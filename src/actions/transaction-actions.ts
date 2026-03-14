'use server';

import { Json } from '@/types/database.types';
import { syncTransactionToSheet } from '@/services/sheet.service';
import { parseMetadata } from '@/lib/transaction-mapper';
import { normalizeMonthTag } from '@/lib/month-tag';
import { revalidatePath } from 'next/cache';
import { CashbackMode } from '@/types/moneyflow.types';
import {
  createTransaction as createPBTransaction,
  updateTransaction as updatePBTransaction,
  voidTransaction as voidPBTransaction,
  confirmRefund as confirmPBRefund,
} from '@/services/transaction.service';
import {
  pocketbaseCreate,
  pocketbaseGetById,
  pocketbaseList,
  pocketbaseUpdate,
  toPocketBaseId,
} from '@/services/pocketbase/server';

export type CreateTransactionInput = {
  occurred_at: string;
  note: string;
  type: 'expense' | 'income' | 'debt' | 'transfer' | 'repayment' | 'credit_pay';
  source_account_id: string;
  person_id?: string | null;
  destination_account_id?: string | null;
  category_id?: string | null;
  debt_account_id?: string | null;
  amount: number;
  tag: string;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  discount_category_id?: string | null;
  shop_id?: string | null;
  cashback_mode?: CashbackMode | null;
  linked_transaction_id?: string | null;
};

export async function createTransaction(input: CreateTransactionInput): Promise<string | null> {
  // 1. PB-PRIMARY Write (+ sheet sync handled inside service)
  const transactionId = await createPBTransaction(input as any);
  if (!transactionId) {
    console.error('[DB:PB] Failed to create transaction in PocketBase');
    return null;
  }

  return transactionId;
}

export async function updateTransaction(id: string, input: CreateTransactionInput): Promise<boolean> {
  const pbId = toPocketBaseId(id, 'transactions');
  
  // 1. PB-PRIMARY Write (+ sheet sync handled inside service)
  const success = await updatePBTransaction(pbId, input as any);
  if (!success) return false;

  return true;
}

export async function voidTransactionAction(id: string): Promise<boolean> {
  const pbId = toPocketBaseId(id, 'transactions');
  // Sheet sync is handled inside service layer.
  return await voidPBTransaction(pbId);
}

export async function restoreTransaction(id: string): Promise<boolean> {
  const pbId = toPocketBaseId(id, 'transactions');
  
  try {
    await pocketbaseUpdate('transactions', pbId, { status: 'posted' });
    
    // Sync restore to sheet
    const existing = await pocketbaseGetById<any>('transactions', pbId);
    if (existing?.person_id) {
       void syncTransactionToSheet(existing.person_id, {
         id: pbId,
         occurred_at: existing.occurred_at,
         note: existing.note,
         tag: existing.tag,
         amount: existing.amount,
         original_amount: existing.amount
       } as any, 'create').catch(err => console.error('Sheet Sync Error (Restore):', err));
    }

    revalidatePath('/transactions');
    return true;
  } catch (error) {
    console.error('[DB:PB] restoreTransaction failed:', error);
    return false;
  }
}

export async function confirmRefundAction(
  pendingTransactionId: string,
  targetAccountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await confirmPBRefund(pendingTransactionId, targetAccountId);
    return result;
  } catch (error: any) {
    console.error('Confirm Refund Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateTransactionMetadata(id: string, metadata: any): Promise<boolean> {
  try {
    const pbId = toPocketBaseId(id, 'transactions');
    const existing = await pocketbaseGetById<any>('transactions', pbId);
    
    const newMetadata = {
      ...(typeof existing.metadata === 'object' ? existing.metadata : {}),
      ...metadata
    };

    await pocketbaseUpdate('transactions', pbId, { metadata: newMetadata });
    revalidatePath('/transactions');
    return true;
  } catch (error) {
    console.error('[DB:PB] updateTransactionMetadata failed:', error);
    return false;
  }
}

export async function deleteSplitBillAction(baseTransactionId: string): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const pbBaseId = toPocketBaseId(baseTransactionId, 'transactions');
    
    // 1. Find all child transactions
    // Note: PocketBase filter for JSON field might be tricky, usually metadata.split_parent_id
    const children = await pocketbaseList<any>('transactions', {
      filter: `metadata.split_parent_id = "${pbBaseId}"`,
      perPage: 500
    });

    let deletedCount = 0;
    
    // 2. Delete children
    for (const child of children.items) {
      await pocketbaseUpdate('transactions', child.id, { status: 'void' }); // Prefer voiding over hard delete for consistency
      deletedCount++;
    }

    // 3. Void base transaction
    await pocketbaseUpdate('transactions', pbBaseId, { status: 'void' });
    deletedCount++;

    revalidatePath('/transactions');
    return { success: true, deletedCount };
  } catch (error: any) {
    console.error('[DB:PB] deleteSplitBillAction failed:', error);
    return { success: false, error: error.message };
  }
}

