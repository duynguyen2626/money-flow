'use client'

import { Account, AccountCashbackSnapshot, Category, Person, Shop } from '@/types/moneyflow.types'
import { UsageStats, QuickPeopleConfig } from '@/types/settings.types'
import { AccountCard } from './account-card'
import { Link } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FamilyClusterProps = {
    parent: Account
    children_accounts: Account[]
    secured_asset?: Account
    // Props to pass down to AccountCard
    allAccounts: Account[]
    cashbackById?: Record<string, AccountCashbackSnapshot>
    categories: Category[]
    people: Person[]
    shops: Shop[]
    collateralAccounts: Account[]
    usageStats?: UsageStats
    pendingBatchAccountIds?: string[]
    quickPeopleConfig?: QuickPeopleConfig
}

export function FamilyCluster({
    parent,
    children_accounts,
    secured_asset,
    allAccounts,
    cashbackById,
    categories,
    people,
    shops,
    collateralAccounts,
    usageStats,
    pendingBatchAccountIds,
    quickPeopleConfig
}: FamilyClusterProps) {

    // Flatten the list for mobile stacking (Parent -> Children)
    // Secured Asset is usually shown separately or as a badge, but if it's a card, we include it? 
    // Prompt says "Parent–Child cards ... form a financial cluster". 
    // Usually Secured Asset is a Savings account. If it has a card representation, we might show it.
    // For now, let's focus on Parent + Children. If Secured Asset is a card (like generic savings), maybe it's separate.
    // But typically "Family" here refers to Credit Card Parent + Children.

    return (
        <div className="contents">
            {/* Parent Card */}
            <div className="w-full">
                <AccountCard
                    account={parent}
                    accounts={allAccounts}
                    cashbackById={cashbackById}
                    categories={categories}
                    people={people}
                    shops={shops}
                    collateralAccounts={collateralAccounts}
                    usageStats={usageStats}
                    pendingBatchAccountIds={pendingBatchAccountIds}
                    quickPeopleConfig={quickPeopleConfig}
                    isClusterParent={true}
                />
            </div>

            {/* Children Cards */}
            {children_accounts.map((child) => (
                <div key={child.id} className="w-full">
                    <AccountCard
                        account={child}
                        accounts={allAccounts}
                        cashbackById={cashbackById}
                        categories={categories}
                        people={people}
                        shops={shops}
                        collateralAccounts={collateralAccounts}
                        usageStats={usageStats}
                        pendingBatchAccountIds={pendingBatchAccountIds}
                        quickPeopleConfig={quickPeopleConfig}
                        isClusterChild={true}
                    />
                </div>
            ))}
        </div>
    )
}
