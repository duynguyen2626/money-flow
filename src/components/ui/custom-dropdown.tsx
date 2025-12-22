'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, Plus } from 'lucide-react'

export type DropdownOption = {
    value: string
    label: string
    disabled?: boolean
    icon?: string
    logo_url?: string
}

type CustomDropdownProps = {
    options: DropdownOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    searchable?: boolean
    allowCustom?: boolean
    onAddNew?: () => void
    addLabel?: string
}

export function CustomDropdown({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    className = '',
    disabled = false,
    searchable = true,
    allowCustom = false,
    onAddNew,
    addLabel = 'New Item'
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const selectedOption = options.find(opt => opt.value === value)

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            if (searchable) {
                setTimeout(() => {
                    searchInputRef.current?.focus()
                }, 50)
            }
        } else {
            setSearchTerm('')
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, searchable])

    const handleSelect = (optionValue: string) => {
        onChange(optionValue)
        setIsOpen(false)
    }

    const renderOptionIcon = (opt: DropdownOption) => {
        if (opt.logo_url) {
            return (
                <div className="h-4 w-4 shrink-0 overflow-hidden rounded bg-slate-50 flex items-center justify-center border border-slate-100 mr-2">
                    <img src={opt.logo_url} alt="" className="h-full w-full object-contain" />
                </div>
            )
        }
        if (opt.icon) {
            return <span className="mr-2 shrink-0">{opt.icon}</span>
        }
        return null
    }

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          w-full flex items-center justify-between
          px-3 py-2 text-sm
          bg-white border border-slate-200 rounded-md
          shadow-sm
          transition-all duration-200
          ${disabled
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
                    }
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : ''}
        `}
            >
                <div className="flex items-center truncate">
                    {selectedOption && renderOptionIcon(selectedOption)}
                    <span className={selectedOption ? 'text-slate-900 truncate' : 'text-slate-400 truncate'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden flex flex-col max-h-[350px]">
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                    placeholder="Search..."
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}
                    <div className="overflow-y-auto">
                        {allowCustom && onAddNew && (
                            <button
                                type="button"
                                onClick={() => {
                                    onAddNew()
                                    setIsOpen(false)
                                }}
                                className="w-full px-3 py-2.5 text-sm text-left text-blue-600 hover:bg-blue-600 hover:text-white bg-blue-50/50 border-b border-blue-100 font-semibold flex items-center gap-2 transition-all duration-200 sticky top-0 z-10"
                            >
                                <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-blue-100 text-blue-600">
                                    <Plus className="h-3.5 w-3.5" />
                                </div>
                                <span>
                                    {searchTerm.trim()
                                        ? `+ Create "${searchTerm.trim()}"`
                                        : '+ Create New Category'}
                                </span>
                            </button>
                        )}

                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => !option.disabled && handleSelect(option.value)}
                                disabled={option.disabled}
                                className={`
                w-full flex items-center justify-between
                px-3 py-2 text-sm text-left
                transition-colors duration-150
                ${option.disabled
                                        ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                    }
                ${option.value === value ? 'bg-blue-50 text-blue-700 font-medium' : ''}
              `}
                            >
                                <div className="flex items-center overflow-hidden">
                                    {renderOptionIcon(option)}
                                    <span className="truncate">{option.label}</span>
                                </div>
                                {option.value === value && (
                                    <Check className="h-4 w-4 shrink-0 text-blue-600" />
                                )}
                            </button>
                        ))}

                        {filteredOptions.length === 0 && (!allowCustom || !searchTerm.trim()) && (
                            <div className="px-3 py-8 text-sm text-slate-400 text-center italic flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 text-slate-200" />
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
