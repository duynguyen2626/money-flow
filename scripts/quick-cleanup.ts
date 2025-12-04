import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getProfileSheetLink(personId: string): Promise<string | null> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, sheet_link')
        .eq('id', personId)
        .maybeSingle()

    if (error) {
        console.error('Failed to fetch profile for sheet sync:', error)
    }

    const profileRow = profile as { id?: string; sheet_link?: string | null } | null
    if (profileRow) {
        return profileRow.sheet_link?.trim() ?? null
    }
    return null
}

async function syncAllTransactions(personId: string) {
    console.log(`[Sync] Starting sync for person: ${personId}`);
    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) {
        console.log(`[Sync] No sheet link for ${personId}, skipping.`);
        return;
    }

    const { data, error } = await supabase
        .from('transaction_lines')
        .select(`
        id,
        transaction_id,
        amount,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        metadata,
        person_id,
        transactions!inner(
          id,
          occurred_at,
          note,
          status,
          tag,
          shop_id,
          shops ( name, logo_url ),
          transaction_lines (
            id,
            type,
            account_id,
            category_id,
            accounts ( name, type, logo_url ),
            categories ( name, type )
          )
        )
      `)
        .eq('person_id', personId)
        .order('occurred_at', { foreignTable: 'transactions', ascending: true })

    if (error) {
        console.error('Failed to load transactions for sync:', error)
        return;
    }

    const rows = (data ?? []) as any[]
    const payloads: any[] = [];

    for (const row of rows) {
        if (!row.transactions) continue

        const meta = (row.metadata as Record<string, unknown> | null) ?? null
        const cashbackAmount =
            typeof meta?.cashback_share_amount === 'number'
                ? meta.cashback_share_amount
                : undefined

        const shopData = row.transactions.shops as any
        let shopName = Array.isArray(shopData) ? shopData[0]?.name : shopData?.name
        const shopId = row.transactions.shop_id
        let shopImageUrl = Array.isArray(shopData) ? shopData[0]?.logo_url : shopData?.logo_url

        const allLines = row.transactions.transaction_lines || [];
        const currentLine = allLines.find((l: any) => l.id === row.id);

        let categoryName = currentLine?.categories?.name;
        let categoryType = currentLine?.categories?.type;

        if (!shopName) {
            if (row.amount < 0) {
                const debitLine = allLines.find((l: any) => l.type === 'debit' && l.id !== row.id)
                if (debitLine?.accounts?.name) {
                    shopName = debitLine.accounts.name
                    if (debitLine.accounts.logo_url) {
                        shopImageUrl = debitLine.accounts.logo_url
                    }
                }
            } else {
                const creditLine = allLines.find((l: any) => l.type === 'credit' && l.id !== row.id)
                if (creditLine?.accounts?.name) {
                    shopName = creditLine.accounts.name
                    if (creditLine.accounts.logo_url) {
                        shopImageUrl = creditLine.accounts.logo_url
                    }
                }
            }
        }

        const payload = {
            id: row.transactions.id,
            occurred_at: row.transactions.occurred_at,
            date: row.transactions.occurred_at,
            note: row.transactions.note,
            tag: row.transactions.tag,
            shop_name: shopName,
            shop_id: shopId,
            shop_image_url: shopImageUrl,
            category_name: categoryName,
            category_type: categoryType,
            amount: row.amount,
            original_amount: row.original_amount,
            cashback_share_percent: row.cashback_share_percent,
            cashback_share_fixed: row.cashback_share_fixed,
            cashback_share_amount: cashbackAmount,
            type: 'debt' // Usually debt for person lines
        }
        payloads.push(payload)
    }

    if (payloads.length > 0) {
        console.log(`[Sync] Sending ${payloads.length} transactions to sheet...`);
        try {
            const response = await fetch(sheetLink, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync_all',
                    transactions: payloads
                })
            });
            const text = await response.text();
            console.log(`[Sync] Response: ${text}`);
        } catch (e) {
            console.error(`[Sync] Failed to send data:`, e);
        }
    } else {
        console.log(`[Sync] No transactions to sync.`);
    }
}

async function cleanup() {
    console.log('Connecting to Supabase...');

    // Find transactions to delete
    // Criteria: tag='DEC25' OR note contains 'Slot:' OR note contains 'Auto:'
    const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id, note, tag')
        .or('tag.eq.DEC25,note.ilike.%Slot:%,note.ilike.Auto:%');

    if (fetchError) {
        console.error('Error fetching transactions:', fetchError.message);
        return;
    }

    if (!transactions || transactions.length === 0) {
        console.log('No matching transactions found.');
        return;
    }

    const ids = transactions.map(t => t.id);
    console.log(`Found ${ids.length} transactions to delete.`);

    // 1. Identify affected people BEFORE deleting
    const { data: lines, error: linesFetchError } = await supabase
        .from('transaction_lines')
        .select('person_id')
        .in('transaction_id', ids)
        .not('person_id', 'is', null);

    const affectedPersonIds = new Set<string>();
    if (lines) {
        lines.forEach(l => {
            if (l.person_id) affectedPersonIds.add(l.person_id);
        });
    }
    console.log(`Identified ${affectedPersonIds.size} affected people.`);

    // 2. Delete lines
    const { error: linesError } = await supabase
        .from('transaction_lines')
        .delete()
        .in('transaction_id', ids);

    if (linesError) {
        console.error('Error deleting transaction lines:', linesError.message);
        return;
    }
    console.log('Deleted transaction lines.');

    // 3. Delete transactions
    const { error: txnsError } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids);

    if (txnsError) {
        console.error('Error deleting transactions:', txnsError.message);
        return;
    }
    console.log('Deleted transactions.');

    // 4. Trigger Sync for affected people
    console.log('--- Triggering Sheet Sync ---');
    for (const personId of Array.from(affectedPersonIds)) {
        await syncAllTransactions(personId);
    }
    console.log('Cleanup and Sync completed.');
}

cleanup();
