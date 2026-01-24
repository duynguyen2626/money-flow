import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function LegacyAccountDetailsRedirect({ params }: PageProps) {
  const { id } = await params
  redirect(`/accounts/${id}`)
}
