
/* eslint-disable @typescript-eslint/no-require-imports */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import os from 'os'

// Load env from root
// Check potential paths for .env
let envPath = path.resolve(process.cwd(), '.env')
if (!require('fs').existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), '.env.local')
}
console.log('Loading .env from:', envPath)
dotenv.config({ path: envPath })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('--- Config ---')
console.log('URL:', url)
console.log('Key present:', !!key)
console.log('--------------')

if (!url || !key) {
    console.error('CRITICAL: Missing credentials in .env')
    process.exit(1)
}

const supabase = createClient(url, key)

async function test() {
    console.log('1. Testing "categories" access (Anon)...')
    const { data, error } = await supabase.from('categories').select('id, name').limit(1)

    if (error) {
        console.error('ERROR querying categories:', error)
    } else {
        console.log('SUCCESS. Rows returned:', data?.length)
        if (data?.length) console.log('Sample:', data[0])
    }

    console.log('\n2. Testing "profiles" access (Anon)...')
    const { data: profiles, error: pError } = await supabase.from('profiles').select('count').limit(1)
    if (pError) {
        console.error('ERROR querying profiles:', pError)
    } else {
        console.log('SUCCESS (Profiles). Data:', profiles)
    }
}

test().catch(err => console.error('Script error:', err))
