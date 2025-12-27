'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from '@/lib/constants'
import { toLegacyMMMYYFromDate, toYYYYMMFromDate } from '@/lib/month-tag'

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

  const initialPrice = (service as any).price || 0

  // Use max_slots if available, otherwise sum of member slots
  const computedTotalSlots = members.reduce((sum, member) => sum + (Number(member.slots) || 0), 0)
  const totalSlots = (service as any).max_slots && (service as any).max_slots > 0
    ? (service as any).max_slots
    : computedTotalSlots

  if (totalSlots === 0) {
    throw new Error('Total slots is zero, cannot distribute.')
  }
  const unitCost = initialPrice / totalSlots
  console.log('Unit cost:', unitCost)

  const createdTransactions: any[] = []

  const transactionDate = customDate ? new Date(customDate).toISOString() : new Date().toISOString()

  // [M2-SP2] Tag Format: YYYY-MM (e.g., 2025-12)
  const dateObj = new Date(transactionDate)
  const monthTag = toYYYYMMFromDate(dateObj)
  const legacyMonthTag = toLegacyMMMYYFromDate(dateObj)

  for (const member of members) {
    const cost = unitCost * member.slots
    if (cost === 0) continue;

    // Format Note
    let note = '';
    const pricePerSlot = Math.round(unitCost);

    const templateToUse = customNoteFormat || (service as any).note_template;

    if (templateToUse) {
      note = templateToUse
        .replace('{service}', (service as any).name)
        .replace('{member}', member.profiles.name)
        .replace('{name}', (service as any).name)
        .replace('{slots}', member.slots.toString())
        .replace('{date}', monthTag)
        .replace('{price}', pricePerSlot.toLocaleString())
        .replace('{initialPrice}', initialPrice.toLocaleString())
        .replace('{total_slots}', totalSlots.toString());
    } else {
      // Default: MemberName 2025-12 Slot: 1 (35,571)/7
      note = `${member.profiles.name} ${monthTag} Slot: ${member.slots} (${pricePerSlot.toLocaleString()})/${totalSlots}`
    }

    // [M2-SP1] Idempotency Check: Use metadata to find existing transaction
    const canonicalMetadata = {
      service_id: serviceId,
      member_id: member.profile_id,
      month_tag: monthTag
    };

    const legacyMetadata = legacyMonthTag
      ? {
        service_id: serviceId,
        member_id: member.profile_id,
        month_tag: legacyMonthTag,
      }
      : null

    // Construct Payload for Single Table
    // Rule:
    // account_id = DRAFT_FUND (Wait for allocation)
    // type = expense
    // amount = -cost (Expense is negative)
    // person_id = member.profile_id (if not owner, so it is Debt), or NULL (if owner, so it is just Expense)
    // Wait... if it is Owner, person_id = NULL means it's my expense.
    // If it is Member, person_id = MemberID means it's "Expense on behalf of Member" -> System treats as Debt if I paid?
    // User instruction: "Phần của Lâm: person_id = 'ID_Của_Lâm' (Hệ thống tự hiểu đây là Nợ)." -> Yes.
    // "Phần của Me: person_id = NULL." -> Yes.

    const personId = member.profiles.is_owner ? null : member.profile_id;

    const payload = {
      occurred_at: transactionDate,
      note: note,
      metadata: canonicalMetadata,
      tag: monthTag,
      shop_id: (service as any).shop_id,
      amount: -cost, // Expense is negative
      type: personId ? 'debt' : 'expense',
      status: 'posted',
      account_id: SYSTEM_ACCOUNTS.DRAFT_FUND,
      category_id: SYSTEM_CATEGORIES.ONLINE_SERVICES,
      person_id: personId,
      created_by: null // System/Bot doesn't have a user ID strictly, or could be owner? Let's leave null or DEFAULT_USER_ID if needed. 'created_by' is usually for RLS.
    };

    // Query existing transaction
    const { data: existingCanonicalTx } = await supabase
      .from('transactions')
      .select('id')
      .contains('metadata', canonicalMetadata)
      .maybeSingle();

    let transactionId = (existingCanonicalTx as any)?.id;

    let isUpdate = false;
    if (!transactionId && legacyMetadata) {
      const { data: existingLegacyTx } = await supabase
        .from('transactions')
        .select('id')
        .contains('metadata', legacyMetadata)
        .maybeSingle()

      transactionId = (existingLegacyTx as any)?.id
    }

    if (transactionId) {
      console.log('Updating existing transaction:', transactionId);
      const { error: updateError } = await supabase
        .from('transactions')
        .update(payload as any)
        .eq('id', transactionId);

      if (updateError) console.error('Error updating transaction:', updateError);
      isUpdate = true;

    } else {
      console.log('Creating new transaction for member:', member.profile_id);
      const { data: newTx, error: insertError } = await supabase
        .from('transactions')
        .insert([payload] as any)
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating transaction:', insertError);
        continue;
      }
      transactionId = newTx.id;
    }

    if (transactionId) {
      createdTransactions.push({ id: transactionId });

      // [M2-SP3] Sync to Google Sheet
      try {
        // Only sync if there is a person (Debt)
        if (personId) {
          const { syncTransactionToSheet } = await import('./sheet.service');
          const sheetPayload = {
            id: transactionId,
            occurred_at: transactionDate,
            note: note,
            tag: monthTag,
            amount: cost, // Sheet expects positive for Debt amount
            type: 'Debt', // Service cost allocated to member is Debt
            shop_name: (service as any).name || 'Service',
          };

          const action = isUpdate ? 'update' : 'create';
          console.log(`[Sheet Sync] Distribute syncing (${action}) for ${personId}`);

          await syncTransactionToSheet(member.profile_id, sheetPayload as any, action);
        }
      } catch (syncError) {
        console.error('Error syncing to sheet:', syncError);
      }
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
      config: config
    } as any, { onConflict: 'key' })

  if (error) throw error
  return true
}

export async function distributeAllServices(customDate?: string) {
  const supabase: any = createClient()
  console.log('Starting batch distribution for all active services...', customDate ? `Date: ${customDate}` : 'Date: Current')

  // 1. Fetch all active services
  const { data: services, error } = await supabase
    .from('subscriptions')
    .select('id, name')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching active services:', error)
    throw new Error('Failed to fetch active services')
  }

  if (!services || services.length === 0) {
    console.log('No active services found.')
    return { success: 0, failed: 0, total: 0 }
  }

  console.log(`Found ${services.length} active services.`)

  let successCount = 0
  let failedCount = 0

  // 2. Distribute each service
  for (const service of services) {
    try {
      await distributeService(service.id, customDate)
      successCount++
    } catch (err) {
      console.error(`Failed to distribute service ${service.name} (${service.id}):`, err)
      failedCount++
    }
  }

  console.log(`Batch distribution completed. Success: ${successCount}, Failed: ${failedCount}`)
  return { success: successCount, failed: failedCount, total: services.length }
}
