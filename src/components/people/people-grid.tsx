'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserPlus, AlertTriangle, CheckCircle, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

import { CreatePersonDialog } from './create-person-dialog'
import { PersonCard } from './person-card'
import { Account, Category, Person, Shop, Subscription } from '@/types/moneyflow.types'
import { cn } from '@/lib/utils'

type PeopleGridProps = {
  people: Person[]
  subscriptions: Subscription[]
  shops: Shop[]
  accounts: Account[]
  categories: Category[]
}

type FilterTab = 'debt' | 'settled' | 'archived'

export function PeopleGrid({ people, subscriptions, shops, accounts, categories }: PeopleGridProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('debt')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people
    const lower = searchQuery.toLowerCase()
    return people.filter(p => p.name.toLowerCase().includes(lower))
  }, [people, searchQuery])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('people-grid-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const handleSelect = (person: Person) => {
    setSelectedId(person.id)
    router.push(`/people/${person.id}`)
  }

  // Group people by status
  const activePeople = filteredPeople.filter(person => !person.is_archived && Math.abs(person.balance ?? 0) > 0)
  const settledPeople = filteredPeople.filter(person => !person.is_archived && Math.abs(person.balance ?? 0) === 0)
  const archivedPeople = filteredPeople.filter(person => person.is_archived)

  // Get current tab data
  const currentPeople = activeTab === 'debt' ? activePeople
    : activeTab === 'settled' ? settledPeople
      : archivedPeople

  const tabs: { id: FilterTab; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    {
      id: 'debt',
      label: 'Outstanding Debt',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      count: activePeople.length,
      color: 'text-rose-600 bg-rose-50 border-rose-200'
    },
    {
      id: 'settled',
      label: 'Settled',
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      count: settledPeople.length,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      id: 'archived',
      label: 'Archived',
      icon: <Archive className="h-3.5 w-3.5" />,
      count: archivedPeople.length,
      color: 'text-slate-500 bg-slate-50 border-slate-200'
    },
  ]

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[180px]">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">People directory</p>
            <h2 className="text-2xl font-semibold text-slate-900">Members</h2>
          </div>

          {/* Tab Filter - Before Search */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? `${tab.color} border shadow-sm`
                    : "text-slate-500 hover:text-slate-700 hover:bg-white"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  activeTab === tab.id ? "bg-white/80" : "bg-slate-200"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Add Person Button */}
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

        {/* People Grid */}
        {currentPeople.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="text-slate-400 mb-2">
              {activeTab === 'debt' && <AlertTriangle className="h-8 w-8 mx-auto" />}
              {activeTab === 'settled' && <CheckCircle className="h-8 w-8 mx-auto" />}
              {activeTab === 'archived' && <Archive className="h-8 w-8 mx-auto" />}
            </div>
            <p className="text-sm text-slate-500">
              {activeTab === 'debt' && 'No outstanding debtors right now.'}
              {activeTab === 'settled' && 'No settled members yet.'}
              {activeTab === 'archived' && 'No archived members.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {currentPeople.map(person => (
              <PersonCard
                key={person.id}
                person={person}
                subscriptions={subscriptions}
                isSelected={selectedId === person.id}
                onSelect={() => handleSelect(person)}
                accounts={accounts}
                categories={categories}
                shops={shops}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
