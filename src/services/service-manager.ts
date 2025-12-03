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
};
type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export async function upsertService(
  serviceData: SubscriptionInsert | SubscriptionUpdate,
  members?: Omit<ServiceMember, 'id' | 'service_id'>[]
) {
  const supabase = createClient()

  // 1. Upsert subscription
  const { data: service, error: serviceError } = await supabase
    .from('subscriptions')
    .upsert([serviceData] as any)
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

export async function distributeService(serviceId: string) {
  const supabase = createClient()
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

  const members = membersResult as any[];

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

  for (const member of members) {
    const cost = unitCost * member.slots
    const transactionDate = new Date().toISOString()
    const note = `Auto: ${(service as any).name} for ${member.profiles.name} [${new Date().toLocaleString('default', { month: 'short' })}]`

    // Create Header
      const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        occurred_at: transactionDate,
        note: note,
        }] as any)
      .select()
      .single()

    const transaction = transactionData as any;

    if (transactionError || !transaction) {
      console.error('Error creating transaction header for member:', member.profile_id, transactionError)
      // Continue to next member
      continue
    }
    console.log('Transaction header created:', transaction)
    createdTransactions.push(transaction)

    // Create Lines
    const transactionLines = []
    
    // Credit Draft Fund
    transactionLines.push({
      transaction_id: transaction.id,
      account_id: SYSTEM_ACCOUNTS.DRAFT_FUND,
      amount: -cost,
      type: 'credit',
    })

    if (member.profiles.is_owner) {
      // Debit: Category SERVICE_CAT_ID. (My Expense).
      transactionLines.push({
        transaction_id: transaction.id,
        category_id: SYSTEM_CATEGORIES.SERVICE,
        amount: cost,
        type: 'debit',
      })
    } else {
      const debtAccount = member.profiles.accounts.find((acc: any) => acc.type === 'debt')
      if (!debtAccount) {
        console.error(`Debt account not found for member ${member.profile_id}`)
        // Continue to next member, or should we rollback?
        continue
      }
      // Debit: Debt Account of that Person. (Their Debt).
      transactionLines.push({
        transaction_id: transaction.id,
        account_id: debtAccount.id,
        amount: cost,
        type: 'debit',
        person_id: member.profile_id,
      })
    }
    
    console.log('Transaction lines to be inserted for member:', member.profile_id, transactionLines)

    const { error: linesError } = await supabase
      .from('transaction_lines')
      .insert(transactionLines as any)

    if (linesError) {
      console.error('Error inserting transaction lines for member:', member.profile_id, linesError)
      // TODO: Rollback transaction header?
    } else {
      console.log('Transaction lines inserted successfully for member:', member.profile_id)
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

    members: Omit<ServiceMember, 'id' | 'service_id'>[]

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

  