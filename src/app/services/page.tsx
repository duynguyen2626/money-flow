import { getServices } from '@/services/service-manager'
import { getPeople } from '@/services/people.service'
import { ServiceCard } from '@/components/services/service-card'
import { ServiceCreateDialog } from '@/components/services/service-create-dialog'
import { DistributeAllButton } from '@/components/services/distribute-all-button'
import { PlusCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const [services, people] = await Promise.all([getServices(), getPeople()])

  return (
    <section className="space-y-4">
      <header className="rounded-lg border bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Service Control Center</p>
            <h1 className="text-2xl font-semibold text-slate-900">Quản lý Dịch vụ</h1>
            <p className="text-sm text-slate-500">Manage your services and allocations.</p>
          </div>
          <div className="flex items-center gap-3">
            <DistributeAllButton />
            <ServiceCreateDialog
              people={people}
              trigger={
                <div className={cn(buttonVariants({ variant: 'outline' }), 'flex items-center gap-2')}>
                  <PlusCircle size={18} />
                  New Service
                </div>
              }
            />
          </div>
        </div>
      </header>

      {services && services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service: any) => (
            <ServiceCard
              key={service.id}
              service={service}
              members={service.service_members}
              allPeople={people}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-6 shadow">
          <p className="text-center text-sm text-slate-500">
            No services found. Create a new one to get started.
          </p>
        </div>
      )}
    </section>
  )
}