'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditPersonDialog } from './edit-person-dialog'
import { Person, Subscription } from '@/types/moneyflow.types'
import { ensureDebtAccountAction } from '@/actions/people-actions'

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

  const [editId, setEditId] = useState<string | null>(null)
  const selectedPerson = editId ? peopleMap.get(editId) ?? null : null
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
                  onClick={event => {
                    event.stopPropagation()
                    setEditId(person.id)
                  }}
                >
                  Edit
                </button>
              </div>
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
    </>
  )
}
