'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from '@/lib/constants'
import { toLegacyMMMYYFromDate, toYYYYMMFromDate } from '@/lib/month-tag'
import { autoSyncCycleSheetIfNeeded } from './sheet.service'

// ServiceMember type for service distribution
// Uses person_id to match database schema after migration
type ServiceMember = {
  id: string;
  service_id: string;
  person_id: string; // Foreign key to people.id
  slots: number;
  is_owner: boolean;
  people?: {
    id: string;
    name: string;
    is_owner?: boolean;
    accounts?: any[];
  }
};
type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export async function upsertService(
  serviceData: SubscriptionInsert | SubscriptionUpdate,
  members?: Omit<ServiceMember, 'id' | 'service_id' | 'people'>[]
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
        person_id: member.person_id,
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
    .select('*, people (id, name, is_owner, accounts:accounts!accounts_owner_id_fkey(*))')
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

  // [Sprint 3] Timezone Fix: Force Asia/Ho_Chi_Minh
  const now = new Date();
  const vnTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
  const vnNow = new Date(vnTimeStr);

  const createdTransactions: any[] = []
  const transactionDate = customDate ? new Date(customDate).toISOString() : vnNow.toISOString()

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
        .replace('{member}', member.people?.name || 'Unknown')
        .replace('{name}', (service as any).name)
        .replace('{slots}', member.slots.toString())
        .replace('{date}', monthTag)
        .replace('{price}', pricePerSlot.toLocaleString())
        .replace('{initialPrice}', initialPrice.toLocaleString())
        .replace('{total_slots}', totalSlots.toString());
    } else {
      // Default: MemberName 2025-12 Slot: 1 (35,571)/7
      note = `${member.people?.name || 'Unknown'} ${monthTag} Slot: ${member.slots} (${pricePerSlot.toLocaleString()})/${totalSlots}`
    }

    // [M2-SP1] Idempotency Check: Use metadata to find existing transaction
    const canonicalMetadata = {
      service_id: serviceId,
      member_id: member.person_id,
      month_tag: monthTag
    };

    const legacyMetadata = legacyMonthTag
      ? {
        service_id: serviceId,
        member_id: member.person_id,
        month_tag: legacyMonthTag,
      }
      : null

    // Construct Payload for Single Table
    // Rule:
    // account_id = DRAFT_FUND (Wait for allocation)
    // type = expense or debt
    // amount = -cost (Expense is negative)
    // person_id = member.person_id (if not owner, so it is Debt), or NULL (if owner, so it is just Expense)
    // Owner = person paying for themselves (no person_id, just expense)
    // Member = person whose share is being paid (person_id set, creates Debt)

    const personId = member.is_owner ? null : member.person_id;

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
      console.log('Creating new transaction for member:', member.people?.name, 'person_id:', member.person_id);
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
          console.log(`[Sheet Sync] Distribute syncing (${action}) for ${personId}`, {
            transactionId,
            memberId: member.person_id,
            memberName: member.people?.name,
            shopName: (service as any).name,
            amount: cost,
            type: 'Debt'
          });

          await syncTransactionToSheet(member.person_id, sheetPayload as any, action);
        }
      } catch (syncError) {
        console.error('Error syncing to sheet:', syncError);
      }
    }
  }

  // Update service bot status after successful distribution
  try {
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate((service as any).due_day || 1)

    await supabase
      .from('subscriptions')
      .update({
        last_distribution_date: now.toISOString(),
        next_distribution_date: nextMonth.toISOString(),
        distribution_status: 'completed'
      })
      .eq('id', serviceId)

    console.log(`[Bot Status] Updated service ${serviceId}: completed, next run ${nextMonth.toISOString()}`)
  } catch (statusError) {
    console.error('[Bot Status] Failed to update service status:', statusError)
    // Don't fail the distribution if status update fails
  }

  // [M2-SP4] Trigger full sheet sync for all affected members to ensure consistency
  try {
    const memberIds = Array.from(new Set(members.map(m => m.person_id).filter(Boolean)))
    console.log(`[Sheet Sync] Triggering full sync for ${memberIds.length} members after distribution`)

    const { syncAllTransactions } = await import('./sheet.service')
    for (const memberId of memberIds) {
      try {
        const syncResult = await syncAllTransactions(memberId)
        if (syncResult.success) {
          console.log(`[Sheet Sync] Full sync completed for member ${memberId}`)
        } else {
          console.error(`[Sheet Sync] Full sync failed for member ${memberId}: ${syncResult.message}`)
        }
      } catch (memberSyncErr) {
        console.error(`[Sheet Sync] Error during full sync for member ${memberId}:`, memberSyncErr)
      }
    }
  } catch (fullSyncErr) {
    console.error('[Sheet Sync] Error triggering full sync after distribution:', fullSyncErr)
    // Don't fail the distribution if sync fails
  }

  // Return created transactions with person IDs for auto-sync
  return { transactions: createdTransactions, personIds: Array.from(new Set(members.map(m => m.person_id).filter(Boolean))) };
}

