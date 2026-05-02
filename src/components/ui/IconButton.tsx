import { Button } from "./Button"
import { cn } from "../../lib/utils"

interface IconButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  label: string
  active?: boolean
}

export const IconButton = ({ icon, onClick, label, active }: IconButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(active && "bg-purple-600/20 text-purple-400")}
      title={label}
    >
      {icon}
    </Button>
  )
}