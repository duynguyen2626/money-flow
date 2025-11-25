'use client'

import { useMemo, useState } from 'react'

import { Account, Person, Shop, Subscription } from '@/types/moneyflow.types'

import { CreateSubscriptionDialog } from './create-subscription-dialog'
import { EditSubscriptionDialog } from './edit-subscription-dialog'
import { SubscriptionCard } from './subscription-card'
import { EditPersonDialog } from '../people/edit-person-dialog'

type ServicesBoardProps = {
  subscriptions: Subscription[]
  people: Person[]
  accounts: Account[]
  shops: Shop[]
}

export function ServicesBoard({ subscriptions, people, accounts, shops }: ServicesBoardProps) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editPersonId, setEditPersonId] = useState<string | null>(null)
  const selected = useMemo(
    () => subscriptions.find(item => item.id === editId) ?? null,
    [editId, subscriptions]
  )
  const peopleMap = useMemo(() => {
    const map = new Map<string, Person>()
    people.forEach(p => map.set(p.id, p))
    return map
  }, [people])
  const selectedPerson = editPersonId ? peopleMap.get(editPersonId) ?? null : null

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Subscriptions</p>
          <h2 className="text-2xl font-semibold text-slate-900">Quan ly dich vu</h2>
          <p className="text-sm text-slate-500">
            Brand card co logo (YouTube, Netflix...) + tinh trang billing. Nhan Edit de cap nhat chia se.
          </p>
        </div>
        <CreateSubscriptionDialog people={people} accounts={accounts} shops={shops} />
      </div>

      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <p className="text-lg font-semibold text-slate-700">Chua co dich vu nao</p>
          <p className="text-sm text-slate-500">
            Bam &ldquo;Them dich vu&rdquo; de them YouTube, Netflix, iCloud...
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subscriptions.map(subscription => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onEdit={() => setEditId(subscription.id)}
              onMemberClick={profileId => setEditPersonId(profileId)}
            />
          ))}
        </div>
      )}

      {selected && (
        <EditSubscriptionDialog
          subscription={selected}
          people={people}
          accounts={accounts}
          shops={shops}
          initiallyOpen
          onClose={() => setEditId(null)}
        />
      )}
      {selectedPerson && (
        <EditPersonDialog
          person={selectedPerson}
          subscriptions={subscriptions}
          initiallyOpen
          onClose={() => setEditPersonId(null)}
        />
      )}
    </div>
  )
}
