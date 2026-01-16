import { z } from "zod";
import type { Account, Category, Person, Shop, Installment, TransactionWithDetails } from "@/types/moneyflow.types";

// Form Schema
export const formSchema = z.object({
    type: z.enum(["expense", "income", "debt", "transfer", "repayment", "quick-people"]),
    amount: z.coerce.number(),
    occurred_at: z.date(),
    note: z.string().optional(),
    tag: z.string().optional(),
    source_account_id: z.string().optional(),
    debt_account_id: z.string().optional(),
    target_account_id: z.string().optional(),
    category_id: z.string().optional(),
    person_id: z.string().optional(),
    shop_id: z.string().optional(),
    is_installment: z.boolean().default(false).optional(),
    installment_plan_id: z.string().optional(),
    cashback_share_percent: z.number().optional(),
    cashback_share_fixed: z.number().optional(),
    cashback_mode: z.enum(["none_back", "percent", "fixed", "real_fixed", "real_percent", "voluntary"]).default("none_back").optional(),
    split_bill: z.boolean().default(false).optional(),
    metadata: z.any().optional(),
    refund_status: z.enum(["pending", "received"]).optional(),
});

export type TransactionFormValues = z.infer<typeof formSchema>;

export type TransactionType = TransactionFormValues["type"];

export type StatusMessage = {
    type: "success" | "error";
    text: string;
} | null;

export type TransactionFormProps = {
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops?: Shop[];
    installments?: Installment[];
    onSuccess?: (txn?: TransactionWithDetails) => void;
    defaultTag?: string;
    defaultPersonId?: string;
    defaultType?: "expense" | "income" | "debt" | "transfer" | "repayment";
    defaultSourceAccountId?: string;
    defaultDebtAccountId?: string;
    transactionId?: string;
    onSwitchTransaction?: (id: string | undefined) => void;
    initialValues?: Partial<TransactionFormValues> & {
        category_name?: string;
        account_name?: string;
        metadata?: any;
        split_group_id?: string;
        split_person_ids?: string[];
    };
    mode?: "create" | "edit" | "refund";
    refundTransactionId?: string;
    refundAction?: "request" | "confirm";
    refundMaxAmount?: number;
    defaultRefundStatus?: "pending" | "received";
    onCancel?: () => void;
    onFormChange?: (hasChanges: boolean) => void;
    onDelete?: (id: string) => void;
};

// Split Bill Types
export type SplitBillParticipant = {
    personId: string;
    name: string;
    shareBefore: number;
    voucherAmount: number;
    finalShare: number;
    advanceAmount?: number;
    paidBy: string;
    note?: string;
    linkedTransactionId?: string;
    amount?: number;
    paidBefore?: number;
};

export type VoucherDistributionMode = "equal" | "proportional";
