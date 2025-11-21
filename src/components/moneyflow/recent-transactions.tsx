'use client';

import { useState, useMemo } from 'react';
import { TransactionWithDetails } from '@/types/moneyflow.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

interface RecentTransactionsProps {
  transactions: TransactionWithDetails[];
  selectedTxnIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

export function RecentTransactions({ transactions, selectedTxnIds, onSelectionChange }: RecentTransactionsProps) {
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const displayedTransactions = useMemo(() => {
    if (showSelectedOnly) {
      return transactions.filter(txn => selectedTxnIds?.has(txn.id));
    }
    return transactions;
  }, [transactions, selectedTxnIds, showSelectedOnly]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(displayedTransactions.map(txn => txn.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (txnId: string, checked: boolean) => {
    const newSet = new Set(selectedTxnIds);
    if (checked) {
      newSet.add(txnId);
    } else {
      newSet.delete(txnId);
    }
    onSelectionChange(newSet);
  };

  const summary = useMemo(() => {
    const selectedTxns = transactions.filter(txn => selectedTxnIds.has(txn.id));
    const initialSummary = {
      sumBack: 0,
      sumAmount: 0,
      sumFinalPrice: 0,
    };

    const incomeSummary = { ...initialSummary };
    const expenseSummary = { ...initialSummary };

    for (const txn of selectedTxns) {
      const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount;
      const percentValue = typeof txn.cashback_share_percent === 'number' ? txn.cashback_share_percent : null;
      const fixedValue = typeof txn.cashback_share_fixed === 'number' ? txn.cashback_share_fixed : 0;
      const derivedSumBack = Math.abs(originalAmount ?? 0) * (percentValue ?? 0) + fixedValue;
      const cashbackAmount = typeof txn.cashback_share_amount === 'number' && txn.cashback_share_amount > 0 ? txn.cashback_share_amount : derivedSumBack;
      const finalPrice = Math.abs(txn.amount ?? 0);

      const targetSummary = txn.type === 'income' ? incomeSummary : expenseSummary;
      targetSummary.sumBack += cashbackAmount;
      targetSummary.sumAmount += Math.abs(originalAmount);
      targetSummary.sumFinalPrice += finalPrice;
    }

    return { incomeSummary, expenseSummary };
  }, [selectedTxnIds, transactions]);


  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p>No transactions yet.</p>
        <p className="text-sm mt-2">Add your first transaction to get started.</p>
      </div>
    );
  }

  const isAllSelected = selectedTxnIds.size > 0 && selectedTxnIds.size === displayedTransactions.length;

  return (
    <div>
      {selectedTxnIds.size > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => onSelectionChange(new Set())}
            className="px-3 py-1 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Deselect All ({selectedTxnIds.size})
          </button>
          <button
            onClick={() => setShowSelectedOnly(!showSelectedOnly)}
            className="px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            {showSelectedOnly ? 'Show All' : 'Show Selected'}
          </button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-r">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={isAllSelected}
                onChange={e => handleSelectAll(e.target.checked)}
              />
            </TableHead>
            <TableHead className="border-r">Date</TableHead>
            <TableHead className="border-r">Note</TableHead>
            <TableHead className="border-r">Category</TableHead>
            <TableHead className="border-r">Account</TableHead>
            <TableHead className="border-r">Tag</TableHead>
            <TableHead className="text-right border-r">% Back</TableHead>
            <TableHead className="text-right border-r">Fix Back</TableHead>
            <TableHead className="text-right border-r">Sum Back</TableHead>
            <TableHead className="text-right border-r">Amount</TableHead>
            <TableHead className="text-right">Final Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedTransactions.map(txn => {
            const amountClass =
              txn.type === 'income'
                ? 'text-emerald-700'
                : txn.type === 'expense'
                ? 'text-red-500'
                : 'text-slate-600';
            const finalPriceColor = amountClass;
            const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount;
            const amountValue = numberFormatter.format(Math.abs(originalAmount ?? 0));
            const percentValue = typeof txn.cashback_share_percent === 'number' ? txn.cashback_share_percent : null;
            const percentBack =
              percentValue && percentValue > 0
                ? `${(percentValue * 100).toLocaleString('en-US', {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: percentValue * 100 < 1 ? 1 : 0,
                  })}%`
                : '-';
            const fixedValue = typeof txn.cashback_share_fixed === 'number' ? txn.cashback_share_fixed : 0;
            const fixBack = fixedValue > 0 ? numberFormatter.format(fixedValue) : '-';
            const derivedSumBack = Math.abs(originalAmount ?? 0) * (percentValue ?? 0) + fixedValue;
            const cashbackAmount =
              typeof txn.cashback_share_amount === 'number' && txn.cashback_share_amount > 0
                ? txn.cashback_share_amount
                : derivedSumBack;
            const sumBack = cashbackAmount > 0 ? numberFormatter.format(cashbackAmount) : '-';
            const finalPrice = Math.abs(txn.amount ?? 0);
            const isSelected = selectedTxnIds.has(txn.id);

            return (
              <TableRow key={txn.id} data-state={isSelected ? 'selected' : undefined}>
                <TableCell className="border-r">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={isSelected}
                    onChange={e => handleSelectOne(txn.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell className="border-r">
                  {new Date(txn.occurred_at).toLocaleDateString('en-CA')}
                </TableCell>
                <TableCell className="font-semibold border-r">{txn.note}</TableCell>
                <TableCell className="text-sm text-gray-500 border-r">
                  {txn.category_name || '-'}
                </TableCell>
                <TableCell className="text-sm text-gray-500 border-r">
                  {txn.account_name || '-'}
                </TableCell>
                <TableCell className="text-sm border-r">
                  {txn.tag || '-'}
                </TableCell>
                <TableCell className="text-right text-sm border-r">{percentBack}</TableCell>
                <TableCell className="text-right text-sm border-r">{fixBack}</TableCell>
                <TableCell className="text-right text-sm border-r">{sumBack}</TableCell>
                <TableCell className={`text-right font-semibold border-r ${amountClass}`}>
                  {amountValue}
                </TableCell>
                <TableCell className={`text-right font-semibold ${finalPriceColor}`}>
                  {numberFormatter.format(finalPrice)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        {selectedTxnIds.size > 0 && (
            <TableFooter>
                {summary.incomeSummary.sumAmount > 0 && (
                    <TableRow className="bg-emerald-50">
                        <TableCell colSpan={8} className="font-semibold text-emerald-700 border-r">Total Income</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700 border-r">{numberFormatter.format(summary.incomeSummary.sumBack)}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700 border-r">{numberFormatter.format(summary.incomeSummary.sumAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">{numberFormatter.format(summary.incomeSummary.sumFinalPrice)}</TableCell>
                    </TableRow>
                )}
                {summary.expenseSummary.sumAmount > 0 && (
                     <TableRow className="bg-red-50">
                        <TableCell colSpan={8} className="font-semibold text-red-500 border-r">Total Expense</TableCell>
                        <TableCell className="text-right font-semibold text-red-500 border-r">{numberFormatter.format(summary.expenseSummary.sumBack)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-500 border-r">{numberFormatter.format(summary.expenseSummary.sumAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-500">{numberFormatter.format(summary.expenseSummary.sumFinalPrice)}</TableCell>
                    </TableRow>
                )}
            </TableFooter>
        )}
      </Table>
    </div>
  );
}
