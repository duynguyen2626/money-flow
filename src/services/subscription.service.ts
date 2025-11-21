'use server'

import { createClient } from '@/lib/supabase/server'
import { Subscription } from '@/types/moneyflow.types'

type SubscriptionRow = {
  id: string
  name: string
  price: number | null
  next_billing_date: string | null
  is_active: boolean | null
}

export async function getSubscriptions(): Promise<Subscription[]> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, name, price, next_billing_date, is_active')
      .order('name', { ascending: true })

    if (error) {
      // Avoid crashing the UI if the table is missing; return empty list quietly.
      return []
    }

    const rows = (data ?? []) as SubscriptionRow[]
    return rows.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      next_billing_date: item.next_billing_date ?? undefined,
      is_active: item.is_active ?? undefined,
    }))
  } catch (err) {
    console.error('Error fetching subscriptions:', err)
    return []
  }
}
