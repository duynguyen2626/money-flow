'use client'

import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, CheckCircle2, Clock, XCircle } from 'lucide-react'
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
}

export function StatusDropdown({ value, onChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false)

  const currentOption = STATUS_OPTIONS.find(opt => opt.value === value) || STATUS_OPTIONS[0]

  const handleSelect = (status: StatusFilter) => {
    onChange(status)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 min-w-[110px] justify-between font-medium",
            currentOption.color
          )}
        >
          <div className="flex items-center gap-1.5">
            {currentOption.icon}
            <span>{currentOption.label}</span>
          </div>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[160px] p-1" 
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
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
