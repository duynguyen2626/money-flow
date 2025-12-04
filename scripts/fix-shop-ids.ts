import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual Env Parsing
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let envConfig: Record<string, string> = {};

if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            envConfig[key] = value;
        }
    });
}

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'] || envConfig['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Fixing Shop IDs for Services ---');

    // 1. Find Shop IDs
    const { data: shops, error: shopError } = await supabase
        .from('shops')
        .select('id, name')
        .in('name', ['Youtube', 'iCloud']);

    if (shopError) {
        console.error('Error fetching shops:', shopError);
        return;
    }

    const youtubeShop = shops.find(s => s.name === 'Youtube');
    const icloudShop = shops.find(s => s.name === 'iCloud');

    console.log('Found Shops:', { youtube: youtubeShop, icloud: icloudShop });

    // 2. Update Services
    if (youtubeShop) {
        console.log('Updating YouTube Service...');
        const { error: ytError } = await supabase
            .from('subscriptions')
            .update({ shop_id: youtubeShop.id } as any)
            .eq('name', 'Youtube'); // Assuming name is 'Youtube' or use ID '95064279-8ce1-4217-88c8-d40aef2fbb94'

        if (ytError) console.error('Error updating YouTube:', ytError);
        else console.log('YouTube updated.');
    }

    if (icloudShop) {
        console.log('Updating iCloud Service...');
        const { error: icError } = await supabase
            .from('subscriptions')
            .update({ shop_id: icloudShop.id } as any)
            .eq('name', 'iCloud'); // Assuming name is 'iCloud' or use ID 'f0fd840f-aac8-4865-875b-53373de3496d'

        if (icError) console.error('Error updating iCloud:', icError);
        else console.log('iCloud updated.');
    }
}

main();
