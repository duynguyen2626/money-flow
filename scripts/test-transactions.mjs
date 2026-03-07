
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// We need to import the service, but since it's a Next.js server component service,
// it's easier to verify via the /api/pb-test or by checking the logs of the dev server.
// However, I can create a standalone script that calls the PB service directly.

import { loadPocketBaseTransactions } from '../src/services/pocketbase/account-details.service.ts';

async function testTransactions() {
    console.log('--- Testing PocketBase Transactions ---');
    try {
        const txns = await loadPocketBaseTransactions({ limit: 5 });
        console.log(`Found ${txns.length} transactions`);

        if (txns.length > 0) {
            const t = txns[0];
            console.log('Sample Transaction:');
            console.log(`- ID: ${t.id}`);
            console.log(`- Date: ${t.occurred_at}`);
            console.log(`- Amount: ${t.amount}`);
            console.log(`- Note: ${t.note}`);
            console.log(`- Account: ${t.account_name}`);
            console.log(`- Category: ${t.category_name}`);
            console.log(`- Shop: ${t.shop_name}`);
            console.log(`- Person: ${t.person_name}`);
        } else {
            console.log('⚠️ No transactions found in PocketBase. Please ensure data is migrated.');
        }
    } catch (err) {
        console.error('❌ Test failed:', err);
    }
}

testTransactions();
