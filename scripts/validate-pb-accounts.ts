/**
 * Validate PocketBase account records for data integrity
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

interface AccountRecord {
  id: string;
  name?: string;
  slug?: string;
  type?: string;
  currency?: string;
  created?: string;
  [key: string]: any;
}

async function pbAuth() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });

  const data = await res.json();
  pbToken = data.token;
}

async function validateAccounts() {
  console.log('\n🔎 Validating PocketBase account records...\n');

  const page = 1;
  const res = await fetch(
    `${PB_URL}/api/collections/pvl_acc_001/records?page=${page}&perPage=500`,
    {
      headers: { Authorization: `Bearer ${pbToken}` },
    }
  );

  if (!res.ok) {
    console.error(`❌ Failed to fetch accounts: ${res.status}`);
    return;
  }

  const data = await res.json();
  const accounts: AccountRecord[] = data.items || [];

  console.log(`📊 Total accounts: ${accounts.length}\n`);

  const issues: string[] = [];
  const stats = {
    nullName: 0,
    nullType: 0,
    nullCurrency: 0,
    noSlug: 0,
    invalidType: 0,
  };

  accounts.forEach((acc) => {
    // Check for null/missing fields
    if (!acc.name) {
      stats.nullName++;
      issues.push(`❌ Account ${acc.id}: name is null/empty`);
    }
    if (!acc.type) {
      stats.nullType++;
      issues.push(`❌ Account ${acc.id}: type is null/empty`);
    }
    if (!acc.currency) {
      stats.nullCurrency++;
      issues.push(`❌ Account ${acc.id}: currency is null/empty`);
    }
    if (!acc.slug) {
      stats.noSlug++;
      issues.push(`⚠️  Account ${acc.id}: no slug field`);
    }

    // Check for valid type values
    const validTypes = ['bank', 'credit_card', 'debit_card', 'savings', 'investment', 'e_wallet', 'loan'];
    if (acc.type && !validTypes.includes(acc.type)) {
      stats.invalidType++;
      issues.push(`⚠️  Account ${acc.id} (${acc.name}): invalid type "${acc.type}"`);
    }
  });

  console.log('📈 Statistics:');
  console.log(`  - Accounts with null name: ${stats.nullName}`);
  console.log(`  - Accounts with null type: ${stats.nullType}`);
  console.log(`  - Accounts with null currency: ${stats.nullCurrency}`);
  console.log(`  - Accounts with no slug: ${stats.noSlug}`);
  console.log(`  - Accounts with invalid type: ${stats.invalidType}`);

  if (issues.length > 0) {
    console.log(`\n⚠️  Issues found (showing first 20 of ${issues.length}):`);
    issues.slice(0, 20).forEach((issue) => console.log(`  ${issue}`));
    if (issues.length > 20) {
      console.log(`  ... and ${issues.length - 20} more`);
    }
  } else {
    console.log('\n✅ No data integrity issues found!');
  }
}

async function main() {
  try {
    await pbAuth();
    await validateAccounts();
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
