import { createClient } from '@/lib/supabase/server'
import { executeWithFallback, logSource } from '@/lib/pocketbase/fallback-helpers'
import { Person } from '@/types/moneyflow.types'
import {
  pocketbaseCreate,
  pocketbaseDelete,
  pocketbaseGetById,
  pocketbaseList,
  pocketbaseUpdate,
  toPocketBaseId,
} from './server'

type PocketBaseRecord = Record<string, unknown>

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

type PocketBasePersonWrite = {
  name: string
  image_url?: string | null
  sheet_link?: string | null
  google_sheet_url?: string | null
  is_owner?: boolean | null
  is_archived?: boolean | null
  is_group?: boolean | null
  group_parent_id?: string | null
  sheet_full_img?: string | null
  sheet_show_bank_account?: boolean
  sheet_bank_info?: string | null
  sheet_linked_bank_id?: string | null
  sheet_show_qr_image?: boolean
}

function mapPerson(record: PocketBaseRecord): Person {
  return {
    id: String(record.slug || record.id || ''),
    pocketbase_id: typeof record.id === 'string' ? record.id : null,
    created_at: typeof record.created === 'string' ? record.created : undefined,
    name: String(record.name || ''),
    image_url: (record.image_url as string | null | undefined) ?? null,
    sheet_link: (record.sheet_link as string | null | undefined) ?? null,
    google_sheet_url: (record.google_sheet_url as string | null | undefined) ?? null,
    sheet_full_img: (record.sheet_full_img as string | null | undefined) ?? null,
    sheet_show_bank_account: (record.sheet_show_bank_account as boolean | null | undefined) ?? null,
    sheet_bank_info: (record.sheet_bank_info as string | null | undefined) ?? null,
    sheet_linked_bank_id: (record.sheet_linked_bank_id as string | null | undefined) ?? null,
    sheet_show_qr_image: (record.sheet_show_qr_image as boolean | null | undefined) ?? null,
    is_owner: (record.is_owner as boolean | null | undefined) ?? null,
    is_archived: (record.is_archived as boolean | null | undefined) ?? null,
    is_group: (record.is_group as boolean | null | undefined) ?? null,
    group_parent_id: (record.group_parent_id as string | null | undefined) ?? null,
  }
}

