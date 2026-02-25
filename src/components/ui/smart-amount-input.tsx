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
    hideLabel?: boolean
    hideCalculator?: boolean
    compact?: boolean
    hideClearButton?: boolean
    /** Allow decimal values (e.g. for % rates like 1.5%). Skips Math.round on change & blur. */
    allowDecimal?: boolean
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
    hideLabel,
    hideCalculator,
    compact,
    hideClearButton,
    allowDecimal = false,
}: SmartAmountInputProps) {
    const [inputValue, setInputValue] = React.useState('')
    const [isFocused, setIsFocused] = React.useState(false)
    const [mathError, setMathError] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const isSelectingSuggestion = React.useRef(false)

    // Sync internal string state with external number value
    React.useEffect(() => {
        if (!isFocused) {
            if (value === undefined || value === null) {
                setInputValue('')
            } else if (allowDecimal) {
                // Show up to 2 decimal places for rate fields, strip trailing zeros
                setInputValue(value === 0 ? '0' : String(parseFloat(value.toFixed(2))))
            } else {
                setInputValue(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value)))
            }
        }
    }, [value, isFocused, allowDecimal])

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
            if (result !== null && !isNaN(result)) {
                if (allowDecimal) {
                    const val = parseFloat(result.toFixed(2))
                    onChange(val)
                    setInputValue(String(val))
                } else {
                    const rounded = Math.round(result);
                    onChange(rounded)
                    setInputValue(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(rounded))
                }
            } else {
                setMathError('Invalid calculation')
            }
        } else {
            // Just a number
            const num = parseFloat(rawInput)
            if (!isNaN(num)) {
                if (allowDecimal) {
                    const val = parseFloat(num.toFixed(2))
                    onChange(val)
                    setInputValue(String(val))
                } else {
                    const rounded = Math.round(num);
                    onChange(rounded)
                    setInputValue(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(rounded))
                }
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

        // Strict allow list: numbers, math operators
        if (!/^[0-9+\-*/().,\s]*$/.test(val)) return

        setMathError(null)

        const raw = val.replace(/,/g, '')

        // If it's a math expression, format numbers within it
        if (/[+\-*/]/.test(raw)) {
            // Split by operators including parentheses
            const parts = raw.split(/([+\-*/()])/);
            const formatted = parts.map(part => {
                if (/^[0-9.]+$/.test(part)) {
                    const [integer, decimal] = part.split('.');
                    if (integer !== undefined) {
                        const fmtInt = integer ? new Intl.NumberFormat('en-US').format(Number(integer)) : '';
                        if (decimal !== undefined) {
                            return `${fmtInt}.${decimal}`;
                        }
                        return fmtInt;
                    }
                }
                return part;
            }).join('');

            setInputValue(formatted);
            return;
        }

        if (unit === '%' && !isNaN(Number(raw)) && Number(raw) > 100) {
            setInputValue('100');
            onChange(100);
            return;
        }

        // If it's a number, format it with commas
        if (raw && !isNaN(Number(raw))) {
            const num = parseFloat(raw)

            if (allowDecimal) {
                // For decimal mode: emit value as-is while typing, keep raw display
                // Only emit if not currently typing a decimal (e.g. "1." or "1.0")
                if (!val.endsWith('.') && !val.endsWith('.0')) {
                    onChange(parseFloat(num.toFixed(2)))
                }
                setInputValue(val)
            } else {
                onChange(Math.round(num))
                // Realtime formatting for integers
                if (!val.includes('.') && !val.includes('e')) {
                    setInputValue(new Intl.NumberFormat('en-US').format(num))
                } else {
                    setInputValue(val)
                }
            }
        } else {
            if (raw === '') {
                setInputValue('')
                onChange(undefined)
            } else {
                setInputValue(val)
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
        if (hideCurrencyText) return []
        if (unit === '%') {
            return currentVal ? [{ value: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(currentVal)), unit: '%' }] : []
        }
        return formatVietnameseCurrencyText(currentVal ?? 0)
    }, [value, inputValue, isFocused, hideCurrencyText, unit])

    // Clear Button Handler
    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setInputValue('');
        onChange(undefined);
        inputRef.current?.focus();
    };

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
                        "text-sm font-black tracking-wide h-full py-0 flex items-center box-border bg-white border border-slate-200 text-slate-950 opacity-100",
                        (inputValue && !disabled && !hideClearButton) || !hideCalculator
                            ? (compact ? "pr-8" : "pr-24")
                            : (compact ? "pr-3" : "pr-3"),
                        "pl-3 text-xs", // Reset left padding, clear button moved to right
                        mathError ? "border-red-300 focus-visible:ring-red-200" : "focus:border-blue-400 focus:ring-1 focus:ring-blue-100",
                        className
                    )}
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
                    {/* Clear Button - Now on Right */}
                    {inputValue && !disabled && !hideClearButton && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()} // Prevent blur
                            onClick={handleClear}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                            tabIndex={-1}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>


                {/* Suggestions Dropdown - Disabled for % */}
                {isFocused && unit !== '%' && suggestions.length > 0 && (
                    <div className="absolute z-[9999] w-full mt-1 bg-white rounded-md shadow-2xl border-2 border-slate-200 overflow-hidden ring-4 ring-slate-100/50">
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
            </div>
        </div>
    )
}
