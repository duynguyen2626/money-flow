import { TransactionWithDetails, MonthlyDebtSummary } from "@/types/moneyflow.types";

export type AllocationResult = {
    paidDebts: {
        transaction: TransactionWithDetails;
        allocatedAmount: number;
        remainingAfterAllocation: number;
        isFullyPaid: boolean;
        isManual?: boolean;
    }[];
    totalAllocated: number;
    remainingRepayment: number;
};

/**
 * Allocates a repayment amount to a list of debt transactions using FIFO strategy,
 * with support for manual overrides.
 */
export function allocateTransactionRepayment(
    debts: TransactionWithDetails[],
    repaymentAmount: number,
    overrides?: Record<string, number> // keyed by transaction.id
): AllocationResult {
    // 1. Sort debts by occurred_at ascending (Oldest first)
    const sortedDebts = [...debts].sort((a, b) => {
        return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
    });

    const paidDebts: AllocationResult["paidDebts"] = [];

    // 2. Calculate budget remaining after manual overrides
    let remainingMoney = repaymentAmount;
    let totalAllocated = 0;

    if (overrides) {
        Object.values(overrides).forEach(amount => {
            remainingMoney -= amount;
            totalAllocated += amount;
        });
    }

    // 3. Setup set of overridden IDs for quick check
    const overriddenIds = new Set(overrides ? Object.keys(overrides) : []);

    for (const debt of sortedDebts) {
        const amountToSettle = Math.abs(debt.amount); // Ensure positive
        let allocation = 0;
        let isManual = false;

        if (overriddenIds.has(debt.id)) {
            // Use manual override
            allocation = overrides?.[debt.id] ?? 0;
            isManual = true;
        } else {
            // Auto-allocate from remaining money (FIFO)
            if (remainingMoney > 0) {
                allocation = Math.min(amountToSettle, remainingMoney);
                remainingMoney -= allocation;
                totalAllocated += allocation;
            }
        }

        // Only include if allocated > 0 or it was manually set to 0 (explicit intent?) 
        // Actually, usually we show all that match? Or just what is paid?
        // Let's include if allocated > 0 OR isManual (user might want to see 0)
        // Or if we want to show ALL rows for editing? 
        // User wants to see "allocation preview" which lists debts.
        // It should probably list ALL eligible debts so user can edit them?
        // But the previous loop broke on `remainingMoney <= 0`.
        // To support arbitrary editing, we should probably output ALL debts in the list,
        // but that might be too long. 
        // Let's stick to: "Show debts that get money OR are manually overridden".

        // BETTER: Show all debts up to the point where money runs out, PLUS any future manual overrides.
        // Actually, for "Bulk Repayment", we typically want to see the list of what IS being covered.
        // If I manually pick a debt far in the future, it should show up.

        const isFullyPaid = allocation >= amountToSettle - 0.01;

        if (allocation > 0 || isManual) {
            paidDebts.push({
                transaction: debt,
                allocatedAmount: allocation,
                remainingAfterAllocation: amountToSettle - allocation,
                isFullyPaid,
                isManual
            });
        }
    }

    // Note: If pure FIFO stops early, but we have manual overrides later, the list might "skip" 
    // debts in the middle that get 0 allocation. This is acceptable.

    // 4. Auto-Absorb Strategy:
    // If there is still remaining money (surplus) and we have eligible debts,
    // the user wants this surplus to be automatically absorbed by the NEWEST (last) debt.
    if (remainingMoney > 0.01 && sortedDebts.length > 0) {
        const newestDebt = sortedDebts[sortedDebts.length - 1];

        // Find if it's already in paidDebts
        const existingEntry = paidDebts.find(p => p.transaction.id === newestDebt.id);

        if (existingEntry) {
            existingEntry.allocatedAmount += remainingMoney;
            existingEntry.remainingAfterAllocation = Math.abs(newestDebt.amount) - existingEntry.allocatedAmount;
            // Recalculate fully paid? It might be Overpaid now.
            existingEntry.isFullyPaid = existingEntry.allocatedAmount >= Math.abs(newestDebt.amount) - 0.01;
        } else {
            // It wasn't allocated anything (maybe 0 overrides or money ran out exactly before it?)
            // Add it now.
            paidDebts.push({
                transaction: newestDebt,
                allocatedAmount: remainingMoney,
                remainingAfterAllocation: Math.abs(newestDebt.amount) - remainingMoney,
                isFullyPaid: remainingMoney >= Math.abs(newestDebt.amount) - 0.01
            });
        }

        // Update totals
        totalAllocated += remainingMoney;
        remainingMoney = 0;
    }

    return {
        paidDebts,
        totalAllocated: totalAllocated,
        remainingRepayment: Math.max(0, remainingMoney)
    };
}

/**
 * Legacy: Allocates repayment to Tag-based aggregated debts.
 * Used by RepayDebtDialog
 */
export function allocateDebtRepayment(
    totalAmount: number,
    debts: MonthlyDebtSummary[]
): Map<string, number> {
    const allocationMap = new Map<string, number>();
    let remaining = totalAmount;

    // Sort by tagLabel (Oldest/Alphabetical) to be deterministic
    const sortedDebts = [...debts].sort((a, b) =>
        (a.tagLabel || "").localeCompare(b.tagLabel || "")
    );

    for (const debt of sortedDebts) {
        if (remaining <= 0.01) break;

        const amountNeeded = debt.amount;
        if (amountNeeded <= 0) continue;

        const allocated = Math.min(amountNeeded, remaining);

        allocationMap.set(debt.tagLabel, allocated);
        remaining -= allocated;
    }

    return allocationMap;
}
