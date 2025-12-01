'use client'

import { useEffect, useState } from 'react'
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
    const [formDefaults, setFormDefaults] = useState<Subscription | null>(null)

    useEffect(() => {
        if (subscription) {
            setFormDefaults({
                ...subscription,
                note_template: subscription.note_template || 'Auto: {name} {date}',
                payment_account_id: subscription.payment_account_id,
                members:
                    subscription.members?.map(member => ({
                        ...member,
                        slots: member.slots ?? 1,
                    })) ?? [],
            })
        }
    }, [subscription])

    if (!formDefaults) {
        return null
    }

    return (
        <SubscriptionForm
            mode="edit"
            initialData={formDefaults}
            people={people}
            accounts={accounts}
            shops={shops}
            onSubmit={async (payload: import('@/services/subscription.service').SubscriptionPayload) => {
                const normalizedMembers = payload.members?.map(member => ({
                    ...member,
                    id: (member as any).id ?? member.profile_id,
                    profile_id: member.profile_id ?? (member as any).id,
                    slots: member.slots ?? 1,
                }))

                await updateSubscriptionAction(subscription.id, { ...payload, members: normalizedMembers })
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
