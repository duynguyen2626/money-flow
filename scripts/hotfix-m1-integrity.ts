import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { computeAccountTotals } from '../src/lib/account-balance'
import { formatIsoCycleTag, getCashbackCycleRange, parseCashbackConfig } from '../src/lib/cashback'
import { resolveCashbackPolicy } from '../src/services/cashback/policy-resolver'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function recalcAccountBalances() {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name, type')

  if (error) {
    throw error
  }

  for (const account of accounts ?? []) {
    const { data: txns, error: txnError } = await supabase
      .from('transactions')
      .select('amount, type, account_id, target_account_id, status')
      .eq('status', 'posted')
      .or(`account_id.eq.${account.id},target_account_id.eq.${account.id}`)

    if (txnError) {
      console.error(`Failed to fetch transactions for ${account.name}:`, txnError)
      continue
    }

    const { totalIn, totalOut, currentBalance } = computeAccountTotals({
      accountId: account.id,
      accountType: account.type,
      transactions: (txns ?? []) as any[],
    })

    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        total_in: totalIn,
        total_out: totalOut,
        current_balance: currentBalance,
      })
      .eq('id', account.id)

    if (updateError) {
      console.error(`Failed to update account ${account.name}:`, updateError)
    }
  }
}

async function wipeCashbackData() {
  const { error: entriesError } = await supabase
    .from('cashback_entries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (entriesError) {
    throw entriesError
  }

  const { error: cyclesError } = await supabase
    .from('cashback_cycles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (cyclesError) {
    throw cyclesError
  }
}

async function resyncCashback() {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name, cashback_config, type')
    .eq('type', 'credit_card')
    .not('cashback_config', 'is', null)

  if (error) {
    throw error
  }

  const cycleIds = new Set<string>()

  for (const account of accounts ?? []) {
    const config = parseCashbackConfig(account.cashback_config, account.id)
    const { data: txns, error: txnError } = await supabase
      .from('transactions')
      .select('id, occurred_at, amount, type, account_id, category_id, cashback_mode, cashback_share_percent, cashback_share_fixed, note, persisted_cycle_tag, categories(name)')
      .eq('account_id', account.id)
      .eq('status', 'posted')
      .in('type', ['expense', 'debt'])

    if (txnError) {
      console.error(`Failed to fetch cashback transactions for ${account.name}:`, txnError)
      continue
    }

    const sortedTxns = [...(txns ?? [])].sort((a, b) => {
      return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    })

    const cycleSpent = new Map<string, number>()
    const cycleCache = new Map<string, string>()

    for (const txn of sortedTxns) {
      const occurredAt = new Date(txn.occurred_at)
      const cycleRange = getCashbackCycleRange(config, occurredAt)
      const tagDate = cycleRange?.end ?? occurredAt
      const cycleTag = formatIsoCycleTag(tagDate)

      if (txn.persisted_cycle_tag !== cycleTag) {
        await supabase
          .from('transactions')
          .update({ persisted_cycle_tag: cycleTag })
          .eq('id', txn.id)
      }

      const cacheKey = `${account.id}:${cycleTag}`
      let cycleId = cycleCache.get(cacheKey)

      if (!cycleId) {
        const { data: existing } = await supabase
          .from('cashback_cycles')
          .select('id')
          .eq('account_id', account.id)
          .eq('cycle_tag', cycleTag)
          .maybeSingle()

        if (existing?.id) {
          cycleId = existing.id
        } else {
          const { data: created, error: createError } = await supabase
            .from('cashback_cycles')
            .insert({
              account_id: account.id,
              cycle_tag: cycleTag,
              max_budget: config.maxAmount ?? null,
              min_spend_target: config.minSpend ?? null,
              spent_amount: 0,
            })
            .select('id')
            .single()

          if (createError) {
            console.error(`Failed to create cycle ${cycleTag} for ${account.name}:`, createError)
            continue
          }
          cycleId = created.id
        }

        cycleCache.set(cacheKey, cycleId)
      }

      const spentSoFar = cycleSpent.get(cycleTag) ?? 0
      const policy = resolveCashbackPolicy({
        account: { id: account.id, cashback_config: account.cashback_config },
        categoryId: txn.category_id,
        amount: Math.abs(Number(txn.amount) || 0),
        cycleTotals: { spent: spentSoFar },
        categoryName: (txn as any).categories?.name ?? undefined,
      })

      const modePreference = txn.cashback_mode || 'none_back'
      const fixedInput = Number(txn.cashback_share_fixed ?? 0)
      const percentInput = Number(txn.cashback_share_percent ?? 0)

      let mode: 'real' | 'virtual' | 'voluntary' = 'virtual'
      let amount = 0
      let countsToBudget = false

      switch (modePreference) {
        case 'real_fixed':
          mode = 'real'
          amount = fixedInput
          countsToBudget = true
          break
        case 'real_percent': {
          mode = 'real'
          const usedRate = percentInput ? percentInput : policy.rate
          amount = Math.abs(Number(txn.amount) || 0) * usedRate + fixedInput
          countsToBudget = true
          break
        }
        case 'voluntary':
          mode = 'voluntary'
          amount = fixedInput
          countsToBudget = false
          break
        case 'none_back':
        default:
          mode = 'virtual'
          amount = Math.abs(Number(txn.amount) || 0) * policy.rate
          countsToBudget = true
          break
      }

      const metadata = policy.metadata ?? {
        policySource: 'legacy',
        reason: 'Policy fallback',
        rate: policy.rate,
        ruleType: 'legacy',
        priority: 0,
      }

      const note = mode === 'virtual'
        ? `Projected: ${metadata.reason}`
        : (txn.note || `Manual: ${metadata.reason}`)

      const { error: entryError } = await supabase
        .from('cashback_entries')
        .upsert({
          cycle_id: cycleId,
          account_id: account.id,
          transaction_id: txn.id,
          mode,
          amount,
          counts_to_budget: countsToBudget,
          metadata,
          note,
        }, { onConflict: 'account_id, transaction_id' })

      if (entryError) {
        console.error(`Failed to upsert cashback entry for txn ${txn.id}:`, entryError)
      }

      cycleIds.add(cycleId)
      cycleSpent.set(cycleTag, spentSoFar + Math.abs(Number(txn.amount) || 0))
    }
  }

  for (const cycleId of cycleIds) {
    const { error: recomputeError } = await supabase
      .rpc('recompute_cashback_cycle', { p_cycle_id: cycleId })
    if (recomputeError) {
      console.error(`Failed to recompute cycle ${cycleId}:`, recomputeError)
    }
  }
}

async function main() {
  console.log('[M1] Recalculating account balances...')
  await recalcAccountBalances()

  console.log('[M1] Wiping cashback cycles and entries...')
  await wipeCashbackData()

  console.log('[M1] Re-syncing cashback entries from transactions...')
  await resyncCashback()

  console.log('[M1] Done.')
}

main().catch(error => {
  console.error('Hotfix failed:', error)
  process.exit(1)
})
