import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useFileStore } from '../store/useFileStore'

interface WikilinkProps {
  link: string
  children?: React.ReactNode
}

export const Wikilink = ({ link, children }: WikilinkProps) => {
  const { resolveWikilink, openFile } = useFileStore()
  const targetNode = resolveWikilink(link)
  
  if (!targetNode) {
    return (
      <span className="text-red-400/50 line-through cursor-not-allowed" title="Заметка не найдена">
        {children || link}
      </span>
    )
  }
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => openFile(targetNode)}
      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-all duration-200 group"
    >
      <span className="underline decoration-purple-400/30 group-hover:decoration-purple-400 underline-offset-4">
        {children || link}
      </span>
      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
    </motion.button>
  )
}