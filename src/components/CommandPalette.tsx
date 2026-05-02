import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { useFileStore, type FileNode } from '../store/useFileStore'
import Fuse from 'fuse.js'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FileNode[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { files, openFile } = useFileStore()

  const getAllFiles = useCallback((nodes: FileNode[]): FileNode[] => {
    let allFiles: FileNode[] = []
    for (const node of nodes) {
      if (node.type === 'file') allFiles.push(node)
      if (node.children) allFiles = [...allFiles, ...getAllFiles(node.children)]
    }
    return allFiles
  }, [])

  const fuse = new Fuse(getAllFiles(files), { keys: ['name'], threshold: 0.3 })

  useEffect(() => {
    if (query.length > 0) setResults(fuse.search(query).map(r => r.item))
    else setResults(getAllFiles(files).slice(0, 8))
    setSelectedIndex(0)
  }, [query, files])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)) }
      if (e.key === 'Enter' && results[selectedIndex]) { openFile(results[selectedIndex]); onClose(); setQuery('') }
      if (e.key === 'Escape') { onClose(); setQuery('') }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, openFile, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-150 max-w-[90vw] z-50"
          >
            <div className="gradient-border">
              <div className="bg-linear-to-br from-[#1a1a2e] to-[#0f0f1a] rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-white/10">
                  <Search size={18} className="text-purple-400" />
                  <input
                    type="text"
                    placeholder="Поиск файлов..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-500 text-sm"
                    autoFocus
                  />
                  <kbd className="text-xs text-gray-500 px-2 py-1 rounded bg-white/5">ESC</kbd>
                </div>
                <div className="max-h-100 overflow-auto p-2">
                  {results.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Ничего не найдено</p>
                    </div>
                  ) : (
                    results.map((file, index) => (
                      <motion.div
                        key={file.path}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn("flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-all", selectedIndex === index && "bg-linear-to-r from-purple-600/30 to-pink-600/30")}
                        onClick={() => { openFile(file); onClose(); setQuery('') }}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <FileText size={16} className="text-purple-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500 truncate">{file.path}</p>
                        </div>
                        <kbd className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">↵</kbd>
                      </motion.div>
                    ))
                  )}
                </div>
                <div className="border-t border-white/10 p-2 text-xs text-gray-500 flex justify-between">
                  <span><kbd className="px-1.5 py-0.5 rounded bg-white/5">↑↓</kbd> навигация</span>
                  <span><kbd className="px-1.5 py-0.5 rounded bg-white/5">↵</kbd> открыть</span>
                  <span><kbd className="px-1.5 py-0.5 rounded bg-white/5">ESC</kbd> закрыть</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}