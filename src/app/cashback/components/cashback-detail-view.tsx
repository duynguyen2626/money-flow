'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table';
import { TransactionWithDetails } from '@/types/moneyflow.types';
import { ArrowLeft } from 'lucide-react';
import { TableCellBadge } from '@/components/moneyflow/table-cell-badge';

// Define types locally if needed or import
interface CashbackDetail {
  id: string;
  cardName: string;
  cycle: string;
  totalSpend: number;
  bankBackRate: number;
  bankBackAmount: number;
  peopleBackRate: number;
  peopleBackAmount: number;
  profit: number;
  profitRate: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions: any[];
  status: string;
}

export const CashbackDetailView: React.FC<{ cashback: CashbackDetail }> = ({ cashback }) => {

  // Map simplified cashback transactions to full TransactionWithDetails for the table
  const tableTransactions: TransactionWithDetails[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return cashback.transactions.map((t: any) => ({
      id: t.id,
      occurred_at: t.occurred_at,
      created_at: t.occurred_at,
      amount: -Math.abs(t.amount), // Assume expense
      original_amount: -Math.abs(t.amount),
      note: t.note,
      type: 'expense',
      status: 'completed',
      account_id: cashback.id,
      account_name: cashback.cardName,
      shop_name: t.shopName,
      shop_logo_url: t.shopLogoUrl,
      category_name: t.categoryName,
      category_icon: t.categoryIcon,
      category_image_url: t.categoryImageUrl,
      tag: cashback.cycle,
      bank_back: t.bankBack,
      cashback_share_amount: t.peopleBack,
      profit: t.profit,
      // Fallbacks
      transaction_lines: [],
    } as unknown as TransactionWithDetails));
  }, [cashback]);

  const stats = [
    { label: 'Total Spend', value: `${cashback.totalSpend.toLocaleString()} đ`, color: 'text-slate-900' },
    { label: 'Bank Back', value: `${cashback.bankBackAmount.toLocaleString()} đ`, sub: `${(cashback.bankBackRate).toFixed(1)}%`, color: 'text-emerald-600' },
    { label: 'People Back', value: `${cashback.peopleBackAmount.toLocaleString()} đ`, sub: `${(cashback.peopleBackRate).toFixed(1)}%`, color: 'text-orange-600' },
    { label: 'Net Profit', value: `${cashback.profit.toLocaleString()} đ`, sub: `${(cashback.profitRate).toFixed(1)}%`, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/cashback"
          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">{cashback.cardName}</h1>
                <TableCellBadge value={cashback.cycle} variant="cycle" />
                <TableCellBadge value={cashback.status} variant="status" />
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border shadow-sm">
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        {stat.sub && <span className="text-sm text-slate-400">{stat.sub}</span>}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow border p-4">
         <h2 className="text-lg font-semibold mb-4">Transactions</h2>
         <UnifiedTransactionTable
            transactions={tableTransactions}
            accountId={cashback.id}
            accountType="credit_card"
            hiddenColumns={['account', 'task']}
         />
      </div>
    </div>
  );
};
