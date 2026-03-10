/**
 * Rebuild accounts collection - purge all records and re-migrate from Supabase
 * Usage: npx tsx scripts/pb-rebuild-accounts.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const PB_URL = process.env.POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL!;
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD!;

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PB_ACCOUNTS_COLLECTION = 'pvl_acc_001';
const PB_CATEGORIES_COLLECTION = 'pvl_cat_001';

let pbToken = '';

async function pbAuth() {
  console.log('[PB Auth] Logging in...');
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  
  const data = await res.json();
  pbToken = data.token;
  console.log('[PB Auth] ✅ Success');
}

async function pbRequest(path: string, options: any = {}) {
  const query = options.query ? `?${new URLSearchParams(options.query).toString()}` : '';
  const url = `${PB_URL}${path}${query}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pbToken}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PB request failed [${res.status}]: ${text.slice(0, 200)}`);
  }
  
  // Handle 204 No Content (e.g., DELETE responses)
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {};
  }
  
  return res.json();
}

function toPocketBaseId(sourceId: string): string {
  const hash = sourceId.split('-').join('').slice(0, 15);
  const base32 = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 15; i++) {
    const charCode = hash.charCodeAt(i % hash.length);
    result += base32[charCode % base32.length];
  }
  return result;
}

function mapAccountType(type: string | undefined): string {
  const typeMap: Record<string, string> = {
    ewallet: 'e_wallet',
    e_wallet: 'e_wallet',
    debt: 'savings',
    system: 'savings',
    income: 'savings',
    expense: 'savings',
    bank: 'bank',
    credit_card: 'credit_card',
    debit_card: 'debit_card',
    savings: 'savings',
    investment: 'investment',
    loan: 'loan',
  };
  
  return typeMap[type?.toLowerCase() || ''] || 'bank';
}

async function purgeAccounts() {
  console.log('\n[Purge] Deleting all accounts from PocketBase...');
  
  let totalDeleted = 0;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    attempts++;
    const res = await pbRequest(`/api/collections/${PB_ACCOUNTS_COLLECTION}/records`, {
      query: { page: 1, perPage: 500 },
    });
    
    const records = res.items || [];
    if (records.length === 0) {
      console.log(`[Purge] No more records found (attempt ${attempts}). Stopping purge.`);
      break;
    }
    
    console.log(`[Purge] Attempt ${attempts}: Found ${records.length} records, deleting...`);
    
    let deletedThisRound = 0;
    for (const record of records) {
      try {
        await pbRequest(`/api/collections/${PB_ACCOUNTS_COLLECTION}/records/${record.id}`, {
          method: 'DELETE',
        });
        deletedThisRound++;
        totalDeleted++;
      } catch (err) {
        console.error(`[Purge] Failed to delete ${record.id}:`, String(err).slice(0, 100));
      }
    }
    
    console.log(`[Purge] Attempt ${attempts}: Deleted ${deletedThisRound}/${records.length} records`);
  }
  
  console.log(`[Purge] ✅ Total deleted: ${totalDeleted} accounts`);
}

async function rebuildAccounts() {
  console.log('\n[Rebuild] Starting account backfill from Supabase...');
  const supabase = createClient(SB_URL, SB_KEY);
  
  const { data: sbAccounts, error } = await supabase.from('accounts').select('*').order('name');
  if (error) throw new Error(`SB accounts fetch failed: ${error.message}`);
  
  console.log(`[Rebuild] Retrieved ${(sbAccounts || []).length} accounts from Supabase`);
  
  // Build category ID map for config migration
  const { data: sbCategories } = await supabase.from('categories').select('id');
  const pbCategories = await pbRequest(`/api/collections/${PB_CATEGORIES_COLLECTION}/records`, {
    query: { perPage: 500, fields: 'id,slug' },
  });
  
  const sbToPbCategoryMap = new Map<string, string>();
  (sbCategories || []).forEach((cat: any) => {
    const pbMatch =
      (pbCategories.items || []).find((pb: any) => pb.slug === cat.id) ||
      (pbCategories.items || []).find((pb: any) => pb.id === toPocketBaseId(cat.id));
    if (pbMatch) sbToPbCategoryMap.set(cat.id, pbMatch.id);
  });
  
  console.log(`[Rebuild] Built category map: ${sbToPbCategoryMap.size} entries`);
  
  let created = 0;
  let failed = 0;
  
  for (const acc of (sbAccounts || [])) {
    const pbId = toPocketBaseId(acc.id);
    
    // Migrate cashback config cat_ids from SB → PB
    let migratedCashbackConfig = acc.cashback_config;
    let migratedRulesJson = acc.cb_rules_json;
    
    if (acc.cashback_config) {
      migratedCashbackConfig = JSON.parse(JSON.stringify(acc.cashback_config));
      const tiers = migratedCashbackConfig?.program?.rules_json_v2?.tiers || [];
      tiers.forEach((tier: any) => {
        (tier.policies || []).forEach((policy: any) => {
          if (Array.isArray(policy.cat_ids)) {
            policy.cat_ids = policy.cat_ids.map((sbId: string) => sbToPbCategoryMap.get(sbId) || sbId);
          }
        });
      });
    }
    
    if (acc.cb_rules_json?.tiers) {
      migratedRulesJson = JSON.parse(JSON.stringify(acc.cb_rules_json));
      (migratedRulesJson.tiers || []).forEach((tier: any) => {
        (tier.policies || []).forEach((policy: any) => {
          if (Array.isArray(policy.cat_ids)) {
            policy.cat_ids = policy.cat_ids.map((sbId: string) => sbToPbCategoryMap.get(sbId) || sbId);
          }
        });
      });
    }
    
    const body = {
      slug: acc.id,
      name: acc.name,
      type: mapAccountType(acc.type),
      currency: acc.currency || 'VND',
      current_balance: acc.current_balance || 0,
      credit_limit: acc.credit_limit || 0,
      is_active: acc.is_active ?? true,
      image_url: acc.image_url || null,
      receiver_name: acc.receiver_name || null,
      account_number: acc.account_number || null,
      total_in: acc.total_in || 0,
      total_out: acc.total_out || 0,
      cashback_config: migratedCashbackConfig || null,
      cashback_config_version: acc.cashback_config_version || 1,
      annual_fee: acc.annual_fee || null,
      annual_fee_waiver_target: acc.annual_fee_waiver_target || null,
      cb_type: acc.cb_type || 'none',
      cb_base_rate: acc.cb_base_rate || 0,
      cb_max_budget: acc.cb_max_budget || null,
      cb_is_unlimited: acc.cb_is_unlimited || false,
      cb_rules_json: migratedRulesJson || null,
      cb_min_spend: acc.cb_min_spend || null,
      cb_cycle_type: acc.cb_cycle_type || 'calendar_month',
      statement_day: acc.statement_day || null,
      due_date: acc.due_date || null,
      holder_type: acc.holder_type || null,
      holder_person_id: null,
      parent_account_id: null,
      secured_by_account_id: null,
      owner_id: null,
    };
    
    try {
      await pbRequest(`/api/collections/${PB_ACCOUNTS_COLLECTION}/records`, {
        method: 'POST',
        body: { id: pbId, ...body },
      });
      created++;
      
      if (created % 20 === 0) {
        console.log(`[Rebuild Progress] ${created}/${(sbAccounts || []).length} created`);
      }
    } catch (err) {
      failed++;
      console.error(`[Rebuild] Error creating ${acc.name}:`, String(err).slice(0, 100));
    }
  }
  
  console.log(`[Rebuild] ✅ Done: ${created} created, ${failed} failed`);
}

async function main() {
  try {
    await pbAuth();
    
    console.log('\n🚀 Starting account rebuild (purge → re-migrate)...');
    
    await purgeAccounts();
    await rebuildAccounts();
    
    console.log('\n✅ Account rebuild complete! Accounts collection is now clean.');
  } catch (err: any) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
