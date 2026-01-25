'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, TrendingUp, TrendingDown, ArrowLeftRight, Users, PiggyBank, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'

interface TypeOption {
  value: FilterType
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'all', label: 'All', color: 'text-slate-700', bgColor: 'hover:bg-slate-50', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { value: 'income', label: 'Income', color: 'text-emerald-700', bgColor: 'hover:bg-emerald-50', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { value: 'expense', label: 'Expense', color: 'text-rose-700', bgColor: 'hover:bg-rose-50', icon: <TrendingDown className="w-3.5 h-3.5" /> },
  { value: 'lend', label: 'Lend', color: 'text-amber-700', bgColor: 'hover:bg-amber-50', icon: <Users className="w-3.5 h-3.5" /> },
  { value: 'repay', label: 'Repay', color: 'text-indigo-700', bgColor: 'hover:bg-indigo-50', icon: <PiggyBank className="w-3.5 h-3.5" /> },
  { value: 'transfer', label: 'Transfer', color: 'text-blue-700', bgColor: 'hover:bg-blue-50', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { value: 'cashback', label: 'Cashback', color: 'text-green-700', bgColor: 'hover:bg-green-50', icon: <Sparkles className="w-3.5 h-3.5" /> },
]

interface TypeFilterDropdownProps {
  value: FilterType
  onChange: (value: FilterType) => void
  fullWidth?: boolean
}

export function TypeFilterDropdown({ value, onChange, fullWidth }: TypeFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const closeTimeout = useRef<NodeJS.Timeout | null>(null)
  
  const currentOption = TYPE_OPTIONS.find(opt => opt.value === value) || TYPE_OPTIONS[0]

  // Get recent items from localStorage
  const getRecentTypes = (): FilterType[] => {
    try {
      const recent = localStorage.getItem('mf_recent_filter_types')
      return recent ? JSON.parse(recent) : []
    } catch {
      return []
    }
  }

  const saveRecentType = (type: FilterType) => {
    try {
      const recent = getRecentTypes()
      const filtered = recent.filter(t => t !== type)
      const newRecent = [type, ...filtered].slice(0, 3) // Keep last 3
      localStorage.setItem('mf_recent_filter_types', JSON.stringify(newRecent))
    } catch (e) {
      console.error('Failed to save recent type', e)
    }
  }

  const handleSelect = (type: FilterType) => {
    onChange(type)
    saveRecentType(type)
    setOpen(false)
  }

  const handleMouseEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 120)
  }

  const recentTypes = getRecentTypes()
  const recentOptions = recentTypes
    .map(t => TYPE_OPTIONS.find(opt => opt.value === t))
    .filter(Boolean) as TypeOption[]

  const allOptions = TYPE_OPTIONS.filter(
    opt => !recentTypes.includes(opt.value)
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 justify-between font-medium",
            fullWidth ? 'w-full h-10' : 'w-[120px] h-9',
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
            {value !== 'all' && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('all')
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
        className="w-[180px] p-1" 
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="space-y-0.5">
          {/* Recent Section */}
          {recentOptions.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Recent
              </div>
              {recentOptions.map(option => (
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
                  <div className="flex items-center gap-2 truncate">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {value === option.value && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
              <div className="h-px bg-border my-1" />
            </>
          )}

          {/* All Options */}
          {allOptions.map(option => (
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
              <div className="flex items-center gap-2 truncate">
                {option.icon}
                <span className="truncate">{option.label}</span>
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
