import { redirect } from 'next/navigation'

export default async function AccountsV2Page() {
  // V2 is the main list; keep legacy URL compatible by redirecting to /accounts
  redirect('/accounts')
}
