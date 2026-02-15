import { z } from "zod";

// --- Single Transaction Schema ---
export const singleTransactionSchema = z.object({
    occurred_at: z.date({
        required_error: "Date is required",
        invalid_type_error: "Invalid date format",
    }),
    amount: z.coerce.number().min(0, "Amount must be positive"),
    service_fee: z.coerce.number().min(0).optional().nullable(),
    note: z.string().optional().nullable(),
    type: z.enum(["expense", "income", "debt", "transfer", "repayment", "credit_pay"]),

    // Relations
    source_account_id: z.string().min(1, "Source account is required"),
    target_account_id: z.string().optional().nullable(),

    // Categorization
    category_id: z.string().optional().nullable(),
    shop_id: z.string().optional().nullable(),
    tag: z.string().optional().nullable(),

    // Person / Debt
    person_id: z.string().optional().nullable(),

    // Cashback
    cashback_mode: z.enum(["none_back", "percent", "fixed", "real_fixed", "real_percent", "voluntary"]).default("none_back"),
    cashback_share_percent: z.number().optional().nullable(),
    cashback_share_fixed: z.number().optional().nullable(),

    // Split Bill
    participants: z.array(z.object({
        person_id: z.string(),
        amount: z.number(),
        is_fixed: z.boolean().optional(),
        note: z.string().optional().nullable()
    })).optional().nullable(),

    // Temporary UI state (not sent to API)
    ui_is_cashback_expanded: z.boolean().default(false).optional(),

    // Metadata for various features (Duplication, etc)
    metadata: z.record(z.any()).optional().nullable(),
});

// --- Bulk Transaction Row Schema ---
export const bulkRowSchema = z.object({
    id: z.string(), // internal tracking ID for field array
    amount: z.coerce.number().min(0),
    note: z.string().optional(),
    shop_id: z.string().optional(),
    person_id: z.string().optional(),
    source_account_id: z.string().optional(), // Can override global default if needed, or required per row

    // Cashback (Inline/Compact)
    cashback_mode: z.enum(["none_back", "percent", "fixed", "real_fixed", "real_percent", "voluntary"]).default("none_back"),
    cashback_share_percent: z.number().optional(),
    cashback_share_fixed: z.number().optional(),

    // Cycle
    cycle: z.string().optional(),

    // UI State
    is_expanded: z.boolean().default(false),
});

// --- Bulk Form Schema ---
export const bulkTransactionSchema = z.object({
    occurred_at: z.date(), // Shared Date
    tag: z.string().optional(), // Shared Cycle Tag
    default_source_account_id: z.string().optional(),
    rows: z.array(bulkRowSchema),
});
