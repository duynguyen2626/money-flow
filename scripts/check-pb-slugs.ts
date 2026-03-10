import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const base = process.env.POCKETBASE_URL || 'https://api-db.reiwarden.io.vn'
const email = process.env.POCKETBASE_DB_EMAIL!
const pass = process.env.POCKETBASE_DB_PASSWORD!

async function main() {
  const auth = await fetch(`${base}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password: pass }),
  })

  const token = (await auth.json()).token

  for (const collection of ['accounts', 'people', 'shops', 'categories']) {
    const response = await fetch(`${base}/api/collections/${collection}/records?perPage=500&fields=id,slug`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    const items = data.items || []
    const withSlug = items.filter((item: any) => item.slug).length
    console.log(`${collection}: total=${items.length}, withSlug=${withSlug}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
