
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PB_URL = 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = (process.env.POCKETBASE_DB_EMAIL || 'namnt05@gmail.com').trim();
const PB_PASSWORD = (process.env.POCKETBASE_DB_PASSWORD || '').trim();

if (!SUPABASE_URL || !SUPABASE_KEY || !PB_PASSWORD) {
    console.error('Missing environment variables. Please check .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COLLECTION_ORDER = [
    'people',
    'person_cycle_sheets',
    'categories',
    'shops',
    'accounts',
    'transactions',
    'transaction_history',
    'installments',
    'cashback_cycles',
    'services',
    'batches',
    'batch_items'
];

const PHASE_TO_COLLECTIONS = {
    all: COLLECTION_ORDER,
    foundation: ['people', 'person_cycle_sheets', 'categories'],
    people: ['people', 'person_cycle_sheets'],
    shops: ['shops'],
    accounts: ['accounts'],
    installments: ['installments'],
    transactions: ['transactions', 'transaction_history'],
    cashback: ['cashback_cycles'],
    services: ['services'],
    batches: ['batches', 'batch_items']
};

function normalizeAccountType(value) {
    if (!value) return 'bank';
    if (value === 'ewallet') return 'e_wallet';
    if (value === 'system') return 'system';
    const allowed = new Set(['bank', 'credit_card', 'e_wallet', 'receivable', 'debt', 'savings', 'investment', 'asset']);
    return allowed.has(value) ? value : 'bank';
}

function normalizeCashbackFields(account) {
    const config = account?.cashback_config && typeof account.cashback_config === 'object'
        ? account.cashback_config
        : {};

    // MF5.3 Compatibility: Check for 'program' wrapper
    const program = config.program || null;

    // Type resolution
    let cbType = account?.cb_type || (program ? (program.levels ? 'tiered' : 'simple') : (config.hasTiers ? 'tiered' : 'none'));
    if (cbType === 'none' && (program || config.rate)) cbType = 'simple';

    const baseRate = account?.cb_base_rate ?? (program?.defaultRate ?? (config.rate ?? 0));
    const maxBudget = account?.cb_max_budget ?? (program?.maxBudget ?? (config.maxAmount ?? null));
    const minSpend = account?.cb_min_spend ?? (program?.minSpendTarget ?? (config.minSpend ?? null));

    // Rules / Tiers resolution
    let rules = account?.cb_rules_json ?? (program?.rules_json_v2 ?? (program?.levels ?? (config.tiers ?? null)));

    return {
        cb_cycle_type: account?.cb_cycle_type ?? (program?.cycleType ?? (config.cycleType ?? null)),
        cb_type: cbType,
        cb_base_rate: Number(baseRate || 0),
        cb_max_budget: maxBudget === null ? null : Number(maxBudget),
        cb_is_unlimited: account?.cb_is_unlimited ?? (program?.maxBudget === null || config.isUnlimited === true),
        cb_rules_json: rules,
        cb_min_spend: minSpend === null ? null : Number(minSpend),
    };
}

function remapCashbackConfigCategoryIds(value) {
    if (Array.isArray(value)) {
        return value.map(remapCashbackConfigCategoryIds);
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    const result = {};
    for (const [key, raw] of Object.entries(value)) {
        if (key === 'cat_ids' && Array.isArray(raw)) {
            result[key] = raw
                .filter((id) => typeof id === 'string' && id.trim().length > 0)
                .map((id) => toPocketBaseId(id, 'categories'));
            continue;
        }

        result[key] = remapCashbackConfigCategoryIds(raw);
    }

    return result;
}

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

function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        phase: 'all',
        cleanup: 'auto',
        syncSchema: false
    };

    for (const arg of args) {
        if (arg.startsWith('--phase=')) {
            config.phase = arg.split('=')[1] || 'all';
        }
        if (arg.startsWith('--cleanup=')) {
            config.cleanup = arg.split('=')[1] || 'auto';
        }
        if (arg === '--sync-schema') {
            config.syncSchema = true;
        }
    }

    if (!PHASE_TO_COLLECTIONS[config.phase]) {
        throw new Error(`Invalid --phase=${config.phase}. Allowed: ${Object.keys(PHASE_TO_COLLECTIONS).join(', ')}`);
    }

    if (!['auto', 'none', 'phase'].includes(config.cleanup)) {
        throw new Error(`Invalid --cleanup=${config.cleanup}. Allowed: auto, none, phase`);
    }

    return config;
}

