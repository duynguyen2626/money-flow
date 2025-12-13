'use client'

import { Account } from '@/types/moneyflow.types'
import { AccountCard } from './account-card'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'

type FamilyGroup = {
    id: string
    securedAsset?: Account
    parent: Account
    children: Account[]
}

type FamilyCardGroupProps = {
    families: FamilyGroup[]
    accounts: Account[]
    categories: any[]
    people: any[]
    shops: any[]
    collateralAccounts: Account[]
    usageStats?: any
    pendingBatchAccountIds?: string[]
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function FamilyCardGroup({
    families,
    accounts,
    categories,
    people,
    shops,
    collateralAccounts,
    usageStats,
    pendingBatchAccountIds = [],
}: FamilyCardGroupProps) {
    if (families.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
                No family card relationships found.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {families.map((family) => {
                // Family shared limit/balance = parent's values (children share the same limit)
                const familyLimit = family.parent.credit_limit ?? 0
                const familyBalance = family.parent.current_balance ?? 0

                // Build card sequence: [Asset] → [Parent] → [Child1] → [Child2] → ...
                const cardSequence: { card: Account; type: 'asset' | 'parent' | 'child' }[] = []

                if (family.securedAsset) {
                    cardSequence.push({ card: family.securedAsset, type: 'asset' })
                }

                cardSequence.push({ card: family.parent, type: 'parent' })

                family.children.forEach((child) => {
                    cardSequence.push({ card: child, type: 'child' })
                })

                return (
                    <div
                        key={family.id}
                        className="space-y-3"
                    >
                        {/* Header with Family Name and Summary Badges */}
                        <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-800">
                                    {family.parent.name} Family
                                </p>
                                <span className="rounded-full bg-slate-200/50 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                                    {cardSequence.length}
                                </span>
                            </div>

                            {/* Summary as Badges */}
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                    Balance: {numberFormatter.format(familyBalance)}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                    Limit: {numberFormatter.format(familyLimit)}
                                </span>
                            </div>
                        </div>

                        {/* Cards Grid with Arrows - Responsive Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {cardSequence.map((item, index) => (
                                <div key={item.card.id} className="relative">
                                    {/* Card */}
                                    <AccountCard
                                        account={item.card}
                                        accounts={accounts}
                                        categories={categories}
                                        people={people}
                                        shops={shops}
                                        collateralAccounts={collateralAccounts}
                                        usageStats={usageStats}
                                        pendingBatchAccountIds={pendingBatchAccountIds}
                                        hideSecuredBadge={true}
                                    />

                                    {/* Arrow Overlay (if not last card) */}
                                    {index < cardSequence.length - 1 && (
                                        <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 hidden lg:flex items-center justify-center pointer-events-none">
                                            <div className="bg-slate-50/80 backdrop-blur-[1px] rounded-full p-0.5 shadow-sm">
                                                <ArrowRight className="h-6 w-6 text-slate-400/80" strokeWidth={2.5} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Per-Card Balance Badges */}
                        <div className="flex flex-wrap gap-2 mt-3 px-2">
                            {cardSequence.map((item) => (
                                <span
                                    key={item.card.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                    {item.card.name}: {numberFormatter.format(item.card.current_balance ?? 0)}
                                </span>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
