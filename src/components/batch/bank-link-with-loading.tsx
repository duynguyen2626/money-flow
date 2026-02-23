'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'

interface BankLinkWithLoadingProps {
    href: string
    target?: string
    children: React.ReactNode
}

export function BankLinkWithLoading({ href, target, children }: BankLinkWithLoadingProps) {
    const [isPending, startTransition] = useTransition()

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        startTransition(() => {
            // Navigation happens automatically via Link
        })
    }

    return (
        <div className="relative">
            <Link href={href} onClick={handleClick} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>
                {children}
            </Link>
            {isPending && (
                <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                        <span className="text-sm font-medium text-white">Loading...</span>
                    </div>
                </div>
            )}
        </div>
    )
}
