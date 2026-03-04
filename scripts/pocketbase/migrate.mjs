
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PB_URL = 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL || 'namnt05@gmail.com';
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_KEY || !PB_PASSWORD) {
    console.error('Missing environment variables. Please check .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function calculateCycleTag(dateStr, statementDay) {
    if (!statementDay) return null;
    const date = new Date(dateStr);
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    // If transaction date is after statement day, it belongs to NEXT month's cycle
    if (date.getDate() > statementDay) {
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }

    return `${year}-${String(month).padStart(2, '0')}`;
}

async function migrate() {
    console.log('🚀 Starting migration...');
    console.log(`- Connection: ${PB_URL}`);

    // 1. Auth with PocketBase
    let authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
    });

    if (!authRes.ok) {
        const err = await authRes.text();
        console.error('❌ Failed to login to PocketBase:', err);
        return;
    }

    const { token } = await authRes.json();
    const headers = { 'Content-Type': 'application/json', 'Authorization': token };

    const maps = {
        people: new Map(),
        categories: new Map(),
        shops: new Map(),
        accounts: new Map(),
        transactions: new Map()
    };

    const generatePbId = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 15; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // 2. Cleanup PB Collections before re-migrating
    const collections = ['batches', 'services', 'cashback_cycles', 'transactions', 'accounts', 'shops', 'categories', 'people'];
    console.log('🧹 Cleaning up existing records in PocketBase...');
    for (const coll of collections) {
        const listRes = await fetch(`${PB_URL}/api/collections/${coll}/records?perPage=500`, { headers });
        if (listRes.ok) {
            const { items } = await listRes.json();
            for (const item of items) {
                await fetch(`${PB_URL}/api/collections/${coll}/records/${item.id}`, { method: 'DELETE', headers });
            }
        }
    }
    console.log('✨ Cleanup done.');

    // Helper to generic migrate
    async function migrateTable(tableName, pbCollection, mapper) {
        console.log(`📦 Migrating ${tableName}...`);
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;

        for (const item of data) {
            const pbId = generatePbId();
            const payload = mapper(item, pbId);
            const res = await fetch(`${PB_URL}/api/collections/${pbCollection}/records`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                maps[tableName]?.set(item.id, pbId);
            } else {
                console.warn(`⚠️ Failed to migrate ${tableName} item ${item.id}:`, await res.text());
            }
        }
        console.log(`✅ Migrated ${data.length} records to ${pbCollection}.`);
    }

    // 2. People
    await migrateTable('people', 'people', (p, id) => ({
        id, name: p.name, role: p.role, image_url: p.image_url, is_owner: p.is_owner || false
    }));

    // 3. Categories
    await migrateTable('categories', 'categories', (c, id) => ({
        id, name: c.name, icon: c.icon, type: c.type, image_url: c.image_url
    }));

    // 4. Shops
    await migrateTable('shops', 'shops', (s, id) => ({
        id, name: s.name, image_url: s.image_url, default_category_id: maps.categories.get(s.default_category_id) || null
    }));

    // 5. Accounts
    await migrateTable('accounts', 'accounts', (a, id) => ({
        id,
        name: a.name,
        slug: a.id.substring(0, 8),
        type: a.type === 'ewallet' ? 'e_wallet' : a.type,
        currency: a.currency,
        credit_limit: parseFloat(a.credit_limit || 0),
        current_balance: parseFloat(a.current_balance || 0),
        owner_id: maps.people.get(a.owner_id) || null,
        cashback_config: a.cashback_config,
        is_active: a.is_active,
        image_url: a.image_url,
        account_number: a.account_number,
        receiver_name: a.receiver_name,
        statement_day: a.statement_day,
        due_date: a.due_date,
        cb_cycle_type: a.cb_cycle_type
    }));

    // 6. Transactions
    console.log('💸 Migrating Transactions...');
    const { data: txns, error: tError } = await supabase.from('transactions').select('*').order('occurred_at', { ascending: true });
    if (tError) throw tError;

    // We need account statement_day for tag calculation
    const { data: accountsDb } = await supabase.from('accounts').select('id, statement_day');
    const statementDayMap = new Map((accountsDb || []).map(a => [a.id, a.statement_day]));

    for (const t of txns) {
        const pbId = generatePbId();
        const statementDay = statementDayMap.get(t.account_id);
        const tag = t.statement_cycle_tag || calculateCycleTag(t.occurred_at, statementDay);

        const payload = {
            id: pbId,
            date: t.occurred_at,
            description: t.note || '',
            amount: parseFloat(t.amount || 0),
            type: t.type,
            account_id: maps.accounts.get(t.account_id) || null,
            to_account_id: maps.accounts.get(t.target_account_id) || null,
            category_id: maps.categories.get(t.category_id) || null,
            shop_id: maps.shops.get(t.shop_id) || null,
            person_id: maps.people.get(t.person_id) || null,
            final_price: parseFloat(t.final_price || 0),
            cashback_amount: parseFloat(t.cashback_share_fixed || 0),
            is_installment: t.is_installment || false,
            parent_transaction_id: maps.transactions.get(t.parent_transaction_id) || t.parent_transaction_id,
            metadata: { ...t.metadata, calculated_tag: tag }
        };

        const res = await fetch(`${PB_URL}/api/collections/transactions/records`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            maps.transactions.set(t.id, pbId);
        }
    }
    console.log(`✅ Migrated ${txns.length} transactions.`);

    // 7. Cashback Cycles
    await migrateTable('cashback_cycles', 'cashback_cycles', (c, id) => ({
        id,
        account_id: maps.accounts.get(c.account_id),
        cycle_tag: c.cycle_tag,
        spent_amount: parseFloat(c.spent_amount || 0),
        real_awarded: parseFloat(c.real_awarded || 0),
        virtual_profit: parseFloat(c.virtual_profit || 0)
    }));

    // 8. Services (Source: subscriptions)
    await migrateTable('subscriptions', 'services', (s, id) => ({
        id,
        name: s.name,
        amount: parseFloat(s.price || 0),
        type: 'subscription',
        account_id: maps.accounts.get(s.account_id) || null,
        billing_day: s.next_billing_date ? new Date(s.next_billing_date).getDate() : 1,
        is_active: s.is_active || true
    }));

    // 9. Batches
    await migrateTable('batches', 'batches', (b, id) => ({
        id,
        name: b.name,
        source_account_id: maps.accounts.get(b.source_account_id),
        status: b.status,
        bank_type: b.bank_type,
        month_year: b.month_year
    }));

    console.log('🎉 Migration completed successfully!');
}

migrate().catch(err => {
    console.error('💥 Migration failed:', err);
});
