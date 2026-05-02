import { create } from 'zustand'
import { loadFileTree, saveFileTree, loadFileContent, saveFileContent } from '../lib/db'

export interface FileNode {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  content?: string
  children?: FileNode[]
}

export interface Backlink {
  sourcePath: string
  sourceName: string
  targetPath: string
  context: string
}

interface FileStore {
  files: FileNode[]
  activeFile: FileNode | null
  openTabs: FileNode[]
  expandedFolders: Set<string>
  backlinks: Backlink[]
  
  loadFiles: () => Promise<void>
  saveFiles: () => Promise<void>
  setFiles: (files: FileNode[]) => void
  setActiveFile: (file: FileNode | null) => void
  openFile: (file: FileNode) => Promise<void>
  closeTab: (path: string) => void
  closeAllTabs: () => void
  updateFileContent: (path: string, content: string) => Promise<void>
  toggleFolder: (path: string) => void
  getFileContent: (path: string) => Promise<string>
  addFile: (parentPath: string, name: string) => Promise<void>
  addFolder: (parentPath: string, name: string) => Promise<void>
  deleteNode: (path: string) => Promise<void>
  renameNode: (path: string, newName: string) => Promise<void>
  
  // Wikilinks методы
  extractWikilinks: (content: string) => string[]
  resolveWikilink: (link: string) => FileNode | null
  updateBacklinks: () => void
}

