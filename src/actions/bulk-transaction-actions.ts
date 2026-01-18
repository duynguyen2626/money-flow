"use server";

import { createTransaction } from "@/services/transaction.service";
import { BulkTransactionFormValues } from "@/components/transaction/slide-v2/types";
import { revalidatePath } from "next/cache";

export type BulkCreateResult = {
    success: boolean;
    count: number;
    errors: string[];
};

export async function bulkCreateTransactions(
    data: BulkTransactionFormValues
): Promise<BulkCreateResult> {
    const errors: string[] = [];
    let successCount = 0;

    console.log(`[Bulk] Processing ${data.rows.length} transactions...`);

    // Process serially to ensure correct order/logging
    // TODO: Optimistic updates or parallel processing if performance needed
    for (const [index, row] of data.rows.entries()) {
        try {
            if (!row.amount || row.amount <= 0) continue; // Skip empty rows

            // Determine Source Account
            const accountId = row.source_account_id || data.default_source_account_id;
            if (!accountId) {
                errors.push(`Row ${index + 1}: Missing source account`);
                continue;
            }

            // Map to CreateTransactionInput
            await createTransaction({
                amount: row.amount,
                occurred_at: data.occurred_at.toISOString(), // Service expects string? check types
                note: row.note || "",
                category_id: "expense", // Default to expense categorization logic or let service handle
                shop_id: row.shop_id,
                source_account_id: accountId,
                type: "expense", // Bulk add currently implies EXPENSE. We might want to support others.

                // Cashback mapping
                cashback_mode: row.cashback_mode,
                cashback_share_percent: row.cashback_share_percent,
                cashback_share_fixed: row.cashback_share_fixed,

                // Defaults
                person_id: row.person_id,
                tag: data.tag,
            });

            successCount++;
        } catch (err: any) {
            console.error(`[Bulk] Error row ${index}:`, err);
            errors.push(`Row ${index + 1}: ${err.message || "Unknown error"}`);
        }
    }

    revalidatePath("/transactions");
    revalidatePath("/txn/v2");

    return {
        success: errors.length === 0,
        count: successCount,
        errors
    };
}
