import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables.')
    process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

async function updateLadyConfig() {
    console.log('Updating VPBank Lady Account Config...')

    // 1. Find Lady accounts
    const { data: accounts, error: fetchError } = await supabase
        .from('accounts')
        .select('id, name, cashback_config')
        .ilike('name', '%Lady%')

    if (fetchError) {
        console.error('Error fetching accounts:', fetchError)
        return
    }

    if (!accounts || accounts.length === 0) {
        console.log('No VPBank Lady accounts found.')
        return
    }

    // 2. Define MF5.3 Config
    const ladyConfig = {
        program: {
            rate: 0.001, // 0.1% default
            maxAmount: 1000000, // 1tr cap
            cycleType: 'calendar_month',
            minSpend: 0, // Qualifies immediately
            levels: [
                {
                    id: 'lady_base',
                    name: 'Base',
                    minTotalSpend: 0,
                    defaultRate: 0.001
                },
                {
                    id: 'lady_qualified',
                    name: 'Qualified (>=10M)',
                    minTotalSpend: 10000000,
                    defaultRate: 0.001,
                    categoryRules: [
                        {
                            categoryIds: [
                                'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Education (Example ID - need to check DB/Constants)
                                'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', // Insurance
                                'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', // Healthcare
                                'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'  // Beauty/Spa
                            ],
                            // Note: In a real app, we should fetch these IDs by name or use standard constants.
                            // For this task, I will use names in a secondary logic if IDs are unreliable, 
                            // but the prompt implies category rules should be set up.
                            // I will fetch categories first.
                            rate: 0.10,
                            maxReward: 1000000 // 1tr total for these groups
                        }
                    ]
                }
            ]
        }
    }

    // Refinement: Fetch Category IDs by Name for robust matching
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .in('name', ['Education', 'Insurance', 'Healthcare', 'Beauty & Spa', 'Spa'])

    if (categories && categories.length > 0) {
        const level = ladyConfig.program.levels[1]
        if (level && level.categoryRules && level.categoryRules[0]) {
            level.categoryRules[0].categoryIds = categories.map(c => c.id)
            console.log(`Mapped ${categories.length} categories for Lady rules.`)
        }
    } else {
        console.warn('Could not find categories by name. Using placeholders.')
    }

    for (const acc of accounts) {
        console.log(`Updating ${acc.name} (${acc.id})...`)
        const { error: updateError } = await supabase
            .from('accounts')
            .update({ cashback_config: ladyConfig } as any)
            .eq('id', acc.id)

        if (updateError) {
            console.error(`Failed to update ${acc.id}:`, updateError.message)
        } else {
            console.log(`✅ ${acc.name} updated.`)
        }
    }
}

updateLadyConfig().catch(console.error)