async function listAllRecordIds(baseUrl, collection, headers) {
    const ids = [];
    let page = 1;
    let totalPages = 1;
    do {
        const res = await fetch(`${baseUrl}/api/collections/${collection}/records?page=${page}&perPage=500&fields=id`, { headers });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Failed listing ${collection} page ${page}: ${text}`);
        }
        const data = await res.json();
        const items = data.items || [];
        for (const item of items) ids.push(item.id);
        totalPages = data.totalPages || 1;
        page += 1;
    } while (page <= totalPages);

    return ids;
}

async function cleanupCollections(baseUrl, collections, headers, mode) {
    if (mode === 'none') {
        console.log('⏭️ Cleanup disabled (--cleanup=none).');
        return;
    }

    if (collections.length === 0) return;

    if (mode === 'auto') {
        let hasAnyData = false;
        for (const coll of collections) {
            const ids = await listAllRecordIds(baseUrl, coll, headers);
            if (ids.length > 0) {
                hasAnyData = true;
                break;
            }
        }

        if (!hasAnyData) {
            console.log('⏭️ Cleanup skipped (target collections are already empty).');
            return;
        }
    }

    console.log(`🧹 Cleanup mode=${mode} on: ${collections.join(', ')}`);
    for (const coll of collections) {
        const ids = await listAllRecordIds(baseUrl, coll, headers);
        if (ids.length === 0) {
            console.log(`- ${coll}: empty`);
            continue;
        }

        const concurrency = 20;
        let deleted = 0;
        for (let i = 0; i < ids.length; i += concurrency) {
            const chunk = ids.slice(i, i + concurrency);
            const results = await Promise.all(chunk.map(async (id) => {
                try {
                    const res = await fetch(`${baseUrl}/api/collections/${coll}/records/${id}`, { method: 'DELETE', headers });
                    if (!res.ok) {
                        const text = await res.text();
                        console.warn(`⚠️  Skip delete ${coll}/${id} (likely referenced by other tables)`);
                        return false;
                    }
                    return true;
                } catch (err) {
                    console.warn(`⚠️  Error deleting ${coll}/${id}: ${err.message}`);
                    return false;
                }
            }));
            deleted += results.filter(r => r === true).length;
        }
        console.log(`- ${coll}: deleted ${deleted}`);
    }
}

async function upsertRecord(baseUrl, collection, id, payload, headers) {
    const readRes = await fetch(`${baseUrl}/api/collections/${collection}/records/${id}?fields=id`, { headers });

    if (readRes.ok) {
        const patchRes = await fetch(`${baseUrl}/api/collections/${collection}/records/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload)
        });

        if (!patchRes.ok) {
            const text = await patchRes.text();
            throw new Error(`PATCH ${collection}/${id} failed: ${text}`);
        }

        return 'updated';
    }

    if (readRes.status !== 404) {
        const text = await readRes.text();
        throw new Error(`GET ${collection}/${id} failed: ${text}`);
    }

    const createRes = await fetch(`${baseUrl}/api/collections/${collection}/records`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, ...payload })
    });

    if (!createRes.ok) {
        const text = await createRes.text();
        throw new Error(`POST ${collection}/${id} failed: ${text}`);
    }

    return 'created';
}

