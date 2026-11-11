import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// UI strings. Article text itself comes from the DB (title_hi, summary_hi, …).
const STRINGS = {
  en: {
    topStories: 'Top Stories',
    today: 'Today',
    forYou: 'For You',
    saved: 'Saved',
    models: 'Model Tracker',
    ask: 'Ask AI',
    archive: 'Archive',
    searchPlaceholder: 'Search AI, models, gadgets…',
    todaysBriefing: "Today's briefing",
    allTodaysStories: "All of today's stories",
    topHeadlines: 'Top headlines',
    seeAll: 'See all',
    browseByDate: 'Browse by date',
    trendingTopics: 'Trending topics',
    latest: 'Latest',
    loadMore: 'Load more stories',
    loading: 'Loading…',
    noArticlesYet: 'No articles yet — run the AI pipeline (npm run news:run) to fetch news.',
    couldntLoad: "Couldn't load news",
    newsArchive: 'News archive',
    story: 'story',
    stories: 'stories',
    all: 'All',
    noStoriesDay: 'No stories on this day',
    pickHighlighted: 'Pick a highlighted date in the calendar — those days have news.',
    article: 'article',
    articles: 'articles',
    jumpToMonth: 'Jump to this month',
    section: 'Section',
    resultsFor: 'Results for',
    topic: 'Topic',
    nothingMatched: 'Nothing matched your search.',
    keyPoints: 'Key points',
    minRead: 'min read',
    copyLink: 'Copy link',
    copied: 'Copied!',
    writtenByAi: 'Written by AI from the original report. AI can make mistakes — check the source for full details.',
    readOn: 'Read on',
    moreInSection: 'Related stories',
    allNewsFrom: 'All news from',
    alsoCoveredBy: 'Also covered by',
    listen: 'Listen',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    save: 'Save',
    savedBtn: 'Saved',
    savedTitle: 'Saved stories',
    savedEmpty: 'Nothing saved yet. Tap the bookmark icon on any story to read it later.',
    clearAll: 'Clear all',
    forYouTitle: 'Your feed',
    forYouIntro: 'Pick the topics you care about. Your choice is saved on this device.',
    editTopics: 'Edit topics',
    done: 'Done',
    pickTopicsFirst: 'Choose at least one topic to build your feed.',
    modelsTitle: 'AI Model Tracker',
    modelsIntro: 'New AI models spotted in the news — updated automatically every day.',
    modelName: 'Model',
    company: 'Company',
    type: 'Type',
    modality: 'Modality',
    context: 'Context',
    params: 'Params',
    announced: 'Announced',
    source: 'Source',
    noModels: 'No model launches tracked yet.',
    filterModels: 'Filter by name or company…',
    askTitle: 'Ask NeuralFeed',
    askIntro: 'Ask anything about recent AI & tech news. Answers come only from articles on this site, with sources.',
    askPlaceholder: 'e.g. What did Google launch this week?',
    askButton: 'Ask',
    thinking: 'Reading the news…',
    sources: 'Sources',
    askError: 'Something went wrong. Please try again.',
    askDisclaimer: 'AI answers can be wrong. Check the linked articles.',
    notFound: 'Page not found',
    backHome: '← Back to top stories',
    footerAbout:
      'Daily AI & tech news, summarized by AI from real publisher feeds. Every brief links to its original source — AI summaries can contain mistakes, so check the source for important details.',
    sections: 'Sections',
    browse: 'Browse',
    language: 'हिंदी',
  },
  hi: {
    topStories: 'मुख्य खबरें',
    today: 'आज',
    forYou: 'आपके लिए',
    saved: 'सेव की गई',
    models: 'मॉडल ट्रैकर',
    ask: 'AI से पूछें',
    archive: 'आर्काइव',
    searchPlaceholder: 'AI, मॉडल, गैजेट्स खोजें…',
    todaysBriefing: 'आज की ब्रीफिंग',
    allTodaysStories: 'आज की सभी खबरें',
    topHeadlines: 'मुख्य सुर्खियां',
    seeAll: 'सभी देखें',
    browseByDate: 'तारीख से देखें',
    trendingTopics: 'ट्रेंडिंग विषय',
    latest: 'ताज़ा',
    loadMore: 'और खबरें',
    loading: 'लोड हो रहा है…',
    noArticlesYet: 'अभी कोई खबर नहीं है।',
    couldntLoad: 'खबरें लोड नहीं हो सकीं',
    newsArchive: 'खबरों का आर्काइव',
    story: 'खबर',
    stories: 'खबरें',
    all: 'सभी',
    noStoriesDay: 'इस दिन कोई खबर नहीं',
    pickHighlighted: 'कैलेंडर में हाइलाइट की गई तारीख चुनें — उन दिनों की खबरें हैं।',
    article: 'खबर',
    articles: 'खबरें',
    jumpToMonth: 'इस महीने पर जाएं',
    section: 'सेक्शन',
    resultsFor: 'खोज परिणाम',
    topic: 'विषय',
    nothingMatched: 'कुछ नहीं मिला।',
    keyPoints: 'मुख्य बातें',
    minRead: 'मिनट',
    copyLink: 'लिंक कॉपी करें',
    copied: 'कॉपी हो गया!',
    writtenByAi: 'यह खबर AI ने मूल रिपोर्ट से लिखी है। AI से गलती हो सकती है — पूरी जानकारी के लिए स्रोत देखें।',
    readOn: 'पढ़ें:',
    moreInSection: 'संबंधित खबरें',
    allNewsFrom: 'इस दिन की सभी खबरें',
    alsoCoveredBy: 'इन्होंने भी कवर किया',
    listen: 'सुनें',
    pause: 'रोकें',
    resume: 'जारी रखें',
    stop: 'बंद करें',
    save: 'सेव करें',
    savedBtn: 'सेव है',
    savedTitle: 'सेव की गई खबरें',
    savedEmpty: 'अभी कुछ सेव नहीं है। किसी भी खबर पर बुकमार्क आइकन दबाएं।',
    clearAll: 'सब हटाएं',
    forYouTitle: 'आपकी फ़ीड',
    forYouIntro: 'अपने पसंदीदा विषय चुनें। आपकी पसंद इसी डिवाइस पर सेव रहती है।',
    editTopics: 'विषय बदलें',
    done: 'हो गया',
    pickTopicsFirst: 'अपनी फ़ीड के लिए कम से कम एक विषय चुनें।',
    modelsTitle: 'AI मॉडल ट्रैकर',
    modelsIntro: 'खबरों में आए नए AI मॉडल — हर दिन अपने आप अपडेट।',
    modelName: 'मॉडल',
    company: 'कंपनी',
    type: 'प्रकार',
    modality: 'मोडैलिटी',
    context: 'कॉन्टेक्स्ट',
    params: 'पैरामीटर',
    announced: 'घोषणा',
    source: 'स्रोत',
    noModels: 'अभी कोई मॉडल लॉन्च ट्रैक नहीं हुआ।',
    filterModels: 'नाम या कंपनी से खोजें…',
    askTitle: 'NeuralFeed से पूछें',
    askIntro: 'हाल की AI और टेक खबरों के बारे में कुछ भी पूछें। जवाब सिर्फ इस साइट की खबरों से, स्रोतों के साथ।',
    askPlaceholder: 'जैसे: इस हफ्ते Google ने क्या लॉन्च किया?',
    askButton: 'पूछें',
    thinking: 'खबरें पढ़ रहा है…',
    sources: 'स्रोत',
    askError: 'कुछ गड़बड़ हुई। फिर से कोशिश करें।',
    askDisclaimer: 'AI के जवाब गलत हो सकते हैं। लिंक की गई खबरें देखें।',
    notFound: 'पेज नहीं मिला',
    backHome: '← मुख्य खबरों पर लौटें',
    footerAbout:
      'रोज़ की AI और टेक खबरें, असली पब्लिशर्स की फ़ीड से AI द्वारा लिखी गईं। हर खबर में मूल स्रोत का लिंक है — AI से गलती हो सकती है, ज़रूरी जानकारी स्रोत पर जांचें।',
    sections: 'सेक्शन',
    browse: 'देखें',
    language: 'English',
  },
}

const LangContext = createContext(null)

function initialLang() {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'hi' || saved === 'en') return saved
  } catch {
    /* storage unavailable */
  }
  return 'en'
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('lang', lang)
    } catch {
      /* storage unavailable */
    }
  }, [lang])

  const t = useCallback((key) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key, [lang])

  /** Article field in the current language, falling back to English. */
  const pick = useCallback(
    (article, field) => {
      if (!article) return ''
      if (lang === 'hi') {
        const hi = article[`${field}_hi`]
        if (hi && (!Array.isArray(hi) || hi.length)) return hi
      }
      return article[field]
    },
    [lang],
  )

  const value = useMemo(
    () => ({ lang, setLang, t, pick, locale: lang === 'hi' ? 'hi-IN' : 'en-IN' }),
    [lang, t, pick],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>')
  return ctx
}
