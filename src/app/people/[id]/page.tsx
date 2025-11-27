
'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPeoplePageData } from '@/actions/people-actions';
import { DebtCycleFilter } from '@/components/moneyflow/debt-cycle-filter';
import { TagFilterProvider, useTagFilter } from '@/context/tag-filter-context';
import { EditPersonDialog } from '@/components/people/edit-person-dialog';
import { notFound } from 'next/navigation';
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog';
import { Account, Category, Person, Shop, Subscription, DebtAccount, TransactionWithDetails } from '@/types/moneyflow.types';
import { DebtByTagAggregatedResult } from '@/services/debt.service';
import { SheetSyncControls } from '@/components/people/sheet-sync-controls';
import { getUnifiedTransactions } from '@/services/transaction.service';
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions';

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
    return numberFormatter.format(value);
}

function PeoplePageInner({ params }: { params: { id: string } }) {
    const { id } = params;
    const [person, setPerson] = useState<DebtAccount | null>(null);
    const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
    const [debtCycles, setDebtCycles] = useState<DebtByTagAggregatedResult[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [personProfile, setPersonProfile] = useState<Person | null>(null);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [allPeople, setAllPeople] = useState<Person[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);

    const { selectedTag, setSelectedTag } = useTagFilter();
    const [activeTab, setActiveTab] = useState<'all' | 'tagged' | 'untagged'>('all');
    const [isExpanded, setIsExpanded] = useState(true);
    const [showSheetSettings, setShowSheetSettings] = useState(true);

    const refreshData = useCallback(async (signal?: AbortSignal) => {
        if (!id || signal?.aborted) return;

        try {
            const data = await getPeoplePageData(id);
            if (signal?.aborted) return;

            if (!data.person) {
                notFound();
                return;
            }

            const txnData = await getUnifiedTransactions(data.person.id, 200);
            if (signal?.aborted) return;

            setPerson(data.person);
            setDebtCycles(data.debtCycles);
            setAccounts(data.accounts);
            setCategories(data.categories);
            setPersonProfile(data.personProfile);
            setSubscriptions(data.subscriptions);
            setAllPeople(data.allPeople);
            setShops(data.shops ?? []);
            setTransactions(txnData);
        } catch (error) {
            console.error("Failed to fetch person details:", error);
        }
    }, [id]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);

        refreshData(controller.signal).finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });

        return () => controller.abort();
    }, [refreshData]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!person) {
        return notFound();
    }

    const taggedCycles = debtCycles.filter(cycle => cycle.tag && cycle.tag !== 'UNTAGGED');
    const untaggedCycles = debtCycles.filter(cycle => !cycle.tag || cycle.tag === 'UNTAGGED');

    let displayedCycles = debtCycles;
    if (activeTab === 'tagged') {
        displayedCycles = taggedCycles;
    } else if (activeTab === 'untagged') {
        displayedCycles = untaggedCycles;
    }

    if (selectedTag) {
        displayedCycles = displayedCycles.filter(cycle => cycle.tag === selectedTag);
    }

    const clearTagSelection = () => setSelectedTag(null);
    const handleTabClick = (tab: 'all' | 'tagged' | 'untagged') => {
        const nextExpanded = activeTab === tab ? !isExpanded : true;
        setActiveTab(tab);
        setIsExpanded(nextExpanded);
        clearTagSelection();
    };
    const toggleExpand = () => setIsExpanded(prev => !prev);
    
    const totalBalance = person.current_balance;
    const balanceColor = totalBalance > 0 ? 'text-green-600' : 'text-red-600';
    const balanceText = totalBalance > 0 ? 'They owe you' : 'You owe them';

    const ownerPerson = allPeople.find(p => p.id === person.owner_id);
    const displayAvatar =
        person.avatar_url ||
        personProfile?.avatar_url ||
        ownerPerson?.avatar_url ||
        null;
    const displaySheetLink = personProfile?.sheet_link ?? ownerPerson?.sheet_link ?? person.sheet_link ?? null;
    const canShowSheetControls = Boolean(person.owner_id || personProfile || displaySheetLink);

    return (
        <div className="space-y-6">
            <section className="space-y-5 bg-white shadow rounded-lg p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        {displayAvatar ? (
                            <img src={displayAvatar} alt={person.name} className="h-16 w-16 object-contain" />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600">
                                {person.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold">{person.name}</h1>
                            <p className="text-sm text-gray-500">{balanceText}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end w-full">
                        <p className={`text-3xl font-bold ${balanceColor}`}>{formatCurrency(totalBalance)}</p>
                        <div className="flex w-full items-center justify-center mt-2">
                            <div className="flex-1 flex flex-wrap gap-2">
                                <button className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => handleTabClick('all')}>
                                    All ({debtCycles.length})
                                </button>
                                <button className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'tagged' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => handleTabClick('tagged')}>
                                    Tagged ({taggedCycles.length})
                                </button>
                                <button className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'untagged' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => handleTabClick('untagged')}>
                                    No tag ({untaggedCycles.length})
                                </button>
                                {selectedTag && (
                                    <button className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600" onClick={clearTagSelection}>
                                        Viewing: {selectedTag} (Show all)
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                                {personProfile && (
                                    <EditPersonDialog person={personProfile} subscriptions={subscriptions} />
                                )}
                                <AddTransactionDialog
                                    accounts={accounts}
                                    categories={categories}
                                    people={allPeople}
                                    shops={shops}
                                    buttonText="Repay / Settle"
                                    defaultType={totalBalance > 0 ? 'repayment' : 'debt'}
                                    defaultPersonId={id}
                                    defaultAmount={Math.abs(totalBalance)}
                                    buttonClassName="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                />
                                <AddTransactionDialog
                                    accounts={accounts}
                                    categories={categories}
                                    people={allPeople}
                                    shops={shops}
                                    buttonText="Quick Add Debt"
                                    defaultType="debt"
                                    defaultPersonId={id}
                                    buttonClassName="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                />
                                <button className="p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={toggleExpand}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        {isExpanded ? <path d="m18 15-6-6-6 6"/> : <path d="m6 9 6 6 6-6"/>}
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
import { notFound } from 'next/navigation'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getPersonDetails, getDebtByTags } from '@/services/debt.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { DebtCycleTabs } from '@/components/moneyflow/debt-cycle-tabs'
import { SheetSyncControls } from '@/components/people/sheet-sync-controls'
import { Plus, CheckCheck } from 'lucide-react'
import { CollapsibleSection } from '@/components/ui/collapsible-section'

export const dynamic = 'force-dynamic'

export default async function PeopleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = await params

  const [person, accounts, categories, people, shops, transactions, debtCycles] = await Promise.all([
    getPersonDetails(personId),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getUnifiedTransactions({ accountId: personId, limit: 200, context: 'person' }),
    getDebtByTags(personId),
  ])

  if (!person) {
    return notFound()
  }

  const sheetProfileId = person.owner_id ?? personId
  const balance = person.current_balance ?? 0
  const balanceLabel = balance > 0 ? 'They owe you' : balance < 0 ? 'You owe them' : 'Settled'
  const balanceClass = balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-600' : 'text-slate-600'

  // Map service result to component props
  const mappedCycles = debtCycles.map(c => ({
    tag: c.tag,
    balance: c.netBalance,
    status: c.status,
    last_activity: c.last_activity
  }))

  return (
    <TagFilterProvider>
      <div className="space-y-6">
        <section className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
            <div className="flex items-center gap-4">
              {person.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.avatar_url} alt={person.name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600">
                  {person.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{person.name}</h1>
                <p className="text-sm text-slate-500">{balanceLabel}</p>
                <p className={`text-xl font-bold ${balanceClass}`}>{balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                buttonText="Settle"
                defaultType="repayment"
                defaultPersonId={personId}
                defaultAmount={Math.abs(balance)}
                buttonClassName="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors flex items-center gap-2"
                triggerContent={
                  <>
                    <CheckCheck className="h-4 w-4" />
                    <span>Settle</span>
                  </>
                }
              />
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                buttonText="Add Debt"
                defaultType="debt"
                defaultPersonId={personId}
                buttonClassName="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors flex items-center gap-2"
                triggerContent={
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Add Debt</span>
                  </>
                }
              />
            </div>
          </div>

          <div className="mt-6">
            <CollapsibleSection title="Sheet Sync & Debt Cycles" defaultOpen={true}>
              <div className="space-y-6">
                {/* Sheet Sync Controls */}
                <SheetSyncControls personId={sheetProfileId} sheetLink={person.sheet_link} />

                {/* Debt Cycle Cards */}
                <DebtCycleTabs
                  allCycles={mappedCycles}
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  shops={shops}
                  personId={personId}
                />
              </div>
            </CollapsibleSection>
          </div>

          <div className="mt-6">
            <FilterableTransactions
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              people={people}
              shops={shops}
              accountId={personId}
              accountType="debt"
              hidePeopleColumn
            />
        </div>
    );
}

export default function PeopleDetailPage({ params }: { params: { id: string } }) {
    return (
        <TagFilterProvider>
            <PeoplePageInner params={params} />
        </TagFilterProvider>
    );
          </div>
        </section>
      </div>
    </TagFilterProvider>
  )
}
