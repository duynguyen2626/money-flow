
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkShop() {
    const shopId = 'ea3477cb-30dd-4b7f-8826-a89a1b919661'
    const { data: shop, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single()

    if (error) {
        console.error('Error fetching shop:', error)
        return
    }

    console.log('Shop found:', shop)
}

checkShop()
