'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

export type BotConfig = Database['public']['Tables']['bot_configs']['Row']

export const getBots = async (): Promise<BotConfig[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bot_configs')
    .select('*')
    .order('key')

  if (error) {
    console.error('Error fetching bot configs:', error)
    return []
  }

  return data
}

import { revalidatePath } from 'next/cache'

export const toggleBot = async (key: string, isEnabled: boolean) => {
  const supabase = createClient()
  const { error } = await (supabase
    .from('bot_configs')
    .update as any)({ is_enabled: isEnabled })
    .eq('key', key)

  if (error) throw error
  revalidatePath('/automation')
}

export const updateBotConfig = async (key: string, config: any) => {
  const supabase = createClient()
  const { error } = await (supabase
    .from('bot_configs')
    .update as any)({ config })
    .eq('key', key)

  if (error) throw error
  revalidatePath('/automation')
}

export const runBotManual = async (key: string, options?: { force?: boolean }) => {
  const supabase = createClient()

  const handlers: Record<string, () => Promise<any>> = {
  }

  const handler = handlers[key]
  if (!handler) {
    return { success: false, message: `Manual run not implemented for ${key}` }
  }

  const result = await handler()

  if (result?.success) {
    await (supabase
      .from('bot_configs')
      .update as any)({ last_run_at: new Date().toISOString() })
      .eq('key', key)
    revalidatePath('/automation')
  }

  return result
}
