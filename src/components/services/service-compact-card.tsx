'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cloud } from 'lucide-react'
import { useState } from 'react'
import { ServiceDetailsSheet } from './service-details-sheet'

export function ServiceCompactCard({ service, people }: { service: any, people: any[] }) {
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    const members = service.service_members || []
    const totalSlots = members.reduce((sum: number, m: any) => sum + (m.slots || 0), 0)

    return (
        <>
            <Card
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors border-slate-200 rounded-none shadow-none"
                onClick={() => setIsSheetOpen(true)}
            >
                <div className="h-12 w-12 rounded-none bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    {service.shop?.image_url ? (
                        <img src={service.shop.image_url} alt="" className="h-12 w-12 rounded-none object-cover" />
                    ) : (
                        <Cloud className="h-6 w-6" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900 truncate">{service.name}</h3>
                        <span className="font-bold text-green-600 shrink-0">{service.price?.toLocaleString()} đ</span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        <div className="flex -space-x-1.5 overflow-hidden">
                            {members.slice(0, 4).map((m: any) => (
                                <div key={m.id} className="h-6 w-6 rounded-none border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold overflow-hidden">
                                    {m.profile.image_url ? (
                                        <img src={m.profile.image_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        m.profile.name.substring(0, 1).toUpperCase()
                                    )}
                                </div>
                            ))}
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5 rounded-none border-slate-200 text-slate-500">
                            Due: {service.due_day || 1}
                        </Badge>
                    </div>
                </div>
            </Card>

            <ServiceDetailsSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                service={service}
                members={service.service_members}
                allPeople={people}
            />
        </>
    )
}
