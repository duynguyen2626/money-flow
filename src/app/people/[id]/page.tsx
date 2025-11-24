'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { getPeoplePageData } from '@/actions/people-actions';
import { DebtCycleFilter } from '@/components/moneyflow/debt-cycle-filter';
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions';
import { TagFilterProvider, useTagFilter } from '@/context/tag-filter-context';
import { EditPersonDialog } from '@/components/people/edit-person-dialog';
import { notFound } from 'next/navigation';
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog';
import { Account, Category, Person, Shop, TransactionWithDetails, Subscription, DebtAccount } from '@/types/moneyflow.types';
import { DebtByTagAggregatedResult } from '@/services/debt.service';
import { SheetSyncControls } from '@/components/people/sheet-sync-controls';

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
    return numberFormatter.format(value);
}

function PeoplePageInner({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [person, setPerson] = useState<DebtAccount | null>(null);
    const [debtCycles, setDebtCycles] = useState<DebtByTagAggregatedResult[]>([]);
    const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [personProfile, setPersonProfile] = useState<Person | null>(null);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [allPeople, setAllPeople] = useState<Person[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const { selectedTag, setSelectedTag } = useTagFilter();
    const [activeTab, setActiveTab] = useState<'all' | 'tagged' | 'untagged'>('all');
    const [isExpanded, setIsExpanded] = useState(true);
    const [showSheetSettings, setShowSheetSettings] = useState(true);

    const refreshData = async () => {
        if (!id) return;
        try {
            const data = await getPeoplePageData(id);
            setPerson(data.person);
            setDebtCycles(data.debtCycles);
            setTransactions(data.transactions);
            setAccounts(data.accounts);
            setCategories(data.categories);
            setPersonProfile(data.personProfile);
            setSubscriptions(data.subscriptions);
            setAllPeople(data.allPeople);
            setShops(data.shops ?? []);
            if (!data.person) {
                notFound();
            }
        } catch (error) {
            console.error("Failed to fetch person details:", error);
        }
    }

    useEffect(() => {
        setLoading(true);
        refreshData().finally(() => setLoading(false));
    }, [id]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(txn => 
            txn.note?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

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
                </div>

                <div className="border-t pt-5">
                    {canShowSheetControls && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                            <p className="text-sm font-semibold text-slate-700">Google Sheet Sync</p>
                            <p className="text-xs text-slate-500">Test connection / Sync all transactions</p>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                    onClick={() => setShowSheetSettings(prev => !prev)}
                                >
                                    {showSheetSettings ? 'Collapse' : 'Open Sheet settings'}
                                </button>
                            </div>
                            {showSheetSettings && (
                                <div className="mt-3">
                                    <SheetSyncControls
                                        personId={person.owner_id ?? personProfile?.id ?? null}
                                        sheetLink={displaySheetLink}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <DebtCycleFilter
                        allCycles={debtCycles}
                        debtAccount={person}
                        accounts={accounts}
                        categories={categories}
                        people={allPeople}
                        displayedCycles={displayedCycles}
                        isExpanded={isExpanded}
                        onQuickAddSuccess={refreshData}
                        onSettleSuccess={refreshData}
                        shops={shops}
                    />
                </div>
            </section>

            <section className="bg-white shadow rounded-lg p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <h2 className="text-lg font-semibold">Transaction History</h2>
                    <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                        <div className="relative flex-1 max-w-[520px] min-w-[240px]">
                            <input
                                type="text"
                                placeholder="Search by note..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            {searchTerm && (
                                <button
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={() => setSearchTerm('')}
                                    title="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <span className="whitespace-nowrap text-sm text-slate-500">{filteredTransactions.length} transactions</span>
                    </div>
                </div>
                <div className="mt-4">
                    <FilterableTransactions
                        transactions={filteredTransactions}
                        categories={categories}
                        accounts={accounts}
                        people={allPeople}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        shops={shops}
                    />
                </div>
            </section>
        </div>
    );
}

export default function PeopleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <TagFilterProvider>
            <PeoplePageInner params={params} />
        </TagFilterProvider>
    );
}
