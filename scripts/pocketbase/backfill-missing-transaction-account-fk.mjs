import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PB_URL = process.env.POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = (process.env.POCKETBASE_DB_EMAIL || '').trim();
const PB_PASSWORD = (process.env.POCKETBASE_DB_PASSWORD || '').trim();

if (!SUPABASE_URL || !SUPABASE_KEY || !PB_EMAIL || !PB_PASSWORD) {
  console.error('Missing required env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function toPocketBaseId(sourceId, fallbackPrefix = 'mf3') {
  if (!sourceId) {
    const randomSeed = `${fallbackPrefix}-${Date.now()}-${Math.random()}`;
    const hash = crypto.createHash('sha256').update(randomSeed).digest();
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomId = '';
    for (let index = 0; index < 15; index++) {
      randomId += chars[hash[index] % chars.length];
    }
    return randomId;
  }

  if (/^[a-z0-9]{15}$/.test(sourceId)) {
    return sourceId;
  }

  const hash = crypto.createHash('sha256').update(String(sourceId)).digest();
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let index = 0; index < 15; index++) {
    result += chars[hash[index] % chars.length];
  }
  return result;
}

async function getPbToken() {
  const response = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`PB auth failed: ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.token;
}

async function listTransactionsWithMissingAccount(headers) {
  const all = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await fetch(`${PB_URL}/api/collections/transactions/records?page=${page}&perPage=200&fields=id,account_id,to_account_id,metadata,note,type`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list transactions page ${page}: ${await response.text()}`);
    }

    const payload = await response.json();
    totalPages = payload.totalPages || 1;

    const items = (payload.items || []).filter((item) => !item.account_id || String(item.account_id).trim() === '');
    all.push(...items);

    page += 1;
  } while (page <= totalPages);

  return all;
}

async function main() {
  const token = await getPbToken();
  const headers = { Authorization: token, 'Content-Type': 'application/json' };

  const missing = await listTransactionsWithMissingAccount(headers);
  console.log(`MISSING_ACCOUNT_TXNS=${missing.length}`);

  if (missing.length === 0) {
    console.log('No transaction requires backfill.');
    return;
  }

  let updated = 0;
  let skippedNoSourceId = 0;
  let skippedNoSupabaseRow = 0;
  let skippedNoAccountId = 0;

  for (const txn of missing) {
    const sourceTxnId = txn?.metadata?.source_id;
    if (!sourceTxnId || typeof sourceTxnId !== 'string') {
      skippedNoSourceId += 1;
      continue;
    }

    const { data: row, error } = await supabase
      .from('transactions')
      .select('id, account_id, target_account_id')
      .eq('id', sourceTxnId)
      .maybeSingle();

    if (error || !row) {
      skippedNoSupabaseRow += 1;
      continue;
    }

    if (!row.account_id) {
      skippedNoAccountId += 1;
      continue;
    }

    const pbAccountId = toPocketBaseId(row.account_id, 'accounts');
    const pbTargetId = row.target_account_id ? toPocketBaseId(row.target_account_id, 'accounts') : null;

    const patchBody = {
      account_id: pbAccountId,
      to_account_id: txn.to_account_id || pbTargetId || null,
    };

    const patchResponse = await fetch(`${PB_URL}/api/collections/transactions/records/${txn.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patchBody),
    });

    if (!patchResponse.ok) {
      console.warn(`Failed patch txn ${txn.id}: ${await patchResponse.text()}`);
      continue;
    }

    updated += 1;
  }

  console.log(`UPDATED=${updated}`);
  console.log(`SKIPPED_NO_SOURCE_ID=${skippedNoSourceId}`);
  console.log(`SKIPPED_NO_SUPABASE_ROW=${skippedNoSupabaseRow}`);
  console.log(`SKIPPED_NO_ACCOUNT_ID=${skippedNoAccountId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
