/**
 * Diagnose PocketBase accounts collection for corrupted records
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const PB_URL = process.env.POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL!;
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD!;

let pbToken = '';

async function pbAuth() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  
  const data = await res.json();
  pbToken = data.token;
}

async function diagnose() {
  console.log('\n🔍 Diagnosing PocketBase accounts collection...\n');

  // Try different ways to fetch accounts
  const methods = [
    { desc: 'Basic list (no fields)', url: `/api/collections/pvl_acc_001/records?page=1&perPage=100` },
    { desc: 'No expand', url: `/api/collections/pvl_acc_001/records?page=1&perPage=100&skipTotal=true` },
  ];

  for (const method of methods) {
    console.log(`\n[Method] ${method.desc}`);
    console.log(`[URL] ${method.url}`);
    
    try {
      const res = await fetch(`${PB_URL}${method.url}`, {
        headers: { Authorization: `Bearer ${pbToken}` },
      });

      console.log(`[Status] ${res.status}`);

      if (!res.ok) {
        const text = await res.text();
        console.log(`[Error] ${text}`);
        continue;
      }

      const data = await res.json();
      console.log(`[Items Found] ${(data.items || []).length}`);
      
      if (data.items && data.items.length > 0) {
        console.log(`[Sample Records]:`);
        data.items.slice(0, 3).forEach((item: any) => {
          console.log(`  - ${item.id} (${item.name})`);
        });
      }
    } catch (err) {
      console.error(`[Exception] ${err}`);
    }
  }

  // Try to get collection info
  console.log(`\n[Collection Info]`);
  try {
    const res = await fetch(`${PB_URL}/api/collections/pvl_acc_001`, {
      headers: { Authorization: `Bearer ${pbToken}` },
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`  Name: ${data.name}`);
      console.log(`  Fields: ${data.schema.length}`);
      console.log(`  Type: ${data.type}`);
    }
  } catch (err) {
    console.error(`[Error fetching collection info]`, err);
  }
}

async function main() {
  try {
    await pbAuth();
    await diagnose();
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
