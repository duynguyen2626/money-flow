
'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAndProcessSubscriptions } from '@/services/subscription.service'

export async function debugSubscriptionBotAction(serviceName?: string) {
    const supabase = createClient()

    // 1. Fetch the subscription manually to see raw data
    const { data: sub } = await supabase
        .from('subscriptions')
        .select(`
      id, name, price, next_billing_date, payment_account_id, shop_id,
      subscription_members (
        profile_id,
        fixed_amount,
        slots,
        profiles ( name )
      )
    `)
        .eq('name', serviceName || 'Youtube')
        .single()

    // 2. Run the bot logic in a "dry run" mode (we can't easily dry run the existing function without modifying it, 
    // so we'll just call it and capture the result, but since it writes to DB, we might want to be careful.
    // However, the user wants to check if code runs correctly.

    // Let's check debt accounts for these members
    const memberIds = sub?.subscription_members?.map((m: any) => m.profile_id) || []
    const { data: debtAccounts } = await supabase
        .from('accounts')
        .select('id, owner_id, name')
        .eq('type', 'debt')
        .in('owner_id', memberIds)

    return {
        rawSubscription: sub,
        foundDebtAccounts: debtAccounts,
        memberIds,
    }
}
