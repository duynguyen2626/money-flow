'use client'

import { useState } from 'react'
import { ServiceTable } from '@/components/services/service-table'
import { ServiceCompactCard } from '@/components/services/service-compact-card'
import { ServiceTransactionsTable } from '@/components/services/service-transactions-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Globe, Bot, Send, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ServiceCreateDialog } from '@/components/services/service-create-dialog'
import { runAllServiceDistributionsAction } from '@/actions/service-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ServicesPageContentProps {
    services: any[]
    people: any[]
}

export function ServicesPageContent({ services, people }: ServicesPageContentProps) {
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
    const [isDistributing, setIsDistributing] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const router = useRouter()

    // Sort services by price (highest first) for tab order
    const sortedServices = [...services].sort((a, b) => (b.price || 0) - (a.price || 0))

    const handleDistributeAll = async () => {
        setIsDistributing(true)
        try {
            const result = await runAllServiceDistributionsAction()
            if (result.failed > 0) {
                toast.warning(`Completed with issues. Success: ${result.success}, Failed: ${result.failed}`)
            } else {
                toast.success(`Successfully distributed ${result.success} services`)
            }
            router.refresh()
        } catch (error) {
            toast.error('Failed to run distribution')
        } finally {
            setIsDistributing(false)
        }
    }

    const handleTestBot = async () => {
        setIsTesting(true)
        try {
            const result = await runAllServiceDistributionsAction()
            const toastId = toast.info('Test Bot Results', {
                description: `Success: ${result.success} | Failed: ${result.failed} | Skipped: ${result.skipped}`,
                duration: Infinity,
                action: {
                    label: 'Dismiss',
                    onClick: () => toast.dismiss(toastId),
                },
            })
            router.refresh()
        } catch (error) {
            toast.error('Test bot failed')
        } finally {
            setIsTesting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Service Table/Cards */}
            <section>
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
            </section>

            {/* Tabbed Transactions */}
            <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
                <Tabs value={selectedServiceId || 'all'} onValueChange={(val) => setSelectedServiceId(val === 'all' ? null : val)} className="flex flex-col h-full">
                    <div className="border-b border-slate-200 px-6 pt-4 pb-2 flex-shrink-0">
                        <div className="flex items-center justify-between gap-4">
                            <TabsList className="h-auto bg-transparent border-0 p-0 gap-6 flex items-center flex-wrap">
                                <TabsTrigger
                                    value="all"
                                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-500 data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 border border-slate-200 rounded-lg px-4 py-2 transition-all hover:bg-slate-50"
                                >
                                    <Globe className="h-4 w-4 mr-2" />
                                    All Services
                                </TabsTrigger>
                                {sortedServices.map((service) => (
                                    <TabsTrigger
                                        key={service.id}
                                        value={service.id}
                                        className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-500 data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 border border-slate-200 rounded-lg px-4 py-2 transition-all hover:bg-slate-50"
                                    >
                                        {service.shop?.image_url && (
                                            <img
                                                src={service.shop.image_url}
                                                alt={service.name}
                                                className="h-4 w-4 mr-2 rounded-sm"
                                            />
                                        )}
                                        {service.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleTestBot}
                                    disabled={isTesting}
                                    size="sm"
                                    variant="outline"
                                    className="border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-lg transition-all"
                                >
                                    <Bot className="h-4 w-4 mr-2" />
                                    {isTesting ? 'Testing...' : 'Test Bot'}
                                </Button>
                                <Button
                                    onClick={handleDistributeAll}
                                    disabled={isDistributing}
                                    size="sm"
                                    variant="outline"
                                    className="border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 rounded-lg transition-all"
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    {isDistributing ? 'Running...' : 'Distribute All'}
                                </Button>
                                <ServiceCreateDialog
                                    trigger={
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-slate-200 text-slate-600 hover:bg-slate-700 hover:text-white hover:border-slate-700 rounded-lg transition-all"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            New Service
                                        </Button>
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <TabsContent value="all" className="p-6 mt-0 h-full">
                            <ServiceTransactionsTable
                                serviceId={null}
                                serviceName="All Services"
                            />
                        </TabsContent>

                        {sortedServices.map((service) => (
                            <TabsContent key={service.id} value={service.id} className="p-6 mt-0 h-full">
                                <ServiceTransactionsTable
                                    serviceId={service.id}
                                    serviceName={service.name}
                                />
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </section>
        </div>
    )
}
