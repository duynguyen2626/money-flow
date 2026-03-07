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

    const endpoints = [
        '/api/collections/import',
        '/api/settings',
        '/api/collections?perPage=1'
    ];

    for (const ep of endpoints) {
        const res = await fetch(`${PB_URL}${ep}`, { headers });
        console.log(`${ep}: ${res.status} ${res.statusText}`);
    }
}

probe().catch(console.error);
