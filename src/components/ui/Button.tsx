import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'neon'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25',
      ghost: 'hover:bg-white/10 text-gray-300',
      outline: 'border border-white/20 hover:bg-white/10 text-gray-300',
      neon: 'bg-transparent border border-purple-500 text-purple-400 hover:shadow-neon transition-shadow duration-300',
    }
    
    const sizes = {
      sm: 'px-2 py-1 text-xs rounded-md',
      md: 'px-3 py-1.5 text-sm rounded-lg',
      lg: 'px-4 py-2 text-base rounded-lg',
      icon: 'p-1.5 rounded-lg',
    }
    
    return (
      <button
        ref={ref}
        className={cn(variants[variant], sizes[size], "transition-all duration-200 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed", className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"