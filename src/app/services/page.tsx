import { getServices } from '@/services/service-manager'
import { getPeople } from '@/services/people.service'
import { ServicesPageContent } from '@/components/services/services-page-content'
import { Bot } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Subscriptions | Money Flow',
}

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const [services, people] = await Promise.all([getServices(), getPeople()])

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <section className="space-y-4 max-w-7xl mx-auto">
        {services && services.length > 0 ? (
          <ServicesPageContent services={services} people={people} />
        ) : (
          <div className="rounded-none border bg-white p-12 text-center shadow-none">
            <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900">No Services Yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Create a new service to start distributing costs.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}