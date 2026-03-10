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

    const collections = ['transactions', 'cashback_cycles', 'accounts'];

    for (const name of collections) {
        const res = await fetch(`${PB_URL}/api/collections/${name}/records?perPage=1`, { headers });
        if (res.ok) {
            const data = await res.json();
            console.log(`${name}: ${data.totalItems} items`);
        } else {
            console.log(`${name}: failed ${res.status}`);
        }
    }
}

check().catch(console.error);
