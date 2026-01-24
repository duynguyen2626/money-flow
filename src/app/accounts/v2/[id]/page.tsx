import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PageProps = { params: { id: string }, searchParams?: { tab?: string } }

export default function LegacyAccountDetailsRedirect({ params, searchParams }: PageProps) {
  const { id } = params
  const tab = searchParams?.tab
  redirect(`/accounts/${id}${tab ? `?tab=${tab}` : ''}`)
}
