import { redirect } from 'next/navigation'

export default function ShopsPage() {
  redirect('/categories?tab=shops')
}