const getInitialFiles = (): FileNode[] => [
  {
    id: '1',
    name: 'Заметки',
    path: '/Заметки',
    type: 'folder',
    children: [
      {
        id: '2',
        name: 'welcome.md',
        path: '/Заметки/welcome.md',
        type: 'file',
        content: '# Добро пожаловать в Obsidian Web!\n\nЭто ваша первая заметка.\n\n## Ссылки\n\nСмотри также: [[README]]\n\n## Возможности\n\n- Редактор Markdown\n- Поддержка вкладок\n- Сохранение в IndexedDB\n- GitHub синхронизация\n- [[Обратные ссылки]]'
      },
      {
        id: '3',
        name: 'todo.md',
        path: '/Заметки/todo.md',
        type: 'file',
        content: '# Список дел\n\n- [ ] Сделать проект\n- [ ] Выложить на GitHub\n- [ ] Написать документацию\n\nСвязано с: [[welcome]]'
      }
    ]
  },
  {
    id: '4',
    name: 'README.md',
    path: '/README.md',
    type: 'file',
    content: '# Obsidian Web\n\nВеб-версия Obsidian с поддержкой GitHub.\n\n[[Заметки/welcome|Добро пожаловать]]'
  }
]

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  activeFile: null,
  openTabs: [],
  expandedFolders: new Set(['/Заметки']),
  backlinks: [],
  
  loadFiles: async () => {
    try {
      const savedTree = await loadFileTree()
      if (savedTree && savedTree.length > 0) {
        set({ files: savedTree })
      } else {
        set({ files: getInitialFiles() })
        await saveFileTree(getInitialFiles())
      }
      get().updateBacklinks()
    } catch (error) {
      console.error('Failed to load files:', error)
      set({ files: getInitialFiles() })
    }
  },
  
  saveFiles: async () => {
    const { files } = get()
    await saveFileTree(files)
  },
  
  setFiles: (files) => set({ files }),
  
  setActiveFile: (file) => set({ activeFile: file }),
  
  getFileContent: async (path: string) => {
    const { files } = get()
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === path && node.type === 'file') return node
        if (node.children) {
          const found = findFile(node.children)
          if (found) return found
        }
      }
      return null
    }
    const file = findFile(files)
    if (file?.content) return file.content
    const savedContent = await loadFileContent(path)
    if (savedContent) return savedContent
    return `# ${path.split('/').pop()}\n\nФайл создан.`
  },
  
  openFile: async (file: FileNode) => {
    const { openTabs } = get()
    const alreadyOpen = openTabs.some(tab => tab.path === file.path)
    
    if (alreadyOpen) {
      set({ activeFile: file })
      return
    }
    
    let content = file.content || ''
    if (!content) {
      const savedContent = await loadFileContent(file.path)
      if (savedContent) {
        content = savedContent
      } else {
        content = `# ${file.name.replace(/\.(md|txt)$/, '')}\n\nНовый файл.`
      }
    }
    
    const fileWithContent = { ...file, content }
    set({
      openTabs: [...openTabs, fileWithContent],
      activeFile: fileWithContent
    })
    get().updateBacklinks()
  },
  
  closeTab: (path) => {
    const { openTabs, activeFile } = get()
    const newTabs = openTabs.filter(tab => tab.path !== path)
    let newActiveFile = activeFile
    if (activeFile?.path === path) {
      newActiveFile = newTabs[newTabs.length - 1] || null
    }
    set({ openTabs: newTabs, activeFile: newActiveFile })
  },
  
  closeAllTabs: () => {
    set({ openTabs: [], activeFile: null })
  },
  
  updateFileContent: async (path, content) => {
    const updateInTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path) return { ...node, content }
        if (node.children) return { ...node, children: updateInTree(node.children) }
        return node
      })
    }
    set({ files: updateInTree(get().files) })
    
    const { openTabs, activeFile } = get()
    const updatedTabs = openTabs.map(tab => tab.path === path ? { ...tab, content } : tab)
    if (activeFile?.path === path) {
      set({ activeFile: { ...activeFile, content }, openTabs: updatedTabs })
    } else {
      set({ openTabs: updatedTabs })
    }
    await saveFileContent(path, content)
    get().updateBacklinks()
  },
  
  toggleFolder: (path) => {
    const { expandedFolders } = get()
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    set({ expandedFolders: newExpanded })
  },
  
  addFile: async (parentPath, name) => {
    const fullName = name.endsWith('.md') ? name : `${name}.md`
    const newPath = parentPath === '/' ? `/${fullName}` : `${parentPath}/${fullName}`
    const newFile: FileNode = {
      id: Date.now().toString(),
      name: fullName,
      path: newPath,
      type: 'file',
      content: `# ${fullName.replace('.md', '')}\n\nНовый файл создан.`
    }
    const addToTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === parentPath && node.type === 'folder') {
          return { ...node, children: [...(node.children || []), newFile] }
        }
        if (node.children) return { ...node, children: addToTree(node.children) }
        return node
      })
    }
    set({ files: addToTree(get().files) })
    await saveFileTree(get().files)
    await saveFileContent(newPath, newFile.content || '')
    get().updateBacklinks()
  },
  
  addFolder: async (parentPath, name) => {
    const newPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`
    const newFolder: FileNode = {
      id: Date.now().toString(),
      name,
      path: newPath,
      type: 'folder',
      children: []
    }
    const addToTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === parentPath && node.type === 'folder') {
          return { ...node, children: [...(node.children || []), newFolder] }
        }
        if (node.children) return { ...node, children: addToTree(node.children) }
        return node
      })
    }
    set({ files: addToTree(get().files) })
    await saveFileTree(get().files)
  },
  
  deleteNode: async (path) => {
    const deleteFromTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => node.path !== path).map(node => ({
        ...node,
        children: node.children ? deleteFromTree(node.children) : undefined
      }))
    }
    set({ files: deleteFromTree(get().files) })
    await saveFileTree(get().files)
    const { openTabs, activeFile } = get()
    if (openTabs.some(tab => tab.path === path)) {
      const newTabs = openTabs.filter(tab => tab.path !== path)
      set({ openTabs: newTabs })
      if (activeFile?.path === path) set({ activeFile: newTabs[0] || null })
    }
    get().updateBacklinks()
  },
  
  renameNode: async (path, newName) => {
    const pathParts = path.split('/')
    pathParts[pathParts.length - 1] = newName
    const newPath = pathParts.join('/')
    const renameInTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path) return { ...node, name: newName, path: newPath }
        if (node.children) {
          const newChildren = renameInTree(node.children)
          const updatedChildren = newChildren.map(child => ({
            ...child,
            path: child.path.replace(path, newPath)
          }))
          return { ...node, children: updatedChildren }
        }
        return node
      })
    }
    set({ files: renameInTree(get().files) })
    await saveFileTree(get().files)
    const { openTabs, activeFile } = get()
    const updatedTabs = openTabs.map(tab => tab.path === path ? { ...tab, name: newName, path: newPath } : tab)
    let newActiveFile = activeFile
    if (activeFile?.path === path) newActiveFile = { ...activeFile, name: newName, path: newPath }
    set({ openTabs: updatedTabs, activeFile: newActiveFile })
  },
  
  extractWikilinks: (content: string) => {
    const regex = /\[\[(.*?)\]\]/g
    const matches = content.matchAll(regex)
    return Array.from(matches, m => m[1].split('|')[0].trim())
  },
  
  resolveWikilink: (link: string) => {
    const { files } = get()
    const searchByName = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        const nameWithoutExt = node.name.replace(/\.md$/, '')
        if (node.name === link || nameWithoutExt === link || node.name === `${link}.md`) {
          return node
        }
        if (node.children) {
          const found = searchByName(node.children)
          if (found) return found
        }
      }
      return null
    }
    return searchByName(files)
  },
  
  updateBacklinks: () => {
    const { files } = get()
    const backlinksMap: Map<string, Backlink[]> = new Map()
    const processNode = (node: FileNode) => {
      if (node.type === 'file' && node.content) {
        const wikilinks = get().extractWikilinks(node.content)
        for (const link of wikilinks) {
          const targetNode = get().resolveWikilink(link)
          if (targetNode) {
            const linkIndex = node.content.indexOf(`[[${link}]]`)
            const start = Math.max(0, linkIndex - 50)
            const end = Math.min(node.content.length, linkIndex + link.length + 50)
            const context = (start > 0 ? '...' : '') + node.content.substring(start, end) + (end < node.content.length ? '...' : '')
            const backlink: Backlink = { sourcePath: node.path, sourceName: node.name, targetPath: targetNode.path, context }
            const existing = backlinksMap.get(targetNode.path) || []
            existing.push(backlink)
            backlinksMap.set(targetNode.path, existing)
          }
        }
      }
      if (node.children) node.children.forEach(processNode)
    }
    files.forEach(processNode)
    set({ backlinks: Array.from(backlinksMap.entries()).flatMap(([_, links]) => links) })
  }
}))