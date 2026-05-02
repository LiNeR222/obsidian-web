import { create } from 'zustand'
import { Octokit } from 'octokit'
import type { FileNode } from './useFileStore'

interface GithubStore {
  token: string | null
  isAuthenticated: boolean
  repos: any[]
  currentRepo: string | null
  currentBranch: string
  isLoading: boolean
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  lastSync: Date | null
  
  setToken: (token: string) => void
  logout: () => void
  loadRepos: () => Promise<void>
  setCurrentRepo: (repo: string) => void
  init: () => Promise<void>
  pullFromGithub: () => Promise<FileNode[] | null>
  pushToGithub: (files: FileNode[]) => Promise<boolean>
  syncWithGithub: (files: FileNode[]) => Promise<boolean>
}

// Функция для кодирования бинарных данных (только если нужно)
const toBase64 = (str: string): string => {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  let binary = ''
  data.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

// Определяем, какие файлы являются текстовыми (не требуют base64)
const isTextFile = (filename: string): boolean => {
  const textExtensions = [
    '.md', '.txt', '.json', '.js', '.ts', '.jsx', '.tsx',
    '.css', '.html', '.xml', '.yaml', '.yml', '.toml', '.env',
    '.gitignore', '.editorconfig', '.prettierrc', '.eslintrc'
  ]
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  return textExtensions.includes(ext) || !ext // файлы без расширения считаем текстовыми
}

// Служебные файлы, которые не нужно пушить
const SKIP_FILES = ['.DS_Store', 'Thumbs.db', '.vercel', 'node_modules']

export const useGithubStore = create<GithubStore>((set, get) => ({
  token: localStorage.getItem('github_token'),
  isAuthenticated: !!localStorage.getItem('github_token'),
  repos: [],
  currentRepo: localStorage.getItem('github_repo'),
  currentBranch: 'main',
  isLoading: false,
  syncStatus: 'idle',
  lastSync: null,
  
  setToken: (token: string) => {
    localStorage.setItem('github_token', token)
    set({ token, isAuthenticated: true })
  },
  
  logout: () => {
    localStorage.removeItem('github_token')
    localStorage.removeItem('github_repo')
    set({ token: null, isAuthenticated: false, repos: [], currentRepo: null })
  },
  
  loadRepos: async () => {
    const { token } = get()
    if (!token) return
    
    set({ isLoading: true })
    try {
      const octokit = new Octokit({ auth: token })
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
      })
      set({ repos: response.data, isLoading: false })
    } catch (error) {
      console.error('Failed to load repos:', error)
      set({ isLoading: false })
    }
  },
  
  setCurrentRepo: (repo: string) => {
    localStorage.setItem('github_repo', repo)
    set({ currentRepo: repo })
  },
  
  init: async () => {
    const { isAuthenticated, token, repos, loadRepos } = get()
    if (isAuthenticated && token && repos.length === 0) {
      await loadRepos()
    }
  },
  
  pullFromGithub: async () => {
    const { token, currentRepo, currentBranch } = get()
    
    if (!token || !currentRepo) return null
    
    set({ syncStatus: 'syncing', isLoading: true })
    
    try {
      const octokit = new Octokit({ auth: token })
      const [owner, repo] = currentRepo.split('/')
      
      const response = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: currentBranch,
        recursive: '1'
      })
      
      const allFiles = response.data.tree.filter(item => item.type === 'blob')
      
      const files: FileNode[] = []
      const folders: { [key: string]: FileNode } = {}
      
      const textExtensions = ['.md', '.txt', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.xml', '.yaml', '.yml', '.toml', '.env']
      
      for (const item of allFiles) {
        try {
          const ext = item.path?.split('.').pop()?.toLowerCase() || ''
          const isTextFileLocal = textExtensions.includes(`.${ext}`) || !ext
          let content = ''
          
          if (isTextFileLocal && item.size && item.size < 100000) {
            try {
              const contentResponse = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: item.path!,
                ref: currentBranch
              })
              
              if ('content' in contentResponse.data) {
                content = atob(contentResponse.data.content.replace(/\n/g, ''))
              }
            } catch (e) {
              // Пропускаем бинарные файлы
            }
          }
          
          const name = item.path!.split('/').pop() || item.path!
          const pathParts = item.path!.split('/')
          
          let currentPath = ''
          for (let i = 0; i < pathParts.length - 1; i++) {
            currentPath += (currentPath ? '/' : '') + pathParts[i]
            if (!folders[currentPath]) {
              const folderNode: FileNode = {
                id: `folder-${currentPath}`,
                name: pathParts[i],
                path: `/${currentPath}`,
                type: 'folder',
                children: []
              }
              folders[currentPath] = folderNode
              files.push(folderNode)
            }
          }
          
          files.push({
            id: item.sha,
            name: name,
            path: `/${item.path}`,
            type: 'file',
            content: content,
            children: undefined
          })
        } catch (err) {
          console.error(`Failed to process ${item.path}:`, err)
        }
      }
      
      // Построение дерева
      const buildTree = (items: FileNode[]): FileNode[] => {
        const root: FileNode[] = []
        const folderMap: { [key: string]: FileNode } = {}
        
        items.forEach(item => {
          if (item.type === 'folder') {
            folderMap[item.path] = item
          }
        })
        
        items.forEach(item => {
          if (item.type === 'file') {
            const lastSlash = item.path.lastIndexOf('/')
            if (lastSlash > 0) {
              const parentPath = item.path.substring(0, lastSlash)
              const parent = folderMap[parentPath]
              if (parent && parent.children) {
                parent.children.push(item)
              } else {
                root.push(item)
              }
            } else {
              root.push(item)
            }
          } else if (item.type === 'folder') {
            if (item.path === '' || item.path === '/') {
              root.push(item)
            } else {
              const lastSlash = item.path.lastIndexOf('/')
              if (lastSlash > 0) {
                const parentPath = item.path.substring(0, lastSlash)
                const parent = folderMap[parentPath]
                if (parent && parent.children) {
                  parent.children.push(item)
                } else {
                  root.push(item)
                }
              } else {
                root.push(item)
              }
            }
          }
        })
        
        const sortNodes = (nodes: FileNode[]): FileNode[] => {
          return nodes.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1
            if (a.type === 'file' && b.type === 'folder') return 1
            return a.name.localeCompare(b.name)
          }).map(node => ({
            ...node,
            children: node.children ? sortNodes(node.children) : undefined
          }))
        }
        
        return sortNodes(root)
      }
      
      const fileTree = buildTree(files)
      
      set({ 
        syncStatus: 'success', 
        isLoading: false,
        lastSync: new Date()
      })
      
      return fileTree
    } catch (error) {
      console.error('GitHub pull error:', error)
      set({ syncStatus: 'error', isLoading: false })
      return null
    }
  },
  
  pushToGithub: async (files: FileNode[]) => {
    const { token, currentRepo, currentBranch } = get()
    
    if (!token || !currentRepo) return false
    
    set({ syncStatus: 'syncing', isLoading: true })
    
    try {
      const octokit = new Octokit({ auth: token })
      const [owner, repo] = currentRepo.split('/')
      
      // Получаем текущий коммит
      const refResponse = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${currentBranch}`
      })
      
      const currentCommitSha = refResponse.data.object.sha
      
      const commitResponse = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha
      })
      
      const currentTreeSha = commitResponse.data.tree.sha
      
      // Рекурсивная функция для создания blobs
      const processNode = async (node: FileNode, currentPath: string = ''): Promise<any[]> => {
        const items: any[] = []
        const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name
        
        // Пропускаем служебные файлы
        if (SKIP_FILES.includes(node.name)) {
          return items
        }
        
        if (node.type === 'file' && node.content) {
          try {
            let content: string
            
            // 🔥 ГЛАВНОЕ ИСПРАВЛЕНИЕ: текстовые файлы отправляем как строку, а не base64!
            if (isTextFile(node.name)) {
              // Для текстовых файлов отправляем обычную строку
              content = node.content
              console.log(`📄 Sending as text: ${node.name}`)
            } else {
              // Для бинарных файлов кодируем в base64
              content = toBase64(node.content)
              console.log(`📦 Sending as base64: ${node.name}`)
            }
            
            items.push({
              path: fullPath,
              mode: '100644' as const,
              type: 'blob' as const,
              content: content
            })
          } catch (err) {
            console.error(`Failed to process ${node.name}:`, err)
          }
        } else if (node.type === 'folder' && node.children) {
          for (const child of node.children) {
            items.push(...await processNode(child, fullPath))
          }
        }
        
        return items
      }
      
      let allItems: any[] = []
      for (const file of files) {
        allItems.push(...await processNode(file))
      }
      
      // Создаём новое дерево
      const newTreeResponse = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentTreeSha,
        tree: allItems
      })
      
      // Создаём коммит
      const newCommitResponse = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: `Sync from Obsidian Web - ${new Date().toLocaleString()}`,
        tree: newTreeResponse.data.sha,
        parents: [currentCommitSha]
      })
      
      // Обновляем ссылку
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${currentBranch}`,
        sha: newCommitResponse.data.sha,
        force: false
      })
      
      console.log('✅ Push successful!')
      
      set({ 
        syncStatus: 'success', 
        isLoading: false,
        lastSync: new Date()
      })
      
      return true
    } catch (error) {
      console.error('GitHub push error:', error)
      set({ syncStatus: 'error', isLoading: false })
      return false
    }
  },
  
  syncWithGithub: async (files: FileNode[]) => {
    return await get().pushToGithub(files)
  }
}))