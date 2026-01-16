
import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { TransactionSlide } from '@/components/moneyflow/transaction-slide-v2/TransactionSlide';

export default async function TestV2Page() {
    const supabase = createClient();

    const [
        { data: accounts },
        { data: categories },
        { data: people },
        { data: shops },
        { data: installments },
    ] = await Promise.all([
        supabase.from('accounts').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('people').select('*'),
        supabase.from('shops').select('*'),
        supabase.from('installment_plans').select('*').eq('status', 'active'),
    ]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-zinc-900">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Transaction Slide V2 Test</h1>
                <p className="mb-4 text-muted-foreground">Click the button below to open the slide-over.</p>

                <TransactionSlide
                    accounts={accounts || []}
                    categories={categories || []}
                    people={people || []}
                    shops={shops || []}
                    installments={installments || []}
                    defaultOpen={true}
                />
            </div>
        </div>
    );
}
