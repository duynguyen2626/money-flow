import { notFound } from 'next/navigation'
import { getSubscriptions } from '@/services/subscription.service'
import { getPeople } from '@/services/people.service'
import { getAccounts } from '@/services/account.service'
import { getShops } from '@/services/shop.service'
import { ServiceEditPageContent } from '@/components/services/service-edit-page-content'

export default async function ServiceEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const [subscriptions, people, accounts, shops] = await Promise.all([
        getSubscriptions(),
        getPeople(),
        getAccounts(),
        getShops(),
    ])

    const subscription = subscriptions.find(s => s.id === id)

    if (!subscription) {
        notFound()
    }

    return (
        <div className="container max-w-3xl py-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Edit Service</h1>
            </div>

            <ServiceEditPageContent
                subscription={subscription}
                people={people}
                accounts={accounts}
                shops={shops}
            />
        </div>
    )
}
