
'use client';

import { use, useEffect, useState } from 'react';
import { getPeoplePageData } from '@/actions/people-actions';
import { TagFilterProvider, useTagFilter } from '@/context/tag-filter-context';
import { notFound } from 'next/navigation';
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog';
import { Account, Category, Person, Shop, Subscription, DebtAccount, TransactionWithDetails } from '@/types/moneyflow.types';
import { DebtByTagAggregatedResult } from '@/services/debt.service';
import { getUnifiedTransactions } from '@/services/transaction.service';
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions';

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
    return numberFormatter.format(value);
}

function PeoplePageInner({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
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

    useEffect(() => {
        async function fetchData() {
            if (!id) return;
            setLoading(true);
            try {
                const data = await getPeoplePageData(id);
                setPerson(data.person);
                setDebtCycles(data.debtCycles);
                setAccounts(data.accounts);
                setCategories(data.categories);
                setPersonProfile(data.personProfile);
                setSubscriptions(data.subscriptions);
                setAllPeople(data.allPeople);
                setShops(data.shops ?? []);
                if (!data.person) {
                    notFound();
                } else {
                    const txnData = await getUnifiedTransactions(data.person.id, 200);
                    setTransactions(txnData);
                }
            } catch (error) {
                console.error("Failed to fetch person details:", error);
                notFound();
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!person) {
        return notFound();
    }

    const totalBalance = person.current_balance;
    const balanceColor = totalBalance > 0 ? 'text-green-600' : 'text-red-600';
    const balanceText = totalBalance > 0 ? 'They owe you' : 'You owe them';

    const displayAvatar = person.avatar_url || personProfile?.avatar_url || null;

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
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                        <p className={`text-3xl font-bold ${balanceColor}`}>{formatCurrency(totalBalance)}</p>
                        <div className="flex flex-wrap justify-end gap-2">
                            <AddTransactionDialog
                                accounts={accounts}
                                categories={categories}
                                people={allPeople}
                                shops={shops}
                                buttonText="Add Transaction"
                                defaultPersonId={id}
                            />
                        </div>
                    </div>
                </div>
            </section>

            <FilterableTransactions
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              people={allPeople}
              shops={shops}
              accountId={id}
              hidePeopleColumn={true}
            />
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
