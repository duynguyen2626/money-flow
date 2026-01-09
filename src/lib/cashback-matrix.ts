
import { TransactionWithDetails } from '@/types/moneyflow.types';

export interface MatrixMonthData {
    month: number; // 1-12
    given: number; // Spend
    received: number; // Cashback/Reward
    fee: number; // Fee
    profit: number; // received - given * cost - fee (Net)
}

export interface CashbackMatrixRow {
    accountId: string;
    accountName: string;
    accountIcon?: string;
    accountType: string;
    months: { [key: number]: MatrixMonthData };
    totalProfit: number;
    totalGiven: number;
    totalReceived: number;
    bestMonth: number; // Month index with highest profit
    worstMonth: number; // Month index with lowest profit
}

/**
 * Transforms raw transactions into a matrix structure for generic profit reporting.
 * Groups by Account -> Month.
 * 
 * Logic:
 * - Given (Spend): Transaction Date of Expense
 * - Received (Income): Transaction Date of Income (Category = Cashback/Reward)
 * - Profit = Received - Given (Simplified mostly, unless we add cost factor later)
 */
export function transformToCashbackMatrix(
    transactions: TransactionWithDetails[],
    accountMap: Map<string, { name: string; type: string; icon?: string }>,
    targetYear: number,
    cashbackEntries: { transaction_id: string; amount: number; mode: string }[] = []
): CashbackMatrixRow[] {
    const matrix = new Map<string, CashbackMatrixRow>();

    // Create a lookup for cashback details
    const cashbackMap = new Map<string, { shared: number }>();
    cashbackEntries.forEach(e => {
        // mode 'real' means shared/given/counts-to-budget in some contexts, 
        // but traditionally 'real' = Cashback that is realized/shared?
        // Let's rely on 'mode'. If mode='real' -> Shared.
        if (e.mode === 'real') {
            const prev = cashbackMap.get(e.transaction_id)?.shared || 0;
            cashbackMap.set(e.transaction_id, { shared: prev + e.amount });
        }
    });

    // Initialize rows for all known accounts (even if no transactions)
    accountMap.forEach((details, id) => {
        matrix.set(id, {
            accountId: id,
            accountName: details.name,
            accountType: details.type,
            accountIcon: details.icon,
            months: {},
            totalProfit: 0,
            totalGiven: 0,
            totalReceived: 0,
            bestMonth: 0,
            worstMonth: 0
        });

        // Init 12 months
        for (let i = 1; i <= 12; i++) {
            matrix.get(id)!.months[i] = { month: i, given: 0, received: 0, fee: 0, profit: 0 };
        }
    });

    // Process Transactions
    transactions.forEach(t => {
        if (!matrix.has(t.account_id)) return;

        const date = new Date(t.occurred_at);
        if (date.getFullYear() !== targetYear) return;

        const month = date.getMonth() + 1;
        const row = matrix.get(t.account_id)!;
        const monthData = row.months[month];

        const amount = Math.abs(t.amount);

        if (t.type === 'expense' || t.type === 'debt') {
            monthData.given += amount;

            // Calculate implied profit from Cashback settings on the transaction itself (e.g. Credit Card spend for others)
            // This is "Volunteer Profit" scenario.
            if (t.cashback_share_percent || t.cashback_share_fixed) {
                const percent = t.cashback_share_percent || 0;
                const fixed = t.cashback_share_fixed || 0;
                const impliedProfit = (amount * percent) + fixed;
                monthData.profit += impliedProfit;
            }
        } else if (t.type === 'income') {
            monthData.received += amount;
        }

        // Calculate Profit: Received - Fee - Shared
        // Currently we don't have fee column in transaction (maybe note or category?)
        // Let's assume Fee is 0 for now unless we add logic.

        // Shared Cashback Calculation:
        // If this transaction has associated 'real' cashback entry, it means we shared it.
        // We SHOULD NOT deduct it from 'Received' because 'Received' is Bank Income transaction.
        // We should deduct it from 'Profit'.
        // Wait, if I spend 10M, get 100k (Real) + 100k (Virtual).
        // Bank gives me 200k? No, Bank gives 200k. I give 100k to friend.
        // My Profit = 200k - 100k = 100k.
        // So I subtract 'shared amount' from Profit.
        // Note: The shared amount is linked to the EXPENSE transaction usually.

        const shared = cashbackMap.get(t.id)?.shared || 0;
        if (shared > 0) {
            // We subtract shared amount from profit. 
            // Note: This logic assumes 'Profit' starts at 'Received'.
            // But 'Received' is calculated from INCOME transactions.
            // 'Shared' is linked to EXPENSE transactions.
            // So we iterate expenses, find shared, and subtract from that month's profit?
            // YES.
            monthData.profit -= shared;
        }
    });

    // Finalize totals
    const result: CashbackMatrixRow[] = [];
    matrix.forEach(row => {
        let maxP = -Infinity;
        let minP = Infinity;

        Object.values(row.months).forEach(m => {
            // Base Profit = Received - Fee
            // (We already subtracted shared amounts in the loop above)
            m.profit += (m.received - m.fee);

            row.totalGiven += m.given;
            row.totalReceived += m.received;
            row.totalProfit += m.profit;

            if (m.profit > maxP) {
                maxP = m.profit;
                row.bestMonth = m.month;
            }
            if (m.profit < minP) {
                minP = m.profit;
                row.worstMonth = m.month;
            }
        });
        result.push(row);
    });

    return result.sort((a, b) => {
        // Priority 1: Has Data (Activity)
        const aHasData = a.totalGiven > 0 || a.totalReceived > 0;
        const bHasData = b.totalGiven > 0 || b.totalReceived > 0;

        if (aHasData && !bHasData) return -1;
        if (!aHasData && bHasData) return 1;

        // Priority 2: Total Profit (Descending)
        return b.totalProfit - a.totalProfit;
    });
}
