'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
    title: string
    count: number
    titleColor?: string
    defaultOpen?: boolean
    children: React.ReactNode
}

export function CollapsibleSection({
    title,
    count,
    titleColor = 'text-slate-900',
    defaultOpen = true,
    children
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <section className="space-y-3">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between group sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2"
            >
                <div className="flex items-center gap-2">
                    {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    )}
                    <h3 className={cn("text-xs font-semibold uppercase tracking-wider", titleColor)}>
                        {title}
                    </h3>
                </div>
                <p className="text-xs text-slate-500">{count} people</p>
            </button>

            {isOpen && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </section>
    )
}
