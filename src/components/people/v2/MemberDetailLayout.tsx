'use client'

import { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MemberDetailLayoutProps {
    personName: string
    personAvatar?: string | null
    balance: number
    balanceLabel: string
    statsToolbar: ReactNode
    timeline: ReactNode
    backHref?: string
}

export function MemberDetailLayout({
    personName,
    personAvatar,
    balance,
    balanceLabel,
    statsToolbar,
    timeline,
    backHref = '/people'
}: MemberDetailLayoutProps) {
    const balanceClass = balance > 0
        ? 'text-rose-600'
        : balance < 0
            ? 'text-emerald-600'
            : 'text-slate-600'

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="flex-none bg-white border-b border-slate-200 px-4 py-4 md:px-6">
                <div className="flex items-center gap-4">
                    {/* Back Button */}
                    <Link
                        href={backHref}
                        className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                        title="Back to People"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>

                    {/* Avatar */}
                    {personAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={personAvatar}
                            alt={personName}
                            className="h-12 w-12 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-lg font-bold text-blue-600">
                            {personName.charAt(0).toUpperCase()}
                        </div>
                    )}

                    {/* Name & Balance */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-slate-900 truncate">{personName}</h1>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-sm text-slate-500">{balanceLabel}</span>
                            <span className={cn("text-lg font-bold", balanceClass)}>
                                {balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Toolbar */}
            <div className="flex-none bg-white border-b border-slate-200 px-4 py-3 md:px-6">
                {statsToolbar}
            </div>

            {/* Main Content - Timeline */}
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
                {timeline}
            </div>
        </div>
    )
}
