
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function patch() {
    const { data: refunds } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', REFUND_PENDING_ACCOUNT_ID)
        .is('metadata->original_transaction_id', null)

    console.log(`Found ${refunds?.length} pending refunds without origin link.`);

    for (const refund of refunds || []) {
        const meta = typeof refund.metadata === 'string' ? JSON.parse(refund.metadata) : refund.metadata;
        const note = meta.original_note;

        if (!note) continue;

        console.log(`Looking for original of: ${note} ($${refund.amount})`);

        // Find candidate: same amount, note contains text (or exact match), occurred before refund
        const { data: candidates } = await supabase
            .from('transactions')
            .select('id, note, amount, occurred_at')
            .eq('amount', refund.amount)
            .neq('id', refund.id)
            .ilike('note', `%${note}%`)
            .lt('occurred_at', refund.occurred_at)
            .limit(5);

        if (candidates && candidates.length === 1) {
            const origin = candidates[0];
            console.log(`  Match found: ${origin.id} - ${origin.note}`);

            const newMeta = { ...meta, original_transaction_id: origin.id };
            await supabase.from('transactions').update({ metadata: newMeta }).eq('id', refund.id);
            console.log('  Updated metadata.');
        } else {
            console.log(`  Ambiguous or no match: ${candidates?.length} found.`);
        }
    }
}

patch();
