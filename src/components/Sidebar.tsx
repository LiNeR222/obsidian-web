import { useState } from 'react'
import { motion} from 'framer-motion'
import { Folder, File, ChevronRight, ChevronDown, MoreHorizontal, FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { useFileStore, type FileNode } from '../store/useFileStore'
import { useGithubStore } from '../store/useGithubStore'
import { ContextMenu } from './ui/ContextMenu'

interface FileTreeProps {
  nodes: FileNode[]
  level?: number
}

const FileTree = ({ nodes, level = 0 }: FileTreeProps) => {
  const { expandedFolders, toggleFolder, openFile, deleteNode, renameNode, addFile, addFolder } = useFileStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const getContextMenuItems = (node: FileNode) => {
    if (node.type === 'folder') {
      return [
        { label: 'Новый файл', icon: <FilePlus size={14} />, onClick: () => { const name = prompt('Имя файла:'); if (name) addFile(node.path, name) } },
        { label: 'Новая папка', icon: <FolderPlus size={14} />, onClick: () => { const name = prompt('Имя папки:'); if (name) addFolder(node.path, name) } },
        { label: 'Переименовать', icon: <Pencil size={14} />, onClick: () => { const newName = prompt('Новое имя:', node.name); if (newName && newName !== node.name) renameNode(node.path, newName) } },
        { label: 'Удалить', icon: <Trash2 size={14} />, danger: true, onClick: () => { if (confirm(`Удалить папку "${node.name}"?`)) deleteNode(node.path) } }
      ]
    }
    return [
      { label: 'Открыть', onClick: () => openFile(node) },
      { label: 'Переименовать', icon: <Pencil size={14} />, onClick: () => { const newName = prompt('Новое имя:', node.name); if (newName && newName !== node.name) renameNode(node.path, newName) } },
      { label: 'Удалить', icon: <Trash2 size={14} />, danger: true, onClick: () => { if (confirm(`Удалить файл "${node.name}"?`)) deleteNode(node.path) } }
    ]
  }

  if (!nodes || nodes.length === 0) {
    return <div className="text-center text-gray-500 text-xs py-4">Нет файлов</div>
  }

  // Вычисляем отступ: базовый 8px + 20px за каждый уровень вложенности
  const paddingLeft = 8 + (level * 20)

  return (
    <>
      <div className="space-y-0.5">
        {nodes.map((node, idx) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            <div
              style={{ paddingLeft: `${paddingLeft}px` }}
              className="flex items-center gap-1.5 py-1 rounded cursor-pointer hover:bg-white/5 group transition-colors"
              onClick={() => {
                if (node.type === 'folder') {
                  toggleFolder(node.path)
                } else {
                  openFile(node)
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, node)}
            >
              {/* Стрелка для папок */}
              {node.type === 'folder' && (
                <button
                  className="p-0.5 text-gray-500 hover:text-white transition-colors w-4 h-4 flex items-center justify-center shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFolder(node.path)
                  }}
                >
                  {expandedFolders.has(node.path) ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </button>
              )}
              
              {/* Пустое место для файлов (чтобы сохранить выравнивание) */}
              {node.type === 'file' && <div className="w-4 shrink-0" />}
              
              {/* Иконка типа файла */}
              {node.type === 'folder' ? (
                <Folder size={14} className="text-blue-400 shrink-0" />
              ) : (
                <File size={14} className="text-gray-500 shrink-0" />
              )}
              
              {/* Название */}
              <span className="text-sm text-gray-300 flex-1 truncate">{node.name}</span>
              
              {/* Кнопка контекстного меню */}
              <button
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all shrink-0 mr-1"
                onClick={(e) => {
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  setContextMenu({ x: rect.left, y: rect.bottom, node })
                }}
              >
                <MoreHorizontal size={12} className="text-gray-500" />
              </button>
            </div>
            
            {/* Вложенные элементы — рекурсивный вызов с увеличенным уровнем */}
            {node.type === 'folder' && expandedFolders.has(node.path) && node.children && node.children.length > 0 && (
              <FileTree nodes={node.children} level={level + 1} />
            )}
            
            {/* Пустая папка */}
            {node.type === 'folder' && expandedFolders.has(node.path) && (!node.children || node.children.length === 0) && (
              <div 
                style={{ paddingLeft: `${paddingLeft + 20}px` }}
                className="text-gray-600 text-xs py-1"
              >
                Пустая папка
              </div>
            )}
          </motion.div>
        ))}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.node)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}

interface SidebarProps {
  isOpen: boolean
}

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const { files, addFile, addFolder, loadFiles, setFiles } = useFileStore()
  const { isAuthenticated, currentRepo, pullFromGithub } = useGithubStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (isAuthenticated && currentRepo) {
        const remoteFiles = await pullFromGithub()
        if (remoteFiles && remoteFiles.length > 0) {
          setFiles(remoteFiles)
        } else {
          await loadFiles()
        }
      } else {
        await loadFiles()
      }
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getFileCount = (nodes: FileNode[]): number => {
    let count = 0
    for (const node of nodes) {
      if (node.type === 'file') count++
      if (node.children) count += getFileCount(node.children)
    }
    return count
  }

  const fileCount = getFileCount(files)

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 280 : 0, opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="border-r border-white/10 bg-[#0f0f1a] flex flex-col overflow-hidden shrink-0"
      style={{ width: isOpen ? 280 : 0 }}
    >
      {/* Заголовок */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Файлы</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <span className="text-xs">↻</span>}
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => { const name = prompt('Имя файла:'); if (name) addFile('/', name) }} title="Новый файл">
              <FilePlus size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => { const name = prompt('Имя папки:'); if (name) addFolder('/', name) }} title="Новая папка">
              <FolderPlus size={14} />
            </Button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {fileCount} {fileCount === 1 ? 'файл' : fileCount === 2 || fileCount === 3 || fileCount === 4 ? 'файла' : 'файлов'}
        </div>
      </div>
      
      {/* Дерево файлов */}
      <div className="flex-1 overflow-auto">
        <FileTree nodes={files} />
      </div>
      
      {/* Статус-бар */}
      <div className="p-2 border-t border-white/10 text-xs text-gray-500 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Готово</span>
          {isAuthenticated && currentRepo && (
            <>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1 truncate">
                <span className="text-sm">🐙</span>
                <span className="truncate text-purple-400">{currentRepo.split('/')[1]}</span>
              </div>
            </>
          )}
        </div>
        {!isAuthenticated && <div className="text-[10px] text-gray-600">Подключите GitHub для синхронизации</div>}
      </div>
    </motion.aside>
  )
}