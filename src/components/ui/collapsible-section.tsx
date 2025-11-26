'use client'

import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleSectionProps {
    title: string
    children: ReactNode
    defaultOpen?: boolean
    className?: string
}

export function CollapsibleSection({
    title,
    children,
    defaultOpen = true,
    className = ""
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className={`border rounded-lg bg-white shadow-sm ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 font-semibold text-slate-700 hover:bg-slate-50 transition-colors rounded-t-lg"
            >
                {title}
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {isOpen && (
                <div className="p-4 border-t">
                    {children}
                </div>
            )}
        </div>
    )
}
