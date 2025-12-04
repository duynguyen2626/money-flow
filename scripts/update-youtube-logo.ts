
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

async function updateYoutubeLogo() {
    // Using a different icon style that usually has less padding (e.g. 'youtube--v1' or just 'youtube')
    // 'https://img.icons8.com/color/48/youtube-play.png' -> 'https://img.icons8.com/color/48/youtube--v1.png'
    // Or 'https://img.icons8.com/fluency/48/youtube-play.png'

    const newLogoUrl = 'https://img.icons8.com/color/48/youtube--v1.png'

    const { data, error } = await supabase
        .from('shops')
        .update({ logo_url: newLogoUrl })
        .ilike('name', '%Youtube%')
        .select()

    if (error) {
        console.error('Error updating shop:', error)
        return
    }

    console.log('Updated shops:', data)
}

updateYoutubeLogo()
