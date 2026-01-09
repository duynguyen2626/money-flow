'use server';

import { createClient } from '@/lib/supabase/server';
import { transformToCashbackMatrix } from '@/lib/cashback-matrix';
import { TransactionWithDetails } from '@/types/moneyflow.types';

export async function getCashbackMatrixData(year: number) {
    const supabase = createClient();
    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDate = `${year}-12-31T23:59:59.999Z`;

    try {
        // 1. Fetch Accounts (Credit Card & Volunteer)
        const { data: rawAccounts, error: accountError } = await supabase
            .from('accounts')
            .select('id, name, type, image_url')
            .order('name');

        if (accountError || !rawAccounts) {
            console.error('Error fetching accounts:', accountError);
            return { success: false, error: 'Failed to fetch accounts' };
        }

        const accounts = rawAccounts as any[];

        // Filter relevant accounts: Credit Card OR Volunteer (by convention)
        const targetAccounts = accounts.filter(acc =>
            acc.type === 'credit_card' ||
            acc.name.toLowerCase().includes('volunteer') ||
            acc.type === 'loan' || // Sometimes Volunteer accounts are loans
            acc.type === 'checking' // Include checking to capture voluntary transactions on normal accounts
        );

        const accountMap = new Map<string, { name: string; type: string; icon?: string }>();
        targetAccounts.forEach(acc => {
            accountMap.set(acc.id, {
                name: acc.name,
                type: acc.type,
                icon: acc.image_url ?? undefined
            });
        });

        // 2. Fetch Transactions
        const accountIds = targetAccounts.map(a => a.id);
        if (accountIds.length === 0) {
            return { success: true, data: [] };
        }

        const { data: transactions, error: txnError } = await supabase
            .from('transactions')
            .select(`
                id,
                amount,
                type,
                occurred_at,
                account_id,
                category_id,
                note,
                cashback_share_percent,
                cashback_share_fixed,
                cashback_mode,
                category:categories(id, name, icon)
            `)
            .in('account_id', accountIds)
            .gte('occurred_at', startDate)
            .lte('occurred_at', endDate)
            .neq('status', 'void') as any;

        if (txnError || !transactions) {
            console.error('Error fetching transactions:', txnError);
            return { success: false, error: 'Failed to fetch transactions' };
        }

        // 2.1 SMART FILTER: Remove 'checking' accounts that have NO transactions
        // We want to keep Credit Cards and explicit Volunteer accounts even if empty (to show gaps)
        // But Checking accounts should only appear if they have relevant activity.
        const activeAccountIds = new Set(transactions.map((t: any) => t.account_id));

        // Re-build accountMap with only relevant accounts
        const originalMap = accountMap;
        originalMap.forEach((val, key) => {
            const isCreditOrVolunteer = val.type === 'credit_card' || val.name.toLowerCase().includes('volunteer');
            const hasActivity = activeAccountIds.has(key);

            if (!isCreditOrVolunteer && !hasActivity) {
                // It's a non-credit/non-volunteer account (likely checking) with NO activity.
                // Remove it from the map so it doesn't show in the matrix.
                originalMap.delete(key);
            }
        });

        // 2.5 Fetch Cashback Entries (to calculate shared/people amounts)
        // We need entries for the transactions we just fetched
        const transactionIds = transactions.map((t: any) => t.id);

        // Fetch in chunks if too many? For now assume it fits.
        let cashbackEntries: any[] = [];
        if (transactionIds.length > 0) {
            const { data: entries, error: entriesError } = await supabase
                .from('cashback_entries')
                .select('transaction_id, amount, mode')
                .in('transaction_id', transactionIds);

            if (!entriesError && entries) {
                cashbackEntries = entries;
            }
        }

        // 3. Transform Data
        const matrix = transformToCashbackMatrix(
            transactions as unknown as TransactionWithDetails[], // Cast for compatibility
            accountMap,
            year,
            cashbackEntries // NEW ARGUMENT
        );

        // 3.1 SORT: Active accounts (Total Profit != 0) first, then alphabetical
        matrix.sort((a, b) => {
            const hasProfitA = Math.abs(a.totalProfit) > 0;
            const hasProfitB = Math.abs(b.totalProfit) > 0;

            if (hasProfitA && !hasProfitB) return -1;
            if (!hasProfitA && hasProfitB) return 1;

            return a.accountName.localeCompare(b.accountName);
        });

        return { success: true, data: matrix };

    } catch (error) {
        console.error('Unexpected error in getCashbackMatrixData:', error);
        return { success: false, error: 'Internal Server Error' };
    }
}