export async function bulkMoveTransactionsToCategory(transactionIds: string[], categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const pbCategoryId = toPocketBaseId(categoryId, 'categories');

    for (const id of transactionIds) {
      const pbTxnId = toPocketBaseId(id, 'transactions');
      await pocketbaseUpdate('transactions', pbTxnId, { category_id: pbCategoryId });
    }

    revalidatePath('/transactions');
    return { success: true };
  } catch (error: any) {
    console.error('[DB:PB] bulkMoveTransactionsToCategory failed:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSplitBillAction(
  baseTransactionId: string,
  data: {
    title: string;
    note: string;
    qrImageUrl: string | null;
    participants: {
      personId: string;
      amount: number;
      isNew?: boolean;
      isRemoved?: boolean;
      transactionId?: string;
    }[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const pbBaseId = toPocketBaseId(baseTransactionId, 'transactions');
    const baseTxn = await pocketbaseGetById<any>('transactions', pbBaseId);

    // 1. Update base transaction
    const baseMetadata = {
      ...(typeof baseTxn.metadata === 'object' ? baseTxn.metadata : {}),
      title: data.title,
      note: data.note,
      qr_image_url: data.qrImageUrl
    };
    await pocketbaseUpdate('transactions', pbBaseId, { metadata: baseMetadata, note: data.note });

    // 2. Process participants
    for (const p of data.participants) {
      if (p.isRemoved && p.transactionId) {
        const pbChildId = toPocketBaseId(p.transactionId, 'transactions');
        await pocketbaseUpdate('transactions', pbChildId, { status: 'void' });
      } else if (p.isNew) {
        // Create new transaction for split
        const pbPersonId = toPocketBaseId(p.personId, 'people');
        // Find debt account for this person
        const personWithDebt = await pocketbaseGetById<any>('people', pbPersonId);
        const debtAccountId = personWithDebt.debt_account_id;

        if (!debtAccountId) {
          console.warn(`No debt account for person ${p.personId}`);
          continue;
        }

        await pocketbaseCreate('transactions', {
          date: baseTxn.date,
          amount: p.amount,
          type: 'debt',
          to_account_id: debtAccountId,
          from_account_id: baseTxn.from_account_id,
          person_id: pbPersonId,
          status: 'confirmed',
          metadata: {
            split_parent_id: pbBaseId,
            split_title: data.title
          }
        });
      } else if (p.transactionId) {
        const pbChildId = toPocketBaseId(p.transactionId, 'transactions');
        await pocketbaseUpdate('transactions', pbChildId, {
          amount: p.amount,
          metadata: {
            split_parent_id: pbBaseId,
            split_title: data.title
          }
        });
      }
    }

    revalidatePath('/transactions');
    return { success: true };
  } catch (error: any) {
    console.error('[DB:PB] updateSplitBillAction failed:', error);
    return { success: false, error: error.message };
  }
}

export async function bulkMoveToCategory(transactionIds: string[], categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const pbCatId = toPocketBaseId(categoryId, 'categories');
    for (const id of transactionIds) {
      const pbId = toPocketBaseId(id, 'transactions');
      await pocketbaseUpdate('transactions', pbId, { category_id: pbCatId });
    }
    revalidatePath('/transactions');
    return { success: true };
  } catch (error: any) {
    console.error('[DB:PB] bulkMoveToCategory failed:', error);
    return { success: false, error: error.message };
  }
}

export async function getOriginalAccount(refundRequestId: string): Promise<any | null> {
  try {
    const pbId = toPocketBaseId(refundRequestId, 'transactions');
    const record = await pocketbaseGetById<any>('transactions', pbId);
    if (!record) return null;

    const meta = parseMetadata(record.metadata);
    const originalAccountId = meta?.original_account_id;
    if (!originalAccountId) return null;

    const account = await pocketbaseGetById<any>('accounts', originalAccountId as string);
    if (!account) return null;

    return {
      id: account.id,
      name: account.name,
      type: account.type || 'general',
      image_url: account.image_url,
      current_balance: account.current_balance || 0
    };
  } catch (err) {
    console.error('getOriginalAccount failed:', err);
    return null;
  }
}

/**
 * Marks a transaction as waiting for refund.
 */
export async function requestRefund(
  transactionId: string,
  amount: number,
  isPartial: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const pbId = toPocketBaseId(transactionId, 'transactions');
    const existing = await pocketbaseGetById<any>('transactions', pbId);
    if (!existing) throw new Error('Transaction not found');

    const updateData: any = {
      status: 'waiting_refund',
      metadata: {
        ...(typeof existing.metadata === 'object' ? existing.metadata : {}),
        has_refund_request: true,
        refund_amount: amount,
        is_partial_refund: isPartial,
        refund_requested_at: new Date().toISOString()
      }
    };

    await pocketbaseUpdate('transactions', pbId, updateData);
    revalidatePath('/transactions');
    return { success: true };
  } catch (error: any) {
    console.error('[DB:PB] requestRefund failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancels an order and requests a full refund.
 */
export async function cancelOrder(transactionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const pbId = toPocketBaseId(transactionId, 'transactions');
    const existing = await pocketbaseGetById<any>('transactions', pbId);
    if (!existing) throw new Error('Transaction not found');

    const amount = Math.abs(existing.amount);
    return await requestRefund(transactionId, amount, false);
  } catch (error: any) {
    console.error('[DB:PB] cancelOrder failed:', error);
    return { success: false, error: error.message };
  }
}
