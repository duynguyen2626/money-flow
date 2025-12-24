import { Database, Json } from '@/types/database.types';
import { TransactionWithDetails, TransactionWithLineRelations } from '@/types/moneyflow.types';
import { createClient } from '@/lib/supabase/server';
import { parseCashbackConfig, getCashbackCycleRange, calculateBankCashback } from './cashback';
import { format } from 'date-fns';

const REFUND_CATEGORY_ID = 'e0000000-0000-0000-0000-000000000095';

export type ShopRow = Database['public']['Tables']['shops']['Row'];

export type TransactionRow = {
    id: string
    occurred_at: string
    note: string | null
    status: 'posted' | 'pending' | 'void'
    tag: string | null
    created_at: string
    cashback_share_percent?: number | null
    cashback_share_fixed?: number | null
    cashback_share_amount?: number | null
    final_price?: number | null
    shop_id?: string | null
    shops?: ShopRow | null
    account_id?: string | null
    target_account_id?: string | null
    category_id?: string | null
    person_id?: string | null
    amount: number
    type: string
    metadata?: Json | null
}

export function parseMetadata(value: Json | null): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

export async function loadShopInfo(
    supabase: ReturnType<typeof createClient>,
    shopId?: string | null
): Promise<ShopRow | null> {
    if (!shopId) {
        return null;
    }

    const { data, error } = await supabase
        .from('shops')
        .select('id, name, image_url')
        .eq('id', shopId)
        .maybeSingle();

    if (error) {
        console.error('Failed to load shop info:', error);
        return null;
    }

    return data as ShopRow | null;
}

export function mapTransactionRow(
    txn: TransactionRow,
    accountId?: string,
): TransactionWithDetails {
    // Basic mapping for flat transaction structure
    return {
        ...txn,
        amount: txn.amount,
        displayType: txn.type as any,
        display_type: txn.type === 'income' ? 'IN' : 'OUT',
        original_amount: Math.abs(txn.amount),
        cashback_share_percent: txn.cashback_share_percent ?? null,
        cashback_share_fixed: txn.cashback_share_fixed ?? null,
        cashback_share_amount: txn.cashback_share_amount ?? null,
        final_price: txn.final_price ?? null,
    } as TransactionWithDetails
}

export function mapUnifiedTransaction(txn: any, contextAccountId?: string): TransactionWithDetails {
    return {
        ...txn,
        // Flatted fields for easy access
        account_name: txn.accounts?.name,
        category_name: txn.categories?.name,
        category_icon: txn.categories?.icon,
        category_image_url: txn.categories?.image_url,
        shop_name: txn.shops?.name,
        shop_image_url: txn.shops?.image_url,

        // Ensure numeric amount
        amount: txn.amount,

        // Display helpers
        displayType: txn.type as any,
        displayAmount: txn.amount,

        // Ensure required properties defaults
        cashback_mode: txn.cashback_mode ?? null,
        currency: txn.currency ?? null,
        created_by: txn.created_by ?? null,
    } as TransactionWithDetails;
}