function toPocketBaseId(sourceId, fallbackPrefix = 'mf3') {
    if (!sourceId) {
        const randomSeed = `${fallbackPrefix}-${Date.now()}-${Math.random()}`;
        const hash = crypto.createHash('sha256').update(randomSeed).digest();
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let randomId = '';
        for (let i = 0; i < 15; i++) {
            randomId += chars[hash[i] % chars.length];
        }
        return randomId;
    }

    // Idempotency: If already 15-char lowercase alphanumeric, assume it's a PB ID
    if (/^[a-z0-9]{15}$/.test(sourceId)) {
        return sourceId;
    }

    const hash = crypto.createHash('sha256').update(String(sourceId)).digest();
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 15; i++) {
        result += chars[hash[i] % chars.length];
    }
    return result;
}

async function checkCollectionsExist(baseUrl, headers) {
    const res = await fetch(`${baseUrl}/api/collections?perPage=200&fields=name`, { headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Unable to list collections: ${text}`);
    }

    const data = await res.json();
    const names = new Set((data.items || []).map((item) => item.name));
    const missing = COLLECTION_ORDER.filter((name) => !names.has(name));

    if (missing.length > 0) {
        throw new Error(`Missing PocketBase collections: ${missing.join(', ')}. Please import scripts/pocketbase/schema.json first or use --sync-schema.`);
    }
}

async function syncPocketBaseSchema(baseUrl, headers) {
    console.log('🔄 Syncing PocketBase schema from schema.json...');
    const schemaPath = path.resolve(__dirname, 'schema.json');
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`schema.json not found at ${schemaPath}`);
    }

    const schemaRaw = fs.readFileSync(schemaPath, 'utf8');
    const collections = JSON.parse(schemaRaw);

    for (const coll of collections) {
        // Try to find if collection exists
        const checkRes = await fetch(`${baseUrl}/api/collections/${coll.name}`, { headers });

        if (checkRes.ok) {
            console.log(`- Updating collection: ${coll.name}`);
            const updateRes = await fetch(`${baseUrl}/api/collections/${coll.name}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(coll)
            });
            if (!updateRes.ok) {
                const text = await updateRes.text();
                throw new Error(`Failed to update ${coll.name}: ${text}`);
            }
        } else if (checkRes.status === 404) {
            console.log(`- Creating collection: ${coll.name}`);
            const createRes = await fetch(`${baseUrl}/api/collections`, {
                method: 'POST',
                headers,
                body: JSON.stringify(coll)
            });
            if (!createRes.ok) {
                const text = await createRes.text();
                throw new Error(`Failed to create ${coll.name}: ${text}`);
            }
        } else {
            const text = await checkRes.text();
            throw new Error(`Failed to check ${coll.name}: ${text}`);
        }
    }

    console.log('✅ Schema synced successfully!');
}

