
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

async function checkLogos() {
    const shopId = 'ea3477cb-30dd-4b7f-8826-a89a1b919661'

    const { data: missingShop } = await supabase
        .from('shops')
        .select('name, image_url')
        .eq('id', shopId)
        .single()

    const { data: icloudShop } = await supabase
        .from('shops')
        .select('name, image_url')
        .ilike('name', '%iCloud%')
        .single()

    const { data: youtubeShop } = await supabase
        .from('shops')
        .select('name, image_url')
        .ilike('name', '%Youtube%')
        .single()

    console.log('Missing Shop:', missingShop)
    console.log('iCloud Shop:', icloudShop)
    console.log('Youtube Shop:', youtubeShop)
}

checkLogos()
