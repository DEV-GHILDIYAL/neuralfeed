// Multi-provider AI client with automatic fallback.
// Every provider below exposes an OpenAI-compatible /chat/completions endpoint,
// so one small fetch-based client covers all of them — no SDKs needed.
//
// Each provider has a LIST of models. Every (provider, model) pair is a separate
// "slot" in the rotation, so if one free model is retired (404) or overloaded (429),
// the next model / provider is used automatically.
// Free-tier model names change often — override with a comma-separated env var,
// e.g.  GROQ_MODELS=openai/gpt-oss-120b,qwen/qwen3.8-27b

const PROVIDERS = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    models: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'],
    extraBody: (model) => (model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
    jsonMode: true,
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyEnv: 'GEMINI_API_KEY',
    // "-latest" aliases follow Google's current model, so they survive model retirements.
    models: ['gemini-flash-lite-latest', 'gemini-flash-latest'],
    extraBody: () => ({ reasoning_effort: 'low' }),
    jsonMode: true,
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    models: ['nvidia/nemotron-3-ultra-550b-a55b:free', 'google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free'],
    jsonMode: false, // many free models don't support response_format
    headers: { 'HTTP-Referer': 'https://github.com/DEV-GHILDIYAL/neuralfeed', 'X-Title': 'NeuralFeed' },
  },
  cerebras: {
    baseUrl: 'https://api.cerebras.ai/v1',
    keyEnv: 'CEREBRAS_API_KEY',
    models: ['gpt-oss-120b', 'llama-3.3-70b'],
    jsonMode: true,
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    keyEnv: 'MISTRAL_API_KEY',
    models: ['mistral-small-latest', 'mistral-medium-latest'],
    jsonMode: true,
  },
}

class ProviderError extends Error {
  constructor(message, { status, retryAfterMs } = {}) {
    super(message)
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

function modelsFor(name, p) {
  const env = process.env[`${name.toUpperCase()}_MODELS`] || process.env[`${name.toUpperCase()}_MODEL`]
  return env ? env.split(',').map((s) => s.trim()).filter(Boolean) : p.models
}

/** Slots (provider × model) for providers that have an API key, in AI_PROVIDER_ORDER order. */
export function getSlots() {
  const order = (process.env.AI_PROVIDER_ORDER || Object.keys(PROVIDERS).join(','))
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  return order
    .filter((name) => PROVIDERS[name] && process.env[PROVIDERS[name].keyEnv])
    .flatMap((name) => {
      const p = PROVIDERS[name]
      return modelsFor(name, p).map((model) => ({
        id: `${name}:${model}`,
        provider: name,
        model,
        ...p,
        apiKey: process.env[p.keyEnv],
      }))
    })
}

async function callSlot(slot, messages, { json = true } = {}) {
  const body = {
    model: slot.model,
    messages,
    temperature: 0.4,
    max_tokens: 2000,
    ...(slot.extraBody ? slot.extraBody(slot.model) : {}),
  }
  if (json && slot.jsonMode) body.response_format = { type: 'json_object' }

  const res = await fetch(`${slot.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${slot.apiKey}`,
      ...(slot.headers || {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const retryAfter = Number(res.headers.get('retry-after'))
    throw new ProviderError(`${slot.id} HTTP ${res.status}: ${text.slice(0, 200)}`, {
      status: res.status,
      retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
    })
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new ProviderError(`${slot.id}: empty response`)
  return content
}

/**
 * Rotating client. Tries slots in order; a rate-limited slot goes into cooldown
 * and the next one is used. A retired model (404) is disabled; a bad key
 * (401/403) disables every slot of that provider.
 */
export function createAIClient({ log = console.log, maxWaitMs = 90_000 } = {}) {
  const slots = getSlots()
  if (slots.length === 0) {
    throw new Error(
      'No AI provider configured. Set at least one of: ' +
        Object.values(PROVIDERS).map((p) => p.keyEnv).join(', '),
    )
  }

  const state = Object.fromEntries(slots.map((s) => [s.id, { cooldownUntil: 0, disabled: false, ok: 0, failed: 0 }]))

  /** @param {{ json?: boolean }} opts  json=false for free-text answers (chat) */
  async function complete(messages, opts = {}) {
    const errors = []
    // Up to 2 passes: second pass waits for the soonest cooldown to expire.
    for (let pass = 0; pass < 2; pass++) {
      for (const slot of slots) {
        const s = state[slot.id]
        if (s.disabled || Date.now() < s.cooldownUntil) continue
        try {
          const text = await callSlot(slot, messages, opts)
          s.ok++
          return { text, provider: slot.provider, model: slot.model }
        } catch (err) {
          s.failed++
          errors.push(err.message)
          if (err.status === 429) {
            s.cooldownUntil = Date.now() + (err.retryAfterMs ?? 60_000)
            log(`  ⏳ ${slot.id} rate-limited, trying next`)
          } else if (err.status === 401 || err.status === 403) {
            slots.filter((x) => x.provider === slot.provider).forEach((x) => (state[x.id].disabled = true))
            log(`  ✖ ${slot.provider} key rejected — disabled for this run`)
          } else if (err.status === 404 || err.status === 400) {
            s.disabled = true
            log(`  ✖ ${slot.id} unavailable (HTTP ${err.status}) — skipping this model`)
          } else {
            s.cooldownUntil = Date.now() + 15_000
            log(`  ⚠ ${slot.id} error: ${err.message.slice(0, 120)}`)
          }
        }
      }

      const live = slots.filter((x) => !state[x.id].disabled)
      if (live.length === 0) break
      const waitMs = Math.min(...live.map((x) => state[x.id].cooldownUntil)) - Date.now()
      if (pass === 0 && waitMs > 0 && waitMs <= maxWaitMs) {
        log(`  … all models busy, waiting ${Math.ceil(waitMs / 1000)}s`)
        await new Promise((r) => setTimeout(r, waitMs))
      }
    }
    throw new Error(`All AI providers failed:\n  ${errors.slice(-5).join('\n  ')}`)
  }

  return {
    complete,
    providers: [...new Set(slots.map((s) => s.provider))].map(
      (p) => `${p} [${slots.filter((s) => s.provider === p).map((s) => s.model).join(', ')}]`,
    ),
    stats: () => Object.fromEntries(Object.entries(state).filter(([, s]) => s.ok || s.failed)),
  }
}
