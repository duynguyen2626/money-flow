
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TXN1_ID = '4b819d2c-3278-4de3-988f-e6ca4e33cbea';
const DUPLICATE_ACC_ID = '89bd159e-192b-487d-ac08-046843e86e7d';
const VISIBLE_ACC_ID = 'a8d4afe7-cf41-4ceb-9529-243fefd0c4e7';

async function verify() {
    console.log('Verifying TXN1 Location...');

    // 1. Transaction
    const { data: txn, error } = await supabase.from('transactions').select('id, account_id, note').eq('id', TXN1_ID).single();
    if (error || !txn) { console.error('TXN Not Found!', error); return; }

    console.log(`TXN1 Account ID: ${txn.account_id}`);

    if (txn.account_id === DUPLICATE_ACC_ID) console.error('>>> STILL ON DUPLICATE ACCOUNT! <<<');
    if (txn.account_id === VISIBLE_ACC_ID) console.log('>>> Correctly on Visible Account. <<<');

    // 2. Accounts
    const { data: accDupe } = await supabase.from('accounts').select('id, name').eq('id', DUPLICATE_ACC_ID).single();
    console.log(`Duplicate Acc: ${accDupe?.name} (${accDupe?.id})`);

    const { data: accVis } = await supabase.from('accounts').select('id, name').eq('id', VISIBLE_ACC_ID).single();
    console.log(`Visible Acc: ${accVis?.name} (${accVis?.id})`);
}

verify();
