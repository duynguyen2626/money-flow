'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { formatVietnameseCurrencyText } from '@/lib/number-to-text'
import { cn } from '@/lib/utils'
import { Calculator, AlertCircle, X } from 'lucide-react'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

interface SmartAmountInputProps {
    value?: number
    onChange: (value: number | undefined) => void
    disabled?: boolean
    className?: string
    placeholder?: string
    error?: string
    label?: string
    unit?: string
    hideCurrencyText?: boolean
}

export function SmartAmountInput({
    value,
    onChange,
    disabled,
    className,
    placeholder = '0',
    error,
    label = 'Amount',
    unit,
    hideCurrencyText,
    hideLabel
}: SmartAmountInputProps & { hideLabel?: boolean }) {
    const [inputValue, setInputValue] = React.useState('')
    const [isFocused, setIsFocused] = React.useState(false)
    const [mathError, setMathError] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Sync internal string state with external number value
    React.useEffect(() => {
        if (!isFocused) {
            setInputValue(value ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) : '')
        }
    }, [value, isFocused])

    const evaluateMath = (expression: string): number | null => {
        try {
            // Allow only numbers and basic math operators
            if (!/^[0-9+\-*/().\s]+$/.test(expression)) return null;

             
            const result = new Function(`return ${expression}`)();

            if (!isFinite(result) || isNaN(result)) return null;
            if (result < 0) return null; // No negative amounts

            return result;
        } catch {
            return null;
        }
    }

    const handleBlur = () => {
        setIsFocused(false)
        setMathError(null)

        // Remove commas for evaluation
        const rawInput = inputValue.replace(/,/g, '')

        if (isSelectingSuggestion.current) {
            isSelectingSuggestion.current = false
            return
        }

        if (rawInput.trim() === '') {
            onChange(undefined)
            setInputValue('')
            return
        }

        // Check if it's a math expression
        if (/[+\-*/]/.test(rawInput)) {
            const result = evaluateMath(rawInput)
            if (result !== null) {
                onChange(result)
                setInputValue(new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(result))
            } else {
                setMathError('Invalid calculation')
                // Keep the input as is so user can fix it
            }
        } else {
            // Just a number
            const num = parseFloat(rawInput)
            if (!isNaN(num)) {
                onChange(num)
                setInputValue(new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num))
            } else {
                onChange(undefined)
                setInputValue('')
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            inputRef.current?.blur()
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        // Allow digits, commas, dots, and math operators
        if (!/^[0-9+\-*/().,\s]*$/.test(val)) return

        setMathError(null)

        const raw = val.replace(/,/g, '')

        // If it's a math expression, keep as is
        if (/[+\-*/]/.test(raw)) {
            setInputValue(val)
            return
        }

        // If it's a number, format it with commas
        if (raw && !isNaN(Number(raw))) {
            const num = parseFloat(raw)
            onChange(num)

            // Realtime formatting for integers
            if (!val.includes('.') && !val.includes('e')) {
                setInputValue(new Intl.NumberFormat('en-US').format(num))
            } else {
                setInputValue(val)
            }
        } else {
            setInputValue(val)
            if (raw === '') onChange(undefined)
        }
    }

    // Suggestions logic
    const suggestions = React.useMemo(() => {
        if (!isFocused) return []
        const raw = inputValue.replace(/,/g, '')
        if (!raw || isNaN(Number(raw)) || /[+\-*/]/.test(raw)) return []

        const num = parseInt(raw)
        if (num === 0) return []
        if (num > 1000000000) return [] // Too big

        return [
            num * 1000,
            num * 10000,
            num * 100000,
            num * 1000000
        ].filter(n => n < 100_000_000_000) // Cap at reasonable amount
    }, [inputValue, isFocused])

    const isSelectingSuggestion = React.useRef(false)

    const textParts = React.useMemo(() => {
        const currentVal = isFocused ? evaluateMath(inputValue.replace(/,/g, '')) : value
        if (hideCurrencyText) return []
        if (unit === '%') {
            return currentVal ? [{ value: new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(currentVal), unit: '%' }] : []
        }
        return formatVietnameseCurrencyText(currentVal ?? 0)
    }, [value, inputValue, isFocused, hideCurrencyText, unit])

    return (
        <div className="space-y-2">
            {!hideLabel && (
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        {label}
                        {mathError && <span className="text-xs text-red-500 font-normal flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {mathError}</span>}
                    </label>
                </div>
            )}

            <div className="relative group">
                <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={cn(
                        "text-sm pr-32 font-medium tracking-wide", // Removed h-11, will use parent className
                        mathError ? "border-red-300 focus-visible:ring-red-200" : "",
                        className // Apply parent className last so it can override
                    )}
                />

                {/* Result Badge inside Input - Hide when focused to prevent overlap */}
                {textParts.length > 0 && !/[+\-*/]/.test(inputValue) && !isFocused && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center bg-white pl-2 shadow-[-10px_0_10px_-5px_rgba(255,255,255,1)]">
                        {textParts.length > 2 ? (
                            <div className="pointer-events-auto">
                                <CustomTooltip content={textParts.map(p => `${p.value} ${p.unit}`).join(' ')}>
                                    <div className="text-xs text-right whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md border border-blue-100 flex items-center gap-1 cursor-help">
                                        {textParts.slice(0, 2).map((part, i) => (
                                            <React.Fragment key={i}>
                                                <span className="font-bold text-blue-600 max-w-[60px] truncate inline-block align-bottom">{part.value}</span>
                                                <span className="text-red-600 font-bold">{part.unit}</span>
                                            </React.Fragment>
                                        ))}
                                        <span className="text-slate-500 font-bold">...</span>
                                    </div>
                                </CustomTooltip>
                            </div>
                        ) : (
                            <div className="text-xs text-right whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md border border-blue-100 flex items-center gap-1">
                                {textParts.map((part, i) => (
                                    <React.Fragment key={i}>
                                        <span className="font-bold text-blue-600">{part.value}</span>
                                        <span className="text-red-600 font-bold">{part.unit}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {(isFocused || /[+\-*/]/.test(inputValue)) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Calculator className="h-4 w-4" />
                    </div>
                )}

                {/* Suggestions Dropdown */}
                {isFocused && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-slate-200 overflow-hidden">
                        {suggestions.map(s => (
                            <button
                                key={s}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between items-center"
                                onMouseDown={(e) => {
                                    e.preventDefault() // Prevent focus loss immediately
                                    isSelectingSuggestion.current = true
                                    onChange(s)
                                    setInputValue(new Intl.NumberFormat('en-US').format(s))
                                    setIsFocused(false)
                                    inputRef.current?.blur()
                                }}
                            >
                                <span className="font-medium text-slate-700">{new Intl.NumberFormat('en-US').format(s)}</span>
                            </button>
                        ))}
                    </div>
                )}
                {/* Clear Button */}
                {inputValue && !disabled && isFocused && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setInputValue('');
                            onChange(undefined);
                            setIsFocused(true);
                            inputRef.current?.focus();
                        }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 z-10"
                        tabIndex={-1}
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    )
}
