import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

type Account = Database['public']['Tables']['accounts']['Row']
type AccountUpdate = Database['public']['Tables']['accounts']['Update']

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY) are set.')
    process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

async function run() {
    console.log('Starting Account Config Verification...')

    // 1. Create a transient test account
    const testName = `Verify_Auto_${Date.now()}`
    const initialFee = 500000

    // Note: We use type assertion because our locally patched types might match, but runtime needs to support it.
    // If 'annual_fee' causes error, it means migration failed.
    const { data: account, error: createError } = await supabase
        .from('accounts')
        .insert({
            name: testName,
            type: 'credit_card',
            annual_fee: initialFee,
            currency: 'VND',
            is_active: true,
            owner_id: '917455ba-16c0-42f9-9cea-264f81a3db66' // Use a known ID or fetch one if needing strict RLS
        } as any)
        .select()
        .single()

    if (createError) {
        console.error('❌ Creation Failed:', createError.message)
        return
    }

    console.log(`✅ Account Created: ${(account as Account).id} (Name: ${(account as Account).name})`)

    // 2. Verify Initial State
    if ((account as Account).annual_fee === initialFee) {
        console.log('✅ Annual Fee persisted correctly on creation.')
    } else {
        console.error(`❌ Annual Fee Mismatch! Expected ${initialFee}, got ${(account as Account).annual_fee}`)
    }

    // 3. Update Account
    const newFee = 999999
    const updateData = { annual_fee: newFee }
    const { data: updated, error: updateError } = await (supabase
        .from('accounts') as any)
        .update(updateData)
        .eq('id', (account as Account).id)
        .select()
        .single()

    if (updateError) {
        console.error('❌ Update Failed:', updateError.message)
    } else {
        if ((updated as Account).annual_fee === newFee) {
            console.log('✅ Annual Fee updated successfully.')
        } else {
            console.error(`❌ Annual Fee Update Mismatch! Expected ${newFee}, got ${(updated as Account).annual_fee}`)
        }
    }

    // 4. Cleanup
    const { error: deleteError } = await supabase.from('accounts').delete().eq('id', (account as Account).id)
    if (deleteError) {
        console.error('⚠️ Cleanup Failed:', deleteError.message)
    } else {
        console.log('✅ Cleanup successful.')
    }
}

run().catch(err => console.error(err))