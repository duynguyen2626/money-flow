
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PB_URL = 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL || 'namnt05@gmail.com';
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD || 'Thanhnam0@';

if (!SUPABASE_URL || !SUPABASE_KEY || !PB_PASSWORD) {
    console.error('Missing environment variables. Please check .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const generatePbId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 15; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Utils: format date as YYYY-MM
const toYearMonth = (date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const getCycleTag = (date, statementDay, cycleType) => {
    const d = new Date(date);
    if (!cycleType || cycleType === 'calendar_month') {
        return toYearMonth(d);
    }

    // Result is based on statementDay
    // If day >= statementDay, belongs to NEXT cycle
    const day = d.getDate();
    if (statementDay && day >= statementDay) {
        const nextDate = new Date(d);
        nextDate.setMonth(nextDate.getMonth() + 1);
        return toYearMonth(nextDate);
    }
    return toYearMonth(d);
};

async function migrate() {
    console.log('🚀 Final migration starting...');

    // 1. Auth with PocketBase
    console.log(`🔑 Logging into PocketBase at ${PB_URL}...`);
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
    });

    if (!authRes.ok) {
        console.error('❌ Failed to login to PocketBase:', await authRes.text());
        return;
    }

    const { token } = await authRes.json();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': token,
    };

    const idMap = {
        people: new Map(),
        accounts: new Map(),
        categories: new Map(),
        shops: new Map(),
        transactions: new Map()
    };

    // 2. Clear all existing data from these collections (optional but safe)
    const collections = ['people', 'categories', 'shops', 'accounts', 'transactions', 'cashback_cycles', 'services', 'batches'];
    console.log('🧹 Clearing old records...');
    for (const coll of collections) {
        const res = await fetch(`${PB_URL}/api/collections/${coll}/records?perPage=500`, { headers });
        const { items } = await res.json();
        for (const item of items || []) {
            await fetch(`${PB_URL}/api/collections/${coll}/records/${item.id}`, { method: 'DELETE', headers });
        }
    }

    // 3. Migrate People
    console.log('👥 Migrating People...');
    const { data: people } = await supabase.from('people').select('*');
    for (const p of people) {
        const pbId = generatePbId();
        const res = await fetch(`${PB_URL}/api/collections/people/records`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                id: pbId,
                name: p.name,
                role: p.role,
                image_url: p.image_url,
                is_owner: p.is_owner || false
            })
        });
        if (res.ok) idMap.people.set(p.id, pbId);
    }

    // 4. Migrate Categories
    console.log('📂 Migrating Categories...');
    const { data: categories } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    for (const c of categories) {
        const pbId = generatePbId();
        const res = await fetch(`${PB_URL}/api/collections/categories/records`, {
            method: 'POST', headers,
            body: JSON.stringify({
                id: pbId,
                name: c.name,
                icon: c.icon,
                type: c.type,
                image_url: c.image_url
            })
        });
        if (res.ok) idMap.categories.set(c.id, pbId);
    }

    // 5. Migrate Shops
    console.log('🏪 Migrating Shops...');
    const { data: shops } = await supabase.from('shops').select('*');
    for (const s of shops) {
        const pbId = generatePbId();
        const res = await fetch(`${PB_URL}/api/collections/shops/records`, {
            method: 'POST', headers,
            body: JSON.stringify({
                id: pbId,
                name: s.name,
                image_url: s.image_url,
                default_category_id: idMap.categories.get(s.default_category_id) || null
            })
        });
        if (res.ok) idMap.shops.set(s.id, pbId);
    }

    // 6. Migrate Accounts
    console.log('💳 Migrating Accounts...');
    const { data: accounts } = await supabase.from('accounts').select('*');
    for (const a of accounts) {
        const pbId = generatePbId();
        const payload = {
            id: pbId,
            name: a.name,
            slug: a.id.substring(0, 8),
            type: a.type === 'ewallet' ? 'e_wallet' : a.type,
            currency: a.currency,
            credit_limit: parseFloat(a.credit_limit || 0),
            current_balance: parseFloat(a.current_balance || 0),
            owner_id: idMap.people.get(a.owner_id) || null,
            cashback_config: a.cashback_config,
            is_active: a.is_active,
            image_url: a.image_url,
            account_number: a.account_number,
            receiver_name: a.receiver_name,
            statement_day: a.statement_day,
            due_date: a.due_date,
            cb_cycle_type: a.cb_cycle_type
        };
        const res = await fetch(`${PB_URL}/api/collections/accounts/records`, {
            method: 'POST', headers,
            body: JSON.stringify(payload)
        });
        if (res.ok) idMap.accounts.set(a.id, pbId);
    }

    // 7. Migrate Transactions
    console.log('💸 Migrating Transactions...');
    const { data: txns } = await supabase.from('transactions').select('*').order('occurred_at', { ascending: true });

    // Create accounts lookup for cycle tag calculation
    const accLookup = new Map();
    accounts.forEach(a => accLookup.set(a.id, a));

    for (const t of txns) {
        const pTag = t.persisted_cycle_tag || getCycleTag(t.occurred_at, accLookup.get(t.account_id)?.statement_day, accLookup.get(t.account_id)?.cb_cycle_type);
        const pbId = generatePbId();
        const payload = {
            id: pbId,
            date: t.occurred_at,
            description: t.note || '',
            amount: parseFloat(t.amount || 0),
            type: t.type,
            account_id: idMap.accounts.get(t.account_id) || null,
            to_account_id: idMap.accounts.get(t.target_account_id) || null,
            category_id: idMap.categories.get(t.category_id) || null,
            shop_id: idMap.shops.get(t.shop_id) || null,
            person_id: idMap.people.get(t.person_id) || null,
            final_price: parseFloat(t.final_price || 0),
            cashback_amount: parseFloat(t.cashback_share_fixed || 0),
            is_installment: t.is_installment || false,
            parent_transaction_id: t.parent_transaction_id, // keep UUID for now, can map later if needed
            metadata: {
                ...t.metadata,
                persisted_cycle_tag: pTag,
                original_uuid: t.id
            }
        };
        const res = await fetch(`${PB_URL}/api/collections/transactions/records`, {
            method: 'POST', headers,
            body: JSON.stringify(payload)
        });
        if (res.ok) idMap.transactions.set(t.id, pbId);
    }

    // 8. Migrate Cashback Cycles
    console.log('📊 Migrating Cashback Cycles...');
    const { data: cycles } = await supabase.from('cashback_cycles').select('*');
    if (cycles) {
        for (const c of cycles) {
            await fetch(`${PB_URL}/api/collections/cashback_cycles/records`, {
                method: 'POST', headers,
                body: JSON.stringify({
                    account_id: idMap.accounts.get(c.account_id) || null,
                    cycle_tag: c.cycle_tag,
                    spent_amount: parseFloat(c.spent_amount || 0),
                    real_awarded: parseFloat(c.real_awarded || 0),
                    virtual_profit: parseFloat(c.virtual_profit || 0)
                })
            });
        }
    }

    // 9. Migrate Services (Subscriptions)
    console.log('🔁 Migrating Services...');
    const { data: subs } = await supabase.from('subscriptions').select('*');
    if (subs) {
        for (const s of subs) {
            await fetch(`${PB_URL}/api/collections/services/records`, {
                method: 'POST', headers,
                body: JSON.stringify({
                    name: s.name,
                    amount: parseFloat(s.price || 0),
                    type: 'subscription',
                    is_active: s.is_active,
                    billing_day: s.next_billing_date ? new Date(s.next_billing_date).getDate() : null
                })
            });
        }
    }

    console.log('🎉 Migration Completed Successfully!');
}

migrate().catch(e => console.error('💥 Error during migration:', e));
