import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLadyConfig() {
    console.log('Fixing Vpbank Lady config...');

    // Fetch current config
    const { data: accounts, error: fetchError } = await supabase
        .from('accounts')
        .select('id, name, cashback_config')
        .eq('name', 'Vpbank Lady');

    if (fetchError || !accounts || accounts.length === 0) {
        console.error('Failed to fetch Vpbank Lady account:', fetchError);
        return;
    }

    const account = accounts[0];
    const config = account.cashback_config;

    console.log('Current Premium minTotalSpend:', config.program.levels[0].minTotalSpend);
    console.log('Current Standard minTotalSpend:', config.program.levels[1].minTotalSpend);

    // Update config
    config.program.levels[0].minTotalSpend = 15000000; // Premium: 15M
    config.program.levels[1].minTotalSpend = 100000;   // Standard: 100k

    const result = await supabase
        .from('accounts')
        .update({ cashback_config: config })
        .eq('id', account.id);

    if (result.error) {
        console.error('Update failed:', result.error);
        return;
    }

    console.log('✅ Updated config:');
    console.log('  Premium minTotalSpend: 15,000,000 (≥15M)');
    console.log('  Standard minTotalSpend: 100,000 (<15M)');

    // Verify
    const { data: verify } = await supabase
        .from('accounts')
        .select('cashback_config')
        .eq('id', account.id)
        .single();

    if (verify) {
        const v = verify;
        console.log('\n✓ Verified:');
        console.log('  Premium:', v.cashback_config.program.levels[0].minTotalSpend);
        console.log('  Standard:', v.cashback_config.program.levels[1].minTotalSpend);
    }
}

fixLadyConfig().then(() => {
    console.log('\nDone!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
