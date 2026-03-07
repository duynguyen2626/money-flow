import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const PB_URL = 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD;

async function probe() {
    let authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
    });

    const { token } = await authRes.json();
    const headers = { 'Authorization': token };

    console.log('--- Collection Info: cashback_cycles ---');
    const res = await fetch(`${PB_URL}/api/collections/cashback_cycles`, { headers });
    if (res.ok) {
        console.log(JSON.stringify(await res.json(), null, 2));
    } else {
        console.log(`Failed to get collection: ${res.status} ${await res.text()}`);
    }

    console.log('\n--- Records Preview: cashback_cycles ---');
    const recRes = await fetch(`${PB_URL}/api/collections/cashback_cycles/records?perPage=1`, { headers });
    if (recRes.ok) {
        console.log(JSON.stringify(await recRes.json(), null, 2));
    } else {
        console.log(`Failed to get records: ${recRes.status} ${await recRes.text()}`);
    }
}

probe().catch(console.error);
