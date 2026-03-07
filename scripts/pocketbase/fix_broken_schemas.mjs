import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const PB_URL = 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD;

async function fixSchema() {
    let authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
    });

    const { token } = await authRes.json();
    const headers = { 'Content-Type': 'application/json', 'Authorization': token };

    const schemaRaw = fs.readFileSync(path.resolve(__dirname, 'schema.json'), 'utf8');
    const allCollections = JSON.parse(schemaRaw);

    // Specifically target collections we know are broken
    const targets = ['cashback_cycles', 'services', 'batches', 'batch_items'];

    for (const name of targets) {
        console.log(`Fixing collection: ${name}`);
        const expected = allCollections.find(c => c.name === name);
        if (!expected) {
            console.warn(`Collection ${name} not found in schema.json`);
            continue;
        }

        const res = await fetch(`${PB_URL}/api/collections/${name}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(expected)
        });

        if (res.ok) {
            console.log(`✅ ${name} updated successfully!`);
        } else {
            console.error(`❌ Failed to update ${name}: ${res.status} ${await res.text()}`);
        }
    }
}

fixSchema().catch(console.error);
