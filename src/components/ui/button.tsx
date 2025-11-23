
import * as React from 'react'
import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-500',
  destructive:
    'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500',
  outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
  secondary: 'bg-slate-50 text-slate-900 hover:bg-slate-100',
  ghost: 'bg-transparent text-slate-900 hover:bg-slate-100',
  link: 'text-blue-600 underline-offset-4 hover:underline',
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3 py-1 text-sm',
  lg: 'h-11 px-6 py-2',
  icon: 'h-10 w-10 p-0',
}

const ButtonComponent = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-semibold transition',
          variants[variant],
          sizes[size],
          className
        )}
        {...(asChild ? { ...props, ref: undefined } : { ...props, ref })}
      />
    )
  }
)
ButtonComponent.displayName = 'Button'

// Minimal tooltip trigger wrapper used by quick action buttons.
export function TooltipTrigger({ children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return <div {...props}>{children}</div>
}

export { ButtonComponent as Button }
