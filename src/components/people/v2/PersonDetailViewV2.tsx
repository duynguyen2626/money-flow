"use client";

import React, { useState, useEffect } from "react";
import { Person, Account, Category, Shop, TransactionWithDetails, PersonCycleSheet } from "@/types/moneyflow.types";
import { PersonDetailHeaderV2, PersonTab } from "./PersonDetailHeaderV2";
import { PersonDetailTransactions } from "./PersonDetailTransactions";
import { useSearchParams, useRouter } from "next/navigation";
import { DebtCycleList } from "@/components/moneyflow/debt-cycle-list";
import { SplitBillManager } from "@/components/people/split-bill-manager";

interface PersonDetailViewV2Props {
    person: Person;
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];
    initialTransactions: TransactionWithDetails[];
    cycleSheets?: PersonCycleSheet[];
    debtTags?: any[];
}

export function PersonDetailViewV2({
    person,
    accounts,
    categories,
    people,
    shops,
    initialTransactions,
    cycleSheets = [],
    debtTags = [],
}: PersonDetailViewV2Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Tab State
    const initialTab = (searchParams.get('tab') as PersonTab) || 'timeline';
    const [activeTab, setActiveTab] = useState<PersonTab>(initialTab);

    // Sync tab with URL
    useEffect(() => {
        const tab = (searchParams.get('tab') as PersonTab) || 'timeline';
        // Validate tab
        if (['timeline', 'history', 'split-bill'].includes(tab)) {
            setActiveTab(tab);
        } else {
            setActiveTab('timeline');
        }
    }, [searchParams]);

    const handleTabChange = (tab: PersonTab) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`/people/${person.id}?${params.toString()}`);
    };

    useEffect(() => {
        document.title = `${person.name} - Money Flow`;
    }, [person.name]);

    const [activeCycleTag, setActiveCycleTag] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString());
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <PersonDetailHeaderV2
                person={person}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                accounts={accounts}
                showManageSheet={true}
            />

            <div className="flex-1 overflow-hidden relative bg-white">
                {activeTab === 'timeline' && (
                    <div className="h-full overflow-y-auto px-4 py-6 md:px-8">
                        <DebtCycleList
                            transactions={initialTransactions}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            personId={person.id}
                            sheetProfileId={person.id}
                            cycleSheets={cycleSheets}
                            filterType={filterType}
                            searchTerm={searchTerm}
                            debtTags={debtTags}
                            selectedYear={selectedYear}
                            onYearChange={setSelectedYear}
                            activeTag={activeCycleTag}
                            onTagChange={setActiveCycleTag}
                        />
                    </div>
                )}

                {activeTab === 'history' && (
                    <PersonDetailTransactions
                        person={person}
                        transactions={initialTransactions}
                        accounts={accounts}
                        categories={categories}
                        people={people}
                        shops={shops}
                    />
                )}

                {activeTab === 'split-bill' && (
                    <div className="h-full overflow-y-auto p-4 md:p-8">
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-4 shadow-sm max-w-5xl mx-auto">
                            <SplitBillManager
                                transactions={initialTransactions}
                                personId={person.id}
                                people={people}
                                accounts={accounts}
                                categories={categories}
                                shops={shops}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
