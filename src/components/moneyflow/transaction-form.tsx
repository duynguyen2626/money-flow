/**
 * ⚠️ STUB FILE - DO NOT USE ⚠️
 * 
 * This is a stub to prevent import errors from legacy components.
 * The actual 5300+ line implementation has been archived to:
 * Archive/components/moneyflow/transaction-form.DEPRECATED.tsx
 * 
 * **USE INSTEAD:** 
 * TransactionSlideV2 with modular sections in:
 * - src/components/transaction/slide-v2/single-mode/
 * - src/components/transaction/slide-v2/bulk-mode/
 * 
 * This stub exports empty placeholders to satisfy TypeScript.
 */

import { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { Installment } from "@/services/installment.service";

export type TransactionFormValues = {
  type: "expense" | "income" | "debt" | "transfer" | "repayment" | "quick-people";
  amount: number;
  occurred_at: Date;
  note?: string;
  tag?: string;
  source_account_id?: string;
  debt_account_id?: string;
  target_account_id?: string;
  category_id?: string;
  person_id?: string;
  shop_id?: string;
  is_installment?: boolean;
  installment_plan_id?: string;
  cashback_share_percent?: number;
  cashback_share_fixed?: number;
  cashback_mode?: "none_back" | "percent" | "fixed" | "real_fixed" | "real_percent" | "voluntary";
  split_bill?: boolean;
  metadata?: any;
  refund_status?: "pending" | "received";
};

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  shops?: Shop[];
  installments?: Installment[];
  onSuccess?: (txn?: any) => void;
  onCancel?: () => void;
  onFormChange?: (hasChanges: boolean) => void;
  defaultTag?: string;
  defaultPersonId?: string;
  defaultType?: "expense" | "income" | "debt" | "transfer" | "repayment";
  defaultSourceAccountId?: string;
  defaultDebtAccountId?: string;
  transactionId?: string;
  onSwitchTransaction?: (id: string) => void;
  mode?: "create" | "edit" | "refund";
  initialValues?: Partial<TransactionFormValues> & {
    split_group_id?: string;
    split_person_ids?: string[];
  };
};

export function TransactionForm(props: TransactionFormProps) {
  console.error(
    "⚠️ TransactionForm (5300+ lines) is DEPRECATED. Use TransactionSlideV2 modular sections instead."
  );
  
  return null;
}
