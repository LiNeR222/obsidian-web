import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { useFileStore } from '../store/useFileStore'
import { MarkdownPreview } from './MarkdownPreview'
import { BacklinksPanel } from './BacklinksPanel'
import { FileText, Eye, Split, Edit3, Save } from 'lucide-react'
import { cn } from '../lib/utils'

type ViewMode = 'edit' | 'preview' | 'split'

export const EditorArea = () => {
  const { activeFile, updateFileContent, openTabs, closeTab, setActiveFile, getFileContent } = useFileStore()
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!activeFile) { setContent(''); return }
    const loadContent = async () => {
      setIsLoading(true)
      try {
        let fileContent = activeFile.content || ''
        if (!fileContent) fileContent = await getFileContent(activeFile.path)
        setContent(fileContent)
      } catch (error) { console.error(error); setContent('') }
      finally { setIsLoading(false) }
    }
    loadContent()
  }, [activeFile, getFileContent])

  useEffect(() => {
    if (!activeFile || isLoading) return
    const timer = setTimeout(async () => {
      if (content !== activeFile.content) {
        setIsSaving(true)
        await updateFileContent(activeFile.path, content)
        setIsSaving(false)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [content, activeFile, updateFileContent, isLoading])

  const handleContentChange = useCallback((value: string) => setContent(value), [])
  const handleSave = async () => {
    if (activeFile && content !== activeFile.content) {
      setIsSaving(true)
      await updateFileContent(activeFile.path, content)
      setIsSaving(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeFile) return
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); setViewMode(prev => prev === 'edit' ? 'preview' : prev === 'preview' ? 'split' : 'edit') }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeFile, handleSave])

  if (!activeFile) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <FileText size={64} className="mb-4 opacity-30" />
        <p className="text-sm">Выберите файл для редактирования</p>
        <p className="text-xs mt-1 opacity-50">или создайте новый через контекстное меню</p>
        <div className="mt-4 flex gap-2 text-xs text-gray-600"><kbd className="px-2 py-1 bg-white/5 rounded">Ctrl+P</kbd><span>— поиск файлов</span></div>
      </motion.div>
    )
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {openTabs.length > 0 && (
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0f0f1a]/50">
          <div className="flex items-center overflow-x-auto flex-1">
            <AnimatePresence>
              {openTabs.map((tab) => (
                <motion.div
                  key={tab.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r border-white/10 group transition-all", activeFile?.path === tab.path && "bg-purple-600/20 border-b-2 border-purple-500")}
                  onClick={() => setActiveFile(tab)}
                >
                  <span className="truncate max-w-37.5">{tab.name}</span>
                  <button className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity" onClick={(e) => { e.stopPropagation(); closeTab(tab.path) }}>✕</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1 px-2 border-l border-white/10">
            {isSaving && <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-1" />}
            <button onClick={handleSave} className="p-1.5 rounded hover:bg-white/10 transition-all" title="Сохранить (Ctrl+S)"><Save size={16} className="text-gray-400" /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            {(['edit', 'preview', 'split'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={cn("p-1.5 rounded transition-all", viewMode === mode && "bg-purple-600/30 text-purple-400")} title={`Режим ${mode === 'edit' ? 'редактирования' : mode === 'preview' ? 'просмотра' : 'split'} (Ctrl+E)`}>
                {mode === 'edit' ? <Edit3 size={16} /> : mode === 'preview' ? <Eye size={16} /> : <Split size={16} />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-1 text-xs text-gray-500 border-b border-white/5 bg-[#0f0f1a]/30">
        <div className="flex items-center gap-4"><span>{activeFile.name}</span><span className="text-gray-600">|</span><span>{content.split('\n').length} строк</span><span className="text-gray-600">|</span><span>{content.length} символов</span></div>
        <div className="flex items-center gap-3"><span>Ctrl+S — сохранить</span><span>Ctrl+E — режим</span></div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <motion.div className={cn("h-full overflow-auto", viewMode === 'split' ? "w-1/2 border-r border-white/10" : "flex-1")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <CodeMirror value={content} onChange={handleContentChange} theme={oneDark} extensions={[markdown({ base: markdownLanguage })]} className="h-full" basicSetup={{ lineNumbers: true, highlightActiveLineGutter: true, highlightActiveLine: true, foldGutter: true, dropCursor: true, allowMultipleSelections: true, indentOnInput: true }} />
          </motion.div>
        )}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <motion.div className={cn("h-full overflow-auto", viewMode === 'split' ? "w-1/2" : "flex-1")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <MarkdownPreview content={content} />
          </motion.div>
        )}
      </div>

      <BacklinksPanel currentPath={activeFile.path} />
    </div>
  )
}