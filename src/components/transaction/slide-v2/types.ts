import { z } from "zod";
import type { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { SYSTEM_ACCOUNTS } from "@/lib/constants";

// --- Shared Enums ---
export type TransactionMode = 'single' | 'bulk';
export type CashbackType = 'none_back' | 'percent' | 'fixed' | 'real_fixed' | 'real_percent' | 'voluntary';

// --- Single Transaction Schema ---
// Re-using logic from V1 but cleaner structure
export const singleTransactionSchema = z.object({
    occurred_at: z.date(),
    amount: z.coerce.number().min(0, "Amount must be positive"),
    note: z.string().optional(),
    type: z.enum(["expense", "income", "debt", "transfer", "repayment", "credit_pay"]),

    // Relations
    source_account_id: z.string().min(1, "Source account is required"),
    target_account_id: z.string().optional(), // For transfer/repay

    // Categorization
    category_id: z.string().optional(),
    shop_id: z.string().optional(),
    tag: z.string().optional(),

    // Person / Debt
    person_id: z.string().optional(),

    // Cashback
    cashback_mode: z.enum(["none_back", "percent", "fixed", "real_fixed", "real_percent", "voluntary"]).default("none_back"),
    cashback_share_percent: z.number().optional(),
    cashback_share_fixed: z.number().optional(),

    // Split Bill
    participants: z.array(z.object({
        person_id: z.string(),
        amount: z.number(),
        is_fixed: z.boolean().optional(), // For logic if needed
        note: z.string().optional()
    })).optional(),

    // Temporary UI state (not sent to API)
    ui_is_cashback_expanded: z.boolean().default(false).optional(),
});

export type SingleTransactionFormValues = z.infer<typeof singleTransactionSchema>;

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

export type BulkRowValues = z.infer<typeof bulkRowSchema>;

// --- Bulk Form Schema ---
export const bulkTransactionSchema = z.object({
    occurred_at: z.date(), // Shared Date
    tag: z.string().optional(), // Shared Cycle Tag
    default_source_account_id: z.string().optional(),
    rows: z.array(bulkRowSchema),
});

export type BulkTransactionFormValues = z.infer<typeof bulkTransactionSchema>;

// --- Component Props ---
export type TransactionSlideV2Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: TransactionMode;
    initialData?: Partial<SingleTransactionFormValues>;
    editingId?: string;

    // Data dependencies
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];

    onSuccess?: (data?: any) => void;
    onHasChanges?: (hasChanges: boolean) => void;
    onSubmissionStart?: () => void;
    onSubmissionEnd?: () => void;
};
