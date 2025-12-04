import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
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
    console.error('Error: Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Checking Subscriptions Schema ---');
    const { data: service, error } = await supabase
        .from('subscriptions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching subscriptions:', error);
    } else {
        if (service && service.length > 0) {
            console.log('Sample service keys:', Object.keys(service[0]));
            console.log('Sample service:', service[0]);
        } else {
            console.log('No services found.');
        }
    }
}

checkSchema();
