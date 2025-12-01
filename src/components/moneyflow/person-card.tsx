"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, HandCoins, Banknote, ExternalLink } from 'lucide-react'

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

    const getInitial = (name: string) => {
        const first = name?.trim().charAt(0)
        return first ? first.toUpperCase() : '?'
    }

    // Badges logic
    let balanceBadge = null
    if (balance > 0) {
        // They owe me (Asset) -> Chờ thu
        balanceBadge = (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 h-6">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Chờ thu: {numberFormatter.format(balance)}
            </span>
        )
    } else if (balance < 0) {
        // I owe them (Liability) -> Nợ họ
        balanceBadge = (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 h-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Nợ họ: {numberFormatter.format(Math.abs(balance))}
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
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md cursor-pointer group relative overflow-hidden"
            onClick={onOpenDebt}
        >
            {/* Header */}
            <div className="flex items-center gap-3">
                {person.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={person.avatar_url}
                        alt={person.name}
                        className="h-12 w-12 rounded-lg border border-slate-100 object-cover bg-slate-50"
                    />
                ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600">
                        {getInitial(person.name)}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 truncate pr-2">
                            {person.name}
                        </h3>
                        <button
                            type="button"
                            className="text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                                e.stopPropagation()
                                onEdit()
                            }}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                        {person.email || 'Contact'}
                    </p>
                </div>
            </div>

            {/* Middle: Stats */}
            <div className="space-y-2 min-h-[52px]">
                {/* Row 1: Debt Badge */}
                <div className="flex items-center gap-2">
                    {balanceBadge || (
                        <span className="text-xs text-slate-400 italic pl-1">No pending debt</span>
                    )}
                </div>

                {/* Row 2: Subscriptions */}
                {person.subscription_details && person.subscription_details.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {person.subscription_details.slice(0, 4).map(sub => {
                            const brand = getServiceBranding(sub.name)
                            return (
                                <div
                                    key={`${person.id}-${sub.id}`}
                                    className="relative group/sub flex items-center gap-0.5"
                                >
                                    <button
                                        type="button"
                                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${brand.bg} ${brand.text} ring-1 ring-white shadow-sm overflow-hidden`}
                                        onClick={event => {
                                            event.stopPropagation()
                                            setEditServiceId(sub.id)
                                        }}
                                    >
                                        {brand.icon}
                                    </button>
                                    {sub.slots > 1 && (
                                        <span className="text-[10px] font-medium text-slate-500">
                                            {sub.slots}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                        {person.subscription_details.length > 4 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-medium text-slate-500 ring-1 ring-white">
                                +{person.subscription_details.length - 4}
                            </span>
                        )}
                        <span className="text-[10px] text-slate-400 self-center ml-1">
                            {person.subscription_details.length} Subs
                        </span>
                    </div>
                )}
            </div>

            {/* Footer: Actions */}
            <div className="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="debt"
                    defaultPersonId={person.id}
                    buttonClassName="flex items-center justify-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors w-full"
                    buttonText="Cho vay"
                    triggerContent={
                        <>
                            <HandCoins className="h-3.5 w-3.5" />
                            Cho vay
                        </>
                    }
                />
                <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="repayment"
                    defaultPersonId={person.id}
                    buttonClassName="flex items-center justify-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors w-full"
                    buttonText="Thu nợ"
                    triggerContent={
                        <>
                            <Banknote className="h-3.5 w-3.5" />
                            Thu nợ
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
