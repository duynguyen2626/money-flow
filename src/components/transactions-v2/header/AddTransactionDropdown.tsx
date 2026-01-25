'use client'

import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Users, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddOption {
  type: string
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

const ADD_OPTIONS: AddOption[] = [
  {
    type: 'expense',
    label: 'Expense',
    icon: <ArrowDownLeft className="w-4 h-4" />,
    color: 'text-rose-700',
    bgColor: 'hover:bg-rose-50',
  },
  {
    type: 'income',
    label: 'Income',
    icon: <ArrowUpRight className="w-4 h-4" />,
    color: 'text-emerald-700',
    bgColor: 'hover:bg-emerald-50',
  },
  {
    type: 'transfer',
    label: 'Transfer',
    icon: <ArrowRightLeft className="w-4 h-4" />,
    color: 'text-blue-700',
    bgColor: 'hover:bg-blue-50',
  },
  {
    type: 'debt',
    label: 'Lend',
    icon: <Users className="w-4 h-4" />,
    color: 'text-amber-700',
    bgColor: 'hover:bg-amber-50',
  },
  {
    type: 'repayment',
    label: 'Repay',
    icon: <DollarSign className="w-4 h-4" />,
    color: 'text-indigo-700',
    bgColor: 'hover:bg-indigo-50',
  },
]

interface AddTransactionDropdownProps {
  onSelect: (type?: string) => void
}

export function AddTransactionDropdown({ onSelect }: AddTransactionDropdownProps) {
  const [open, setOpen] = useState(false)

  // Get recent types from localStorage
  const getRecentTypes = (): string[] => {
    try {
      const recent = localStorage.getItem('mf_recent_add_types')
      return recent ? JSON.parse(recent) : []
    } catch {
      return []
    }
  }

  const saveRecentType = (type: string) => {
    try {
      const recent = getRecentTypes()
      const filtered = recent.filter(t => t !== type)
      const newRecent = [type, ...filtered].slice(0, 3) // Keep last 3
      localStorage.setItem('mf_recent_add_types', JSON.stringify(newRecent))
    } catch (e) {
      console.error('Failed to save recent type', e)
    }
  }

  const handleSelect = (type: string) => {
    saveRecentType(type)
    onSelect(type)
    setOpen(false)
  }

  const recentTypes = getRecentTypes()
  const recentOptions = recentTypes
    .map(t => ADD_OPTIONS.find(opt => opt.type === t))
    .filter(Boolean) as AddOption[]

  const allOptions = ADD_OPTIONS.filter(
    opt => !recentTypes.includes(opt.type)
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className="h-9 gap-2 bg-primary hover:bg-primary/90 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[200px] p-1" 
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
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
                  key={option.type}
                  onClick={() => handleSelect(option.type)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm transition-colors",
                    option.bgColor,
                    option.color
                  )}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              ))}
              <div className="h-px bg-border my-1" />
            </>
          )}

          {/* All Options */}
          <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            New Transaction
          </div>
          {allOptions.map(option => (
            <button
              key={option.type}
              onClick={() => handleSelect(option.type)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm transition-colors",
                option.bgColor,
                option.color
              )}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