async function migrate() {
    const { phase, cleanup, syncSchema } = parseArgs();
    const targetCollections = PHASE_TO_COLLECTIONS[phase];

    console.log('🚀 Starting migration...');
    console.log(`- Connection: ${PB_URL}`);
    console.log(`- Phase: ${phase} (${targetCollections.join(', ')})`);
    console.log(`- Cleanup: ${cleanup}`);

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

    if (syncSchema) {
        await syncPocketBaseSchema(PB_URL, headers);
    } else {
        await checkCollectionsExist(PB_URL, headers);
    }
    await cleanupCollections(PB_URL, targetCollections, headers, cleanup);

    async function migrateTable({ phaseKey, tableName, pbCollection, mapper, orderBy, select = '*' }) {
        if (!targetCollections.includes(phaseKey)) return null;

        console.log(`📦 Migrating ${tableName} -> ${pbCollection}...`);
        let query = supabase.from(tableName).select(select);
        if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }

        const { data, error } = await query;
        if (error) throw error;

        let created = 0;
        let updated = 0;
        for (const item of data || []) {
            const sourceId = toPocketBaseId(item.id, pbCollection);
            const payload = mapper(item);
            const mode = await upsertRecord(PB_URL, pbCollection, sourceId, payload, headers);
            if (mode === 'created') created += 1;
            if (mode === 'updated') updated += 1;
        }

        const total = (data || []).length;
        console.log(`✅ ${pbCollection}: total=${total}, created=${created}, updated=${updated}`);
        return { collection: pbCollection, total, created, updated };
    }

    const summary = [];

    const peopleResult = await migrateTable({
        phaseKey: 'people',
        tableName: 'people',
        pbCollection: 'people',
        mapper: (p) => ({
            slug: p.id,
            name: p.name,
            role: p.role,
            image_url: p.image_url,
            sheet_link: p.sheet_link ?? null,
            google_sheet_url: p.google_sheet_url ?? null,
            sheet_full_img: p.sheet_full_img ?? null,
            sheet_show_bank_account: p.sheet_show_bank_account ?? false,
            sheet_bank_info: p.sheet_bank_info ?? null,
            sheet_linked_bank_id: p.sheet_linked_bank_id ? toPocketBaseId(p.sheet_linked_bank_id, 'accounts') : null,
            sheet_show_qr_image: p.sheet_show_qr_image ?? false,
            is_owner: p.is_owner || false,
            is_archived: p.is_archived ?? false,
            is_group: p.is_group ?? false,
            group_parent_id: p.group_parent_id ? toPocketBaseId(p.group_parent_id, 'people') : null,
        })
    });
    if (peopleResult) summary.push(peopleResult);

    const personCycleSheetsResult = await migrateTable({
        phaseKey: 'person_cycle_sheets',
        tableName: 'person_cycle_sheets',
        pbCollection: 'person_cycle_sheets',
        mapper: (s) => ({
            person_id: s.person_id ? toPocketBaseId(s.person_id, 'people') : null,
            cycle_tag: s.cycle_tag,
            sheet_id: s.sheet_id ?? null,
            sheet_url: s.sheet_url ?? null,
        })
    });
    if (personCycleSheetsResult) summary.push(personCycleSheetsResult);

    const categoriesResult = await migrateTable({
        phaseKey: 'categories',
        tableName: 'categories',
        pbCollection: 'categories',
        mapper: (c) => ({
            name: c.name,
            icon: c.icon,
            type: (c.type || 'expense').toLowerCase(),
            image_url: c.image_url,
            kind: c.kind || 'external',
            is_archived: c.is_archived || false,
            mcc_codes: c.mcc_codes || [],
            parent_id: c.parent_id ? toPocketBaseId(c.parent_id, 'categories') : null
        })
    });
    if (categoriesResult) summary.push(categoriesResult);

    const shopsResult = await migrateTable({
        phaseKey: 'shops',
        tableName: 'shops',
        pbCollection: 'shops',
        mapper: (s) => ({
            name: s.name,
            image_url: s.image_url,
            default_category_id: s.default_category_id ? toPocketBaseId(s.default_category_id, 'categories') : null,
            is_archived: s.is_archived || false
        })
    });
    if (shopsResult) summary.push(shopsResult);

    const accountsResult = await migrateTable({
        phaseKey: 'accounts',
        tableName: 'accounts',
        pbCollection: 'accounts',
        mapper: (a) => {
            const cashbackFields = normalizeCashbackFields(a);

            return {
                name: a.name,
                slug: a.id || null,
                type: normalizeAccountType(a.type),
                currency: a.currency,
                credit_limit: parseFloat(a.credit_limit || 0),
                current_balance: parseFloat(a.current_balance || 0),
                owner_id: a.owner_id ? toPocketBaseId(a.owner_id, 'people') : null,
                cashback_config: remapCashbackConfigCategoryIds(a.cashback_config),
                cashback_config_version: a.cashback_config_version ?? null,
                is_active: a.is_active,
                image_url: a.image_url,
                account_number: a.account_number,
                receiver_name: a.receiver_name,
                statement_day: a.statement_day,
                due_date: a.due_date,
                annual_fee: a.annual_fee ?? null,
                annual_fee_waiver_target: a.annual_fee_waiver_target ?? null,
                total_in: a.total_in ?? null,
                total_out: a.total_out ?? null,
                user_id: a.user_id ?? null,
                holder_type: a.holder_type ?? null,
                holder_person_id: a.holder_person_id ? toPocketBaseId(a.holder_person_id, 'people') : null,
                ...cashbackFields,
            };
        }
    });
    if (accountsResult) summary.push(accountsResult);


    if (targetCollections.includes('transactions')) {
        console.log('💸 Migrating transactions...');
        const { data: txns, error: tError } = await supabase
            .from('transactions')
            .select('*')
            .order('occurred_at', { ascending: true });
        if (tError) throw tError;

        const { data: accountsDb, error: accError } = await supabase
            .from('accounts')
            .select('id, statement_day');
        if (accError) throw accError;

        const statementDayMap = new Map((accountsDb || []).map((a) => [a.id, a.statement_day]));

        let created = 0;
        let updated = 0;
        for (const t of txns || []) {
            const statementDay = statementDayMap.get(t.account_id);
            const persistedCycleTag = t.statement_cycle_tag || calculateCycleTag(t.occurred_at, statementDay);

            const payload = {
                occurred_at: t.occurred_at,
                date: t.occurred_at,
                description: t.note || '',
                note: t.note || '',
                amount: parseFloat(t.amount || 0),
                type: t.type,
                account_id: t.account_id ? toPocketBaseId(t.account_id, 'accounts') : null,
                target_account_id: t.target_account_id ? toPocketBaseId(t.target_account_id, 'accounts') : null,
                to_account_id: t.target_account_id ? toPocketBaseId(t.target_account_id, 'accounts') : null,
                category_id: t.category_id ? toPocketBaseId(t.category_id, 'categories') : null,
                shop_id: t.shop_id ? toPocketBaseId(t.shop_id, 'shops') : null,
                person_id: t.person_id ? toPocketBaseId(t.person_id, 'people') : null,
                final_price: parseFloat(t.final_price || 0),
                cashback_amount: parseFloat(t.cashback_share_fixed || 0),
                is_installment: t.is_installment || false,
                parent_transaction_id: t.parent_transaction_id ? toPocketBaseId(t.parent_transaction_id, 'transactions') : null,
                debt_cycle_tag: t.tag ?? null,
                persisted_cycle_tag: persistedCycleTag ?? null,
                cashback_share_percent: t.cashback_share_percent ?? null,
                cashback_share_fixed: t.cashback_share_fixed ?? null,
                cashback_mode: t.cashback_mode ?? null,
                metadata: {
                    ...(t.metadata || {}),
                    persisted_cycle_tag: persistedCycleTag,
                    debt_cycle_tag: t.tag ?? null,
                }
            };

            const mode = await upsertRecord(PB_URL, 'transactions', toPocketBaseId(t.id, 'transactions'), payload, headers);
            if (mode === 'created') created += 1;
            if (mode === 'updated') updated += 1;
        }

        const total = (txns || []).length;
        console.log(`✅ transactions: total=${total}, created=${created}, updated=${updated}`);
        summary.push({ collection: 'transactions', total, created, updated });
    }

    if (targetCollections.includes('transaction_history')) {
        console.log('📜 Migrating transaction history...');
        const { data: historyItems, error: hError } = await supabase
            .from('transaction_history')
            .select('*');
        if (hError) throw hError;

        let created = 0;
        let updated = 0;
        for (const item of historyItems || []) {
            const payload = {
                transaction_id: toPocketBaseId(item.transaction_id, 'transactions'),
                changed_at: item.changed_at || item.created_at,
                changed_by: item.changed_by,
                change_type: item.change_type,
                snapshot_before: item.snapshot_before,
                diff_note: item.diff_note,
            };

            const mode = await upsertRecord(PB_URL, 'transaction_history', toPocketBaseId(item.id, 'transaction_history'), payload, headers);
            if (mode === 'created') created += 1;
            if (mode === 'updated') updated += 1;
        }

        const total = (historyItems || []).length;
        console.log(`✅ transaction_history: total=${total}, created=${created}, updated=${updated}`);
        summary.push({ collection: 'transaction_history', total, created, updated });
    }

    const installmentsResult = await migrateTable({
        phaseKey: 'installments',
        tableName: 'installments',
        pbCollection: 'installments',
        mapper: (i) => ({
            name: i.name,
            original_transaction_id: i.original_transaction_id ? toPocketBaseId(i.original_transaction_id, 'transactions') : null,
            owner_id: i.owner_id,
            debtor_id: i.debtor_id ? toPocketBaseId(i.debtor_id, 'people') : null,
            total_amount: parseFloat(i.total_amount || 0),
            conversion_fee: parseFloat(i.conversion_fee || 0),
            term_months: parseInt(i.term_months || 0),
            monthly_amount: parseFloat(i.monthly_amount || 0),
            start_date: i.start_date,
            remaining_amount: parseFloat(i.remaining_amount || 0),
            next_due_date: i.next_due_date,
            status: i.status || 'active',
            type: i.type || 'credit_card'
        })
    });
    if (installmentsResult) summary.push(installmentsResult);

    const cashbackResult = await migrateTable({
        phaseKey: 'cashback_cycles',
        tableName: 'cashback_cycles',
        pbCollection: 'cashback_cycles',
        mapper: (c) => ({
            account_id: c.account_id ? toPocketBaseId(c.account_id, 'accounts') : null,
            cycle_tag: c.cycle_tag,
            spent_amount: parseFloat(c.spent_amount || 0),
            real_awarded: parseFloat(c.real_awarded || 0),
            virtual_profit: parseFloat(c.virtual_profit || 0),
            max_budget: parseFloat(c.max_budget || 0) || null,
            min_spend_target: parseFloat(c.min_spend_target || 0) || null,
            is_exhausted: c.is_exhausted || false,
            met_min_spend: c.met_min_spend || false,
            overflow_loss: parseFloat(c.overflow_loss || 0) || null
        })
    });
    if (cashbackResult) summary.push(cashbackResult);

    const servicesResult = await migrateTable({
        phaseKey: 'services',
        tableName: 'subscriptions',
        pbCollection: 'services',
        mapper: (s) => ({
            name: s.name,
            amount: parseFloat(s.price || 0),
            type: 'subscription',
            account_id: s.account_id ? toPocketBaseId(s.account_id, 'accounts') : null,
            billing_day: s.next_billing_date ? new Date(s.next_billing_date).getDate() : 1,
            is_active: s.is_active ?? true
        })
    });
    if (servicesResult) summary.push(servicesResult);

    const batchesResult = await migrateTable({
        phaseKey: 'batches',
        tableName: 'batches',
        pbCollection: 'batches',
        mapper: (b) => ({
            name: b.name,
            source_account_id: b.source_account_id ? toPocketBaseId(b.source_account_id, 'accounts') : null,
            status: b.status,
            bank_type: b.bank_type,
            month_year: b.month_year
        })
    });
    if (batchesResult) summary.push(batchesResult);

    const batchItemsResult = await migrateTable({
        phaseKey: 'batches',
        tableName: 'batch_items',
        pbCollection: 'batch_items',
        mapper: (item) => ({
            batch_id: toPocketBaseId(item.batch_id, 'batches'),
            receiver_name: item.receiver_name,
            target_account_id: item.target_account_id ? toPocketBaseId(item.target_account_id, 'accounts') : null,
            amount: parseFloat(item.amount || 0),
            note: item.note,
            status: item.status || 'pending',
            metadata: item.metadata || {}
        })
    });
    if (batchItemsResult) summary.push(batchItemsResult);

    console.log('📊 Phase summary:');
    for (const row of summary) {
        console.log(`- ${row.collection}: total=${row.total}, created=${row.created}, updated=${row.updated}`);
    }

    console.log('🎉 Migration completed successfully!');
}

migrate().catch(err => {
    console.error('💥 Migration failed:', err);
});
