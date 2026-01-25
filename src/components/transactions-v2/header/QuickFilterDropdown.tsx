'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, ChevronDown, Search, Users, Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickFilterItem {
  id: string
  name: string
  image?: string | null
  icon?: 'person' | 'account'
}

interface QuickFilterDropdownProps {
  items: QuickFilterItem[]
  value?: string
  onValueChange: (id: string | undefined) => void
  placeholder: string
  emptyText: string
}

export function QuickFilterDropdown({
  items,
  value,
  onValueChange,
  placeholder,
  emptyText,
}: QuickFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const closeTimeout = useRef<NodeJS.Timeout | null>(null)

  const selectedItem = items.find(item => item.id === value)

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items
    const query = searchQuery.toLowerCase()
    return items.filter(item => item.name.toLowerCase().includes(query))
  }, [items, searchQuery])

  const handleSelect = (id: string | undefined) => {
    onValueChange(id)
    setOpen(false)
    setSearchQuery('')
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
            "h-9 gap-2 min-w-[130px] justify-between font-medium",
            !value && "text-muted-foreground"
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {selectedItem ? (
            <div className="flex items-center gap-2">
              {selectedItem.icon === 'person' && <Users className="w-3.5 h-3.5" />}
              {selectedItem.icon === 'account' && <Landmark className="w-3.5 h-3.5" />}
              {selectedItem.image && (
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="w-4 h-4 rounded-none object-contain bg-white"
                />
              )}
              <span className="truncate">{selectedItem.name}</span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[240px] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-2 py-2 border-b">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 border-0 bg-transparent px-0 focus-visible:ring-0"
          />
        </div>

        {/* Options */}
        <div className="max-h-[300px] overflow-y-auto p-1">
          {/* Clear Selection */}
          {value && (
            <>
              <button
                onClick={() => handleSelect(undefined)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors"
              >
                <span className="text-muted-foreground">Clear filter</span>
              </button>
              <div className="h-px bg-border my-1" />
            </>
          )}

          {/* Items */}
          {filteredItems.length > 0 ? (
            <div className="space-y-0.5">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors",
                    value === item.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                      {item.icon === 'person' && <Users className="w-3.5 h-3.5" />}
                      {item.icon === 'account' && <Landmark className="w-3.5 h-3.5" />}
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-5 h-5 rounded-none object-contain bg-white"
                      />
                    )}
                      <span className="truncate">{item.name}</span>
                  </div>
                  {value === item.id && (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
