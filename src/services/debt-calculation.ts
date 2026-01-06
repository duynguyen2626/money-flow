import { parse } from 'date-fns';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'debt' | 'repayment';

export type DebtTransactionRow = {
    id: string;
    amount: number | null;
    type: TransactionType | null;
    person_id: string | null;
    tag?: string | null;
    occurred_at?: string | null;
    status?: string | null;
    cashback_share_percent?: string | number | null;
    cashback_share_fixed?: string | number | null;
    final_price?: number | null;
    metadata?: any;
};

export type DebtByTagAggregatedResult = {
    tag: string;
    netBalance: number;
    originalPrincipal: number;
    totalOriginalDebt: number;
    totalBack: number;
    totalCashback: number;
    status: string;
    last_activity: string;
    settled_tags?: string[];
    // Traceability fields
    settled_by_transaction_id?: string;
    settled_by_tag?: string;
    // Helper to find the "payer" transaction within a credit cycle
    primary_transaction_id?: string;
    distribution_strategy?: RepaymentStrategy;
    manual_allocations?: Record<string, number>;
};

export type SettleDebtResult = {
    transactionId: string;
    direction: 'collect' | 'repay';
    amount: number;
};

export function resolveBaseType(
    type: TransactionType | null | undefined
): 'income' | 'expense' | 'transfer' {
    if (type === 'repayment') return 'income';
    if (type === 'debt') return 'expense';
    if (type === 'transfer') return 'transfer';
    if (type === 'income') return 'income';
    return 'expense';
}

export function compareTags(tagA: string, tagB: string): number {
    try {
        const dateA = parse(tagA, 'MMM-yyyy', new Date());
        const dateB = parse(tagB, 'MMM-yyyy', new Date());
        const timeA = dateA.getTime();
        const timeB = dateB.getTime();

        if (!isNaN(timeA) && !isNaN(timeB)) {
            return timeA - timeB;
        }
    } catch (e) {
        // Ignore parsing errors
    }
    return tagA.localeCompare(tagB);
}

export function calculateFinalPrice(row: DebtTransactionRow): number {
    if (row.final_price !== undefined && row.final_price !== null) {
        const parsed = Number(row.final_price);
        if (!isNaN(parsed)) {
            return Math.abs(parsed);
        }
    }

    const rawAmount = Math.abs(Number(row.amount ?? 0));
    const percentVal = Number(row.cashback_share_percent ?? 0);
    const fixedVal = Number(row.cashback_share_fixed ?? 0);
    const normalizedPercent = percentVal > 1 ? percentVal / 100 : percentVal;
    const safePercent = isNaN(normalizedPercent) ? 0 : normalizedPercent;
    const cashbackFromPercent = rawAmount * safePercent;
    const totalCashback = cashbackFromPercent + fixedVal;

    return rawAmount - totalCashback;
}

export type RepaymentStrategy = 'oldest' | 'newest' | 'manual';

