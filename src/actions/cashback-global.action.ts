'use server';

import { createClient } from '@/lib/supabase/server';

export interface MonthlyCashbackData {
    estimated: number;
    real: number;
}

export interface CashbackMatrixRow {
    id: string;
    name: string;
    image_url?: string;
    annual_fee: number;
    total_real: number;
    profit: number;
    months: Record<string, MonthlyCashbackData>;
}

export async function getGlobalCashbackMatrix(year: number): Promise<{ success: boolean; data: CashbackMatrixRow[]; error?: string }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('get_year_cashback_summary', { year_input: year });

        if (error) {
            console.error('RPC get_year_cashback_summary failed:', error);
            return { success: false, data: [], error: error.message };
        }

        return { success: true, data: data as CashbackMatrixRow[] };
    } catch (err: any) {
        console.error('getGlobalCashbackMatrix exception:', err);
        return { success: false, data: [], error: err.message || 'Unknown error' };
    }
}
