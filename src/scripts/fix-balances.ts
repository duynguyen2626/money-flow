
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { computeAccountTotals } from '../lib/account-balance'

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('Starting Account Balance Backfill...')

    // 1. Fetch all accounts
    const { data: accounts, error: accError } = await supabase
        .from('accounts')
        .select('id, name, current_balance, type, owner_id')

    if (accError) {
        console.error('Error fetching accounts:', accError)
        process.exit(1)
    }

    console.log(`Found ${accounts.length} accounts.`)

    for (const account of accounts) {
        console.log(`Processing ${account.name} (${account.id})...`)

        // 2. Fetch all transactions (Replicating logic from account.service.ts)
        const { data: txns, error: txnError } = await supabase
            .from('transactions')
            .select('amount, type, account_id, target_account_id, status')
            .eq('status', 'posted')
            .or(`account_id.eq.${account.id},target_account_id.eq.${account.id}`)

        if (txnError) {
            console.error(`Error fetching transactions for ${account.name}:`, txnError)
            continue
        }

        const { totalIn, totalOut, currentBalance: computedBalance } = computeAccountTotals({
            accountId: account.id,
            accountType: account.type,
            transactions: (txns || []) as any[],
        })

        const existingBalance = account.current_balance ?? 0
        const diff = existingBalance - computedBalance

        // Round to avoid float precision issues
        const roundedDiff = Math.round(diff * 100) / 100

        if (roundedDiff === 0) {
            console.log(`  [OK] Balance matches transactions (${existingBalance}).`)
        } else {
            console.log(`  [MISMATCH] Current: ${existingBalance}, TxnSum: ${computedBalance}. Diff: ${roundedDiff}`)

            // 3. Create Correction Transaction
            console.log(`  -> Creating 'Opening Balance' transaction for ${roundedDiff}...`)

            const isPositive = roundedDiff > 0
            const type = isPositive ? 'income' : 'expense'
            const amount = Math.abs(roundedDiff)

            const { error: insertError } = await supabase
                .from('transactions')
                .insert({
                    occurred_at: new Date().toISOString(), // Or maybe use account created_at if available? Now is fine.
                    note: 'Opening Balance (Auto-Backfill)',
                    type: type,
                    source_account_id: account.id,
                    amount: isPositive ? amount : -amount, // DB expects signed amount for Source
                    status: 'posted',
                    created_by: account.owner_id // Or system? account doesn't have owner_id in my select above?
                    // I need owner_id if RLS checks it, but Service Role bypasses RLS.
                })

            if (insertError) {
                console.error('  -> Failed to insert correction:', insertError)
            } else {
                console.log('  -> Correction created.')

                const { data: refreshedTxns, error: refreshError } = await supabase
                    .from('transactions')
                    .select('amount, type, account_id, target_account_id, status')
                    .eq('status', 'posted')
                    .or(`account_id.eq.${account.id},target_account_id.eq.${account.id}`)

                if (refreshError) {
                    console.error('  -> Failed to reload transactions:', refreshError)
                    continue
                }

                const { totalIn: refreshedIn, totalOut: refreshedOut, currentBalance: refreshedBalance } = computeAccountTotals({
                    accountId: account.id,
                    accountType: account.type,
                    transactions: (refreshedTxns || []) as any[],
                })

                const { error: updateError } = await supabase
                    .from('accounts')
                    .update({
                        total_in: refreshedIn,
                        total_out: refreshedOut,
                        current_balance: refreshedBalance
                    })
                    .eq('id', account.id)

                if (updateError) {
                    console.error('  -> Failed to update account totals:', updateError)
                } else {
                    console.log('  -> Account totals updated.')
                }
            }
        }
    }

    console.log('Backfill complete.')
}

main().catch(console.error)
