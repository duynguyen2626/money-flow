'use client'

import { useMemo, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, RefreshCw } from 'lucide-react'
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
}

export function CycleFilterDropdown({ cycles, value, onChange, disabled }: CycleFilterDropdownProps) {
  const [open, setOpen] = useState(false)

  const options = useMemo(() => cycles, [cycles])
  const selected = options.find(o => o.value === value)

  const handleSelect = (val?: string) => {
    onChange(val)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-9 min-w-[140px] justify-between gap-2 font-medium",
            !selected && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="truncate">{selected ? selected.label : 'Cycle'}</span>
          </div>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-1" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
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
  )
}
