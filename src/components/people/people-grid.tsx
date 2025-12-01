'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserPlus } from 'lucide-react'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

import { EditPersonDialog } from './edit-person-dialog'
import { CreatePersonDialog } from './create-person-dialog'
import { PersonCard } from '@/components/moneyflow/person-card'
import { Account, Category, Person, Shop, Subscription } from '@/types/moneyflow.types'
import { ensureDebtAccountAction } from '@/actions/people-actions'

type PeopleGridProps = {
  people: Person[]
  subscriptions: Subscription[]
  shops: Shop[]
  accounts: Account[]
  categories: Category[]
}

type FilterStatus = 'all' | 'active' | 'settled'

export function PeopleGrid({ people, subscriptions, shops, accounts, categories }: PeopleGridProps) {
  const peopleMap = useMemo(() => {
    const map = new Map<string, Person>()
    people.forEach(p => map.set(p.id, p))
    return map
  }, [people])

  const [editId, setEditId] = useState<string | null>(null)
  const selectedPerson = editId ? peopleMap.get(editId) ?? null : null
  const router = useRouter()
  const [, startEnsuring] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

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

  const activePeople = filteredPeople.filter(person => (person.balance ?? 0) !== 0)
  const settledPeople = filteredPeople.filter(person => (person.balance ?? 0) === 0)

  const showActive = filterStatus === 'all' || filterStatus === 'active'
  const showSettled = filterStatus === 'all' || filterStatus === 'settled'

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">People directory</p>
            <h2 className="text-2xl font-semibold text-slate-900">Members</h2>
            <p className="text-xs text-slate-500">Group by status, then collect debts quickly.</p>
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-1 text-[11px] font-semibold text-slate-600">
              {(['all', 'active', 'settled'] as FilterStatus[]).map(status => (
                <button
                  key={status}
                  type="button"
                  className={`flex items-center gap-1 rounded-full px-3 py-1 transition ${filterStatus === status
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                    }`}
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'all' ? 'All' : status === 'active' ? 'Active Debtors' : 'Settled'}
                </button>
              ))}
            </div>
            <CreatePersonDialog
              subscriptions={subscriptions}
              trigger={
                <CustomTooltip content="Add new person">
                  <button className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-blue-500 hover:text-blue-600">
                    <UserPlus className="h-4 w-4" />
                  </button>
                </CustomTooltip>
              }
            />
          </div>
        </div>
      </div>

      {showActive && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-500">⚠️ Outstanding Debt</h3>
            <p className="text-xs text-slate-500">{activePeople.length} people</p>
          </div>
          {activePeople.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              No outstanding debters right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activePeople.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  shops={shops}
                  accounts={accounts}
                  categories={categories}
                  subscriptions={subscriptions}
                  onEdit={() => setEditId(person.id)}
                  onOpenDebt={() => handleOpenDebt(person)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showSettled && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-500">✅ Settled / Clean</h3>
            <p className="text-xs text-slate-500">{settledPeople.length} people</p>
          </div>
          {settledPeople.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              Everyone currently owes you something.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {settledPeople.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  shops={shops}
                  accounts={accounts}
                  categories={categories}
                  subscriptions={subscriptions}
                  onEdit={() => setEditId(person.id)}
                  onOpenDebt={() => handleOpenDebt(person)}
                  variant="compact"
                />
              ))}
            </div>
          )}
        </section>
      )}

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
