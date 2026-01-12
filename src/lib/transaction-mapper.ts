import { TransactionWithDetails } from "@/types/moneyflow.types";
import { TransactionFormValues } from "@/components/moneyflow/transaction-form";
import { generateTag } from "@/lib/tag";
import { Database } from '@/types/database.types';
import { createClient } from '@/lib/supabase/server';
import { normalizeMonthTag } from "@/lib/month-tag";

export type ShopRow = Database['public']['Tables']['shops']['Row'];

export async function loadShopInfo(
    supabase: ReturnType<typeof createClient>,
    shopId?: string | null
): Promise<{ name: string; image_url?: string | null } | null> {
    if (!shopId) return null;

    const { data: shop } = await supabase
        .from('shops')
        .select('name, image_url')
        .eq('id', shopId)
        .single();

    const typedShop = shop as { name: string; image_url?: string | null } | null;

    return typedShop ? { name: typedShop.name, image_url: typedShop.image_url } : null;
}

export function mapUnifiedTransaction(
    rawTxn: any,
    contextAccountId?: string
): TransactionWithDetails {
    // Defensive mapping to handle various join structures
    const baseTag = rawTxn.tag;
    const tag = normalizeMonthTag(baseTag) ?? baseTag ?? null;
    const originalAmount = Math.abs(rawTxn.amount ?? 0);

    // Attempt to extract joined data if available
    const categoryName = rawTxn.categories?.name || rawTxn.category?.name || rawTxn.category_name;
    const categoryIcon = rawTxn.categories?.icon || rawTxn.category?.icon;
    const shopName = rawTxn.shops?.name || rawTxn.shop?.name || rawTxn.shop_name;
    const shopImage = rawTxn.shops?.image_url || rawTxn.shop?.image_url;
    const personName = rawTxn.profiles?.name || rawTxn.person?.name || rawTxn.person_name;
    const personImage = rawTxn.profiles?.image_url || rawTxn.person?.image_url;

    // Determine Display Type
    let displayType: TransactionWithDetails['displayType'] = 'expense';
    if (rawTxn.type === 'income') displayType = 'income';
    else if (rawTxn.type === 'repayment') displayType = 'income'; // Usually Repayment In
    else if (rawTxn.type === 'transfer') {
        // If context is target, it's income-like
        if (contextAccountId && rawTxn.target_account_id === contextAccountId) {
            displayType = 'income';
        } else {
            displayType = 'expense';
        }
    }

    return {
        ...rawTxn,
        tag,
        original_amount: originalAmount,
        amount: rawTxn.amount ?? 0,
        displayType,
        display_type: displayType === 'income' ? 'IN' : displayType === 'expense' ? 'OUT' : 'TRANSFER',
        category_name: categoryName,
        category_icon: categoryIcon,
        shop_name: shopName,
        shop_image_url: shopImage,
        person_name: personName,
        person_image_url: personImage,
        history_count: rawTxn.transaction_history?.[0]?.count ?? 0,
        // Ensure critical fields are present
        cashback_share_percent: rawTxn.cashback_share_percent ?? null,
        cashback_share_fixed: rawTxn.cashback_share_fixed ?? null,
    } as TransactionWithDetails;
}

// Debug logging wrapper
export function parseMetadata(value: TransactionWithDetails['metadata']) {
    if (!value) return null;
    let parsed: Record<string, unknown> | null = null;

    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value) as Record<string, unknown>;
        } catch (e) {
            console.warn("[parseMetadata] JSON Parse Error:", e);
            parsed = null;
        }
    } else if (typeof value === 'object' && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
    }

    // Additional logging to help verify if parent_transaction_id is being seen
    if (parsed) {
        if ('parent_transaction_id' in parsed) {
            console.log("[parseMetadata] Found parent_transaction_id:", parsed.parent_transaction_id);
        } else {
            // console.log("[parseMetadata] No parent_transaction_id in:", parsed);
        }
    }

    return parsed;
}

