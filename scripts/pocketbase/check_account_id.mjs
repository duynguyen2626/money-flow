import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const PB_URL = 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD;

async function check() {
    let authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
    });

    const { token } = await authRes.json();
    const headers = { 'Authorization': token };

    const targetId = '5suiccb03badhj7';
    console.log(`Checking account ID: ${targetId}`);

    const res = await fetch(`${PB_URL}/api/collections/accounts/records/${targetId}`, { headers });
    if (res.ok) {
        console.log('✅ Found account:');
        console.log(JSON.stringify(await res.json(), null, 2));
    } else {
        console.log(`❌ Not found: ${res.status} ${await res.text()}`);
    }

    // Also list some accounts to see what IDs they have
    console.log('\nListing some accounts:');
    const listRes = await fetch(`${PB_URL}/api/collections/accounts/records?perPage=5`, { headers });
    const { items } = await listRes.json();
    items.forEach(a => console.log(`- ${a.id} (${a.name}) slug: ${a.slug}`));
}

check().catch(console.error);
