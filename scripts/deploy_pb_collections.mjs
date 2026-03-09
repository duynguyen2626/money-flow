import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PB_URL = 'https://api-db.reiwarden.io.vn';
const email = process.env.POCKETBASE_DB_EMAIL || 'namnt05@gmail.com';
const password = process.env.POCKETBASE_DB_PASSWORD || 'Thanhnam0@';

async function run() {
    console.log("🔑 Authenticating...");
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
    });
    if (!authRes.ok) {
        console.error("Auth failed");
        return;
    }
    const { token } = await authRes.json();
    const headers = { 'Content-Type': 'application/json', 'Authorization': token };

    // Get current collections
    const colRes = await fetch(`${PB_URL}/api/collections?perPage=500`, { headers });
    const cols = await colRes.json();
    const existing = new Map();
    for (const c of cols.items || []) {
        existing.set(c.name, c.id);
    }

    const t = (name, type = "text", o = {}) => ({ name, type, ...o });
    const rel = (name, targetColName, o = {}) => ({
        name,
        type: "relation",
        maxSelect: 1,
        collectionId: existing.get(targetColName) || "",
        cascadeDelete: false,
        ...o
    });
    const num = (name, o = {}) => t(name, "number", o);
    const bool = (name, o = {}) => t(name, "bool", o);
    const dt = (name, o = {}) => t(name, "date", o);
    const json = (name, o = {}) => t(name, "json", o);

    const missingCollections = [
        {
            name: "installments",
            type: "base",
            fields: [
                rel("original_transaction_id", "transactions"),
                rel("owner_id", "people", { required: true }),
                rel("debtor_id", "people"),
                t("name", "text", { required: true }),
                num("total_amount", { required: true }),
                num("conversion_fee"),
                num("term_months", { required: true }),
                num("monthly_amount", { required: true }),
                dt("start_date", { required: true }),
                num("remaining_amount", { required: true }),
                dt("next_due_date"),
                t("status", "text", { required: false }),
                t("type", "text", { required: false })
            ]
        },
        {
            name: "batch_phases",
            type: "base",
            fields: [
                t("bank_type", "text", { required: true }),
                t("label", "text", { required: true }),
                t("period_type", "text", { required: true }),
                num("cutoff_day", { required: true }),
                num("sort_order"),
                bool("is_active")
            ]
        },
        // IMPORTANT: Let's create `batch_phases` first because batches references it, wait, batches might not have it yet.
        // Wait, I will just run this script twice to resolve cross-references if any.
        {
            name: "batch_master_items",
            type: "base",
            fields: [
                t("bank_type", "text", { required: true }),
                t("receiver_name", "text", { required: true }),
                t("bank_number", "text", { required: true }),
                t("bank_name", "text", { required: true }),
                rel("target_account_id", "accounts"),
                t("cutoff_period", "text", { required: true }),
                num("sort_order"),
                bool("is_active"),
                rel("category_id", "categories"),
                t("default_note"),
                t("bank_code")
            ]
        },
        {
            name: "batch_items",
            type: "base",
            fields: [
                rel("batch_id", "batches"),
                t("receiver_name"),
                rel("target_account_id", "accounts"),
                num("amount", { required: true }),
                t("note"),
                t("status"),
                t("bank_name"),
                t("bank_number"),
                t("card_name"),
                rel("transaction_id", "transactions"),
                bool("is_confirmed"),
                bool("is_installment_payment"),
                rel("master_item_id", "batch_master_items"),
                t("bank_code")
            ]
        },
        {
            name: "service_members",
            type: "base",
            fields: [
                rel("service_id", "services"),
                rel("person_id", "people"),
                num("slots"),
                bool("is_owner")
            ]
        },
        {
            name: "person_cycle_sheets",
            type: "base",
            fields: [
                rel("person_id", "people", { required: true }),
                t("cycle_tag", "text", { required: true }),
                t("sheet_id"),
                t("sheet_url"),
                bool("show_bank_account"),
                bool("show_qr_image")
            ]
        },
        {
            name: "cashback_entries",
            type: "base",
            fields: [
                rel("cycle_id", "cashback_cycles"),
                rel("account_id", "accounts", { required: true }),
                rel("transaction_id", "transactions"),
                t("mode", "text", { required: true }),
                num("amount", { required: true }),
                bool("counts_to_budget"),
                t("note"),
                json("metadata")
            ]
        },
        {
            name: "bank_mappings",
            type: "base",
            fields: [
                t("bank_code", "text", { required: true }),
                t("bank_name", "text", { required: true }),
                t("short_name", "text", { required: true }),
                t("image_url"),
                t("bank_type")
            ]
        },
        {
            name: "batch_settings",
            type: "base",
            fields: [
                t("bank_type", "text", { required: true }),
                t("sheet_url"),
                t("sheet_name"),
                t("webhook_url"),
                bool("webhook_enabled"),
                t("image_url"),
                num("cutoff_day"),
                t("display_sheet_url"),
                t("display_sheet_name")
            ]
        },
        {
            name: "bot_configs",
            type: "base",
            fields: [
                t("key", "text", { required: true }),
                t("name"),
                t("description"),
                bool("is_active"),
                json("config"),
                dt("last_run_at"),
                t("last_run_status"),
                t("last_run_log"),
                bool("is_enabled")
            ]
        },
        {
            name: "bot_user_links",
            type: "base",
            fields: [
                t("platform", "text", { required: true }),
                t("platform_user_id", "text", { required: true }),
                rel("profile_id", "people", { required: true }),
                json("state")
            ]
        },
        {
            name: "quick_add_templates",
            type: "base",
            fields: [
                rel("profile_id", "people", { required: true }),
                t("name", "text", { required: true }),
                json("payload", { required: true })
            ]
        },
        {
            name: "sheet_webhook_links",
            type: "base",
            fields: [
                t("name", "text", { required: true }),
                t("url", "text", { required: true })
            ]
        },
        {
            name: "subcategories",
            type: "base",
            fields: [
                rel("category_id", "categories"),
                t("name", "text", { required: true }),
                t("pl_type")
            ]
        },
        {
            name: "user_settings",
            type: "base",
            fields: [
                t("key", "text", { required: true }),
                json("value", { required: true })
            ]
        }
    ];

    console.log("🚀 Creating collections...");
    let updated = false;

    // First pass create collections
    for (const c of missingCollections) {
        if (!existing.has(c.name)) {
            // we have to resolve collection IDs at runtime if they refer to each other
            c.fields = c.fields.map(f => {
                if (f.type === 'relation' && !f.collectionId) {
                    f.collectionId = existing.get(f.name.replace('_id', 's').replace('profile_id', 'people').replace('original_transaction_s', 'transactions')) || existing.get(f.name.split('_')[0] + "s") || "";
                    if (!f.collectionId) {
                        console.warn(`Cannot resolve collection for relation ${f.name} in ${c.name}`);
                    }
                }
                return f;
            });
            c.listRule = ""; c.viewRule = ""; c.createRule = ""; c.updateRule = ""; c.deleteRule = "";
            const res = await fetch(`${PB_URL}/api/collections`, {
                method: 'POST', headers, body: JSON.stringify(c)
            });
            if (res.ok) {
                const data = await res.json();
                existing.set(c.name, data.id);
                console.log(`✅ Created ${c.name}`);
                updated = true;
            } else {
                console.error(`❌ Failed to create ${c.name}:`, await res.text());
            }
        } else {
            console.log(`⏭️  ${c.name} already exists`);
        }
    }

    if (updated) {
        // Second pass: Update relations that were unresolved during creation
        for (const c of missingCollections) {
            c.fields = c.fields.map(f => {
                if (f.type === 'relation') {
                    // Try exact name mapping or known mapping
                    const collNameHint = f.name === 'profile_id' ? 'people' :
                        f.name === 'original_transaction_id' ? 'transactions' :
                            f.name === 'master_item_id' ? 'batch_master_items' :
                                f.name === 'service_id' ? 'services' :
                                    f.name.replace('_id', 's');
                    let targetColId = existing.get(collNameHint) || existing.get(f.name.split('_')[0] + "s");
                    if (f.name === 'debtor_id' || f.name === 'owner_id') targetColId = existing.get('people');
                    if (f.name === 'target_account_id') targetColId = existing.get('accounts');
                    if (f.name === 'transaction_id') targetColId = existing.get('transactions');
                    f.collectionId = targetColId || "";
                }
                return f;
            });
            const collId = existing.get(c.name);
            await fetch(`${PB_URL}/api/collections/${collId}`, {
                method: 'PATCH', headers, body: JSON.stringify({ fields: c.fields })
            });
        }
    }

    // UPDATE BATCHES collection to include missing relation fields (if any)
    const batchesCollId = existing.get('batches');
    const bRes = await fetch(`${PB_URL}/api/collections/${batchesCollId}`, { headers });
    if (bRes.ok) {
        const bCol = await bRes.json();
        const hasPhaseId = bCol.fields.find(f => f.name === 'phase_id');
        if (!hasPhaseId) {
            bCol.fields.push(rel("phase_id", "batch_phases"));
            await fetch(`${PB_URL}/api/collections/${batchesCollId}`, {
                method: 'PATCH', headers, body: JSON.stringify({ fields: bCol.fields })
            });
            console.log("✅ Updated batches with phase_id");
        }
    }

    // UPDATE TRANSACTIONS collection to include installment_plan_id
    const txnsCollId = existing.get('transactions');
    const tRes = await fetch(`${PB_URL}/api/collections/${txnsCollId}`, { headers });
    if (tRes.ok) {
        const tCol = await tRes.json();
        const hasInstallment = tCol.fields.find(f => f.name === 'installment_plan_id');
        if (!hasInstallment) {
            tCol.fields.push(rel("installment_plan_id", "installments"));
            await fetch(`${PB_URL}/api/collections/${txnsCollId}`, {
                method: 'PATCH', headers, body: JSON.stringify({ fields: tCol.fields })
            });
            console.log("✅ Updated transactions with installment_plan_id");
        }
    }

}
run().catch(console.error);
