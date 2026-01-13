
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TXN1_ID = '4b819d2c-3278-4de3-988f-e6ca4e33cbea';
const VISIBLE_ACC_ID = 'a8d4afe7-cf41-4ceb-9529-243fefd0c4e7';

async function forceMigrate() {
    console.log('Force Migrating TXN1...');

    // 1. Check current state
    const { data: before } = await supabase.from('transactions').select('account_id, created_by').eq('id', TXN1_ID).single();
    console.log('Before:', before);

    // 2. Update Account
    const { data: updated, error } = await supabase
        .from('transactions')
        .update({ account_id: VISIBLE_ACC_ID })
        .eq('id', TXN1_ID)
        .select();

    if (error) {
        console.error('Update Failed:', error);
        return;
    }
    console.log('Update Result:', updated);

    // 3. Fix Created_By (Ownership) just in case
    // Get valid owner from account
    const { data: acc } = await supabase.from('accounts').select('owner_id').eq('id', VISIBLE_ACC_ID).single();
    if (acc?.owner_id) {
        const { error: ownerError } = await supabase
            .from('transactions')
            .update({ created_by: acc.owner_id }) // Assuming created_by maps to owner logic
            .eq('id', TXN1_ID);
        if (ownerError) console.error('Owner Fix Failed:', ownerError);
        else console.log('Owner Fixed to:', acc.owner_id);
    }

    // 4. Update Refund Link
    // Check if there is a refund request pointing to it
    const { data: refund } = await supabase.from('transactions')
        .select('id, metadata')
        .ilike('metadata', `%${TXN1_ID}%`) // Loose search
        .single();

    if (refund) {
        console.log('Found Linked Refund:', refund.id);
        // Ensure specific link
        const meta = typeof refund.metadata === 'string' ? JSON.parse(refund.metadata) : refund.metadata;
        if (meta.original_transaction_id !== TXN1_ID) {
            const newMeta = { ...meta, original_transaction_id: TXN1_ID };
            await supabase.from('transactions').update({ metadata: newMeta }).eq('id', refund.id);
            console.log('Link Verified/Fixed.');
        }

        // Also fix Refund ownership to match
        if (acc?.owner_id) {
            await supabase.from('transactions').update({ created_by: acc.owner_id, owner_id: acc.owner_id }).eq('id', refund.id);
        }
    }

}

forceMigrate();
