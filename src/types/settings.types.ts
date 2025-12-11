export type QuickPeopleConfig = {
    mode: 'smart' | 'manual'
    pinned_ids: string[]
    blacklist_ids: string[] // People to never show
}

export const DEFAULT_QUICK_PEOPLE_CONFIG: QuickPeopleConfig = {
    mode: 'smart',
    pinned_ids: [],
    blacklist_ids: []
}

export type UsageStats = {
    [personId: string]: {
        lend_count: number
        repay_count: number
        last_used_at: string
    }
}

export const SETTINGS_KEY_QUICK_PEOPLE = 'quick_people_config'
export const SETTINGS_KEY_USAGE_STATS = 'usage_stats'
