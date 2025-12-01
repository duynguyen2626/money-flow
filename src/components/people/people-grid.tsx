'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditPersonDialog } from './edit-person-dialog'
import { PersonCard } from '@/components/moneyflow/person-card'
import { Account, Category, Person, Shop, Subscription } from '@/types/moneyflow.types'
import { ensureDebtAccountAction } from '@/actions/people-actions'
import { EditSubscriptionDialog } from '@/components/services/edit-subscription-dialog'

type PeopleGridProps = {
  people: Person[]
  subscriptions: Subscription[]
  shops: Shop[]
  accounts: Account[]
  categories: Category[]
}

const getInitial = (name: string) => {
  const first = name?.trim().charAt(0)
  return first ? first.toUpperCase() : '?'
}

export function PeopleGrid({ people, subscriptions, shops, accounts, categories }: PeopleGridProps) {
  const peopleMap = useMemo(() => {
    const map = new Map<string, Person>()
    people.forEach(p => map.set(p.id, p))
    return map
  }, [people])
  const subscriptionMap = useMemo(() => {
    const map = new Map<string, Subscription>()
    subscriptions.forEach(sub => map.set(sub.id, sub))
    return map
  }, [subscriptions])

  const [editId, setEditId] = useState<string | null>(null)
  const selectedPerson = editId ? peopleMap.get(editId) ?? null : null
  const [editServiceId, setEditServiceId] = useState<string | null>(null)
  const router = useRouter()
  const [isEnsuring, startEnsuring] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people
    const lower = searchQuery.toLowerCase()
    return people.filter(p => p.name.toLowerCase().includes(lower))
  }, [people, searchQuery])

  const handleOpenDebt = (person: Person) => {
    setError(null)
    const navigate = (accountId: string) => router.push(`/people/${accountId}`)
    if (person.debt_account_id) {
      navigate(person.debt_account_id)
      return
    }
    startEnsuring(async () => {
      const accountId = await ensureDebtAccountAction(person.id, person.name)
      if (!accountId) {
        setError('Khong the tao ho so cong no.')
        return
      }
      navigate(accountId)
    })
  }

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search people..."
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredPeople.map(person => (
          <PersonCard
            key={person.id}
            person={person}
            subscriptions={subscriptions}
            shops={shops}
            accounts={accounts}
            categories={categories}
            onEdit={() => setEditId(person.id)}
            onOpenDebt={() => handleOpenDebt(person)}
          />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {selectedPerson && (
        <EditPersonDialog
          person={selectedPerson}
          subscriptions={subscriptions}
          initiallyOpen
          onClose={() => setEditId(null)}
        />
      )}
      {editServiceId && subscriptionMap.get(editServiceId) && (
        <EditSubscriptionDialog
          subscription={subscriptionMap.get(editServiceId)!}
          people={people}
          accounts={[]}
          shops={shops}
          initiallyOpen
          onClose={() => {
            setEditServiceId(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
