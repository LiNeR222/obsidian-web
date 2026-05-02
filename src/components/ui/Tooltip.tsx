import { useState } from "react"
import { cn } from "../../lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
}

export const Tooltip = ({ children, content }: TooltipProps) => {
  const [show, setShow] = useState(false)

  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-xs text-white rounded whitespace-nowrap z-50">
          {content}
        </div>
      )}
    </div>
  )
}