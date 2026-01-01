import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type BankMapping = Database['public']['Tables']['bank_mappings']['Row']
type BankMappingInsert = Database['public']['Tables']['bank_mappings']['Insert']
type BankMappingUpdate = Database['public']['Tables']['bank_mappings']['Update']

/**
 * Get all bank mappings
 */
export async function getBankMappings(bankType?: string): Promise<BankMapping[]> {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let supabase

    if (serviceRoleKey) {
        supabase = createSupabaseClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )
    } else {
        supabase = await createClient()
    }

    let query = supabase
        .from('bank_mappings')
        .select('*')

    if (bankType) {
        query = query.eq('bank_type', bankType)
    }

    const { data, error } = await query.order('bank_name')

    if (error) {
        console.error('getBankMappings error:', error)
        throw error
    }
    console.log('getBankMappings: data length', data?.length, 'bankType:', bankType)
    return data || []
}

/**
 * Get bank mapping by code
 */
export async function getBankByCode(code: string): Promise<BankMapping | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('bank_mappings')
        .select('*')
        .eq('bank_code', code)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
    }
    return data
}

/**
 * Create a new bank mapping
 */
export async function createBankMapping(mapping: BankMappingInsert): Promise<BankMapping> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('bank_mappings')
        .insert(mapping)
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Update a bank mapping
 */
export async function updateBankMapping(
    id: string,
    mapping: BankMappingUpdate
): Promise<BankMapping> {
    const supabase = await createClient()
    const updateData: BankMappingUpdate = {
        ...mapping,
        updated_at: new Date().toISOString()
    }
    const { data, error } = await supabase
        .from('bank_mappings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Delete a bank mapping
 */
export async function deleteBankMapping(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('bank_mappings')
        .delete()
        .eq('id', id)

    if (error) throw error
}

/**
 * Delete multiple bank mappings
 */
export async function deleteBankMappings(ids: string[]): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('bank_mappings')
        .delete()
        .in('id', ids)

    if (error) throw error
}

/**
 * Search bank by name or code
 */
export async function searchBanks(query: string): Promise<BankMapping[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('bank_mappings')
        .select('*')
        .or(`bank_code.ilike.%${query}%,bank_name.ilike.%${query}%,short_name.ilike.%${query}%`)
        .order('bank_name')

    if (error) throw error
    return data || []
}


/**
 * Import bank mappings from Excel/Text data
 * Format: STT | Bank Code - Name | Full Bank Name
 */
export async function importBankMappingsFromExcel(excelData: string, bankType: 'VIB' | 'MBB' = 'VIB') {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let supabase

    if (serviceRoleKey) {
        supabase = createSupabaseClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )
    } else {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Cannot perform privileged import.')
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables. Please check .env.local')
    }
    const lines = excelData.trim().split('\n')
    const results = { success: 0, errors: [] as string[] }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        try {
            // Skip common headers
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('bank_name') || lowerLine.startsWith('stt')) {
                continue;
            }

            const columns = line.split('\t')

            // For VIB, we expect at least 2 columns (Code-Name | FullName) or (STT | Code-Name | FullName)
            if (bankType === 'VIB' && columns.length < 2) {
                results.errors.push(`Line ${i + 1}: Not enough columns for VIB format`)
                continue
            }
            // For MBB, we allow 1 column if it parses correctly
            if (bankType === 'MBB' && columns.length < 1) {
                results.errors.push(`Line ${i + 1}: Empty line`)
                continue
            }

            let bankCode = ''
            let shortName = ''
            let fullName = ''

            if (bankType === 'MBB') {
                // MBB Format: Check if any column has "Name (CODE)" pattern
                // User input example: "Nông nghiệp và Phát triển nông thôn (VBA)"

                const possibleNameCol = columns[0].trim(); // Try first column

                // Regex for "text (CODE)" at end of string
                const match = possibleNameCol.match(/(.+)\s+\(([^)]+)\)$/);

                if (match && match[2]) {
                    bankCode = match[2].trim();
                    // Group 1 is the name part before (Code)
                    shortName = match[1].trim();
                    fullName = shortName; // Use short name as full name fallback
                } else {
                    // Try column 1 if exists?
                    if (columns.length > 1) {
                        const col1 = columns[1].trim();
                        const match1 = col1.match(/(.+)\s+\(([^)]+)\)$/);
                        if (match1 && match1[2]) {
                            bankCode = match1[2].trim();
                            shortName = match1[1].trim();
                            fullName = shortName;
                        }
                    }
                }

                // If Full Name provided in next col, use it
                if (columns.length > 1 && !fullName) {
                    fullName = columns[1].trim();
                }
            } else {
                // VIB (Legacy) Logic
                // STT | Code - Name | Full Name
                // OR: Code - Name | Full Name

                // If Col 0 is small integer, assume STT -> use Col 1.
                let nameCol = columns[0];
                let fullCol = columns[1];

                if (/^\d+$/.test(columns[0]) && columns.length >= 3) {
                    nameCol = columns[1];
                    fullCol = columns[2];
                }

                const codeNamePart = nameCol.trim()
                const separatorIndex = codeNamePart.indexOf(' - ')

                if (separatorIndex !== -1) {
                    bankCode = codeNamePart.substring(0, separatorIndex).trim()
                    shortName = codeNamePart.substring(separatorIndex + 3).trim()
                } else {
                    bankCode = codeNamePart
                    shortName = codeNamePart
                }

                fullName = fullCol?.trim() || '';
            }

            if (!bankCode) throw new Error('Could not extract bank code')

            const { error } = await supabase
                .from('bank_mappings')
                .upsert({
                    bank_code: bankCode,
                    short_name: shortName,
                    bank_name: fullName,
                    bank_type: bankType,
                    updated_at: new Date().toISOString()
                } as BankMappingInsert, {
                    onConflict: 'bank_code,bank_type'  // Composite unique key
                })

            if (error) throw error
            results.success++
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push(`Line ${i + 1}: ${msg}`)
        }
    }

    return results
}
