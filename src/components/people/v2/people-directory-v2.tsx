"use client";

import React, { useState, useMemo } from "react";
import { Person, Subscription, Account, Category, Shop } from "@/types/moneyflow.types";
import {
    LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PeopleSlideV2 } from "./people-slide-v2";
import { PeopleTableV2 } from "./people-table-v2";
import { TransactionSlideV2 } from "@/components/transaction/slide-v2/transaction-slide-v2";
import { SingleTransactionFormValues } from "@/components/transaction/slide-v2/types";
import { toast } from "sonner";
import { PeopleTableHeaderV2, FilterStatus } from "./people-table-header-v2";

interface PeopleDirectoryV2Props {
    people: Person[];
    subscriptions: Subscription[];
    accounts: Account[];
    categories: Category[];
    shops: Shop[];
}


// ... existing imports

export function PeopleDirectoryV2({
    people,
    subscriptions,
    accounts,
    categories,
    shops,
}: PeopleDirectoryV2Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [isSlideOpen, setIsSlideOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

    // Transaction Slide State
    const [txnSlideOpen, setTxnSlideOpen] = useState(false);
    const [txnInitialData, setTxnInitialData] = useState<Partial<SingleTransactionFormValues> | undefined>(undefined);

    // Statistics
    const stats = useMemo(() => {
        return {
            outstandingCount: people.filter(p => (p.balance || 0) > 0 && !p.is_archived).length,
            settledCount: people.filter(p => (p.balance || 0) === 0 && !p.is_archived).length,
            archivedCount: people.filter(p => p.is_archived).length,
            groupsCount: people.filter(p => p.is_group).length,
        };
    }, [people]);

    // Filtering Logic
    const filteredPeople = useMemo(() => {
        let result = people;

        // Archive Filter (from toggle)
        result = result.filter(p => showArchived ? p.is_archived : !p.is_archived);

        // Status Filter
        if (activeFilter === 'outstanding') {
            result = result.filter(p => (p.balance || 0) > 0);
        } else if (activeFilter === 'settled') {
            result = result.filter(p => (p.balance || 0) === 0);
        } else if (activeFilter === 'groups') {
            result = result.filter(p => p.is_group);
        }

        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q)
            );
        }

        // Sort by highest debt (total debt = current_cycle_debt + outstanding_debt)
        result.sort((a, b) => {
            const totalDebtA = (a.current_cycle_debt || 0) + (a.outstanding_debt || 0);
            const totalDebtB = (b.current_cycle_debt || 0) + (b.outstanding_debt || 0);
            return totalDebtB - totalDebtA; // Descending order (highest first)
        });

        return result;
    }, [people, activeFilter, searchQuery, showArchived]);





    const handleAction = (person: Person, action: string) => {
        if (action === 'settings') {
            setSelectedPerson(person);
            setIsSlideOpen(true);
        } else if (action === 'lend') {
            setTxnInitialData({
                type: 'debt',
                person_id: person.id,
                amount: 0,
                occurred_at: new Date()
            });
            setTxnSlideOpen(true);
        } else if (action === 'repay') {
            const debtAmount = (person.current_cycle_debt || 0) + (person.outstanding_debt || 0);
            setTxnInitialData({
                type: 'repayment',
                person_id: person.id,
                // Pre-fill full amount if positive, otherwise 0
                amount: debtAmount > 0 ? debtAmount : 0,
                occurred_at: new Date()
            });
            setTxnSlideOpen(true);
        }
        console.log(`Action ${action} for ${person.name}`);
    };

    const handleTxnSuccess = () => {
        setTxnSlideOpen(false);
        // Page should refresh automatically locally or via router refresh if using RSC, 
        // but explicit refresh might be needed if this component is standard client comp.
        // Assuming parent page or server actions handle revalidation.
        window.location.reload(); // Simple refresh for now to update debts
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header Area */}
            <PeopleTableHeaderV2
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onAdd={() => {
                    setSelectedPerson(null);
                    setIsSlideOpen(true);
                }}
                stats={stats}
                showArchived={showArchived}
                onToggleArchived={setShowArchived}
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-visible">
                <div className="max-w-7xl mx-auto">
                    <PeopleTableV2
                        people={filteredPeople}
                        accounts={accounts}
                        onEdit={(p) => handleAction(p, 'settings')}
                        onLend={(p) => handleAction(p, 'lend')}
                        onRepay={(p) => handleAction(p, 'repay')}
                    />
                </div>
            </div>

            <PeopleSlideV2
                open={isSlideOpen}
                onOpenChange={setIsSlideOpen}
                person={selectedPerson}
                subscriptions={subscriptions}
            />

            <TransactionSlideV2
                open={txnSlideOpen}
                onOpenChange={setTxnSlideOpen}
                initialData={txnInitialData}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={handleTxnSuccess}
            />
        </div>
    );
}

