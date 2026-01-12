'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Cloud, Edit, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ServiceDetailsSheet } from './service-details-sheet'
import { distributeServiceAction } from '@/actions/service-actions'
import { toast } from 'sonner'

export function ServiceTable({ services, people }: { services: any[], people: any[] }) {
    const [selectedService, setSelectedService] = useState<any>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isDistributing, setIsDistributing] = useState<string | null>(null)

    const handleRowClick = (service: any) => {
        setSelectedService(service)
        setIsSheetOpen(true)
    }

    const handleDistribute = async (e: React.MouseEvent, serviceId: string) => {
        e.stopPropagation()
        setIsDistributing(serviceId)
        try {
            const result = await distributeServiceAction(serviceId)
            if (result.success) {
                toast.success('Distributed successfully')
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Failed to distribute')
        } finally {
            setIsDistributing(null)
        }
    }

    return (
        <>
            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[300px]">Service</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Cycle</TableHead>
                            <TableHead>Members</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {services.map((service) => {
                            const members = service.service_members || []
                            const totalSlots = members.reduce((sum: number, m: any) => sum + (m.slots || 0), 0)

                            return (
                                <TableRow
                                    key={service.id}
                                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => handleRowClick(service)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-none bg-blue-50 flex items-center justify-center text-blue-600">
                                                {service.shop?.image_url ? (
                                                    <img src={service.shop.image_url} alt="" className="h-10 w-10 rounded-none object-cover" />
                                                ) : (
                                                    <Cloud className="h-6 w-6" />
                                                )}
                                            </div>
                                            <span className="font-semibold text-slate-900">{service.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">
                                        {service.price?.toLocaleString()} đ
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        Next bill: {service.due_day || 1} Monthly
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex -space-x-2" title={members.map((m: any) => `${m.profile.name} (${m.slots} slot${m.slots > 1 ? 's' : ''})`).join(', ')}>
                                            {members.slice(0, 3).map((m: any) => (
                                                <div key={m.id} className="h-8 w-8 rounded-none border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                                    {m.profile.image_url ? (
                                                        <img src={m.profile.image_url} alt={m.profile.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        m.profile.name.substring(0, 1).toUpperCase()
                                                    )}
                                                </div>
                                            ))}
                                            {members.length > 3 && (
                                                <div className="h-8 w-8 rounded-none border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                                    +{members.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={service.is_active ? 'default' : 'secondary'} className="rounded-none">
                                            {service.is_active ? 'Active' : 'Paused'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-1 rounded-lg"
                                                onClick={(e) => handleDistribute(e, service.id)}
                                                disabled={isDistributing === service.id}
                                            >
                                                <Send className="h-3 w-3" />
                                                Distribute
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                <Edit className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {selectedService && (
                <ServiceDetailsSheet
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                    service={selectedService}
                    members={selectedService.service_members}
                    allPeople={people}
                />
            )}
        </>
    )
}