export function aggregateDebtByTags(
    rows: DebtTransactionRow[]
): DebtByTagAggregatedResult[] {
    const tagMap = new Map<
        string,
        {
            lend: number;
            lendOriginal: number;
            repay: number;
            cashback: number;
            last_activity: string;
            settled_tags: string[];

            primary_transaction_id?: string;
            distribution_strategy?: RepaymentStrategy;
        }
    >();

    rows.forEach((row) => {
        const tag = row.tag ?? 'UNTAGGED';
        const baseType = resolveBaseType(row.type);
        const finalPrice = calculateFinalPrice(row);
        const occurredAt = row.occurred_at ?? '';

        if (!tagMap.has(tag)) {
            tagMap.set(tag, {
                lend: 0,
                lendOriginal: 0,
                repay: 0,
                cashback: 0,
                last_activity: occurredAt,
                settled_tags: [],
                primary_transaction_id: undefined,
                distribution_strategy: undefined
            });
        }

        const current = tagMap.get(tag)!;

        // Capture primary transaction ID for repayment cycles (Credits)
        // We prefer the transaction with the largest amount, or just the first one found if not set.
        if (baseType === 'income') { // Repayment
            if (!current.primary_transaction_id || finalPrice > 0) {
                // Simple logic: If we encounter a repayment, capture its ID.
                // Ideally we want the "main" repayment if multiple exist.
                // For now, let's just take the most recent one (occurredAt) or just overwrite.
                // Let's stick to: if not set, set it.
                if (!current.primary_transaction_id) {
                    current.primary_transaction_id = row.id;
                }
            }
        }

        let rowMetadata = row.metadata;
        if (typeof rowMetadata === 'string') {
            try {
                rowMetadata = JSON.parse(rowMetadata);
            } catch (e) {
                console.error('[aggregateDebtByTags] Failed to parse metadata:', e);
                rowMetadata = {};
            }
        }

        const rawAmount = Math.abs(Number(row.amount ?? 0));
        const percentVal = Number(row.cashback_share_percent ?? 0);
        const fixedVal = Number(row.cashback_share_fixed ?? 0);
        const normalizedPercent = percentVal > 1 ? percentVal / 100 : percentVal;
        const cashback = rawAmount * normalizedPercent + fixedVal;

        if (baseType === 'expense') {
            if (!isNaN(finalPrice)) {
                current.lend += finalPrice;
            }
            if (!isNaN(rawAmount)) {
                current.lendOriginal += rawAmount;
            }
        } else if (baseType === 'income') {
            if (!isNaN(finalPrice)) {
                current.repay += finalPrice;
            }
            if (rowMetadata?.settled_tags && Array.isArray(rowMetadata.settled_tags)) {
                const otherTags = rowMetadata.settled_tags.filter((t: string) => t !== tag);
                current.settled_tags.push(...otherTags);
            }
            if (rowMetadata?.distribution_strategy) {
                current.distribution_strategy = rowMetadata.distribution_strategy as RepaymentStrategy;
            }
        }

        if (!isNaN(cashback)) {
            current.cashback += cashback;
        }

        if (occurredAt && occurredAt > current.last_activity) {
            current.last_activity = occurredAt;
        }
    });

    const aggregated = Array.from(tagMap.entries()).map(
        ([tag, { lend, lendOriginal, repay, cashback, last_activity, settled_tags, primary_transaction_id, distribution_strategy }]) => {
            const netBalance = lend - repay;
            return {
                tag,
                netBalance,
                originalPrincipal: lend,
                totalOriginalDebt: lendOriginal,
                totalBack: repay,
                totalCashback: cashback,
                status: Math.abs(netBalance) < 0.01 ? 'settled' : 'active',
                last_activity,
                settled_tags: Array.from(new Set(settled_tags)),

                primary_transaction_id,
                distribution_strategy,
                settled_by_transaction_id: undefined,
                settled_by_tag: undefined
            } as DebtByTagAggregatedResult;
        }
    );

    const surplusPool = aggregated
        .filter((item) => item.netBalance > 0.01)
        .sort((a, b) => compareTags(a.tag, b.tag)); // Default Sort
    const deficitPool = aggregated
        .filter((item) => item.netBalance < -0.01)
        .sort((a, b) => compareTags(a.tag, b.tag)); // Default Sort

    // Phase 1: Explicit Repayments
    for (const creditItem of deficitPool) {
        if (creditItem.status === 'settled') continue;
        if (!creditItem.settled_tags || creditItem.settled_tags.length === 0) continue;

        const availableCredit = Math.abs(creditItem.netBalance);
        if (availableCredit < 0.01) continue;

        // Sort targets by Tag ASC (Oldest first) to ensure deterministic filling
        // For explicitly settled tags, we probably just want Oldest First default, or respect the strategy?
        // Explicit tags are... explicit. Order within them might not matter much if they are all selected.
        // But let's stick to Oldest First for stability.
        const targetDebts = surplusPool
            .filter((d) => d.status !== 'settled' && creditItem.settled_tags!.includes(d.tag))
            .sort((a, b) => compareTags(a.tag, b.tag));

        for (const debtItem of targetDebts) {
            if (Math.abs(creditItem.netBalance) < 0.01) break;

            const creditRemaining = Math.abs(creditItem.netBalance);
            const debtRemaining = debtItem.netBalance;
            const amountToCover = Math.min(creditRemaining, debtRemaining);

            if (amountToCover > 0.001) {
                debtItem.netBalance -= amountToCover;
                creditItem.netBalance += amountToCover;

                // Traceability
                debtItem.settled_by_transaction_id = creditItem.primary_transaction_id;
                debtItem.settled_by_tag = creditItem.tag;

                if (debtItem.netBalance < 0.01) debtItem.status = 'settled';
                if (Math.abs(creditItem.netBalance) < 0.01) creditItem.status = 'settled';
            }
        }
    }

    // Phase 2: Implicit Repayments (Credit Pushes to Debt)
    // We iterate remaining Credits (Repayments) and let them distribute surplus to debts based on their strategy.
    const sortedCredits = deficitPool.sort((a, b) => compareTags(a.tag, b.tag));

    for (const creditItem of sortedCredits) {
        if (creditItem.status === 'settled') continue;
        const availableCredit = Math.abs(creditItem.netBalance);
        if (availableCredit < 0.01) continue;

        const currentStrategy = creditItem.distribution_strategy ?? 'oldest';

        // Parse manual allocations if strategy is manual
        let manualAllocations: Record<string, number> = {};
        if (currentStrategy === 'manual' && creditItem.manual_allocations) { // Assuming type updated or cast
            try {
                manualAllocations = creditItem.manual_allocations;
            } catch (e) {
                // Ignore
            }
        }

        // Dynamic Sort for Targets based on THIS Credit's strategy
        const targetSortFn = (a: DebtByTagAggregatedResult, b: DebtByTagAggregatedResult) => {
            if (currentStrategy === 'manual') {
                const hasA = manualAllocations[a.tag] !== undefined;
                const hasB = manualAllocations[b.tag] !== undefined;
                if (hasA && !hasB) return -1;
                if (!hasA && hasB) return 1;
            }
            const diff = compareTags(a.tag, b.tag);
            return currentStrategy === 'newest' ? -diff : diff;
        };

        const validDebts = surplusPool
            .filter((d) => d.status !== 'settled')
            .sort(targetSortFn);

        for (const debtItem of validDebts) {
            if (Math.abs(creditItem.netBalance) < 0.01) break;

            const creditRemaining = Math.abs(creditItem.netBalance);
            const debtRemaining = debtItem.netBalance;

            let amountToCover = 0;
            if (currentStrategy === 'manual' && manualAllocations[debtItem.tag] !== undefined) {
                const manualAmount = manualAllocations[debtItem.tag];
                amountToCover = Math.min(debtRemaining, Math.min(manualAmount, creditRemaining));
            } else {
                amountToCover = Math.min(creditRemaining, debtRemaining);
            }

            if (amountToCover > 0) {

                if (amountToCover > 0.001) {
                    debtItem.netBalance -= amountToCover;
                    creditItem.netBalance += amountToCover;

                    // Traceability
                    // Only overwrite if not already settled by explicit? 
                    // Or maybe multi-settlement support? For now, newest settler wins traceability or first?
                    // Logic: debtItem.settled_by... overwrites. 
                    // Ideally we should append or check, but last-payer (or main-payer) takes credit is simpler.
                    debtItem.settled_by_transaction_id = creditItem.primary_transaction_id;
                    debtItem.settled_by_tag = creditItem.tag;

                    if (debtItem.netBalance < 0.01) debtItem.status = 'settled';
                    if (Math.abs(creditItem.netBalance) < 0.01) creditItem.status = 'settled';
                }
            }
        }
    }

    const finalResult = [...surplusPool, ...deficitPool];
    return finalResult.sort((a, b) => b.tag.localeCompare(a.tag));
};

