import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const PB_URL = 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD;

function transformField(f) {
    const transformed = { ...f };
    if (f.options) {
        Object.assign(transformed, f.options);
        delete transformed.options;
    }
    return transformed;
}

async function sync() {
    let authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
    });

    const { token } = await authRes.json();
    const headers = { 'Content-Type': 'application/json', 'Authorization': token };

    const schemaRaw = fs.readFileSync(path.resolve(__dirname, 'schema.json'), 'utf8');
    const collections = JSON.parse(schemaRaw);

    for (const coll of collections) {
        console.log(`Syncing collection: ${coll.name}`);

        // Transform the collection record for PB v0.22+
        const transformedColl = {
            ...coll,
            fields: coll.fields.map(transformField),
            // Ensure rules are open for now if not specified
            listRule: coll.listRule ?? "",
            viewRule: coll.viewRule ?? "",
            createRule: coll.createRule ?? "",
            updateRule: coll.updateRule ?? "",
            deleteRule: coll.deleteRule ?? ""
        };

        const checkRes = await fetch(`${PB_URL}/api/collections/${coll.name}`, { headers });
        if (checkRes.ok) {
            console.log(`- Updating existing: ${coll.name}`);
            const updateRes = await fetch(`${PB_URL}/api/collections/${coll.name}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(transformedColl)
            });
            if (updateRes.ok) {
                console.log(`  ✅ Done.`);
            } else {
                console.error(`  ❌ Failed: ${updateRes.status} ${await updateRes.text()}`);
            }
        } else {
            console.log(`- Creating new: ${coll.name}`);
            const createRes = await fetch(`${PB_URL}/api/collections`, {
                method: 'POST',
                headers,
                body: JSON.stringify(transformedColl)
            });
            if (createRes.ok) {
                console.log(`  ✅ Done.`);
            } else {
                console.error(`  ❌ Failed: ${createRes.status} ${await createRes.text()}`);
            }
        }
    }
}

sync().catch(console.error);
