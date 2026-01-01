'use client'

import { useState, useMemo, InputHTMLAttributes } from 'react'
import { formatShortVietnameseCurrency } from '@/lib/number-to-text'

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

    // Parse current value and evaluate arithmetic if needed
    const numericValue = useMemo(() => {
        const cleaned = value.replace(/,/g, '')
        try {
            // Basic arithmetic evaluation (+-*/)
            // Only evaluate if it contains operators
            if (/[+\-*/]/.test(cleaned)) {
                // Safety check: only allow digits, dots, and operators
                if (/^[0-9.+\-*/() ]+$/.test(cleaned)) {
                    // eslint-disable-next-line no-eval
                    const result = eval(cleaned)
                    return typeof result === 'number' && isFinite(result) ? Math.round(result) : 0
                }
            }
            const digits = cleaned.replace(/[^0-9.]/g, '')
            return digits ? parseFloat(digits) : 0
        } catch (e) {
            return 0
        }
    }, [value])

    // Human readable label (e.g., 150 tr)
    const humanLabel = useMemo(() => {
        if (!numericValue || numericValue === 0) return null
        return formatShortVietnameseCurrency(numericValue)
    }, [numericValue])

    // Generate suggestions
    const suggestions = useMemo(() => {
        if (!isFocused || numericValue === 0) return []

        const results: number[] = []

        // Special logic: if value is small (< 10), provide a wider range of magnitude suggestions
        if (numericValue < 100) {
            // Suggest x1,000 (Thousands)
            results.push(numericValue * 1000)
            // Suggest x10,000 (Ten thousands)
            results.push(numericValue * 10000)
            // Suggest x100,000 (Hundred thousands)
            results.push(numericValue * 100000)

            // Should success step be considered? If step is 1M, we definitely want Millions
            if (step >= 1000000) {
                results.push(numericValue * 1000000)
                results.push(numericValue * 10000000)
                results.push(numericValue * 100000000)
            }
        } else {
            // Standard multiplier logic
            for (let i = 0; i < maxSuggestions; i++) {
                const multiplier = Math.pow(10, i)
                const suggestion = numericValue * step * multiplier
                if (suggestion !== numericValue && suggestion > 0) {
                    results.push(suggestion)
                }
            }
        }

        // Filter out the raw numericValue if it's already in the suggestions
        // Also ensure we don't return 0
        const filteredResults = results.filter(s => s !== numericValue && s > 0)

        // If no suggestions, maybe user wants something?
        // But usually we just return empty.

        return [...new Set(filteredResults)].slice(0, 5) // Increase limit to 5
    }, [numericValue, isFocused, step])

    const formatNumber = (num: number) => {
        return num.toLocaleString('en-US')
    }

    const handleSuggestionClick = (suggestion: number) => {
        onChange(formatNumber(suggestion))
        setIsFocused(false)
    }

    const evaluateExpression = () => {
        if (numericValue !== 0) {
            onChange(formatNumber(numericValue))
        }
    }

    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    const input = e.target.value
                    // Allow digits, operators and dots for arithmetic
                    if (/^[0-9.+\-*/(), ]*$/.test(input)) {
                        onChange(input)
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        evaluateExpression()
                    }
                }}
                onFocus={(e) => {
                    setIsFocused(true)
                    props.onFocus?.(e)
                }}
                onBlur={(e) => {
                    // Delay to allow click on suggestions
                    setTimeout(() => {
                        setIsFocused(false)
                        evaluateExpression()
                    }, 200)
                    props.onBlur?.(e)
                }}
                placeholder={placeholder}
                className={`
          w-full px-3 py-2 text-sm pr-24
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

            {/* Human readable label */}
            {humanLabel && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm border border-blue-100 animate-in fade-in zoom-in-50 pointer-events-none">
                    {humanLabel}
                </div>
            )}

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