export async function resolvePocketBasePersonRecord(sourceOrPocketBaseId: string): Promise<PocketBaseRecord | null> {
  if (!sourceOrPocketBaseId) return null

  try {
    return await pocketbaseGetById<PocketBaseRecord>('people', sourceOrPocketBaseId)
  } catch {
    // continue
  }

  try {
    const pbId = toPocketBaseId(sourceOrPocketBaseId)
    return await pocketbaseGetById<PocketBaseRecord>('people', pbId)
  } catch {
    // continue
  }

  try {
    const escapedId = sourceOrPocketBaseId.replace(/'/g, "\\'")
    const bySlug = await pocketbaseList<PocketBaseRecord>('people', {
      perPage: 1,
      page: 1,
      filter: `slug='${escapedId}'`,
    })
    return bySlug.items?.[0] ?? null
  } catch {
    return null
  }
}

export async function getPocketBasePeople(): Promise<Person[]> {
  return executeWithFallback(
    async () => {
      logSource('PB', 'people.list')
      const response = await pocketbaseList<PocketBaseRecord>('people', {
        perPage: 500,
        page: 1,
      })
      return response.items.map(mapPerson).sort((a, b) => a.name.localeCompare(b.name))
    },
    async () => {
      logSource('SB', 'people.list fallback')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('people')
        .select('id, created_at, name, image_url, sheet_link, google_sheet_url, is_owner, is_archived, is_group, group_parent_id, sheet_full_img, sheet_show_bank_account, sheet_bank_info, sheet_linked_bank_id, sheet_show_qr_image')
        .order('name', { ascending: true })

      if (error) throw error

      const rows = (data ?? []) as Array<any>

      return rows.map((item) => ({
        id: item.id,
        created_at: item.created_at ?? undefined,
        name: item.name,
        image_url: item.image_url,
        sheet_link: item.sheet_link,
        google_sheet_url: item.google_sheet_url,
        is_owner: item.is_owner,
        is_archived: item.is_archived,
        is_group: item.is_group,
        group_parent_id: item.group_parent_id,
        sheet_full_img: item.sheet_full_img,
        sheet_show_bank_account: item.sheet_show_bank_account,
        sheet_bank_info: item.sheet_bank_info,
        sheet_linked_bank_id: item.sheet_linked_bank_id,
        sheet_show_qr_image: item.sheet_show_qr_image,
      }))
    },
    'people.list'
  )
}

export async function getPocketBasePersonDetails(sourceOrPocketBaseId: string): Promise<Person | null> {
  return executeWithFallback(
    async () => {
      logSource('PB', 'people.get', { sourceOrPocketBaseId })
      const personRecord = await resolvePocketBasePersonRecord(sourceOrPocketBaseId)
      if (!personRecord) return null
      const mapped = mapPerson(personRecord)
      const sourcePersonId = (() => {
        if (typeof personRecord.slug === 'string' && isUuid(personRecord.slug)) return personRecord.slug
        if (typeof personRecord.source_id === 'string' && isUuid(personRecord.source_id)) return personRecord.source_id
        if (isUuid(sourceOrPocketBaseId)) return sourceOrPocketBaseId
        if (isUuid(mapped.id)) return mapped.id
        return null
      })()

      if (!sourcePersonId) {
        return mapped
      }

      // 1. Base hydration from people table (Wait! PB Schema now has these fields, rely on PB)
      const hydrated = {
        ...mapped,
      }

      // 2. Fallbacks for missing configurations
      // Fallback for sheet_link (webhook link)
      if (!hydrated.sheet_link) {
        try {
          const escapedName = mapped.name.replace(/'/g, "\\'")
          const webhookDataByName = await pocketbaseList<PocketBaseRecord>('sheet_webhook_links', {
            filter: `name ~ '${escapedName}'`,
            sort: '-created',
            perPage: 1
          })
          
          let webhookLink = webhookDataByName.items?.[0] || null

          if (!webhookLink) {
            const webhookDataLatest = await pocketbaseList<PocketBaseRecord>('sheet_webhook_links', {
              sort: '-created',
              perPage: 1
            })
            webhookLink = webhookDataLatest.items?.[0] || null
          }

          if (webhookLink?.url) {
            hydrated.sheet_link = String(webhookLink.url)
          }
        } catch (err) {
          console.warn('[PB: Fallback] Failed to fetch sheet_webhook_links from PocketBase', err)
        }
      }

      // Fallback for google_sheet_url (from cycle sheets)
      if (!hydrated.google_sheet_url && personRecord.id) {
        try {
          const cycleSheetRows = await pocketbaseList<PocketBaseRecord>('person_cycle_sheets', {
            filter: `person_id='${personRecord.id}' && sheet_url != null && sheet_url != ''`,
            sort: '-updated,-created',
            perPage: 1
          })

          const latest = cycleSheetRows.items?.[0] || null
          if (latest?.sheet_url) {
            hydrated.google_sheet_url = String(latest.sheet_url)
          }
        } catch (err) {
           console.warn('[PB: Fallback] Failed to fetch person_cycle_sheets from PocketBase', err)
        }
      }

      console.log(`[people.service] Merge config for ${mapped.name}:`, {
        sheet_link: !!hydrated.sheet_link,
        google_sheet_url: !!hydrated.google_sheet_url,
        sheet_linked_bank_id: !!hydrated.sheet_linked_bank_id
      })

      return hydrated
    },
    async () => {
      logSource('SB', 'people.get fallback', { sourceOrPocketBaseId })
      const supabase = createClient()
      const { data, error } = await supabase
        .from('people')
        .select('id, created_at, name, image_url, sheet_link, google_sheet_url, is_owner, is_archived, is_group, group_parent_id, sheet_full_img, sheet_show_bank_account, sheet_bank_info, sheet_linked_bank_id, sheet_show_qr_image')
        .eq('id', sourceOrPocketBaseId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      const row = data as any

      return {
        id: row.id,
        created_at: row.created_at ?? undefined,
        name: row.name,
        image_url: row.image_url,
        sheet_link: row.sheet_link,
        google_sheet_url: row.google_sheet_url,
        is_owner: row.is_owner,
        is_archived: row.is_archived,
        is_group: row.is_group,
        group_parent_id: row.group_parent_id,
        sheet_full_img: row.sheet_full_img,
        sheet_show_bank_account: row.sheet_show_bank_account,
        sheet_bank_info: row.sheet_bank_info,
        sheet_linked_bank_id: row.sheet_linked_bank_id,
        sheet_show_qr_image: row.sheet_show_qr_image,
      }
    },
    'people.get'
  )
}

export async function getPocketBasePersonById(sourceOrPocketBaseId: string): Promise<Person | null> {
  return getPocketBasePersonDetails(sourceOrPocketBaseId)
}

export async function createPocketBasePerson(
  supabaseId: string,
  data: PocketBasePersonWrite
): Promise<boolean> {
  return executeWithFallback(
    async () => {
      const pbId = toPocketBaseId(supabaseId)
      logSource('PB', 'people.create', { supabaseId, pbId, name: data.name })
      await pocketbaseCreate<PocketBaseRecord>('people', {
        id: pbId,
        slug: supabaseId,
        ...data,
        group_parent_id: data.group_parent_id ? toPocketBaseId(data.group_parent_id) : null,
      })
      return true
    },
    async () => {
      logSource('SB', 'people.create fallback', { supabaseId })
      return false
    },
    'people.create'
  )
}

export async function updatePocketBasePerson(
  sourceOrPocketBaseId: string,
  data: Partial<PocketBasePersonWrite>
): Promise<boolean> {
  return executeWithFallback(
    async () => {
      const record = await resolvePocketBasePersonRecord(sourceOrPocketBaseId)
      if (!record?.id) return false

      const body: Record<string, unknown> = { ...data }
      if (typeof body.group_parent_id === 'string' && body.group_parent_id) {
        body.group_parent_id = toPocketBaseId(body.group_parent_id)
      }

      await pocketbaseUpdate<PocketBaseRecord>('people', String(record.id), body)
      return true
    },
    async () => {
      logSource('SB', 'people.update fallback', { sourceOrPocketBaseId })
      return false
    },
    'people.update'
  )
}

export async function deletePocketBasePerson(sourceOrPocketBaseId: string): Promise<boolean> {
  return executeWithFallback(
    async () => {
      const record = await resolvePocketBasePersonRecord(sourceOrPocketBaseId)
      if (!record?.id) return false
      await pocketbaseDelete('people', String(record.id))
      return true
    },
    async () => {
      logSource('SB', 'people.delete fallback', { sourceOrPocketBaseId })
      return false
    },
    'people.delete'
  )
}
