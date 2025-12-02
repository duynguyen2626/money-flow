'use server'

import Link from 'next/link'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getSubscription } from '@/services/subscription.service'
import { getPeople } from '@/services/people.service'
import { getAccounts } from '@/services/account.service'
import { getShops } from '@/services/shop.service'
import { getServiceBranding } from '@/components/services/service-branding'
import { ServiceEditPageContent } from '@/components/services/service-edit-page-content'

interface ServicePageProps {
    params: Promise<{ id: string }>
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
})

export default async function ServicePage({ params }: ServicePageProps) {
    const { id } = await params

    const [subscription, people, accounts, shops] = await Promise.all([
        getSubscription(id),
        getPeople(),
        getAccounts(),
        getShops(),
    ])

    if (!subscription) {
        notFound()
    }

    const brand = getServiceBranding(subscription.name)

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-10 pt-6">
            <div className="flex items-start gap-4">
                <Link
                    href="/services"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>

                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm ${brand.bg} ${brand.text}`}>
                    {brand.icon}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Service</p>
                    <h1 className="text-2xl font-semibold text-slate-900 truncate">
                        {subscription.name}
                    </h1>
                    <p className="text-sm text-slate-500">
                        {subscription.next_billing_date
                            ? `Next billing ${format(new Date(subscription.next_billing_date), 'MMM d, yyyy')}`
                            : 'No billing date yet'}
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-xs text-slate-400">Monthly price</p>
                    <p className="text-xl font-semibold text-slate-900">
                        {currencyFormatter.format(subscription.price ?? 0)}
                    </p>
                    <p className="text-xs text-slate-500">
                        Status: {subscription.is_active ? 'Active' : 'Paused'}
                    </p>
                </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase text-slate-500">Service Info</p>
                        <h2 className="text-lg font-semibold text-slate-900">Quick edits</h2>
                        <p className="text-sm text-slate-500">
                            Update the pricing, billing date, and other settings right here.
                        </p>
                    </div>
                    <p className="text-xs text-slate-400">Changes sync instantly</p>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <ServiceEditPageContent
                    key={subscription.id}
                    subscription={subscription}
                    people={people}
                    accounts={accounts}
                    shops={shops}
                    redirectAfterSave={false}
                />
            </div>
        </div>
    )
}
