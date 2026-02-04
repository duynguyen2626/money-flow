'use client'

import React from 'react'

interface EmptyStateProps {
    title?: string
    description?: string
    className?: string
}

export function EmptyState({
    title = 'No data found',
    description = 'Try adjusting your filters or search criteria',
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
            {/* SVG Illustration */}
            <svg
                className="w-48 h-48 mb-6 text-slate-300"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Empty folder */}
                <path
                    d="M40 60 L40 160 L160 160 L160 70 L110 70 L100 60 Z"
                    fill="currentColor"
                    opacity="0.2"
                />
                <path
                    d="M40 60 L40 160 L160 160 L160 70 L110 70 L100 60 Z"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />

                {/* Magnifying glass */}
                <circle
                    cx="130"
                    cy="110"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                />
                <line
                    x1="145"
                    y1="125"
                    x2="160"
                    y2="140"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* X mark inside folder */}
                <line
                    x1="70"
                    y1="100"
                    x2="90"
                    y2="120"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.4"
                />
                <line
                    x1="90"
                    y1="100"
                    x2="70"
                    y2="120"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.4"
                />
            </svg>

            {/* Text */}
            <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 text-center max-w-sm">{description}</p>
        </div>
    )
}
