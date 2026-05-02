import { motion } from 'framer-motion'
import { Menu, PanelLeftClose, PanelLeftOpen, Search, Settings, Sparkles } from 'lucide-react'
import { IconButton } from './ui/IconButton'
import { GithubStatus } from './GithubStatus'

interface TopBarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenSearch: () => void
}

export const TopBar = ({ isSidebarOpen, onToggleSidebar, onOpenSearch }: TopBarProps) => {
  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-50 glass-strong border-b border-white/10"
    >
      <div className="flex items-center justify-between h-12 px-4">
        <div className="flex items-center gap-2">
          <IconButton
            icon={isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            onClick={onToggleSidebar}
            label={isSidebarOpen ? "Скрыть панель" : "Показать панель"}
          />
          <div className="w-px h-5 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <IconButton icon={<Menu size={18} />} onClick={() => {}} label="Меню" />
        </div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
          />
          <span className="text-sm font-bold tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent neon-text">
            OBSIDIAN WEB
          </span>
          <Sparkles size={12} className="text-purple-400 animate-pulse" />
        </motion.div>

        <div className="flex items-center gap-1">
          <GithubStatus />
          <IconButton 
            icon={<Search size={18} />} 
            onClick={onOpenSearch} 
            label="Поиск (Ctrl+P)" 
          />
          <IconButton icon={<Settings size={18} />} onClick={() => {}} label="Настройки" />
        </div>
      </div>
    </motion.div>
  )
}