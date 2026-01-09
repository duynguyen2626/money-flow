'use server';

import { createClient } from '@/lib/supabase/server';
import { SYSTEM_CATEGORIES } from '@/lib/constants';

export interface MonthlyProfit {
    month: number;
    given: number; // Total Spend (Expenses)
    received: number; // Total Cashback/Rewards
    profit: number; // Received - Cost
    cost: number; // Fees or Shared Cashback (Future)
    net_profit_cumulative?: number;
}

export interface AccountProfitAnalytics {
    accountId: string;
    accountName: string;
    accountType: string;
    monthlyData: MonthlyProfit[]; // Array of 12 months
    totalGiven: number;
    totalReceived: number;
    totalProfit: number;
}

export async function getYearlyProfitAnalytics(year: number): Promise<AccountProfitAnalytics[]> {
    const supabase = createClient();
    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDate = `${year}-12-31T23:59:59.999Z`;

    // 1. Get relevant accounts
    // Logic: Type = 'credit_card' OR name includes 'Volunteer' (temporary convention)
    const { data: accounts, error: accountError } = await supabase
        .from('accounts')
        .select('id, name, type')
        .order('name') as any;

    if (accountError || !accounts) {
        console.error('Error fetching accounts:', JSON.stringify(accountError, null, 2));
        return [];
    }

    // Filter accounts: kept Credit Cards. For Volunteer, we might need a specific flag later.
    // For now, let's include all Credit Cards.
    // TODO: Add logic for 'Volunteer' accounts based on prompt (Account has Interest/Profit).
    const targetAccounts = (accounts as any[]).filter(acc => acc.type === 'credit_card');

    // 2. Fetch Transactions for the year for these accounts
    const accountIds = targetAccounts.map(a => a.id);

    if (accountIds.length === 0) return [];

    const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select(`
      id,
      amount,
      type,
      occurred_at,
      account_id,
      category_id
    `)
        .in('account_id', accountIds)
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate)
        .neq('status', 'void') as any; // Cast to any

    if (txnError || !transactions) {
        console.error('Error fetching transactions:', txnError);
        return [];
    }

    // 3. Process Data
    const analytics: AccountProfitAnalytics[] = targetAccounts.map((account: any) => {
        // Initialize 12 months
        const monthlyData: MonthlyProfit[] = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            given: 0,
            received: 0,
            cost: 0,
            profit: 0
        }));

        // Filter transactions for this account
        const accountTxns = (transactions as any[]).filter(t => t.account_id === account.id);

        accountTxns.forEach(txn => {
            const date = new Date(txn.occurred_at);
            const monthIndex = date.getMonth(); // 0-11
            const monthData = monthlyData[monthIndex];

            const amount = Math.abs(txn.amount);

            // Logic: 
            // Given: Expense
            // Received: Income with Category = Cashback (or others if defined)

            if (txn.type === 'expense') {
                // Exclude internal transfers or specific ignored categories?
                // Prompt says: "Given (Cho đi - Vốn bỏ ra): Tổng số tiền giao dịch (Expenses)"
                monthData.given += amount;
            } else if (txn.type === 'income') {
                if (txn.category_id === SYSTEM_CATEGORIES.CASHBACK) {
                    monthData.received += amount;
                }
                // TODO: check for Reward/Interest categories if IDs are known
            }
        });

        // Calculate Profit & Cumulative
        let cumulativeProfit = 0;
        let totalGiven = 0;
        let totalReceived = 0;
        let totalProfit = 0;

        monthlyData.forEach(m => {
            m.profit = m.received - m.cost; // Currently Cost is 0
            m.net_profit_cumulative = cumulativeProfit + m.profit; // This logic might be per month relative to start of year
            // Actually prompt says "Profit = Received - (Given_Cashback_Cost + Fees + Interest)"
            // And "Cumulative Profit" (Lãi lũy kế)
            cumulativeProfit += m.profit;
            m.net_profit_cumulative = cumulativeProfit;

            totalGiven += m.given;
            totalReceived += m.received;
            totalProfit += m.profit;
        });

        return {
            accountId: account.id,
            accountName: account.name,
            accountType: account.type,
            monthlyData,
            totalGiven,
            totalReceived,
            totalProfit
        };
    });

    return analytics;
}
