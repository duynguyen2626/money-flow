'use client'

import * as React from 'react'
import { Check, ChevronDown, Lock, PlusIcon } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk'

const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ')

export type ComboboxItem = {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
  searchValue?: string
}

type ComboboxProps = {
  items: ComboboxItem[]
  value?: string
  onValueChange: (value: string | undefined) => void
  placeholder?: React.ReactNode
  inputPlaceholder?: string
  emptyState?: string
  disabled?: boolean
  className?: string
  onAddNew?: () => void
}

export function Combobox({
  items,
  value,
  onValueChange,
  placeholder = 'Select an item',
  inputPlaceholder = 'Search...',
  emptyState = 'No results found',
  disabled = false,
  className,
  onAddNew,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selectedItem = items.find(item => item.value === value)

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue || undefined)
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-slate-600 shadow-sm transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-0',
            open ? 'border-blue-500' : '',
            disabled ? 'bg-gray-100 text-slate-500 cursor-not-allowed' : '',
            className
          )}
          title={disabled ? 'This field is locked in Refund mode' : undefined}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2">
            {selectedItem?.icon && <span className="text-slate-500 flex-shrink-0">{selectedItem.icon}</span>}
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-slate-900">
                {selectedItem ? selectedItem.label : placeholder}
              </span>
              {selectedItem?.description && (
                <span className="text-[11px] text-slate-500">{selectedItem.description}</span>
              )}
            </span>
          </span>
          <span className="flex items-center gap-1">
            {disabled && <Lock className="h-4 w-4 text-slate-400" aria-hidden />}
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content
        align="start"
        sideOffset={4}
        className="z-50 w-[280px] rounded-xl border border-slate-200 bg-white p-0 shadow-lg"
      >
        <Command className="overflow-hidden rounded-xl">
          <CommandInput className="border-b border-slate-100 px-3 py-2 text-sm outline-none" placeholder={inputPlaceholder} />
          <CommandList className="max-h-72 overflow-y-auto">
            {items.length === 0 && (
              <CommandEmpty className="px-3 py-2 text-xs text-slate-500">{emptyState}</CommandEmpty>
            )}
            {items.map(item => {
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
          </CommandList>
          {onAddNew && (
            <div className="border-t border-slate-100 bg-slate-50 p-1">
              <div
                role="button"
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
                onClick={() => {
                  onAddNew()
                  setOpen(false)
                }}
              >
                <PlusIcon className="h-4 w-4" />
                <span className="font-medium">Thêm mới...</span>
              </div>
            </div>
          )}
        </Command>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}
