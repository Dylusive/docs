import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CommandCenter } from './pages/CommandCenter'
import { ChapterView } from './pages/ChapterView'
import { ConceptWeb } from './pages/ConceptWeb'
import { ImageVault } from './pages/ImageVault'
import { CharacterBible } from './pages/CharacterBible'
import { CoverDesigner } from './pages/CoverDesigner'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/chapter/:id" element={<ChapterView />} />
        <Route path="/concepts" element={<ConceptWeb />} />
        <Route path="/images" element={<ImageVault />} />
        <Route path="/characters" element={<CharacterBible />} />
        <Route path="/cover" element={<CoverDesigner />} />
      </Routes>
    </BrowserRouter>
  )
}
