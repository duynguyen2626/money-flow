'use server'

import { revalidatePath } from 'next/cache'
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

export async function createPersonAction(payload: {
  name: string
  email?: string | null
  image_url?: string | null
  sheet_link?: string | null
  subscriptionIds?: string[]
  is_owner?: boolean
  is_archived?: boolean
  is_group?: boolean
  group_parent_id?: string | null
}) {
  const result = await createPerson(
    payload.name,
    payload.email ?? undefined,
    payload.image_url ?? undefined,
    payload.sheet_link ?? undefined,
    payload.subscriptionIds,
    {
      is_owner: payload.is_owner,
      is_archived: payload.is_archived,
      is_group: payload.is_group,
      group_parent_id: payload.group_parent_id,
    }
  )
  if (result) {
    revalidatePath('/people')
  }
  return result
}

export async function ensureDebtAccountAction(personId: string, personName?: string) {
  const accountId = await ensureDebtAccount(personId, personName)
  if (accountId) {
    revalidatePath('/people')
  }
  return accountId
}

export async function updatePersonAction(
  id: string,
  payload: {
    name?: string
    email?: string | null
    image_url?: string | null
    sheet_link?: string | null
    google_sheet_url?: string | null
    sheet_full_img?: string | null
    sheet_show_bank_account?: boolean
    sheet_show_qr_image?: boolean
    subscriptionIds?: string[]
    is_owner?: boolean
    is_archived?: boolean
    is_group?: boolean
    group_parent_id?: string | null
  }
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

  if (!personId || !fromCycle || !toCycle || !amountStr) {
    return { success: false, error: 'Missing required fields' }
  }

  const amount = Number(amountStr)
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Invalid amount' }
  }

  // Ensure debt account exists and get its ID
  // This is crucial because transactions must link to a valid account ID, not just a person ID
  const accountId = await ensureDebtAccount(personId)
  if (!accountId) {
    return { success: false, error: 'Could not resolve debt account for person' }
  }

  // Ensure 'Bank' shop exists
  const bankShopId = await findOrCreateBankShop()

  // Transaction 1: Settlement (IN) for the OLD cycle
  // This reduces the balance of the old month to 0 (or less)
  const settleNote = `Rollover to ${toCycle}`
  const settleRes = await createTransaction({
    occurred_at: new Date().toISOString(),
    tag: fromCycle,
    note: settleNote,
    type: 'repayment', // Counts as IN (Reduces debt)
    source_account_id: accountId,
    amount: amount,
    person_id: personId,
    shop_id: bankShopId ?? undefined,
  })

  if (!settleRes) {
    return { success: false, error: 'Failed to create settlement transaction' }
  }

  // Transaction 2: Opening Balance (OUT) for the NEW cycle
  // This increases the balance of the new month
  const openNote = `Rollover from ${fromCycle}`
  const openRes = await createTransaction({
    occurred_at: new Date().toISOString(),
    tag: toCycle,
    note: openNote,
    type: 'debt', // Counts as OUT (Increases debt)
    source_account_id: accountId,
    amount: amount,
    person_id: personId,
    shop_id: bankShopId ?? undefined,
  })

  if (!openRes) {
    return { success: false, error: 'Failed to create opening balance transaction' }
  }

  revalidatePath(`/people/${personId}`)
  return { success: true, message: 'Debt rolled over successfully' }
}
