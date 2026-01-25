'use client'

import { useState, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, CheckCircle2, Clock, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusFilter = 'active' | 'void' | 'pending'

interface StatusOption {
  value: StatusFilter
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'active',
    label: 'Active',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: 'text-emerald-700',
    bgColor: 'hover:bg-emerald-50',
  },
  {
    value: 'pending',
    label: 'Pending',
    icon: <Clock className="w-3.5 h-3.5" />,
    color: 'text-amber-700',
    bgColor: 'hover:bg-amber-50',
  },
  {
    value: 'void',
    label: 'Void',
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: 'text-slate-600',
    bgColor: 'hover:bg-slate-50',
  },
]

interface StatusDropdownProps {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
  fullWidth?: boolean
}

export function StatusDropdown({ value, onChange, fullWidth }: StatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const closeTimeout = useRef<NodeJS.Timeout | null>(null)

  const currentOption = STATUS_OPTIONS.find(opt => opt.value === value) || STATUS_OPTIONS[0]

  const handleSelect = (status: StatusFilter) => {
    onChange(status)
    setOpen(false)
  }

  const handleMouseEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 justify-between font-medium",
            fullWidth ? 'w-full h-10' : 'w-[130px] h-9',
            currentOption.color
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-1.5 truncate">
            {currentOption.icon}
            <span className="truncate">{currentOption.label}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {value !== 'active' && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('active')
                }}
                className="hover:bg-current hover:bg-opacity-10 rounded p-0.5 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3 opacity-70 hover:opacity-100" />
              </div>
            )}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[160px] p-1" 
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="space-y-0.5">
          {STATUS_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm transition-colors",
                option.bgColor,
                option.color,
                value === option.value && "bg-accent"
              )}
            >
              <div className="flex items-center gap-1.5">
                {option.icon}
                <span>{option.label}</span>
              </div>
              {value === option.value && (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
