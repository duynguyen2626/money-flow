"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { AccountHeaderV2, AdvancedFilters } from "./AccountHeaderV2";
import { AccountTableV2 } from "./AccountTableV2";
import { AccountGridView } from "./AccountGridView";
import { AccountSlideV2 } from "./AccountSlideV2";
import { TransactionSlideV2 } from "@/components/transaction/slide-v2/transaction-slide-v2";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccountDirectoryV2Props {
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];
}

export function AccountDirectoryV2({
    accounts: initialAccounts,
    categories,
    people,
    shops
}: AccountDirectoryV2Props) {
    const router = useRouter();
    // State
    const [searchTerm, setSearchTerm] = useState('');

    console.log('AccountDirectoryV2: initialAccounts count', initialAccounts?.length);
    console.log('AccountDirectoryV2: sample account', initialAccounts?.find(a => a.name === 'Exim Violet'));
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<'accounts_cards' | 'credit' | 'savings' | 'debt' | 'closed'>('accounts_cards');
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
        family: false,
        dueSoon: false,
        needsSpendMore: false,
        multiRuleCb: false
    });
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // CRUD state (Account)
    const [isAccountSlideOpen, setIsAccountSlideOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [editStack, setEditStack] = useState<Account[]>([]);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

    // Transaction state
    const [isTxnSlideOpen, setIsTxnSlideOpen] = useState(false);
    const [txnInitialData, setTxnInitialData] = useState<any>(null);

    const filteredAccounts = useMemo(() => {
        let result = initialAccounts;

        // --- Main Filter Logic ---
        if (activeFilter === 'accounts_cards') {
            result = result.filter(a => ['bank', 'ewallet', 'cash', 'credit_card'].includes(a.type) && a.is_active !== false);
        } else if (activeFilter === 'credit') {
            result = result.filter(a => a.type === 'credit_card' && a.is_active !== false);
        } else if (activeFilter === 'savings') {
            result = result.filter(a => a.type === 'savings' && a.is_active !== false);
        } else if (activeFilter === 'debt') {
            result = result.filter(a => a.type === 'debt' && a.is_active !== false);
        } else if (activeFilter === 'closed') {
            result = result.filter(a => a.is_active === false);
        }

        // --- Advanced Filter Logic ---
        if (advancedFilters.family) {
            result = result.filter(a => (a.relationships?.is_parent || a.parent_account_id));
        }

        if (advancedFilters.dueSoon) {
            const today = new Date();
            const fiveDaysFromNow = new Date();
            fiveDaysFromNow.setDate(today.getDate() + 5);

            result = result.filter(a => {
                if (!a.stats?.due_date) return false;
                const dueDate = new Date(a.stats.due_date);
                return dueDate >= today && dueDate <= fiveDaysFromNow;
            });
        }

        if (advancedFilters.needsSpendMore) {
            result = result.filter(a => {
                const spent = a.stats?.spent_this_cycle || 0;
                const target = a.cb_min_spend || a.stats?.min_spend || 0;
                return target > 0 && spent < target;
            });
        }

        if (advancedFilters.multiRuleCb) {
            result = result.filter(a => {
                const rules = a.cb_rules_json ? (Array.isArray(a.cb_rules_json) ? a.cb_rules_json : (a.cb_rules_json as any).tiers?.flatMap((t: any) => t.rules || [])) : [];
                return (rules?.length || 0) > 1;
            });
        }

        // --- Search Filter ---
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.type.toLowerCase().includes(q) ||
                a.id.toLowerCase().includes(q) ||
                a.account_number?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [initialAccounts, searchQuery, activeFilter, advancedFilters]);

    // Derived stats for header
    const activeCount = initialAccounts.filter(a => a.is_active !== false && a.type !== 'debt').length;
    const debtCount = initialAccounts.filter(a => a.type === 'debt' && a.is_active !== false).length;
    const closedCount = initialAccounts.filter(a => a.is_active === false).length;

    // --- Account Handlers ---
    const handleAddAccount = () => {
        setSelectedAccount(null);
        setEditStack([]);
        setIsAccountSlideOpen(true);
    };

    const handleEditAccount = (account: Account) => {
        if (isAccountSlideOpen && selectedAccount && selectedAccount.id !== account.id) {
            setEditStack(prev => [...prev, selectedAccount]);
        } else if (!isAccountSlideOpen) {
            setEditStack([]);
        }
        setSelectedAccount(account);
        setIsAccountSlideOpen(true);
    };

    const handleBack = () => {
        if (editStack.length > 0) {
            const previous = editStack[editStack.length - 1];
            setEditStack(prev => prev.slice(0, -1));
            setSelectedAccount(previous);
        } else {
            setIsAccountSlideOpen(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setAccountToDelete(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!accountToDelete) return;

        try {
            const { deleteAccount } = await import("@/services/account.service");
            const ok = await deleteAccount(accountToDelete);
            if (ok) {
                toast.success("Account deleted successfully");
            } else {
                toast.error("Failed to delete account");
            }
        } catch (err) {
            toast.error("Error deleting account");
        } finally {
            setIsDeleteOpen(false);
            setAccountToDelete(null);
        }
    };

    // --- Transaction Handlers ---
    const handleLend = (account: Account) => {
        setTxnInitialData({
            type: 'debt',
            source_account_id: account.id,
            occurred_at: new Date(),
        });
        setIsTxnSlideOpen(true);
    };

    const handleRepay = (account: Account) => {
        // Repay TO this account? Or this account is REPAYING someone?
        // Usually repaying a credit card bill or loan.
        setTxnInitialData({
            type: 'repayment',
            target_account_id: account.id, // Paying into this account
            occurred_at: new Date(),
        });
        setIsTxnSlideOpen(true);
    };

    const handlePay = (account: Account) => {
        setTxnInitialData({
            type: 'expense',
            source_account_id: account.id,
            occurred_at: new Date(),
        });
        setIsTxnSlideOpen(true);
    };

    const handleTransfer = (account: Account) => {
        setTxnInitialData({
            type: 'transfer',
            source_account_id: account.id,
            occurred_at: new Date(),
        });
        setIsTxnSlideOpen(true);
    };

    const handleCategoryChange = (categoryId: string | undefined) => {
        setSelectedCategory(categoryId || null);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <AccountHeaderV2
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter as any} // Cast to any to bypass strict check if header types aren't perfectly synced yet, but we updated header props
                onFilterChange={setActiveFilter as any}
                onAdd={handleAddAccount}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                activeCount={activeCount}
                debtCount={debtCount}
                closedCount={closedCount}
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                advancedFilters={advancedFilters}
                onAdvancedFiltersChange={setAdvancedFilters}
            />

            <div className="flex-1 overflow-auto px-6 py-4">
                {viewMode === 'table' ? (
                    <AccountTableV2
                        accounts={filteredAccounts}
                        onEdit={handleEditAccount}
                        onLend={handleLend}
                        onRepay={handleRepay}
                        onPay={handlePay}
                        onTransfer={handleTransfer}
                        allAccounts={initialAccounts}
                        categories={categories}
                    />
                ) : (
                    <AccountGridView
                        accounts={filteredAccounts}
                        onEdit={handleEditAccount}
                        onDelete={handleDeleteClick}
                    />
                )}
            </div>

            {/* Account CRUD Slide */}
            <AccountSlideV2
                open={isAccountSlideOpen}
                onOpenChange={setIsAccountSlideOpen}
                account={selectedAccount}
                allAccounts={initialAccounts}
                categories={categories}
                existingAccountNumbers={Array.from(new Set(initialAccounts.map(a => a.account_number).filter(Boolean))) as string[]}
                existingReceiverNames={Array.from(new Set(initialAccounts.map(a => a.receiver_name).filter(Boolean))) as string[]}
                onEditAccount={handleEditAccount}
                onBack={editStack.length > 0 ? handleBack : undefined}
            />

            {/* Transaction Quick Action Slide */}
            <TransactionSlideV2
                open={isTxnSlideOpen}
                onOpenChange={setIsTxnSlideOpen}
                initialData={txnInitialData}
                accounts={initialAccounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={() => {
                    setIsTxnSlideOpen(false);
                    router.refresh(); // Refresh account list/stats
                }}
            />

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black text-rose-600">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium">
                            This action cannot be undone. This will permanently delete the account and all associated transaction records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider"
                        >
                            Delete Account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
