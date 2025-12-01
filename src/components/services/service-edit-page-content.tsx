'use client'

import { useRouter } from 'next/navigation'
import { SubscriptionForm } from '@/components/services/subscription-form'
import { updateSubscriptionAction } from '@/actions/subscription-actions'
import { Subscription, Person, Account, Shop } from '@/types/moneyflow.types'

export function ServiceEditPageContent({
    subscription,
    people,
    accounts,
    shops
}: {
    subscription: Subscription
    people: Person[]
    accounts: Account[]
    shops: Shop[]
}) {
    const router = useRouter()

    return (
        <SubscriptionForm
            mode="edit"
            initialData={subscription}
            people={people}
            accounts={accounts}
            shops={shops}
            onSubmit={async (payload) => {
                await updateSubscriptionAction(subscription.id, payload)
                router.push('/services')
                router.refresh()
            }}
            onCancel={() => router.push('/services')}
        />
    )
}
