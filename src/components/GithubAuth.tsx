import { useState, useEffect } from 'react'
import { LogOut, Check, Loader2, Key } from 'lucide-react'
import { Button } from './ui/Button'
import { useGithubStore } from '../store/useGithubStore'
import { cn } from '../lib/utils'

interface GithubAuthProps {
  onClose?: () => void
}

export const GithubAuth = ({ onClose }: GithubAuthProps) => {
  const { 
    token, 
    isAuthenticated, 
    repos, 
    currentRepo, 
    isLoading, 
    setToken, 
    logout, 
    loadRepos, 
    setCurrentRepo 
  } = useGithubStore()
  const [inputToken, setInputToken] = useState('')
  const [error, setError] = useState('')

  // Автоматически загружаем репозитории, если пользователь уже авторизован
  useEffect(() => {
    if (isAuthenticated && repos.length === 0 && !isLoading) {
      console.log('🔄 Auto-loading repos for authenticated user')
      loadRepos()
    }
  }, [isAuthenticated, repos.length, isLoading, loadRepos])

  const handleLogin = async () => {
    if (!inputToken.trim()) {
      setError('Введите токен')
      return
    }
    
    setError('')
    setToken(inputToken)
    await loadRepos()
    if (onClose) onClose()
  }

  const handleLogout = () => {
    logout()
    if (onClose) onClose()
  }

  const handleSelectRepo = async (repo: string) => {
    setCurrentRepo(repo)
    console.log('📁 Repo selected:', repo)
    if (onClose) onClose()
  }

  if (isAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-base">🐙</span>
            <span className="text-sm text-white">Подключено к GitHub</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-red-300">
            <LogOut size={14} className="mr-1" />
            Выйти
          </Button>
        </div>
        
        <div>
          <p className="text-xs text-gray-400 mb-2">Выберите репозиторий:</p>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-purple-400" />
            </div>
          ) : repos.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              <p>Нет доступных репозиториев</p>
              <button 
                onClick={loadRepos} 
                className="mt-2 text-purple-400 hover:text-purple-300 text-xs"
              >
                Обновить список
              </button>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-auto">
              {repos.map((repo) => (
                <button
                  key={repo.full_name}
                  onClick={() => handleSelectRepo(repo.full_name)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between",
                    currentRepo === repo.full_name 
                      ? "bg-purple-600/30 text-purple-400" 
                      : "hover:bg-white/5 text-gray-300"
                  )}
                >
                  <span>{repo.full_name}</span>
                  {currentRepo === repo.full_name && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {currentRepo && (
          <div className="text-xs text-green-400 bg-green-400/10 p-2 rounded">
            ✅ Выбран: {currentRepo}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="text-5xl mb-3 block">🐙</span>
        <p className="text-sm text-gray-300 mb-2">Подключите GitHub для синхронизации</p>
        <p className="text-xs text-gray-500">Введите Personal Access Token</p>
      </div>
      
      <div>
        <input
          type="password"
          placeholder="ghp_xxxxxxxxxxxx"
          value={inputToken}
          onChange={(e) => setInputToken(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500"
        />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
      
      <div className="text-xs text-gray-500">
        <a 
          href="https://github.com/settings/tokens" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-purple-400 hover:underline"
        >
          Создать токен →
        </a>
        <p className="mt-1">Нужны права: repo, workflow</p>
      </div>
      
      <Button onClick={handleLogin} disabled={isLoading} className="w-full">
        {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Key size={16} className="mr-2" />}
        Подключить GitHub
      </Button>
    </div>
  )
}