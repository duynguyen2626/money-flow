'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ')

export type SelectItem = {
  value: string
  label: string
}

type SelectProps = {
  items: SelectItem[]
  value?: string
  onValueChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Select({
  items,
  value,
  onValueChange,
  placeholder = 'Select an item',
  disabled = false,
  className,
}: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const selectedItem = items.find(item => item.value === value)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-slate-600 shadow-sm transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-0',
          className
        )}
      >
        <span className="text-sm font-medium text-slate-900">
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
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
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-slate-600 shadow-sm transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-0',
            open ? 'border-blue-500' : '',
            className
          )}
          aria-expanded={open}
        >
          <span className="text-sm font-medium text-slate-900">
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content
        align="start"
        sideOffset={4}
        className="z-50 w-[280px] rounded-xl border border-slate-200 bg-white p-0 shadow-lg"
      >
        <div className="max-h-72 overflow-y-auto">
          {items.map(item => {
            const isSelected = item.value === value
            return (
              <div
                key={item.value}
                onClick={() => handleSelect(item.value)}
                className="flex items-center justify-between px-3 py-2 text-sm transition hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-900">{item.label}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-blue-600" />}
              </div>
            )
          })}
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}
