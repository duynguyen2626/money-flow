import { redirect } from 'next/navigation'

export default async function AccountsV2Page() {
  // Redirect to old page for now - will implement proper V2 list later
  redirect('/accounts')
}
