/**
 * ⚠️ STUB FILE - DO NOT USE ⚠️
 * 
 * This is a stub to prevent import errors from legacy components.
 * The actual implementation has been archived to:
 * Archive/components/moneyflow/add-transaction-dialog.DEPRECATED.tsx
 * 
 * **USE INSTEAD:** 
 * import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
 * 
 * This stub exports empty placeholders to satisfy TypeScript.
 * Any usage will log console warnings.
 */

import { ReactNode } from "react";
import { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { Installment } from "@/services/installment.service";

export type AddTransactionDialogProps = {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  shops?: Shop[];
  installments?: Installment[];
  buttonText?: string;
  defaultTag?: string;
  defaultPersonId?: string;
  defaultType?: "expense" | "income" | "debt" | "transfer" | "repayment";
  buttonClassName?: string;
  defaultSourceAccountId?: string;
  defaultTargetAccountId?: string;
  defaultDebtAccountId?: string;
  defaultAmount?: number;
  triggerContent?: ReactNode;
  onOpen?: () => void;
  listenToUrlParams?: boolean;
  asChild?: boolean;
  cloneInitialValues?: any;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBackToChat?: () => void;
  backToChatLabel?: string;
  mode?: "create" | "edit" | "refund";
  transactionId?: string;
  initialValues?: any;
  onSuccess?: (txn?: any) => void;
};

export function AddTransactionDialog(props: AddTransactionDialogProps) {
  console.error(
    "⚠️ AddTransactionDialog is DEPRECATED. Use TransactionSlideV2 instead:",
    "import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'"
  );
  
  return null;
}
