'use client'

import { useRef, useMemo, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, RefreshCw, X } from 'lucide-react'
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
  disabled?: boolean
  fullWidth?: boolean
}

export function CycleFilterDropdown({ cycles, value, onChange, disabled, fullWidth }: CycleFilterDropdownProps) {
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
                <span className="truncate">{selected ? selected.label : 'Cycle'}</span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {selected && !disabled && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange(undefined)
                    }}
                    className="hover:bg-current hover:bg-opacity-10 rounded p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3 opacity-70 hover:opacity-100" />
                  </div>
                )}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </div>
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-1" align="start" onOpenAutoFocus={(e) => e.preventDefault()} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div className="space-y-0.5">
            <button
              onClick={() => handleSelect(undefined)}
              className={cn(
                "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors",
                !value && "bg-accent"
              )}
            >
              <span className="truncate">All cycles</span>
              {!value && <Check className="w-3.5 h-3.5" />}
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
