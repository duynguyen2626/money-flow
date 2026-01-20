"use client"

import React, { useState, useMemo } from 'react';
import { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { AccountHeaderV2 } from "./AccountHeaderV2";
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
    // State
    const [searchTerm, setSearchTerm] = useState('');

    console.log('AccountDirectoryV2: initialAccounts count', initialAccounts?.length);
    console.log('AccountDirectoryV2: sample account', initialAccounts?.find(a => a.name === 'Exim Violet'));
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<'accounts_cards' | 'credit' | 'savings' | 'debt'>('accounts_cards');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // CRUD state (Account)
    const [isAccountSlideOpen, setIsAccountSlideOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

    // Transaction state
    const [isTxnSlideOpen, setIsTxnSlideOpen] = useState(false);
    const [txnInitialData, setTxnInitialData] = useState<any>(null);

    const filteredAccounts = useMemo(() => {
        let result = initialAccounts;

        // Filter Logic
        if (activeFilter === 'accounts_cards') {
            result = result.filter(a => ['bank', 'ewallet', 'cash', 'credit_card'].includes(a.type) && a.is_active !== false);
        } else if (activeFilter === 'credit') {
            result = result.filter(a => a.type === 'credit_card' && a.is_active !== false);
        } else if (activeFilter === 'savings') {
            result = result.filter(a => a.type === 'savings' && a.is_active !== false);
        } else if (activeFilter === 'debt') {
            result = result.filter(a => a.type === 'debt' && a.is_active !== false);
        }

        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.type.toLowerCase().includes(q) ||
                a.account_number?.includes(q)
            );
        }

        return result;
    }, [initialAccounts, searchQuery, activeFilter]);

    // Derived stats for header
    const activeCount = initialAccounts.filter(a => a.is_active !== false && a.type !== 'debt').length;
    const debtCount = initialAccounts.filter(a => a.type === 'debt' && a.is_active !== false).length;
    const closedCount = initialAccounts.filter(a => a.is_active === false).length;

    // --- Account Handlers ---
    const handleAddAccount = () => {
        setSelectedAccount(null);
        setIsAccountSlideOpen(true);
    };

    const handleEditAccount = (account: Account) => {
        setSelectedAccount(account);
        setIsAccountSlideOpen(true);
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

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
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
            />

            <div className="flex-1 overflow-auto p-4 sm:p-6">
                {viewMode === 'table' ? (
                    <AccountTableV2
                        accounts={filteredAccounts}
                        onEdit={handleEditAccount}
                        onLend={handleLend}
                        onRepay={handleRepay}
                        onPay={handlePay}
                        onTransfer={handleTransfer}
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
                    // Refresh data if needed, but slide handles toast and router.refresh
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
