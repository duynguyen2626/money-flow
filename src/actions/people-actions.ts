'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPerson, ensureDebtAccount, updatePerson, getPersonWithSubs, getPeople } from '@/services/people.service'
import { getPersonDetails, getDebtByTags } from '@/services/debt.service';
import { getAccounts, getAccountTransactions } from '@/services/account.service';
import { getCategories } from '@/services/category.service';
import { getShops, createShop } from '@/services/shop.service';
import { syncAllTransactions, testConnection } from '@/services/sheet.service';

async function findOrCreateBankShop() {
  const shops = await getShops()
  const bankShop = shops.find(s => s.name.toLowerCase() === 'bank')
  if (bankShop) return bankShop.id

  // Create if not exists
  const newShop = await createShop({ name: 'Bank' })
  return newShop?.id
}

export type CreatePersonPayload = {
  name: string
  image_url?: string | null
  sheet_link?: string | null
  google_sheet_url?: string | null
  subscriptionIds?: string[]
  is_owner?: boolean
  is_archived?: boolean
  is_group?: boolean
  group_parent_id?: string | null
}

export async function createPersonAction(payload: CreatePersonPayload) {
  const result = await createPerson(
    payload.name,
    payload.image_url?.trim(),
    payload.sheet_link?.trim(),
    payload.subscriptionIds,
    {
      is_owner: payload.is_owner,
      is_archived: payload.is_archived,
      is_group: payload.is_group,
      group_parent_id: payload.group_parent_id,
      google_sheet_url: payload.google_sheet_url?.trim(),
    }
  )

  if (result) {
    revalidatePath('/people')
    return { success: true, profileId: result.profileId, debtAccountId: result.debtAccountId }
  } else {
    return { success: false, error: 'Failed to create person' }
  }
}

export async function ensureDebtAccountAction(personId: string, personName?: string) {
  const accountId = await ensureDebtAccount(personId, personName)
  if (accountId) {
    revalidatePath('/people')
  }
  return accountId
}

export type UpdatePersonPayload = {
  name?: string

  image_url?: string | null
  sheet_link?: string | null
  google_sheet_url?: string | null
  sheet_full_img?: string | null
  sheet_show_bank_account?: boolean
  sheet_bank_info?: string | null
  sheet_linked_bank_id?: string | null
  sheet_show_qr_image?: boolean
  subscriptionIds?: string[]
  is_owner?: boolean
  is_archived?: boolean
  is_group?: boolean
  group_parent_id?: string | null
}

export async function updatePersonAction(
  id: string,
  payload: UpdatePersonPayload
) {
  const ok = await updatePerson(id, payload)
  if (ok) {
    revalidatePath('/people')
    revalidatePath(`/people/${id}`)
  }
  return ok
}

import { getServices } from '@/services/service-manager';

export async function getPeoplePageData(id: string) {
  const person = await getPersonDetails(id);
  const ownerId = person?.owner_id ?? id;

  const [
    debtCycles,
    transactions,
    accounts,
    categories,
    personProfile,
    shops,
    subscriptions,
    allPeople,
  ] = await Promise.all([
    getDebtByTags(id),
    getAccountTransactions(id, 100),
    getAccounts(),
    getCategories(),
    getPersonWithSubs(ownerId),
    getShops(),
    getServices(),
    getPeople(),
  ]);

  // The data returned from server actions must be serializable.
  // Convert any non-serializable properties if necessary.
  // For example, Date objects can be converted to ISO strings.
  // In this case, the data from Supabase should already be serializable.
  return {
    person,
    debtCycles,
    transactions,
    accounts,
    categories,
    personProfile,
    shops,
    subscriptions,
    allPeople,
  };
}

export async function testSheetConnectionAction(personId: string) {
  return testConnection(personId);
}

export async function syncAllSheetDataAction(personId: string) {
  return syncAllTransactions(personId);
}

export async function syncAllPeopleSheetsAction() {
  const people = await getPeople({ includeArchived: false });
  const peopleWithSheets = people.filter(p => !!p.sheet_link && !p.is_archived);

  const results = await Promise.all(peopleWithSheets.map(async (p) => {
    try {
      await syncAllTransactions(p.id);
      return { id: p.id, name: p.name, success: true };
    } catch (err) {
      console.error(`Failed to sync sheet for ${p.name}:`, err);
      return { id: p.id, name: p.name, success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }));

  revalidatePath('/people');
  return results;
}

import { createTransaction } from '@/services/transaction.service';

export type RolloverDebtState = {
  success: boolean
  message?: string
  error?: string
}

export async function rolloverDebtAction(
  prevState: RolloverDebtState,
  formData: FormData
): Promise<RolloverDebtState> {
  const personId = formData.get('personId') as string
  const fromCycle = formData.get('fromCycle') as string
  const toCycle = formData.get('toCycle') as string
  const amountStr = formData.get('amount') as string
  const occurredAt = formData.get('occurredAt') as string

  if (!personId || !fromCycle || !toCycle || !amountStr) {
    return { success: false, error: 'Missing required fields' }
  }

  const amount = Math.round(Number(amountStr))
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Invalid amount' }
  }

  // Ensure debt account exists and get its ID
  // This is crucial because transactions must link to a valid account ID, not just a person ID
  const accountId = await ensureDebtAccount(personId)
  if (!accountId) {
    return { success: false, error: 'Could not resolve debt account for person' }
  }

  // Ensure 'Rollover' shop exists
  const rolloverShopId = await (async () => {
    const shops = await getShops()
    const rollover = shops.find(s => s.name.toLowerCase() === 'rollover')
    if (rollover) return rollover.id
    const newShop = await createShop({ name: 'Rollover' })
    return newShop?.id
  })()

  // Transaction 1: Settlement (IN) for the OLD cycle (Debt Repayment)
  // This reduces the balance of the old month to 0 (or less)
  const settleNote = `Rollover to ${toCycle}`
  const txDate = occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString()

  const settleRes = await createTransaction({
    occurred_at: txDate,
    tag: fromCycle,
    note: settleNote,
    type: 'repayment', // Counts as IN (Reduces debt)
    source_account_id: accountId,
    amount: amount,
    person_id: personId,
    category_id: '71e71711-83e5-47ba-8ff5-85590f45a70c', // Rollover Category
    shop_id: rolloverShopId ?? undefined,
  })

  if (!settleRes) {
    return { success: false, error: 'Failed to create settlement transaction' }
  }

  // Transaction 2: Opening Balance (OUT) for the NEW cycle (Lending)
  // This increases the balance of the new month
  const openNote = `Rollover from ${fromCycle}`
  const openRes = await createTransaction({
    occurred_at: txDate,
    tag: toCycle,
    note: openNote,
    type: 'debt', // Counts as OUT (Increases debt)
    source_account_id: accountId,
    amount: amount,
    person_id: personId,
    category_id: '71e71711-83e5-47ba-8ff5-85590f45a70c', // Rollover Category
    shop_id: rolloverShopId ?? undefined,
  })

  if (!openRes) {
    return { success: false, error: 'Failed to create opening balance transaction' }
  }

  // Link Transaction 1 to Transaction 2 (Bidirectional for easier voiding)
  const supabase = createClient()
  await (supabase.from('transactions').update as any)({ linked_transaction_id: openRes }).eq('id', settleRes);
  await (supabase.from('transactions').update as any)({ linked_transaction_id: settleRes }).eq('id', openRes);

  revalidatePath(`/people/${personId}`)
  return { success: true, message: 'Debt rolled over successfully' }
}

export async function getPeopleAction() {
  return await getPeople();
}
