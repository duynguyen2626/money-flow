"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, HandCoins, Banknote } from 'lucide-react'

import { Person, Shop, Subscription, Account, Category } from '@/types/moneyflow.types'
import { getServiceBranding } from '@/components/services/service-branding'
import { EditSubscriptionDialog } from '@/components/services/edit-subscription-dialog'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'

interface PersonCardProps {
    person: Person
    subscriptions: Subscription[]
    shops: Shop[]
    accounts: Account[]
    categories: Category[]
    onEdit: () => void
    onOpenDebt: () => void
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function PersonCard({
    person,
    subscriptions,
    shops,
    accounts,
    categories,
    onEdit,
    onOpenDebt,
}: PersonCardProps) {
    const router = useRouter()
    const [editServiceId, setEditServiceId] = useState<string | null>(null)

    const personSubscriptions = useMemo(() => {
        const subMap = new Map(subscriptions.map(s => [s.id, s]))
        return (person.subscription_ids ?? [])
            .map(id => subMap.get(id))
            .filter(Boolean) as Subscription[]
    }, [person.subscription_ids, subscriptions])

    const balance = person.balance ?? 0
    const hasDebt = Boolean(person.debt_account_id)

    const getInitial = (name: string) => {
        const first = name?.trim().charAt(0)
        return first ? first.toUpperCase() : '?'
    }

    // Badges logic
    let balanceBadge = null
    if (balance > 0) {
        // They owe me (Asset)
        balanceBadge = (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Wait: {numberFormatter.format(balance)}
            </span>
        )
    } else if (balance < 0) {
        // I owe them (Liability - but here negative asset means I owe)
        balanceBadge = (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Owe: {numberFormatter.format(Math.abs(balance))}
            </span>
        )
    }

    const dialogBaseProps = {
        accounts,
        categories,
        people: [person],
        shops,
    }

    return (
        <div
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md cursor-pointer"
            onClick={onOpenDebt}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {person.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={person.avatar_url}
                            alt={person.name}
                            className="h-12 w-12 border border-slate-200 object-contain flex-shrink-0 bg-white"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-base font-semibold text-slate-700 flex-shrink-0">
                            {getInitial(person.name)}
                        </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate">
                            {person.name}
                        </span>
                        {person.email && (
                            <span className="text-[10px] text-slate-500 truncate">{person.email}</span>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 flex-shrink-0"
                    onClick={(e) => {
                        e.stopPropagation()
                        onEdit()
                    }}
                >
                    <Pencil className="h-3 w-3" />
                </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Status</span>
                <div className="flex gap-1.5">
                    {balanceBadge}
                    {hasDebt ? (
                        !balanceBadge && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Settled</span>
                    ) : (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Unlinked
                        </span>
                    )}
                </div>
            </div>

            {personSubscriptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {personSubscriptions.slice(0, 2).map(sub => {
                        const brand = getServiceBranding(sub.name)
                        return (
                            <button
                                key={`${person.id}-${sub.id}`}
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700 focus:outline-none"
                                onClick={event => {
                                    event.stopPropagation()
                                    setEditServiceId(sub.id)
                                }}
                            >
                                <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ring-1 ${brand.bg} ${brand.text} ${brand.ring}`}
                                >
                                    {brand.icon}
                                </span>
                                <span className="truncate max-w-[60px]">{sub.name}</span>
                            </button>
                        )
                    })}
                    {personSubscriptions.length > 2 && (
                        <span className="text-[10px] text-slate-500">+{personSubscriptions.length - 2}</span>
                    )}
                </div>
            )}

            <div className="mt-auto pt-2 border-t border-slate-100 flex gap-1.5">
                <div className="flex-1">
                    <AddTransactionDialog
                        {...dialogBaseProps}
                        defaultType="debt"
                        defaultPersonId={person.id}
                        buttonClassName="w-full flex items-center justify-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        buttonText="Lend"
                        triggerContent={
                            <>
                                <HandCoins className="h-3 w-3" />
                                Lend
                            </>
                        }
                    />
                </div>
                <div className="flex-1">
                    <AddTransactionDialog
                        {...dialogBaseProps}
                        defaultType="repayment"
                        defaultPersonId={person.id}
                        buttonClassName="w-full flex items-center justify-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                        buttonText="Repay"
                        triggerContent={
                            <>
                                <Banknote className="h-3 w-3" />
                                Repay
                            </>
                        }
                    />
                </div>
            </div>

            {editServiceId && (
                <EditSubscriptionDialog
                    subscription={subscriptions.find(s => s.id === editServiceId)!}
                    people={[person]}
                    accounts={accounts}
                    shops={shops}
                    initiallyOpen
                    onClose={() => {
                        setEditServiceId(null)
                        router.refresh()
                    }}
                />
            )}
        </div>
    )
}
