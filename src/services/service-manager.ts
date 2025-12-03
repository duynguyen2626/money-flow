'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from '@/lib/constants'

// TODO: The 'service_members' table is not in database.types.ts. 
// This is a temporary type definition.
// The database schema needs to be updated.
type ServiceMember = {
  id: string;
  service_id: string;
  profile_id: string;
  slots: number;
  is_owner: boolean;
  profiles: {
    name: string;
    is_owner: boolean;
    accounts: any[];
  }
};
type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export async function upsertService(
  serviceData: SubscriptionInsert | SubscriptionUpdate,
  members?: Omit<ServiceMember, 'id' | 'service_id' | 'profiles'>[]
) {
  const supabase = createClient()

  // 1. Upsert subscription
  const { data: service, error: serviceError } = await supabase
    .from('subscriptions')
    .upsert([{
      ...serviceData,
      shop_id: (serviceData as any).shop_id
    }] as any)
    .select()
    .single()

  if (serviceError) {
    console.error('Error upserting service:', serviceError)
    throw new Error(serviceError.message)
  }

  if (members) {
    const serviceId = (service as any).id

    // 2. Delete all service_members for this ID
    const { error: deleteError } = await supabase
      .from('service_members')
      .delete()
      .eq('service_id', serviceId)

    if (deleteError) {
      console.error('Error deleting service members:', deleteError)
      // Don't throw here, we can still try to insert new members
    }

    // 3. Insert new members list
    if (members.length > 0) {
      const memberInsertData = members.map(member => ({
        service_id: serviceId,
        profile_id: member.profile_id,
        slots: member.slots,
        is_owner: member.is_owner,
      }))

      const { error: insertError } = await supabase
        .from('service_members')
        .insert(memberInsertData as any)

      if (insertError) {
        console.error('Error inserting service members:', insertError)
        throw new Error(insertError.message)
      }
    }
  }

  return service
}

export async function distributeService(serviceId: string, customDate?: string, customNoteFormat?: string) {
  const supabase: any = createClient()
  console.log('Distributing service:', serviceId)

  // Step 1: Calculate Math
  // Fetch Service + Members.
  const { data: service, error: serviceError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) {
    console.error('Error fetching service:', serviceError)
    throw new Error('Service not found')
  }
  console.log('Service found:', service)

  const { data: membersResult, error: membersError } = await supabase
    .from('service_members')
    .select('*, profiles (name, is_owner, accounts(*))')
    .eq('service_id', serviceId)

  const members = membersResult as unknown as ServiceMember[];

  if (membersError || !members) {
    console.error('Error fetching service members:', membersError)
    throw new Error('Service members not found')
  }
  console.log('Members found:', members)

  const totalSlots = members.reduce((sum, member) => sum + member.slots, 0)
  if (totalSlots === 0) {
    throw new Error('Total slots is zero, cannot distribute.')
  }
  const unitCost = ((service as any).price || 0) / totalSlots
  console.log('Unit cost:', unitCost)

  const createdTransactions: any[] = []

  const transactionDate = customDate ? new Date(customDate).toISOString() : new Date().toISOString()

  // [M2-SP2] Tag Format: MMMYY (e.g., DEC25)
  const dateObj = new Date(transactionDate)
  const monthStr = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const yearStr = dateObj.getFullYear().toString().slice(-2)
  const monthTag = `${monthStr}${yearStr}`

  for (const member of members) {
    const cost = unitCost * member.slots

    // Format Note
    let note = '';
    const pricePerSlot = Math.round(unitCost);

    if (customNoteFormat) {
      note = customNoteFormat
        .replace('{service}', (service as any).name)
        .replace('{member}', member.profiles.name)
        .replace('{name}', (service as any).name) // {name} now maps to Service Name as requested
        .replace('{slots}', member.slots.toString())
        .replace('{date}', monthTag)
        .replace('{price}', pricePerSlot.toLocaleString())
        .replace('{total_slots}', totalSlots.toString());
    } else {
      // Default: MemberName DEC25 Slot: 1 (35,571)/7
      note = `${member.profiles.name} ${monthTag} Slot: ${member.slots} (${pricePerSlot.toLocaleString()})/${totalSlots}`
    }

    // [M2-SP1] Idempotency Check: Use metadata to find existing transaction
    const metadata = {
      service_id: serviceId,
      member_id: member.profile_id,
      month_tag: monthTag
    };

    // Query existing transaction
    // Note: We use .contains for JSONB. 
    // If 'metadata' column doesn't exist, this will fail. User needs to run migration.
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('*')
      .contains('metadata', metadata)
      .single();

    let transactionId = (existingTx as any)?.id;

    if (existingTx) {
      console.log('Updating existing transaction:', (existingTx as any).id);
      // Update Header
      await supabase
        .from('transactions')
        .update({
          note: note,
          occurred_at: transactionDate,
          tag: monthTag // [M2-SP2] Ensure tag is updated
        } as any)
        .eq('id', transactionId);

      // Delete existing lines to recreate them (simplest way to handle amount/account changes)
      await supabase
        .from('transaction_lines')
        .delete()
        .eq('transaction_id', transactionId);

    } else {
      console.log('Creating new transaction for member:', member.profile_id);
      // Create Header
      const { data: newTx, error: txError } = await supabase
        .from('transactions')
        .insert([{
          occurred_at: transactionDate,
          note: note,
          metadata: metadata,
          tag: monthTag // [M2-SP2] Add tag for filtering
        }] as any)
        .select()
        .single();

      if (txError || !newTx) {
        console.error('Error creating transaction:', txError);
        continue;
      }
      transactionId = newTx.id;
    }

    createdTransactions.push({ id: transactionId });

    // Create Lines (for both new and updated)
    const transactionLines = []

    // Credit Draft Fund
    transactionLines.push({
      transaction_id: transactionId,
      account_id: SYSTEM_ACCOUNTS.DRAFT_FUND,
      amount: -cost,
      type: 'credit',
      category_id: SYSTEM_CATEGORIES.ONLINE_SERVICES // Ensure category is set for credit line too if needed, but usually for debit
    })

    if (member.profiles.is_owner) {
      // Debit: Category SERVICE_CAT_ID. (My Expense).
      transactionLines.push({
        transaction_id: transactionId,
        category_id: 'e0000000-0000-0000-0000-000000000088',
        amount: cost,
        type: 'debit',
      })
    } else {
      const debtAccount = member.profiles.accounts.find((acc: any) => acc.type === 'debt')
      if (!debtAccount) {
        console.error(`Debt account not found for member ${member.profile_id}`)
        continue
      }
      // Debit: Debt Account of that Person. (Their Debt).
      transactionLines.push({
        transaction_id: transactionId,
        account_id: debtAccount.id,
        amount: cost,
        type: 'debit',
        person_id: member.profile_id,
        category_id: 'e0000000-0000-0000-0000-000000000088',
      })
    }

    const { error: linesError } = await supabase
      .from('transaction_lines')
      .insert(transactionLines as any)

    if (linesError) {
      console.error('Error inserting lines:', linesError)
    }
  }

  return createdTransactions;
}

