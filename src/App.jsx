import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import CategoryPage from './pages/CategoryPage.jsx'
import ArticlePage from './pages/ArticlePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import DatePage from './pages/DatePage.jsx'
import ForYouPage from './pages/ForYouPage.jsx'
import SavedPage from './pages/SavedPage.jsx'
import ModelsPage from './pages/ModelsPage.jsx'
import AskPage from './pages/AskPage.jsx'
import ShortsPage from './pages/ShortsPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="article/:slug" element={<ArticlePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="date/:day" element={<DatePage />} />
        <Route path="for-you" element={<ForYouPage />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="ask" element={<AskPage />} />
        <Route path="shorts" element={<ShortsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
