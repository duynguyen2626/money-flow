'use client'

import { useRef, useMemo, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, RotateCcw, RefreshCw, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CycleOption {
  label: string
  value: string
}

interface CycleFilterDropdownProps {
  cycles: CycleOption[]
  value?: string
  onChange: (value?: string) => void
  onReset?: () => void
  disabled?: boolean
  fullWidth?: boolean
}

export function CycleFilterDropdown(props: CycleFilterDropdownProps) {
  const { cycles, value, onChange, onReset, disabled, fullWidth } = props
  const [open, setOpen] = useState(false)
  const closeTimeout = useRef<NodeJS.Timeout | null>(null)

  const options = useMemo(() => cycles, [cycles])
  const selected = options.find(o => o.value === value)

  const handleSelect = (val?: string) => {
    onChange(val)
    setOpen(false)
  }

  const tooltip = disabled ? 'Please select an account first' : undefined

  const handleMouseEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <Tooltip>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn(
                "justify-between gap-2 font-medium",
                fullWidth ? 'w-full h-10' : 'w-[180px] h-9',
                !selected && "text-muted-foreground"
              )}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center gap-1.5 truncate">
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{value === 'all' ? 'All Cycles' : (selected ? selected.label : 'Cycle')}</span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {value && !disabled && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          if (props.onReset) props.onReset()
                          else props.onChange(undefined)
                        }}
                        className="hover:bg-slate-100 rounded p-1 transition-colors cursor-pointer group/reset"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400 group-hover/reset:text-indigo-600 transition-colors" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">Reset to current cycle</TooltipContent>
                  </Tooltip>
                )}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </div>
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-1" align="start" onOpenAutoFocus={(e) => e.preventDefault()} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div className="space-y-0.5">
            <button
              onClick={() => handleSelect('all')}
              className={cn(
                "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors",
                value === 'all' && "bg-accent"
              )}
            >
              <span className="truncate">All cycles</span>
              {value === 'all' && <Check className="w-3.5 h-3.5" />}
            </button>
            <div className="h-px bg-border my-1" />
            {options.length === 0 && (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">No cycles</div>
            )}
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors",
                  value === opt.value && "bg-accent"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
  )
}