export async function getServices() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
        *,
        shop:shops(*),
        service_members:service_members(*, person:people(*))
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
  members: Omit<ServiceMember, 'id' | 'service_id' | 'people'>[]
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
      person_id: member.person_id,
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
        service_members:service_members(*, person:people(*))
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

  // [Sprint 3] Timezone Fix: Force Asia/Ho_Chi_Minh
  const now = new Date();
  const vnTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
  const vnNow = new Date(vnTimeStr);
  const todayDay = vnNow.getDate();

  const activeDate = customDate ? new Date(customDate) : vnNow;
  const monthTag = toYYYYMMFromDate(activeDate);

  console.log(`Starting batch distribution for all active services... Tag: ${monthTag}, Today VN: ${vnNow.toISOString()}`)

  // 1. Fetch all active services
  const { data: services, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching active services:', error)
    throw new Error('Failed to fetch active services')
  }

  if (!services || services.length === 0) {
    console.log('No active services found.')
    return { success: 0, failed: 0, skipped: 0, total: 0, reports: [] }
  }

  console.log(`Found ${services.length} active services.`)

  let successCount = 0
  let failedCount = 0
  let skippedCount = 0
  const reports: any[] = []

  // 2. Distribute each service
  for (const service of services) {
    try {
      const dueDay = service.due_day || 1;

      // [Sprint 3] Missed Day Recovery: today >= dueDay
      // If we are testing with customDate, we bypass the dueDay check or use the customDate's day
      const checkDay = customDate ? activeDate.getDate() : todayDay;

      if (checkDay < dueDay) {
        console.log(`Skipping ${service.name}: due on ${dueDay}, today is ${checkDay}`);
        skippedCount++;
        reports.push({ name: service.name, status: 'skipped', reason: `Due on day ${dueDay}` });
        continue;
      }

      // [Sprint 3] Idempotency Check: Check if ALREADY distributed this month
      // We check if ANY transaction exists for this service and monthTag
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .contains('metadata', { service_id: service.id, month_tag: monthTag })
        .limit(1);

      if (existingTx && existingTx.length > 0) {
        console.log(`Skipping ${service.name}: already distributed for ${monthTag}`);
        skippedCount++;
        reports.push({ name: service.name, status: 'skipped', reason: `Already distributed for ${monthTag}` });
        continue;
      }

      const result = await distributeService(service.id, customDate)
      successCount++
      reports.push({ name: service.name, status: 'success' });

      // [Service Sheet Integration] Auto-sync cycle sheets for people with sheet settings
      if (result.personIds && result.personIds.length > 0) {
        console.log(`[AutoSync] Triggering auto-sync for ${result.personIds.length} people from service ${service.name}`)
        for (const personId of result.personIds) {
          try {
            await autoSyncCycleSheetIfNeeded(personId, monthTag)
          } catch (autoSyncError) {
            console.error(`[AutoSync] Failed for person ${personId}:`, autoSyncError)
            // Don't fail the distribution if auto-sync fails
          }
        }
      }
    } catch (err) {
      console.error(`Failed to distribute service ${service.name} (${service.id}):`, err)
      failedCount++
      reports.push({ name: service.name, status: 'failed', reason: (err as any).message });
    }
  }

  console.log(`Batch distribution completed. Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`)
  return {
    success: successCount,
    failed: failedCount,
    skipped: skippedCount,
    total: services.length,
    reports
  }
}
