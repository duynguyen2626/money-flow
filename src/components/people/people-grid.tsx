'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditPersonDialog } from './edit-person-dialog'
import { Person, Subscription } from '@/types/moneyflow.types'
import { ensureDebtAccountAction } from '@/actions/people-actions'
import { Zap, Pencil } from 'lucide-react'
import { EditSubscriptionDialog } from '@/components/services/edit-subscription-dialog'
import { getServiceBranding } from '@/components/services/service-branding'

type PeopleGridProps = {
  people: Person[]
  subscriptions: Subscription[]
}

const getInitial = (name: string) => {
  const first = name?.trim().charAt(0)
  return first ? first.toUpperCase() : '?'
}

export function PeopleGrid({ people, subscriptions }: PeopleGridProps) {
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people.map(person => {
          const hasDebt = Boolean(person.debt_account_id)
          const personSubscriptions = (person.subscription_ids ?? [])
            .map(id => subscriptionMap.get(id))
            .filter(Boolean) as Subscription[]
          return (
            <div
              key={person.id}
              role="button"
              tabIndex={0}
              className="flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => handleOpenDebt(person)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleOpenDebt(person)
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {person.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.avatar_url}
                      alt={person.name}
                      className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700">
                      {getInitial(person.name)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-slate-900">{person.name}</span>
                    <span className="text-xs text-slate-500">{person.email || 'Chua co email'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
                  onClick={event => {
                    event.stopPropagation()
                    setEditId(person.id)
                  }}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Ho so cong no</span>
                {hasDebt ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                    San sang
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    Chua lien ket
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                Account no: Nợ phải thu - {person.name}
              </div>
              {personSubscriptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {personSubscriptions.map(sub => {
                    const brand = getServiceBranding(sub.name)
                    return (
                      <button
                        key={`${person.id}-${sub.id}`}
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700 focus:outline-none"
                        onClick={event => {
                          event.stopPropagation()
                          setEditServiceId(sub.id)
                        }}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ring-2 ${brand.bg} ${brand.text} ${brand.ring}`}
                        >
                          {brand.icon}
                        </span>
                        <span className="truncate max-w-[120px]">{sub.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
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
