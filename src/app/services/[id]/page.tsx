import { getServiceById } from '@/services/service-manager'
import { getPeople } from '@/services/people.service'
import { ServiceCard } from '@/components/services/service-card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const service: any = await getServiceById(id)
    const people = await getPeople()

    if (!service) {
        return <div>Service not found</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/services">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{service.name}</h1>
                    <p className="text-sm text-muted-foreground">Manage service details and automation</p>
                </div>
            </div>

            <div className="max-w-xl">
                <ServiceCard
                    service={service}
                    members={service.service_members}
                    allPeople={people}
                    isDetail={true}
                />
            </div>
        </div>
    )
}
