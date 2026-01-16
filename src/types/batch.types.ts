// Batch Settings Types
export type BankType = 'MBB' | 'VIB'

export interface BatchSettings {
    id: string
    bank_type: BankType
    sheet_url: string | null
    sheet_name: string | null
    webhook_url: string | null
    webhook_enabled: boolean
    image_url: string | null
    created_at: string
    updated_at: string
}

export interface CreateMonthParams {
    month_year: string // Format: 'YYYY-MM'
    bank_type: BankType
    clone_from_id?: string | null
}

export interface QuickEntryItem {
    bank_name: string
    bank_code: string
    amount: number
    skip?: boolean
}

export interface CloneBatchParams {
    source_batch_id: string
    month_year: string
    bank_type: BankType
    items: QuickEntryItem[]
}
