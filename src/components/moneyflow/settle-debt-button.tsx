'use client';

import { useState } from 'react';
import { Account, DebtAccount } from '@/types/moneyflow.types';
import { SettleDebtDialog } from './settle-debt-dialog';

interface SettleDebtButtonProps {
    debtAccount: DebtAccount;
    accounts: Account[];
}

export function SettleDebtButton({ debtAccount, accounts }: SettleDebtButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const openDialog = () => setIsOpen(true);
    const closeDialog = () => setIsOpen(false);

    // Cannot settle if balance is zero
    if (Math.abs(debtAccount.current_balance) < 0.01) {
        return null;
    }

    const bankAccounts = accounts.filter(
        acc => acc.type === 'bank' || acc.type === 'cash' || acc.type === 'ewallet'
    );

    return (
        <>
            <button
                onClick={openDialog}
                className="mt-2 inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                {'Tất toán nhanh'}
            </button>
            {isOpen && (
                <SettleDebtDialog
                    debt={debtAccount}
                    accounts={bankAccounts}
                    onClose={closeDialog}
                />
            )}
        </>
    );
}
