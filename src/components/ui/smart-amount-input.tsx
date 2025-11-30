'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { formatVietnameseCurrencyText } from '@/lib/number-to-text'
import { cn } from '@/lib/utils'
import { Calculator, AlertCircle } from 'lucide-react'

interface SmartAmountInputProps {
    value?: number
    onChange: (value: number | undefined) => void
    disabled?: boolean
    className?: string
    placeholder?: string
    error?: string
    label?: string
}

export function SmartAmountInput({
    value,
    onChange,
    disabled,
    className,
    placeholder = '0',
    error,
    label = 'Amount'
}: SmartAmountInputProps) {
    const [inputValue, setInputValue] = React.useState('')
    const [isFocused, setIsFocused] = React.useState(false)
    const [mathError, setMathError] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Sync internal string state with external number value
    React.useEffect(() => {
        if (!isFocused) {
            setInputValue(value ? new Intl.NumberFormat('en-US').format(value) : '')
        }
    }, [value, isFocused])

    const evaluateMath = (expression: string): number | null => {
        try {
            // Allow only numbers and basic math operators
            if (!/^[0-9+\-*/().\s]+$/.test(expression)) return null;

            // eslint-disable-next-line no-new-func
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

        if (!rawInput) {
            onChange(undefined)
            return
        }

        // Check if it's a math expression
        if (/[+\-*/]/.test(rawInput)) {
            const result = evaluateMath(rawInput)
            if (result !== null) {
                onChange(result)
                setInputValue(new Intl.NumberFormat('en-US').format(result))
            } else {
                setMathError('Invalid calculation')
                // Keep the input as is so user can fix it
            }
        } else {
            // Just a number
            const num = parseFloat(rawInput)
            if (!isNaN(num)) {
                onChange(num)
                setInputValue(new Intl.NumberFormat('en-US').format(num))
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
        setInputValue(val)
        setMathError(null)

        // If it's a simple number being typed, we can update the parent immediately
        // but if it looks like math, we wait for blur/enter
        const raw = val.replace(/,/g, '')
        if (!/[+\-*/]/.test(raw)) {
            const num = parseFloat(raw)
            if (!isNaN(num)) {
                // Don't update parent yet if we want to support typing "22" and suggesting "22000"
                // Actually, for immediate feedback, we might want to update.
                // But the requirement says "suggestions".
            }
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

    const textParts = React.useMemo(() => {
        const currentVal = isFocused ? evaluateMath(inputValue.replace(/,/g, '')) : value
        return formatVietnameseCurrencyText(currentVal ?? 0)
    }, [value, inputValue, isFocused])

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    {label}
                    {mathError && <span className="text-xs text-red-500 font-normal flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {mathError}</span>}
                </label>
                {textParts.length > 0 && (
                    <div className="text-xs text-right">
                        {textParts.map((part, i) => (
                            <React.Fragment key={i}>
                                <span className="font-bold text-blue-600">{part.value}</span>
                                <span className="text-red-600 ml-0.5 mr-1">{part.unit}</span>
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative">
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
                        "h-11 font-mono text-lg",
                        mathError ? "border-red-300 focus-visible:ring-red-200" : ""
                    )}
                />
                {/[+\-*/]/.test(inputValue) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                                    e.preventDefault() // Prevent blur
                                    onChange(s)
                                    setInputValue(new Intl.NumberFormat('en-US').format(s))
                                    setIsFocused(false)
                                    inputRef.current?.blur()
                                }}
                            >
                                <span className="font-medium text-slate-700">{new Intl.NumberFormat('en-US').format(s)}</span>
                                <span className="text-xs text-slate-400">
                                    {formatVietnameseCurrencyText(s).map(p => `${p.value} ${p.unit}`).join(' ')}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    )
}
