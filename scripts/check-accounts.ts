
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAccounts() {
    console.log('Checking accounts...')
    const { data, error } = await supabase
        .from('accounts')
        .select('id, name, is_active, type')

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Accounts found:', data?.length)
        console.table(data)
    }
}

checkAccounts()
