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

    const collections = ['categories', 'shops', 'accounts'];

    for (const name of collections) {
        console.log(`--- Collection Info: ${name} ---`);
        const res = await fetch(`${PB_URL}/api/collections/${name}`, { headers });
        if (res.ok) {
            const data = await res.json();
            console.log(`Fields: ${data.fields.map(f => f.name).join(', ')}`);
        } else {
            console.log(`Failed to get collection ${name}: ${res.status}`);
        }
    }
}

probe().catch(console.error);
