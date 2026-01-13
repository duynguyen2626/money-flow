
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function diagnose() {
    // 1. Check account types
    const { data: accounts } = await supabase.from('accounts').select('id, name, type');

    if (!accounts) {
        console.log('No accounts found');
        return;
    }

    console.log('Account Types found:');
    const types = new Set(accounts.map(a => a.type));
    types.forEach(t => console.log(` - ${t}`));

    // 2. Check for transactions linked to these accounts
    for (const account of accounts) {
        if (['bank', 'credit_card', 'wallet'].includes(account.type)) {
            const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('account_id', account.id);
            console.log(`Account "${account.name}" (${account.type}) has ${count} transactions.`);
        }
    }
}

diagnose();
