'use client'

import React, { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'

interface SidebarSearchProps {
  onSearchChange: (query: string) => void
  placeholder?: string
  isCollapsed?: boolean
}

export function SidebarSearch({ 
  onSearchChange, 
  placeholder = 'Search items...',
  isCollapsed = false 
}: SidebarSearchProps) {
  const [searchValue, setSearchValue] = React.useState('')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    onSearchChange(value)
  }, [onSearchChange])

  const handleClear = useCallback(() => {
    setSearchValue('')
    onSearchChange('')
  }, [onSearchChange])

  if (isCollapsed) {
    return null
  }

  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchValue}
        onChange={handleChange}
        className={cn(
          "w-full h-9 rounded-md border border-slate-200 bg-white pl-9 pr-8 text-xs placeholder:text-slate-400",
          "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200",
          "transition-colors duration-200"
        )}
      />
      {searchValue && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
          title="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
