import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CommandCenter } from './pages/CommandCenter'
import { ChapterView } from './pages/ChapterView'
import { ConceptWeb } from './pages/ConceptWeb'
import { ImageVault } from './pages/ImageVault'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/chapter/:id" element={<ChapterView />} />
        <Route path="/concepts" element={<ConceptWeb />} />
        <Route path="/images" element={<ImageVault />} />
      </Routes>
    </BrowserRouter>
  )
}
