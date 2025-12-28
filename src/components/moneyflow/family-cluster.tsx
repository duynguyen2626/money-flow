'use client'

import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { AccountCard } from './account-card'
import { Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UsageStats, QuickPeopleConfig } from '@/types/settings.types'

type FamilyClusterProps = {
    parent: Account
    children: Account[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    collateralAccounts: Account[]
    usageStats?: UsageStats
    quickPeopleConfig?: QuickPeopleConfig
    pendingBatchAccountIds?: string[]
}

/**
 * FamilyCluster Component
 * 
 * Renders Parent + Children as a unified horizontal cluster.
 * Always occupies 2 columns in the base grid-cols-2 system.
 * Displays visual bridge (Link icon + dashed line) between cards.
 */
export function FamilyCluster({
    parent,
    children,
    accounts,
    categories,
    people,
    shops,
    collateralAccounts,
    usageStats,
    quickPeopleConfig,
    pendingBatchAccountIds = [],
}: FamilyClusterProps) {
    // Build card sequence: Parent → Child1 → Child2 → ...
    const cards = [parent, ...children]

    return (
        // Cluster container - spans 2 columns in parent grid
        <div className="col-span-2">
            {/* Inner grid for family cards - responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {cards.map((card, index) => (
                    <div key={card.id} className="relative">
                        {/* Account Card */}
                        <AccountCard
                            account={card}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            collateralAccounts={collateralAccounts}
                            usageStats={usageStats}
                            quickPeopleConfig={quickPeopleConfig}
                            pendingBatchAccountIds={pendingBatchAccountIds}
                            hideSecuredBadge={true}
                        />

                        {/* Bridge Connector (if not last card) */}
                        {index < cards.length - 1 && (
                            <>
                                {/* Desktop: Horizontal bridge between cards */}
                                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-30">
                                    <div className="flex items-center gap-0">
                                        {/* Dashed line - left side */}
                                        <div className="w-3 h-0 border-t-2 border-dashed border-slate-300" />

                                        {/* Link Icon - centered */}
                                        <div className="bg-white rounded-full p-1.5 shadow-md border-2 border-slate-200">
                                            <Link2 className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                                        </div>

                                        {/* Dashed line - right side */}
                                        <div className="w-3 h-0 border-t-2 border-dashed border-slate-300" />
                                    </div>
                                </div>

                                {/* Mobile: Vertical bridge below card */}
                                <div className="md:hidden flex justify-center my-2">
                                    <div className="flex flex-col items-center gap-0">
                                        {/* Dashed line - top */}
                                        <div className="w-0 h-3 border-l-2 border-dashed border-slate-300" />

                                        {/* Link Icon - centered */}
                                        <div className="bg-white rounded-full p-1.5 shadow-md border-2 border-slate-200">
                                            <Link2 className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                                        </div>

                                        {/* Dashed line - bottom */}
                                        <div className="w-0 h-3 border-l-2 border-dashed border-slate-300" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
