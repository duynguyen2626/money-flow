import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import fs from 'fs';

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

    const collNamesRes = await fetch(`${PB_URL}/api/collections?perPage=200&fields=name`, { headers });
    const { items: collections } = await collNamesRes.json();

    const report = [];

    for (const { name } of collections) {
        const res = await fetch(`${PB_URL}/api/collections/${name}`, { headers });
        if (res.ok) {
            const data = await res.json();
            if (name === 'categories') {
                report.push({ name, fullFields: data.fields });
            } else {
                const fieldNames = data.fields.map(f => f.name).sort();
                report.push({ name, fields: fieldNames });
            }
        } else {
            report.push({ name, error: res.status });
        }
    }

    const result = JSON.stringify(report, null, 2);
    console.log(result);
    fs.writeFileSync('full_probe_results.json', result, 'utf8');
}

probe().catch(console.error);
