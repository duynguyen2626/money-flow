'use client'

import { useRouter } from 'next/navigation'
import { SubscriptionForm } from '@/components/services/subscription-form'
import { updateSubscriptionAction } from '@/actions/subscription-actions'
import { Subscription, Person, Account, Shop } from '@/types/moneyflow.types'

type ServiceEditPageContentProps = {
    subscription: Subscription
    people: Person[]
    accounts: Account[]
    shops: Shop[]
    redirectAfterSave?: boolean
    onSaved?: () => void
    onCancel?: () => void
}

export function ServiceEditPageContent({
    subscription,
    people,
    accounts,
    shops,
    redirectAfterSave = true,
    onSaved,
    onCancel,
}: ServiceEditPageContentProps) {
    const router = useRouter()

    return (
        <SubscriptionForm
            mode="edit"
            initialData={subscription}
            people={people}
            accounts={accounts}
            shops={shops}
            onSubmit={async (payload: import('@/services/subscription.service').SubscriptionPayload) => {
                await updateSubscriptionAction(subscription.id, payload)
                router.refresh()
                onSaved?.()
                if (redirectAfterSave) {
                    router.push('/services')
                }
            }}
            onCancel={() => {
                if (onCancel) {
                    onCancel()
                    return
                }
                router.push('/services')
            }}
        />
    )
}
