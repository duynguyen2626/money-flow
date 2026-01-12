'use client'

import * as React from 'react'
import { Check, ChevronDown, Lock, Plus, Eye } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, CommandGroup } from 'cmdk'

const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ')

export type ComboboxItem = {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
  searchValue?: string
}

export type ComboboxGroup = {
  label: string
  items: ComboboxItem[]
}

type ComboboxProps = {
  items?: ComboboxItem[]
  groups?: ComboboxGroup[]
  value?: string
  onValueChange: (value: string | undefined) => void
  placeholder?: React.ReactNode
  inputPlaceholder?: string
  emptyState?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  onAddNew?: () => void
  addLabel?: string
  onDetailClick?: () => void
  tabs?: {
    value: string
    label: string
    onClick: () => void
    active: boolean
  }[]
  onSearchChange?: (value: string) => void
}

export function Combobox({
  items,
  groups,
  value,
  onValueChange,
  placeholder = 'Select an item',
  inputPlaceholder = 'Search...',
  emptyState = 'No results found',
  disabled = false,
  className,
  triggerClassName,
  onAddNew,
  addLabel,
  onDetailClick,
  tabs,
  onSearchChange,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const flatItems = React.useMemo(
    () => items ?? groups?.flatMap(group => group.items) ?? [],
    [items, groups]
  )
  const selectedItem = flatItems.find(item => item.value === value)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
          triggerClassName
        )}
      >
        <span className="block truncate text-gray-500">{placeholder}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue || undefined)
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <div className="relative w-full">
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-slate-600 shadow-sm transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-0',
              open ? 'border-blue-500' : '',
              disabled ? 'bg-gray-100 text-slate-500 cursor-not-allowed' : '',
              className,
              triggerClassName
            )}
            title={disabled ? 'This field is locked in Refund mode' : undefined}
            aria-expanded={open}
          >
            <span className="flex items-center gap-2 min-w-0 flex-1">
              {selectedItem?.icon && <span className="text-slate-500 flex-shrink-0">{selectedItem.icon}</span>}
              <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-900 truncate">
                  {selectedItem ? selectedItem.label : placeholder}
                </span>
                {selectedItem?.description && (
                  <span className="text-[11px] text-slate-500 truncate">{selectedItem.description}</span>
                )}
              </span>
            </span>
            <span className="flex items-center gap-1 flex-shrink-0 ml-2">
              {disabled && <Lock className="h-4 w-4 text-slate-400" aria-hidden />}
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </span>
          </button>

          {onDetailClick && selectedItem && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDetailClick()
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors z-10"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-[100] w-[320px] rounded-xl border border-slate-200 bg-white p-0 shadow-lg"
        >
          <Command className="overflow-hidden rounded-xl">
            {onAddNew && (
              <div
                onClick={() => {
                  onAddNew()
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-50 border-b border-slate-200 bg-white"
              >
                <Plus className="h-4 w-4" />
                <span>{`+ Create ${addLabel || 'Item'}`}</span>
              </div>
            )}
            <CommandInput
              className="border-b border-slate-100 px-3 py-2 text-sm outline-none"
              placeholder={inputPlaceholder}
              onValueChange={(val) => {
                if (onSearchChange) {
                  onSearchChange(val)
                }
              }}
            />
            {tabs && tabs.length > 0 && (
              <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50">
                {tabs.map(tab => (
                  <button
                    key={tab.value}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      tab.onClick()
                    }}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                      tab.active
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            <CommandList className="max-h-72 overflow-y-auto">
              <CommandEmpty className="px-3 py-2 text-xs text-slate-500">{emptyState}</CommandEmpty>
              {groups && groups.length > 0 ? (
                groups.filter(group => group.items.length > 0).map(group => (
                  <CommandGroup key={group.label} heading={group.label} className="px-1 py-1 text-xs text-slate-500">
                    {group.items.map(item => {
                      const isSelected = item.value === value
                      const searchableValue = item.searchValue ?? item.label
                      return (
                        <CommandItem
                          key={item.value}
                          value={searchableValue}
                          onSelect={() => handleSelect(item.value)}
                          className="flex items-center justify-between px-3 py-2 text-sm transition hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2">
                            {item.icon && <span className="text-slate-500">{item.icon}</span>}
                            <div className="flex flex-col">
                              <span className="text-slate-900">{item.label}</span>
                              {item.description && (
                                <span className="text-[11px] text-slate-500">{item.description}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                ))
              ) : (
                (items ?? []).map(item => {
                  const isSelected = item.value === value
                  const searchableValue = item.searchValue ?? item.label
                  return (
                    <CommandItem
                      key={item.value}
                      value={searchableValue}
                      onSelect={() => handleSelect(item.value)}
                      className="flex items-center justify-between px-3 py-2 text-sm transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        {item.icon && <span className="text-slate-500">{item.icon}</span>}
                        <div className="flex flex-col">
                          <span className="text-slate-900">{item.label}</span>
                          {item.description && (
                            <span className="text-[11px] text-slate-500">{item.description}</span>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                    </CommandItem>
                  )
                })
              )}
            </CommandList>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
