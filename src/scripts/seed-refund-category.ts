
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seed() {
    console.log('🌱 Checking Refund Category...')

    // Check if it exists
    const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Refund')
        .eq('type', 'expense')
        .maybeSingle()

    if (existing) {
        console.log('✅ Refund category already exists.', existing)
        return
    }

    // Create it
    const { data, error } = await supabase
        .from('categories')
        .insert({
            name: 'Refund',
            type: 'expense',
            icon: 'RotateCcw', // Using Lucide icon name as standard
        })
        .select()
        .single()

    if (error) {
        console.error('❌ Failed to create Refund category:', error)
    } else {
        console.log('✅ Created Refund category:', data)
    }
}

seed()
