
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

const accounts = [
  {
    id: '40c3998b-7550-414c-be42-fe93ed767a06',
    name: 'Vcb Signature',
    type: 'credit_card',
    currency: 'VND',
    credit_limit: 150000000.00,
    current_balance: 35790000.00,
    owner_id: '917455ba-16c0-42f9-9cea-264f81a3db66', // Note: Make sure this owner exists or use a valid one if this fails
    cashback_config: {"rate": 0.1, "tiers": [{"minSpend": 0, "categories": {}, "defaultRate": 0.1}], "dueDate": 15, "hasTiers": true, "minSpend": null, "cycleType": "calendar_month", "maxAmount": 300000, "statementDay": null, "parentAccountId": null},
    is_active: true,
    created_at: '2025-11-30 12:04:42.646344+00',
    secured_by_account_id: '71e996c7-c6a4-46e0-9b86-af03d68f96ca', // Note: Make sure this collateral exists
    image_url: 'https://res.cloudinary.com/dpnrln3ug/image/upload/v1763898711/Gemini_Generated_Image_u7lg45u7lg45u7lg_oyy5gp.png',
    total_in: 0.00,
    total_out: -35790000.00,
    annual_fee: 1500000.00,
    cashback_config_version: 1
  },
  {
    id: '83a27121-0e34-4231-b060-2818da672eca',
    name: 'Vpbank Lady',
    type: 'credit_card',
    currency: 'VND',
    credit_limit: 38000000.00,
    current_balance: 7951215.00,
    owner_id: 'dba2a24b-d89b-4d29-a51e-b92c5632228d',
    cashback_config: {"program": {"levels": [{"id": "lvl_1766378084811", "name": "Premium Tier ≥15M", "rules": [{"id": "rule_ztjfmz5cr", "rate": 0.15, "maxReward": 300000, "categoryIds": ["aac49051-7231-471e-a3ae-7925c78afa7d"]}], "defaultRate": 0.001, "minTotalSpend": 15000000}, {"id": "lvl_a51kvdh6w", "name": "Standard (<15M)", "rules": [{"id": "rule_7xyr829gb", "rate": 0.075, "maxReward": 150000, "categoryIds": ["aac49051-7231-471e-a3ae-7925c78afa7d"]}], "defaultRate": 0.001, "minTotalSpend": 0}], "dueDate": 15, "cycleType": "statement_cycle", "maxBudget": null, "defaultRate": 0.003, "statementDay": 20, "minSpendTarget": null}, "parentAccountId": null},
    is_active: true,
    created_at: '2025-11-30 12:04:42.646344+00',
    image_url: 'https://haagrico.com.vn/wp-content/uploads/2023/06/vpbank-lady-mastercard-la-the-gi-4.jpg',
    total_in: 0.00,
    total_out: -7951215.00,
    cashback_config_version: 3
  }
]

async function seed() {
  console.log('🌱 Seeding accounts...')

  for (const acc of accounts) {
    const { error } = await supabase.from('accounts').upsert(acc)
    if (error) {
      console.error(`❌ Failed to insert ${acc.name}:`, error)
    } else {
      console.log(`✅ Inserted/Updated ${acc.name}`)
    }
  }
  
  console.log('🏁 Seeding complete.')
}

seed()
