'use server';

import { createClient } from '@/lib/supabase/server';

export async function getRecentShopByCategoryId(categoryId: string): Promise<string | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('transactions')
        .select('shop_id')
        .eq('category_id', categoryId)
        .not('shop_id', 'is', null)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching recent shop for category:', error);
        return null;
    }

    return (data as any)?.shop_id ?? null;
}

export async function getRecentShopIdsByCategoryId(categoryId: string): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('transactions')
        .select('shop_id')
        .eq('category_id', categoryId)
        .not('shop_id', 'is', null)
        .order('occurred_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching recent shops for category:', error);
        return [];
    }

    const ids = (data as any[]).map(d => d.shop_id).filter(Boolean);
    return Array.from(new Set(ids)).slice(0, 10);
}

export async function getRecentCategoriesByShopId(shopId: string): Promise<string[]> {
    const supabase = createClient();

    // Fetch the 20 most recent unique categories used with this shop
    const { data, error } = await supabase
        .from('transactions')
        .select('category_id')
        .eq('shop_id', shopId)
        .not('category_id', 'is', null)
        .order('occurred_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching recent categories for shop:', error);
        return [];
    }

    const ids = (data as any[]).map(d => d.category_id).filter(Boolean);
    // Return unique IDs (up to 5)
    return Array.from(new Set(ids)).slice(0, 5);
}
