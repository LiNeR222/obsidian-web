import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { EditorArea } from './components/EditorArea'
import { CommandPalette } from './components/CommandPalette'
import { useFileStore } from './store/useFileStore'
import { useGithubStore } from './store/useGithubStore'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const { setFiles, loadFiles } = useFileStore()
  const { isAuthenticated, currentRepo, pullFromGithub, loadRepos, repos } = useGithubStore()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Автоматически загружаем репозитории при монтировании, если есть токен
  useEffect(() => {
    if (isAuthenticated && repos.length === 0) {
      console.log('🔄 Loading repos on app start')
      loadRepos()
    }
  }, [isAuthenticated, repos.length, loadRepos])

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        if (isAuthenticated && currentRepo) {
          console.log('📡 Loading files from GitHub:', currentRepo)
          const remoteFiles = await pullFromGithub()
          if (remoteFiles && remoteFiles.length > 0) {
            console.log(`✅ Loaded ${remoteFiles.length} files from GitHub`)
            setFiles(remoteFiles)
          } else {
            console.log('⚠️ No files in GitHub, loading local')
            await loadFiles()
          }
        } else {
          console.log('💾 GitHub not connected, loading local')
          await loadFiles()
        }
      } catch (error) {
        console.error('❌ Error:', error)
        setLoadError('Ошибка загрузки. Показаны локальные данные.')
        await loadFiles()
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [isAuthenticated, currentRepo, setFiles, loadFiles, pullFromGithub])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCommandPaletteOpen])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f1a]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Загрузка заметок...</p>
          {isAuthenticated && currentRepo && <p className="text-xs text-gray-500 mt-2">{currentRepo}</p>}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f0f1a] overflow-hidden">
      <AnimatePresence>
        {loadError && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs text-center py-1.5">
            ⚠️ {loadError}
          </motion.div>
        )}
      </AnimatePresence>
      <TopBar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onOpenSearch={() => setIsCommandPaletteOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} />
        <EditorArea />
      </div>
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  )
}

export default App