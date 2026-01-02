import { getServices } from '@/services/service-manager'
import { getPeople } from '@/services/people.service'
import { ServiceTable } from '@/components/services/service-table'
import { ServiceCompactCard } from '@/components/services/service-compact-card'
import { ServicesFAB } from '@/components/services/services-fab'
import { Bot } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const [services, people] = await Promise.all([getServices(), getPeople()])

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <section className="space-y-4 max-w-7xl mx-auto">
        {services && services.length > 0 ? (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <ServiceTable services={services} people={people} />
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-2 md:hidden">
              {services.map((service: any) => (
                <ServiceCompactCard
                  key={service.id}
                  service={service}
                  people={people}
                />
              ))}
            </div>
          </>
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

      {/* Floating Action Buttons */}
      <ServicesFAB />
    </div>
  )
}