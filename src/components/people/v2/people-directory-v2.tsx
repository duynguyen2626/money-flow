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
import { syncAllSheetDataAction, syncAllPeopleSheetsAction } from "@/actions/people-actions";
import { PeopleColumnKey } from "@/hooks/usePeopleColumnPreferences";

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
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [showArchived, setShowArchived] = useState(false);
    const [isSlideOpen, setIsSlideOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

    const [sortConfig, setSortConfig] = useState<{ key: PeopleColumnKey; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: PeopleColumnKey) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleResetSort = () => {
        setSortConfig(null);
    };

    // Transaction Slide State
    const [txnSlideOpen, setTxnSlideOpen] = useState(false);
    const [txnInitialData, setTxnInitialData] = useState<Partial<SingleTransactionFormValues> | undefined>(undefined);

    // Calculate Available Years from data
    const availableYears = useMemo(() => {
        const yearSet = new Set<number>();
        people.forEach(p => {
            p.monthly_debts?.forEach(d => {
                if (d.tag) {
                    const year = parseInt(d.tag.split('-')[0]);
                    if (!isNaN(year)) yearSet.add(year);
                }
            });
            p.cycle_sheets?.forEach(s => {
                if (s.cycle_tag) {
                    const year = parseInt(s.cycle_tag.split('-')[0]);
                    if (!isNaN(year)) yearSet.add(year);
                }
            });
        });
        // Add current year
        yearSet.add(new Date().getFullYear());
        return Array.from(yearSet).sort((a, b) => b - a);
    }, [people]);

    // Statistics
    const stats = useMemo(() => {
        return {
            outstandingCount: people.filter(p => (p.current_debt || 0) > 0 && !p.is_archived).length,
            settledCount: people.filter(p => (p.current_debt || 0) === 0 && !p.is_archived).length,
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
            result = result.filter(p => ((p as any).current_debt || 0) > 0);
        } else if (activeFilter === 'settled') {
            result = result.filter(p => ((p as any).current_debt || 0) === 0);
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

        // Apply Manual Sort if exists
        if (sortConfig) {
            result.sort((a, b) => {
                let valA: any = (a as any)[sortConfig.key] ?? 0;
                let valB: any = (b as any)[sortConfig.key] ?? 0;

                // Priority for current_tag
                if (sortConfig.key === 'current_tag') {
                    valA = a.current_cycle_label || '';
                    valB = b.current_cycle_label || '';
                } else if (sortConfig.key === 'current_debt') {
                    valA = a.current_cycle_debt || 0;
                    valB = b.current_cycle_debt || 0;
                }

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'asc'
                        ? valA.localeCompare(valB)
                        : valB.localeCompare(valA);
                }

                return sortConfig.direction === 'asc'
                    ? (valA > valB ? 1 : -1)
                    : (valA < valB ? 1 : -1);
            });
        } else {
            // Default Sort: by current_debt (highest first)
            result.sort((a, b) => {
                const currentDebtA = (a as any).current_debt || 0;
                const currentDebtB = (b as any).current_debt || 0;
                return currentDebtB - currentDebtA;
            });
        }

        return result;
    }, [people, activeFilter, searchQuery, showArchived, sortConfig]);





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

    const [isSyncingAll, setIsSyncingAll] = useState(false);

    const handleRefreshAll = async () => {
        setIsSyncingAll(true);
        const promise = syncAllPeopleSheetsAction();
        toast.promise(promise, {
            loading: 'Syncing all sheets...',
            success: (results) => {
                const succeeded = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;
                return `Successfully synced ${succeeded} sheets${failed > 0 ? `, ${failed} failed` : ''}`;
            },
            error: 'Failed to sync sheets',
        });
        await promise;
        setIsSyncingAll(false);
    };

    const handleSyncPerson = async (personId: string) => {
        const promise = syncAllSheetDataAction(personId);
        toast.promise(promise, {
            loading: 'Syncing sheet...',
            success: 'Sheet synced successfully',
            error: (err) => `Failed to sync sheet: ${err.message || err}`
        });
        await promise;
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
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                availableYears={availableYears}
                onAdd={() => {
                    setSelectedPerson(null);
                    setIsSlideOpen(true);
                }}
                stats={stats}
                showArchived={showArchived}
                onToggleArchived={setShowArchived}
                onRefreshAll={handleRefreshAll}
                isSyncingAll={isSyncingAll}
                canResetSort={!!sortConfig}
                onResetSort={handleResetSort}
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-visible">
                <div className="w-full">
                    <PeopleTableV2
                        people={filteredPeople}
                        accounts={accounts}
                        onEdit={(p) => handleAction(p, 'settings')}
                        onLend={(p) => handleAction(p, 'lend')}
                        onRepay={(p) => handleAction(p, 'repay')}
                        onSync={handleSyncPerson}
                        sortConfig={sortConfig}
                        onSort={handleSort}
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

