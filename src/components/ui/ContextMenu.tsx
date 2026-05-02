import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

interface ContextMenuProps {
  x: number
  y: number
  items: {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    danger?: boolean
  }[]
  onClose: () => void
}

export const ContextMenu = ({ x, y, items, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('contextmenu', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl py-1 animate-fade-in"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick()
            onClose()
          }}
          className={cn(
            "w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-white/10 transition-colors",
            item.danger && "text-red-400 hover:bg-red-500/10"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  )
}