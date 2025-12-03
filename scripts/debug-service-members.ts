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
    const serviceId = 'af12cd04-1915-49b2-974e-d2d20419f597' // From user request

    console.log('Fetching service:', serviceId)

    const { data: service, error } = await supabase
        .from('subscriptions')
        .select(`
      *,
      service_members:service_members(*)
    `)
        .eq('id', serviceId)
        .single()

    if (error) {
        console.error('Error fetching service:', error)
        return
    }

    console.log('Service:', service.name)
    console.log('Current members count:', service.service_members.length)

    // Delete all members
    const { error: deleteError } = await supabase
        .from('service_members')
        .delete()
        .eq('service_id', serviceId)

    if (deleteError) {
        console.error('Error deleting members:', deleteError)
    } else {
        console.log('Successfully deleted all members. Please re-add them in the UI.')
    }
}

main()
