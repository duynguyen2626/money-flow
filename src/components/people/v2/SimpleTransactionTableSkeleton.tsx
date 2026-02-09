'use client'

import React from 'react'

export function SimpleTransactionTableSkeleton() {
    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="h-10 border-b border-slate-100 bg-slate-50 flex items-center px-4 gap-4">
                <div className="h-3 w-4 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 flex-1 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-slate-200 rounded animate-pulse ml-auto" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 border-b border-slate-100 flex items-center px-4 gap-4">
                    <div className="h-4 w-4 bg-slate-100 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-slate-100/50 rounded animate-pulse" />
                    <div className="flex flex-col gap-1.5 flex-1">
                        <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
                        <div className="h-2 w-1/4 bg-slate-50 rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                </div>
            ))}
        </div>
    )
}
