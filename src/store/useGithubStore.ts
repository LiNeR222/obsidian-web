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
    if (!token) {
      console.log('❌ No token, cannot load repos')
      return
    }
    
    console.log('🔄 Loading repos from GitHub...')
    set({ isLoading: true })
    
    try {
      const octokit = new Octokit({ auth: token })
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
      })
      
      console.log(`✅ Loaded ${response.data.length} repos`)
      set({ repos: response.data, isLoading: false })
    } catch (error) {
      console.error('❌ Failed to load repos:', error)
      set({ isLoading: false })
    }
  },
  
  setCurrentRepo: (repo: string) => {
    console.log('📁 Setting current repo:', repo)
    localStorage.setItem('github_repo', repo)
    set({ currentRepo: repo })
  },
  
  init: async () => {
    const { isAuthenticated, token, repos, loadRepos } = get()
    
    console.log('🔧 Initializing GithubStore', { isAuthenticated, hasToken: !!token, reposCount: repos.length })
    
    if (isAuthenticated && token && repos.length === 0) {
      console.log('🔄 Auto-loading repos on init')
      await loadRepos()
    }
  },
  
  pullFromGithub: async () => {
    const { token, currentRepo, currentBranch } = get()
    
    console.log('🔍 PullFromGithub started', { 
      hasToken: !!token, 
      currentRepo, 
      currentBranch 
    })
    
    if (!token || !currentRepo) {
      console.log('❌ No token or repo')
      return null
    }
    
    set({ syncStatus: 'syncing', isLoading: true })
    
    try {
      const octokit = new Octokit({ auth: token })
      const [owner, repo] = currentRepo.split('/')
      
      console.log(`📡 Fetching tree from ${owner}/${repo} (${currentBranch})`)
      
      const response = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: currentBranch,
        recursive: '1'
      })
      
      console.log(`📁 Got tree: ${response.data.tree.length} total items`)
      
      const allFiles = response.data.tree.filter(item => item.type === 'blob')
      console.log(`📄 Found ${allFiles.length} files in repository`)
      
      if (allFiles.length === 0) {
        console.log('⚠️ No files found in repository')
        set({ syncStatus: 'success', isLoading: false })
        return []
      }
      
      const fileTypes = new Map<string, number>()
      allFiles.forEach(item => {
        const ext = item.path?.split('.').pop() || 'no extension'
        fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1)
      })
      console.log('📊 File types distribution:', Object.fromEntries(fileTypes))
      
      const files: FileNode[] = []
      const folders: { [key: string]: FileNode } = {}
      let loadedCount = 0
      let skippedCount = 0
      
      const textExtensions = ['md', 'txt', 'json', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'xml', 'yaml', 'yml', 'toml', 'env', 'gitignore', 'mdx']
      
      for (const item of allFiles) {
        try {
          const ext = item.path?.split('.').pop()?.toLowerCase() || ''
          const isTextFile = textExtensions.includes(ext) || !ext
          let content = ''
          
          if (isTextFile && item.size && item.size < 100000) {
            try {
              const contentResponse = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: item.path!,
                ref: currentBranch
              })
              
              if ('content' in contentResponse.data) {
                content = atob(contentResponse.data.content.replace(/\n/g, ''))
                loadedCount++
              }
            } catch (e) {
              skippedCount++
            }
          } else {
            skippedCount++
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
          
          if (loadedCount % 50 === 0) {
            console.log(`📦 Progress: ${loadedCount} files loaded, ${skippedCount} skipped`)
          }
        } catch (err) {
          console.error(`❌ Failed to process ${item.path}:`, err)
          skippedCount++
        }
      }
      
      console.log(`✅ Loaded: ${loadedCount} files, Skipped: ${skippedCount} files`)
      console.log(`📦 Total items collected: ${files.length}`)
      
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
      console.log('🌲 Final tree has', fileTree.length, 'root items')
      
      set({ 
        syncStatus: 'success', 
        isLoading: false,
        lastSync: new Date()
      })
      
      return fileTree
    } catch (error) {
      console.error('❌ GitHub pull error:', error)
      set({ syncStatus: 'error', isLoading: false })
      return null
    }
  },
  
  pushToGithub: async (files: FileNode[]) => {
    const { token, currentRepo, currentBranch } = get()
    
    if (!token || !currentRepo) {
      console.log('❌ No token or repo for push')
      return false
    }
    
    set({ syncStatus: 'syncing', isLoading: true })
    
    try {
      const octokit = new Octokit({ auth: token })
      const [owner, repo] = currentRepo.split('/')
      
      console.log(`📤 Pushing to ${owner}/${repo}`)
      
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
      
      const processNode = async (node: FileNode, currentPath: string = ''): Promise<any[]> => {
        const items: any[] = []
        const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name
        
        if (node.type === 'file' && node.content) {
          const content = btoa(unescape(encodeURIComponent(node.content)))
          items.push({
            path: fullPath,
            mode: '100644' as const,
            type: 'blob' as const,
            content: content
          })
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
      
      console.log(`📦 Prepared ${allItems.length} items for commit`)
      
      const newTreeResponse = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentTreeSha,
        tree: allItems
      })
      
      const newCommitResponse = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: `Sync from Obsidian Web - ${new Date().toLocaleString()}`,
        tree: newTreeResponse.data.sha,
        parents: [currentCommitSha]
      })
      
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
      console.error('❌ GitHub push error:', error)
      set({ syncStatus: 'error', isLoading: false })
      return false
    }
  },
  
  syncWithGithub: async (files: FileNode[]) => {
    return await get().pushToGithub(files)
  }
}))