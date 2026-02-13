"use client";

import React, { useState, useMemo } from "react";
import { Person, Account, Category, Shop, TransactionWithDetails } from "@/types/moneyflow.types";
import { UnifiedTransactionTable } from "@/components/moneyflow/unified-transaction-table";
import { TypeFilterDropdown } from "@/components/transactions-v2/header/TypeFilterDropdown";
import { StatusDropdown } from "@/components/transactions-v2/header/StatusDropdown";
import { QuickFilterDropdown } from "@/components/transactions-v2/header/QuickFilterDropdown";
import { MonthYearPickerV2 } from "@/components/transactions-v2/header/MonthYearPickerV2";
import { AddTransactionDropdown } from "@/components/transactions-v2/header/AddTransactionDropdown";
import { TransactionSlideV2 } from "@/components/transaction/slide-v2/transaction-slide-v2";
import { SingleTransactionFormValues } from "@/components/transaction/slide-v2/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, FilterX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import { buildEditInitialValues } from "@/lib/transaction-mapper";

interface PersonDetailTransactionsProps {
    person: Person;
    transactions: TransactionWithDetails[];
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];
}

type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback';
type StatusFilter = 'active' | 'void' | 'pending';

export function PersonDetailTransactions({
    person,
    transactions,
    accounts,
    categories,
    people,
    shops,
}: PersonDetailTransactionsProps) {
    const router = useRouter();

    // Dialog State
    const [isAddSlideOpen, setIsAddSlideOpen] = useState(false);
    const [addInitialData, setAddInitialData] = useState<Partial<SingleTransactionFormValues> | undefined>();

    // Edit State
    const [editingTxn, setEditingTxn] = useState<TransactionWithDetails | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
    const [date, setDate] = useState<Date>(new Date());
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [dateMode, setDateMode] = useState<'month' | 'range' | 'date' | 'all' | 'year'>('month');
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
    const [isFilterActive, setIsFilterActive] = useState(false);

    // Available Filter Options
    const availableAccounts = useMemo(() => {
        const accountIds = new Set<string>();
        transactions.forEach(t => {
            if (t.source_account_id) accountIds.add(t.source_account_id);
            if (t.target_account_id) accountIds.add(t.target_account_id);
        });
        return accounts.filter(a => accountIds.has(a.id));
    }, [transactions, accounts]);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        transactions.forEach(t => {
            const tag = t.tag;
            if (tag && /^\d{4}-\d{2}$/.test(tag)) months.add(tag);
        });
        return months;
    }, [transactions]);

    // Filtering Logic
    const filteredTransactions = useMemo(() => {
        let result = transactions;

        // Status filter
        if (statusFilter === 'void') {
            result = result.filter(t => t.status === 'void');
        } else if (statusFilter === 'pending') {
            result = result.filter(t => t.status === 'pending' || t.status === 'waiting_refund');
        } else {
            result = result.filter(t => t.status !== 'void');
        }

        if (isFilterActive) {
            // Type Filter
            if (filterType !== 'all') {
                result = result.filter(t => {
                    const type = t.type?.toLowerCase();
                    const matchType = filterType === 'lend' ? 'debt' : (filterType === 'repay' ? 'repayment' : filterType);
                    return type === matchType;
                });
            }

            // Account Filter
            if (selectedAccountId) {
                result = result.filter(t => t.source_account_id === selectedAccountId || t.target_account_id === selectedAccountId);
            }

            // Search Filter
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                result = result.filter(t =>
                    t.note?.toLowerCase().includes(q) ||
                    t.shop_name?.toLowerCase().includes(q) ||
                    t.id.toLowerCase().includes(q)
                );
            }

            // Date Filter
            if (dateMode === 'month') {
                const monthStart = startOfMonth(date);
                const monthEnd = endOfMonth(date);
                result = result.filter(t => {
                    const txDate = parseISO(t.occurred_at || t.created_at || '');
                    return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
                });
            } else if (dateMode === 'range' && dateRange?.from) {
                const rangeEnd = dateRange.to || dateRange.from;
                result = result.filter(t => {
                    const txDate = parseISO(t.occurred_at || t.created_at || '');
                    return isWithinInterval(txDate, { start: dateRange!.from!, end: rangeEnd! });
                });
            }
        }

        return result;
    }, [transactions, isFilterActive, filterType, selectedAccountId, searchTerm, date, dateRange, dateMode, statusFilter]);

    const handleReset = () => {
        setFilterType('all');
        setSelectedAccountId(undefined);
        setDate(new Date());
        setDateRange(undefined);
        setIsFilterActive(false);
        setSearchTerm('');
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Add Slide */}
            <TransactionSlideV2
                open={isAddSlideOpen}
                onOpenChange={setIsAddSlideOpen}
                initialData={addInitialData}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={() => {
                    setIsAddSlideOpen(false);
                    router.refresh();
                }}
                mode="single"
                operationMode="add"
            />

            {/* Edit Slide */}
            <TransactionSlideV2
                open={!!editingTxn}
                onOpenChange={(open) => !open && setEditingTxn(null)}
                initialData={editingTxn ? (() => {
                    const v1Values = buildEditInitialValues(editingTxn) as any;
                    return {
                        ...v1Values,
                        // Map V1 'debt_account_id' to V2 'target_account_id'
                        target_account_id: v1Values.debt_account_id,
                        // Cast type to satisfy V2 schema (ignore incompatible types like 'quick-people' which won't exist in DB)
                        type: v1Values.type as SingleTransactionFormValues['type'],
                    };
                })() : undefined}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                mode="single"
                operationMode="edit"
                editingId={editingTxn?.id}
                onSuccess={() => {
                    setEditingTxn(null);
                    router.refresh();
                }}
            />

            {/* Toolbar */}
            <div className="border-b border-slate-200 bg-white px-6 py-3">
                <div className="flex items-center gap-2">
                    <StatusDropdown value={statusFilter} onChange={setStatusFilter} />

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (isFilterActive) handleReset();
                            else setIsFilterActive(true);
                        }}
                        className={isFilterActive ? "h-9 bg-slate-100 text-slate-700 border-slate-300" : "h-9"}
                    >
                        {isFilterActive ? <><FilterX className="h-4 w-4 mr-2" />Clear</> : <><Filter className="h-4 w-4 mr-2" />Filter</>}
                    </Button>

                    <div className="flex items-center gap-2 flex-1">
                        <TypeFilterDropdown value={filterType} onChange={setFilterType} />

                        <QuickFilterDropdown
                            items={availableAccounts.map(a => ({ id: a.id, name: a.name, image: a.image_url || undefined, type: 'account' }))}
                            value={selectedAccountId}
                            onValueChange={setSelectedAccountId}
                            placeholder="Account"
                            emptyText="No accounts found"
                        />

                        <MonthYearPickerV2
                            date={date}
                            dateRange={dateRange}
                            mode={dateMode}
                            onDateChange={setDate}
                            onRangeChange={setDateRange}
                            onModeChange={setDateMode}
                            availableMonths={availableMonths}
                        />

                        <div className="relative flex-1 max-w-sm">
                            <Input
                                placeholder="Search notes, shops..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-9 pl-9 pr-8 text-sm border-slate-200"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <AddTransactionDropdown
                        onSelect={(type) => {
                            setAddInitialData({
                                type: type as SingleTransactionFormValues['type'],
                                person_id: person.id,
                                occurred_at: new Date(),
                            });
                            setIsAddSlideOpen(true);
                        }}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <UnifiedTransactionTable
                    transactions={filteredTransactions}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    context="person"
                    contextId={person.id}
                    activeTab={statusFilter}
                    showPagination
                    onEdit={setEditingTxn}
                />
            </div>
        </div>
    );
}