export function buildEditInitialValues(txn: TransactionWithDetails): Partial<TransactionFormValues> {
    const baseAmount =
        typeof txn.original_amount === "number" ? txn.original_amount : txn.amount ?? 0;
    const percentValue =
        typeof txn.cashback_share_percent === "number" ? txn.cashback_share_percent : undefined;

    let derivedType: TransactionFormValues["type"] = (txn.type as any) === 'repayment' ? 'repayment' : txn.type as TransactionFormValues["type"] || "expense";

    const categoryName = txn.category_name?.toLowerCase() ?? '';
    const meta = parseMetadata(txn.metadata);

    if (meta && meta.is_debt_repayment_parent) {
        derivedType = 'repayment';
    } else if (txn.person_id) {
        if (categoryName.includes('thu nợ') || categoryName.includes('repayment')) {
            derivedType = 'repayment';
        } else {
            derivedType = 'debt';
        }
    } else if (categoryName.includes('cashback') || categoryName.includes('income') || categoryName.includes('refund')) {
        derivedType = 'income';
    } else if (categoryName.includes('money transfer') || categoryName.includes('chuyển tiền')) {
        derivedType = 'transfer';
    } else if (!txn.category_id && !txn.category_name) {
        derivedType = 'transfer';
    } else if (txn.type === 'income') {
        derivedType = 'income';
    } else if (txn.type === 'expense') {
        derivedType = 'expense';
    }

    let sourceAccountId = txn.account_id ?? undefined;
    let destinationAccountId =
        derivedType === "transfer" || derivedType === "debt"
            ? txn.target_account_id ?? undefined
            : undefined;

    if (derivedType === 'repayment') {
        // For repayment: source is bank, destination is debt
        sourceAccountId = txn.account_id ?? undefined;
        destinationAccountId = txn.target_account_id ?? undefined;
    }

    const result = {
        occurred_at: txn.occurred_at ? new Date(txn.occurred_at) : new Date(),
        type: derivedType,
        amount: Math.abs(baseAmount ?? 0),
        note: txn.note ?? "",
        tag: txn.tag ?? generateTag(new Date()),
        source_account_id: sourceAccountId,
        category_id: txn.category_id ?? undefined,
        person_id: (txn.person_id ?? (meta?.original_person_id as string)) || undefined,
        debt_account_id: destinationAccountId,
        shop_id: txn.shop_id ?? undefined,
        // Pass raw names for duplicate/edit scenarios where IDs might be missing but we want to preserve visual info or allow fuzzy match
        shop_name: txn.shop_name,
        shop_image_url: txn.shop_image_url,
        category_name: txn.category_name,
        cashback_share_percent:
            percentValue !== undefined && percentValue !== null ? percentValue * 100 : undefined, // Multiply by 100 for UI (0.01 → 1%)
        cashback_share_fixed:
            txn.cashback_share_fixed !== null && txn.cashback_share_fixed !== undefined ? Number(txn.cashback_share_fixed) : undefined,
        is_installment: txn.is_installment ?? false,
        // CRITICAL: Preserve cashback_mode from database (especially 'voluntary'), don't auto-infer
        cashback_mode: (txn.cashback_mode as 'none_back' | 'real_fixed' | 'real_percent' | 'voluntary') ||
            ((percentValue !== undefined && percentValue !== null && Number(percentValue) > 0) ? 'real_percent' :
                (txn.cashback_share_fixed !== null && txn.cashback_share_fixed !== undefined && Number(txn.cashback_share_fixed) > 0) ? 'real_fixed' : 'none_back'),
        metadata: meta,
    };

    // Diagnostic logging for duplicate form issue
    console.log('[buildEditInitialValues] Transaction:', {
        id: txn.id,
        shop_id: txn.shop_id,
        shop_name: txn.shop_name,
        account_id: txn.account_id,
        source_name: txn.source_name,
        result_shop_id: result.shop_id,
        result_source_account_id: result.source_account_id,
    });

    return result;
}
