
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local')
const envConfig = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, value] = line.split('=')
        if (key && value) {
            acc[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
        }
        return acc
    }, {} as Record<string, string>)

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('Checking subscriptions table columns...')

    // We can't directly query schema info easily with JS client unless we have rpc.
    // But we can try to select * from subscriptions limit 1 and see keys.
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error:', error)
        return
    }

    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]))
    } else {
        console.log('No data found, cannot infer columns.')
        // Try to insert a dummy with shop_id to see if it errors? 
        // No, that's risky.
    }
}

main()
