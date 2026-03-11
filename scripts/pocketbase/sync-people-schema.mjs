import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const PB_URL = 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD;

async function sync() {
    console.log('Logging in to PocketBase...');
    let authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
    });

    if (!authRes.ok) {
        throw new Error('Login failed: ' + await authRes.text());
    }

    const { token } = await authRes.json();
    const headers = { 'Content-Type': 'application/json', 'Authorization': token };

    console.log('Reading schema.json...');
    const schemaRaw = fs.readFileSync(path.resolve(__dirname, 'schema.json'), 'utf8');
    const sections = JSON.parse(schemaRaw);
    const peopleColl = sections.find(c => c.name === 'people');

    if (!peopleColl) {
        throw new Error('People collection not found in schema.json');
    }

    console.log('Updating People collection schema...');
    
    // Transform fields to internal PB format (flattens options)
    const transformedFields = peopleColl.fields.map(f => {
        const transformed = { ...f };
        if (f.options && typeof f.options === 'object') {
            Object.assign(transformed, f.options);
        }
        return transformed;
    });

    const updatePayload = {
        name: 'people',
        type: 'base',
        fields: transformedFields,
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
    };

    const updateRes = await fetch(`${PB_URL}/api/collections/people`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updatePayload)
    });

    if (updateRes.ok) {
        console.log('✅ People collection schema updated successfully!');
    } else {
        const errText = await updateRes.text();
        console.error('❌ Failed to update People collection:', errText);
        
        // If 404, maybe it needs more specific field mapping or the collection doesn't exist by name 'people'
        // But looking at previous output, it does exist.
    }
}

sync().catch(console.error);