export async function getServices() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
        *,
        shop:shops(*),
        service_members:service_members(*, profile:profiles(*))
      `)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching services:', error)
    // TEMP: Return empty array until DB schema is updated
    return []
  }

  return data
}

export async function deleteService(serviceId: string) {
  const supabase = createClient()

  const { error: membersError } = await supabase
    .from('service_members')
    .delete()
    .eq('service_id', serviceId)

  if (membersError) {
    console.error('Error deleting service members:', membersError)
    throw new Error(membersError.message)
  }

  const { error: serviceError } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', serviceId)

  if (serviceError) {
    console.error('Error deleting service:', serviceError)
    throw new Error(serviceError.message)
  }
}

export async function updateServiceMembers(
  serviceId: string,
  members: Omit<ServiceMember, 'id' | 'service_id' | 'profiles'>[]
) {
  const supabase = createClient()

  // 1. Delete all service_members for this ID
  const { error: deleteError } = await supabase
    .from('service_members')
    .delete()
    .eq('service_id', serviceId)

  if (deleteError) {
    console.error('Error deleting service members:', deleteError)
    throw new Error(deleteError.message)
  }

  // 2. Insert new members list
  if (members && members.length > 0) {
    const memberInsertData = members.map(member => ({
      service_id: serviceId,
      profile_id: member.profile_id,
      slots: Number(member.slots) || 0,
      is_owner: member.is_owner,
    }))

    const { error: insertError } = await supabase
      .from('service_members')
      .insert(memberInsertData as any)

    if (insertError) {
      console.error('Error inserting service members:', insertError)
      throw new Error(insertError.message)
    }
  }
}

export async function getServiceById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
        *,
        shop:shops(*),
        service_members:service_members(*, profile:profiles(*))
      `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getServiceBotConfig(serviceId: string) {
  const supabase = createClient()
  const key = `service_${serviceId}`
  const { data, error } = await supabase
    .from('bot_configs')
    .select('*')
    .eq('key', key)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
    console.error('Error fetching bot config:', error)
  }
  return data
}

export async function saveServiceBotConfig(serviceId: string, config: any) {
  const supabase = createClient()
  const key = `service_${serviceId}`

  const { error } = await supabase
    .from('bot_configs')
    .upsert({
      key: key,
      name: `Bot for Service ${serviceId}`,
      is_enabled: config.isEnabled,
      config: config,
      updated_at: new Date().toISOString() // Assuming updated_at exists or just rely on created_at/default
    } as any)

  if (error) throw error
  return true
}