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

const numberFormatter = new Intl.NumberFormat('vi-VN', {
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
        // They owe me (Asset) -> Chờ thu
        balanceBadge = (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                Wait: {numberFormatter.format(balance)}
            </span>
        )
    } else if (balance < 0) {
        // I owe them (Liability) -> Nợ họ
        balanceBadge = (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                Owe: {numberFormatter.format(Math.abs(balance))}
            </span>
        )
    } else {
        balanceBadge = (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Settled
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
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer group"
            onClick={onOpenDebt}
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    {person.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={person.avatar_url}
                            alt={person.name}
                            className="h-14 w-14 rounded-full border border-slate-200 object-cover bg-white"
                        />
                    ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-700">
                            {getInitial(person.name)}
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {person.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                            {person.email || 'No contact info'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    onClick={(e) => {
                        e.stopPropagation()
                        onEdit()
                    }}
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </div>

            {/* Middle: Stats */}
            <div className="space-y-2">
                {/* Debt Badge */}
                <div>
                    {balanceBadge}
                </div>

                {/* Subscriptions */}
                {personSubscriptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {personSubscriptions.map(sub => {
                            const brand = getServiceBranding(sub.name)
                            return (
                                <button
                                    key={`${person.id}-${sub.id}`}
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                    onClick={event => {
                                        event.stopPropagation()
                                        setEditServiceId(sub.id)
                                    }}
                                >
                                    <span className={`flex h-3 w-3 items-center justify-center rounded-full text-[6px] ${brand.bg} ${brand.text}`}>
                                        {brand.icon}
                                    </span>
                                    <span className="truncate max-w-[60px]">{sub.name}</span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Footer: Actions */}
            <div className="mt-auto pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="debt"
                    defaultPersonId={person.id}
                    buttonClassName="flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors w-full"
                    buttonText="Lend"
                    triggerContent={
                        <>
                            <HandCoins className="h-3.5 w-3.5" />
                            Lend
                        </>
                    }
                />
                <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="repayment"
                    defaultPersonId={person.id}
                    buttonClassName="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors w-full"
                    buttonText="Repay"
                    triggerContent={
                        <>
                            <Banknote className="h-3.5 w-3.5" />
                            Repay
                        </>
                    }
                />
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
