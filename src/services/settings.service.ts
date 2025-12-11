import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import {
    DEFAULT_QUICK_PEOPLE_CONFIG,
    SETTINGS_KEY_QUICK_PEOPLE,
    SETTINGS_KEY_USAGE_STATS
} from '@/types/settings.types'
import type { QuickPeopleConfig, UsageStats } from '@/types/settings.types'

// Re-export specific things if needed by server actions, 
// but components should import from types file directly.
export { DEFAULT_QUICK_PEOPLE_CONFIG }
export type { QuickPeopleConfig, UsageStats }


// --- Getters ---

export const getQuickPeopleConfig = cache(async () => {
    const supabase = await createClient()
    const { data } = await supabase
        .from('user_settings')
        .select('value')
        .eq('key', SETTINGS_KEY_QUICK_PEOPLE)
        .single()

    if (!data) return DEFAULT_QUICK_PEOPLE_CONFIG
    return (data as any).value as QuickPeopleConfig
})

export const getUsageStats = cache(async () => {
    const supabase = await createClient()
    const { data } = await supabase
        .from('user_settings')
        .select('value')
        .eq('key', SETTINGS_KEY_USAGE_STATS)
        .single()

    if (!data) return {} as UsageStats
    return (data as any).value as UsageStats
})

// --- Setters (Server Actions usually, but service helper here) ---

export async function updateQuickPeopleConfig(config: Partial<QuickPeopleConfig>) {
    const supabase = await createClient()
    const current = await getQuickPeopleConfig()
    const newValue = { ...current, ...config }

    const { error } = await supabase
        .from('user_settings')
        .upsert({
            key: SETTINGS_KEY_QUICK_PEOPLE,
            value: newValue as any
        } as any, { onConflict: 'user_id, key' })

    if (error) throw error
    return newValue
}

export async function trackPersonUsage(personId: string, type: 'lend' | 'repay') {
    const supabase = await createClient()

    // Optimistic/Atomic update might be hard with JSONB, but sufficient for low frequency
    // We'll fetch, update, push. Race conditions possible but acceptable for stats.
    const { data } = await supabase
        .from('user_settings')
        .select('value')
        .eq('key', SETTINGS_KEY_USAGE_STATS)
        .single()

    const stats: UsageStats = ((data as any)?.value as UsageStats) || {}

    const currentStat = stats[personId] || { lend_count: 0, repay_count: 0, last_used_at: new Date().toISOString() }

    if (type === 'lend') currentStat.lend_count = (currentStat.lend_count || 0) + 1
    if (type === 'repay') currentStat.repay_count = (currentStat.repay_count || 0) + 1
    currentStat.last_used_at = new Date().toISOString()

    stats[personId] = currentStat

    const { error } = await supabase
        .from('user_settings')
        .upsert({
            key: SETTINGS_KEY_USAGE_STATS,
            value: stats as any
        } as any, { onConflict: 'user_id, key' })

    if (error) console.error('Failed to track usage:', error)
}
