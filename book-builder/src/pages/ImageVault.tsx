import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, useActiveBook } from '../store/bookStore'
import { MainFrame } from '../components/layout/MainFrame'
import { HolographicCard } from '../components/ui/HolographicCard'
import { GlowButton } from '../components/ui/GlowButton'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ImageVault() {
  const book = useActiveBook()
  const { addFolder, renameFolder, deleteFolder, addImage, deleteImage } = useStore()
  const [activeFolderId, setActiveFolderId] = useState(book.imageFolders[0]?.id ?? '')
  const [preview, setPreview] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const activeFolder = book.imageFolders.find((f) => f.id === activeFolderId)
    ?? book.imageFolders[0]

  const handleUpload = async (files: FileList | null) => {
    if (!files || !activeFolder) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const dataUrl = await fileToDataUrl(file)
        addImage(activeFolder.id, file.name, dataUrl)
      } catch {
        // skip failed files
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleUpload(e.dataTransfer.files)
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    addFolder(newFolderName.trim())
    setNewFolderName('')
    setAddingFolder(false)
  }

  const totalImages = book.imageFolders.reduce((s, f) => s + f.images.length, 0)

  return (
    <MainFrame ariaContext={`User is in the Image Vault. ${totalImages} images across ${book.imageFolders.length} folders.`}>
      <div className="flex h-full overflow-hidden">
        {/* Folder sidebar */}
        <div
          className="w-52 flex-shrink-0 flex flex-col border-r overflow-hidden"
          style={{ borderColor: 'rgba(0,229,255,0.08)', background: 'rgba(0,0,0,0.3)' }}
        >
          <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(0,229,255,0.08)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono font-bold tracking-wider" style={{ color: '#00e5ff' }}>◻ FOLDERS</span>
              <button
                onClick={() => setAddingFolder(true)}
                className="text-xs font-mono transition-colors"
                style={{ color: 'rgba(0,229,255,0.5)' }}
              >
                + new
              </button>
            </div>
          </div>

          {/* New folder input */}
          <AnimatePresence>
            {addingFolder && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-2 py-2 border-b overflow-hidden"
                style={{ borderColor: 'rgba(0,229,255,0.08)' }}
              >
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setAddingFolder(false) }}
                  placeholder="Folder name..."
                  className="w-full px-2 py-1 rounded text-xs font-mono outline-none"
                  style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', color: 'rgba(255,255,255,0.8)' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {book.imageFolders.map((folder) => (
              <div key={folder.id} className="group relative">
                {renamingId === folder.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { renameFolder(folder.id, renameVal); setRenamingId(null) }
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="w-full px-2 py-1.5 rounded text-xs font-mono outline-none"
                    style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', color: 'rgba(255,255,255,0.9)' }}
                  />
                ) : (
                  <motion.button
                    whileHover={{ x: 2 }}
                    onClick={() => { setActiveFolderId(folder.id) }}
                    onDoubleClick={() => { setRenamingId(folder.id); setRenameVal(folder.name) }}
                    className="w-full text-left px-2 py-2 rounded text-xs font-mono transition-all flex items-center justify-between"
                    style={{
                      background: folder.id === activeFolderId ? 'rgba(0,229,255,0.1)' : 'transparent',
                      border: `1px solid ${folder.id === activeFolderId ? 'rgba(0,229,255,0.25)' : 'transparent'}`,
                      color: folder.id === activeFolderId ? '#00e5ff' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    <span className="truncate">◻ {folder.name}</span>
                    <span style={{ opacity: 0.5, fontSize: 10 }}>{folder.images.length}</span>
                  </motion.button>
                )}

                {/* Delete folder (not shown for last folder) */}
                {book.imageFolders.length > 1 && (
                  <button
                    onClick={() => {
                      deleteFolder(folder.id)
                      if (activeFolderId === folder.id) setActiveFolderId(book.imageFolders.find((f) => f.id !== folder.id)?.id ?? '')
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-xs px-1 rounded transition-all"
                    style={{ color: 'rgba(239,68,68,0.5)' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-2 border-t" style={{ borderColor: 'rgba(0,229,255,0.08)' }}>
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
              {totalImages} images total
            </span>
          </div>
        </div>

        {/* Image grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Upload bar */}
          <div className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'rgba(0,229,255,0.08)' }}>
            <h2 className="text-sm font-mono font-bold" style={{ color: '#00e5ff' }}>
              {activeFolder?.name ?? 'Images'}
            </h2>
            <div className="flex-1" />
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <GlowButton size="sm" onClick={() => fileInput.current?.click()} icon={<span>↑</span>}>
              Upload Images
            </GlowButton>
          </div>

          {/* Drop zone + grid */}
          <div
            className="flex-1 overflow-y-auto p-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {!activeFolder || activeFolder.images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.98, 1.02, 0.98] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center text-3xl"
                  style={{ borderColor: 'rgba(0,229,255,0.2)' }}
                >
                  🖼
                </motion.div>
                <div className="text-center">
                  <p className="font-mono text-sm mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Drop images here</p>
                  <p className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>or click Upload Images above</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                <AnimatePresence>
                  {activeFolder.images.map((img, i) => (
                    <motion.div
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.03 }}
                      className="group relative"
                    >
                      <HolographicCard padding="p-0" hover onClick={() => setPreview(img.dataUrl)}>
                        <div className="aspect-square overflow-hidden rounded-t-lg">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="px-2 py-1.5 flex items-center justify-between">
                          <span className="text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '80%' }}>
                            {img.name}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteImage(activeFolder.id, img.id) }}
                            className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'rgba(239,68,68,0.6)' }}
                          >
                            ✕
                          </button>
                        </div>
                      </HolographicCard>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Drop zone card */}
                <motion.label
                  whileHover={{ scale: 1.02 }}
                  className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ borderColor: 'rgba(0,229,255,0.15)', color: 'rgba(0,229,255,0.3)' }}
                >
                  <span className="text-2xl">+</span>
                  <span className="text-xs font-mono">Upload</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                </motion.label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview lightbox */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
            onClick={() => setPreview(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={preview}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{ boxShadow: '0 0 60px rgba(0,229,255,0.2)' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-4 right-4 text-xl font-mono"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MainFrame>
  )
}
