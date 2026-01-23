import { redirect } from 'next/navigation'

export default async function AccountsPage() {
  // Redirect to /accounts/v2 as the main accounts list
  redirect('/accounts/v2')
}
