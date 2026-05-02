import { useState } from 'react'
import { CheckCircle, AlertCircle, Loader2, Cloud, CloudOff, Download, Upload } from 'lucide-react'
import { useGithubStore } from '../store/useGithubStore'
import { useFileStore } from '../store/useFileStore'
import { Modal } from './ui/Modal'
import { GithubAuth } from './GithubAuth'
import { Button } from './ui/Button'

export const GithubStatus = () => {
  const { 
    isAuthenticated, 
    syncStatus, 
    pullFromGithub, 
    pushToGithub, 
  } = useGithubStore()
  const { files, setFiles } = useFileStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [isPushing, setIsPushing] = useState(false)

  const handlePull = async () => {
    setIsPulling(true)
    const remoteFiles = await pullFromGithub()
    if (remoteFiles && remoteFiles.length > 0) {
      setFiles(remoteFiles)
    }
    setIsPulling(false)
  }

  const handlePush = async () => {
    setIsPushing(true)
    await pushToGithub(files)
    setIsPushing(false)
  }

  const getStatusIcon = () => {
    if (isPulling || isPushing || syncStatus === 'syncing') {
      return <Loader2 size={14} className="animate-spin text-yellow-400" />
    }
    if (syncStatus === 'success') {
      return <CheckCircle size={14} className="text-green-400" />
    }
    if (syncStatus === 'error') {
      return <AlertCircle size={14} className="text-red-400" />
    }
    if (isAuthenticated) {
      return <Cloud size={14} className="text-purple-400" />
    }
    return <CloudOff size={14} className="text-gray-500" />
  }

  const getStatusText = () => {
    if (isPulling || isPushing || syncStatus === 'syncing') return 'Синхронизация...'
    if (syncStatus === 'success') return 'Синхронизировано'
    if (syncStatus === 'error') return 'Ошибка синхронизации'
    if (isAuthenticated) return 'GitHub готов'
    return 'GitHub не подключён'
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors"
      >
        <span className="text-base">🐙</span>
        <span className="text-xs text-gray-400">Подключить GitHub</span>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="GitHub">
          <GithubAuth onClose={() => setIsModalOpen(false)} />
        </Modal>
      </button>
    )
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          title="GitHub настройки"
        >
          <span className="text-base">🐙</span>
          <div className="flex items-center gap-1.5">
            {getStatusIcon()}
            <span className="text-xs text-gray-400">{getStatusText()}</span>
          </div>
        </button>
        
        <Button
          size="sm"
          onClick={handlePull}
          disabled={isPulling || isPushing}
          className="h-7 px-2 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400"
          title="Загрузить из GitHub"
        >
          <Download size={12} className="mr-1" />
          Pull
        </Button>
        
        <Button
          size="sm"
          onClick={handlePush}
          disabled={isPulling || isPushing}
          className="h-7 px-2 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400"
          title="Выгрузить в GitHub"
        >
          <Upload size={12} className="mr-1" />
          Push
        </Button>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="GitHub">
        <GithubAuth onClose={() => setIsModalOpen(false)} />
      </Modal>
    </>
  )
}