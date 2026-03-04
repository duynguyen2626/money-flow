import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '/Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PB_URL = 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genId = () => Array.from({ length: 15 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');

const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
});
const { token } = await authRes.json();
const H = { 'Content-Type': 'application/json', Authorization: token };
console.log('✅ Auth OK');

// 1. Build account idMap from PocketBase (fetch all accounts, use metadata.original_supabase_id or slug)
// We need supabase UUID → PB ID mapping. Fetch all from PB accounts ordered by name, and match to supabase by name.
const { data: sbAccounts } = await supabase.from('accounts').select('id, name');
const pbAccRes = await fetch(`${PB_URL}/api/collections/accounts/records?perPage=200`, { headers: H });
const { items: pbAccounts } = await pbAccRes.json();

const accMap = new Map(); // supabase UUID → PB ID
for (const pbAcc of pbAccounts || []) {
  const sbAcc = sbAccounts?.find(a => a.name === pbAcc.name);
  if (sbAcc) accMap.set(sbAcc.id, pbAcc.id);
}
console.log(`🗺️  Account map: ${accMap.size} entries`);

// 2. Migrate services
console.log('\n🔁 Migrating services...');
const clrSvc = await fetch(`${PB_URL}/api/collections/services/records?perPage=200`, { headers: H });
const { items: svcItems } = await clrSvc.json();
for (const item of svcItems || []) {
  await fetch(`${PB_URL}/api/collections/services/records/${item.id}`, { method: 'DELETE', headers: H });
}

const { data: subs } = await supabase.from('subscriptions').select('*');
let svcInserted = 0;
for (const s of subs || []) {
  const res = await fetch(`${PB_URL}/api/collections/services/records`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      id: genId(), name: s.name,
      amount: parseFloat(s.price || 0),
      type: 'subscription', is_active: s.is_active !== false,
    })
  });
  if (res.ok) svcInserted++;
  else console.warn('  svc fail:', await res.text());
}
console.log(`  ✅ services: ${svcInserted} inserted`);

// 3. Migrate cashback_cycles
console.log('\n📊 Migrating cashback_cycles...');
const clrCyc = await fetch(`${PB_URL}/api/collections/cashback_cycles/records?perPage=200`, { headers: H });
const { items: cycItems } = await clrCyc.json();
for (const item of cycItems || []) {
  await fetch(`${PB_URL}/api/collections/cashback_cycles/records/${item.id}`, { method: 'DELETE', headers: H });
}

const { data: cycles } = await supabase.from('cashback_cycles').select('*');
let cycInserted = 0, cycSkipped = 0;
for (const c of cycles || []) {
  const accPbId = accMap.get(c.account_id);
  if (!accPbId) { cycSkipped++; continue; }
  const res = await fetch(`${PB_URL}/api/collections/cashback_cycles/records`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      id: genId(), account_id: accPbId,
      cycle_tag: c.cycle_tag,
      spent_amount: parseFloat(c.spent_amount || 0),
      real_awarded: parseFloat(c.real_awarded || 0),
      virtual_profit: parseFloat(c.virtual_profit || 0),
      met_min_spend: c.met_min_spend || false,
      is_exhausted: c.is_exhausted || false,
    })
  });
  if (res.ok) cycInserted++;
  else { cycSkipped++; console.warn('  cyc fail:', (await res.text()).substring(0, 100)); }
}
console.log(`  ✅ cashback_cycles: ${cycInserted} inserted, ${cycSkipped} skipped`);
console.log('\n✅ Done!');
