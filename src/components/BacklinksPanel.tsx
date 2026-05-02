import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, Sparkles } from 'lucide-react'
import { useFileStore } from '../store/useFileStore'

interface BacklinksPanelProps {
  currentPath: string | null
}

export const BacklinksPanel = ({ currentPath }: BacklinksPanelProps) => {
  const { backlinks, updateBacklinks, openFile, resolveWikilink } = useFileStore()
  
  useEffect(() => {
    updateBacklinks()
  }, [useFileStore.getState().files])
  
  const currentBacklinks = backlinks.filter(b => b.targetPath === currentPath)
  
  if (!currentPath) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="gradient-border mt-auto"
    >
      <div className="p-4 bg-linear-to-br from-purple-500/5 to-pink-500/5 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <motion.div
            animate={{ rotate: currentBacklinks.length > 0 ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link size={12} className="text-purple-400" />
          </motion.div>
          <span className="uppercase tracking-wider font-semibold">Обратные связи</span>
          <span className="text-purple-400 text-[10px]">{currentBacklinks.length}</span>
        </div>
        
        <AnimatePresence mode="wait">
          {currentBacklinks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-gray-600"
            >
              <Sparkles size={12} />
              <span>Нет обратных ссылок</span>
            </motion.div>
          ) : (
            <motion.div className="space-y-3">
              {currentBacklinks.map((backlink, idx) => {
                const sourceNode = resolveWikilink(backlink.sourceName)
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group cursor-pointer rounded-lg p-2 hover:bg-white/5 transition-all"
                    onClick={() => sourceNode && openFile(sourceNode)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-1 rounded-full bg-purple-400" />
                      <span className="text-sm font-medium text-purple-400 group-hover:text-purple-300 transition-colors">
                        {backlink.sourceName}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[11px] leading-relaxed pl-3 border-l border-purple-500/30">
                      {backlink.context}
                    </p>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}