'use client'

import { X } from 'lucide-react'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputWithClearProps extends InputHTMLAttributes<HTMLInputElement> {
    onClear: () => void
    wrapperClassName?: string
}

export const InputWithClear = forwardRef<HTMLInputElement, InputWithClearProps>(
    ({ className = '', wrapperClassName = '', value, onClear, ...props }, ref) => {
        return (
            <div className={`relative ${wrapperClassName}`}>
                <input
                    ref={ref}
                    value={value}
                    className={`w-full rounded-md border border-slate-200 px-3 py-2 pr-8 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white ${className}`}
                    {...props}
                />
                {value && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 rounded-full p-0.5"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        )
    }
)

InputWithClear.displayName = 'InputWithClear'
