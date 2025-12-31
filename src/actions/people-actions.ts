'use server'

import { revalidatePath } from 'next/cache'
import { createPerson, ensureDebtAccount, updatePerson, getPersonWithSubs, getPeople } from '@/services/people.service'
import { getPersonDetails, getDebtByTags } from '@/services/debt.service';
import { getAccounts, getAccountTransactions } from '@/services/account.service';
import { getCategories } from '@/services/category.service';
import { getShops } from '@/services/shop.service';
import { syncAllTransactions, testConnection } from '@/services/sheet.service';

export async function createPersonAction(payload: {
  name: string
  email?: string | null
  avatar_url?: string | null
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
    payload.avatar_url ?? undefined,
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
    avatar_url?: string | null
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
  console.log('[updatePersonAction] Called with:', { id, payload })
  const ok = await updatePerson(id, payload)
  console.log('[updatePersonAction] Result:', ok)
  if (ok) {
    revalidatePath('/people')
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
