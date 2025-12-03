import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Bắt buộc dùng Service Key để bypass RLS

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase URL or Service Role Key in .env.local');
    console.log('👉 Tip: Ensure you have a .env.local file with SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDraftFundAccount() {
    console.log('🔄 Connecting to Supabase...');
    console.log('🔍 Checking for existing "Draft Fund" account...');

    // 1. Check if "Draft Fund" already exists
    const { data: existingAccount, error: findError } = await supabase
        .from('accounts')
        .select('id, name, owner_id')
        .eq('name', 'Draft Fund')
        .single();

    if (existingAccount) {
        console.log(`✅ "Draft Fund" account already exists!`);
        console.log(`   - ID: ${existingAccount.id}`);
        console.log(`   - Owner: ${existingAccount.owner_id}`);
        return;
    }

    // 2. Find a valid Owner ID (We need a real user profile to assign ownership)
    // We prioritize the first user found in 'profiles'.
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(1);

    if (profileError || !profiles || profiles.length === 0) {
        console.error('❌ Error: Could not find any user profile to assign ownership.');
        console.log('👉 Tip: Sign up a user in your app first.');
        return;
    }

    const owner = profiles[0];
    console.log(`👤 Assigning ownership to: ${owner.full_name || 'User'} (${owner.id})`);

    // 3. Insert the "Draft Fund" Account
    // Using specific structure matching your "Receivable" example
    const newAccount = {
        name: 'Draft Fund',
        type: 'asset', // 'asset' is appropriate for a holding fund
        currency: 'VND',
        credit_limit: 0,
        current_balance: 0,
        owner_id: owner.id,
        is_active: true,
        cashback_config: null,
        // Logo Icon: General Ledger / Money Bag style
        logo_url: 'https://img.icons8.com/fluency/48/general-ledger.png',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('accounts')
        .insert(newAccount)
        .select()
        .single();

    if (error) {
        console.error('❌ Failed to create account:', error.message);
    } else {
        console.log('🎉 Successfully created "Draft Fund" account!');
        console.log('-------------------------------------------');
        console.log(`🆔 ID:   ${data.id}`);
        console.log(`📛 Name: ${data.name}`);
        console.log(`🖼️ Logo: ${data.logo_url}`);
        console.log('-------------------------------------------');
    }
}

seedDraftFundAccount();