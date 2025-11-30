'use client'

import { useState, useMemo, InputHTMLAttributes } from 'react'

type NumberInputWithSuggestionsProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
    value: string
    onChange: (value: string) => void
    step?: number // Bước nhảy (default: 1000)
    maxSuggestions?: number // Số lượng suggestions (default: 3)
}

export function NumberInputWithSuggestions({
    value,
    onChange,
    placeholder = '0',
    className = '',
    step = 1000,
    maxSuggestions = 3,
    ...props
}: NumberInputWithSuggestionsProps) {
    const [isFocused, setIsFocused] = useState(false)

    // Parse current value
    const numericValue = useMemo(() => {
        const cleaned = value.replace(/[^0-9]/g, '')
        return cleaned ? parseInt(cleaned, 10) : 0
    }, [value])

    // Generate suggestions
    const suggestions = useMemo(() => {
        if (!isFocused || numericValue === 0) return []

        const results: number[] = []
        const baseDigit = parseInt(value.replace(/[^0-9]/g, '')[0] || '1', 10)

        // Generate suggestions based on first digit
        for (let i = 0; i < maxSuggestions; i++) {
            const multiplier = Math.pow(10, i)
            const suggestion = baseDigit * step * multiplier
            if (suggestion !== numericValue) {
                results.push(suggestion)
            }
        }

        return results.slice(0, maxSuggestions)
    }, [value, numericValue, isFocused, step, maxSuggestions])

    const formatNumber = (num: number) => {
        return num.toLocaleString('en-US')
    }

    const handleSuggestionClick = (suggestion: number) => {
        onChange(formatNumber(suggestion))
        setIsFocused(false)
    }

    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    const input = e.target.value
                    const cleaned = input.replace(/[^0-9]/g, '')
                    if (cleaned) {
                        onChange(formatNumber(parseInt(cleaned, 10)))
                    } else {
                        onChange('')
                    }
                }}
                onFocus={(e) => {
                    setIsFocused(true)
                    props.onFocus?.(e)
                }}
                onBlur={(e) => {
                    // Delay to allow click on suggestions
                    setTimeout(() => setIsFocused(false), 200)
                    props.onBlur?.(e)
                }}
                placeholder={placeholder}
                className={`
          w-full px-3 py-2 text-sm
          bg-white border border-slate-200 rounded-md
          shadow-sm
          transition-all duration-200
          hover:border-blue-300
          focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200
          disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400
          ${className}
        `}
                {...props}
            />

            {/* Suggestions */}
            {isFocused && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                        <span className="text-xs font-medium text-slate-500">Quick suggestions</span>
                    </div>
                    <div className="py-1">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault() // Prevent blur
                                    handleSuggestionClick(suggestion)
                                }}
                                className="
                  w-full px-3 py-2 text-sm text-left
                  text-slate-700 hover:bg-blue-50 hover:text-blue-700
                  transition-colors duration-150
                  font-medium
                "
                            >
                                {formatNumber(suggestion)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
