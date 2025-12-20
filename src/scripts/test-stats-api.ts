import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { getAccountSpendingStats } from '../services/cashback.service'

async function test() {
    const aid = '83a27121-0e34-4231-b060-2818da672eca'
    const date = new Date()
    console.log(`Testing Stats for ${aid} on ${date.toISOString()}`)

    const stats = await getAccountSpendingStats(aid, date)
    console.log('--- API Response Payload ---')
    console.log(JSON.stringify(stats, null, 2))
}

test().catch(console.error)
