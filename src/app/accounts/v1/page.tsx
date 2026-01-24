import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AccountsV1Redirect() {
  redirect('/archive/accounts/v1')
}
