import { z } from "zod";
import type { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import {
    singleTransactionSchema,
    bulkTransactionSchema,
    bulkRowSchema
} from "./schema";

// --- Shared Enums ---
export type TransactionMode = 'single' | 'bulk';
export type CashbackType = 'none_back' | 'percent' | 'fixed' | 'real_fixed' | 'real_percent' | 'voluntary';

export type SingleTransactionFormValues = z.infer<typeof singleTransactionSchema>;
export type BulkRowValues = z.infer<typeof bulkRowSchema>;
export type BulkTransactionFormValues = z.infer<typeof bulkTransactionSchema>;

// --- Component Props ---
export type TransactionSlideV2Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: TransactionMode;
    initialData?: Partial<SingleTransactionFormValues>;
    editingId?: string;
    operationMode?: 'add' | 'edit' | 'duplicate'; // Track user action for UI titles

    // Data dependencies
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];

    onSuccess?: (data?: any) => void;
    onHasChanges?: (hasChanges: boolean) => void;
    onBackButtonClick?: () => void; // Called when user clicks back button - for parent to handle close
    onSubmissionStart?: () => void;
    onSubmissionEnd?: () => void;
};
