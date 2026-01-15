import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface BatchListProps {
    batches: any[]
    mode: 'processing' | 'done'
    accounts: any[]
    webhookLinks: any[]
}

export function BatchList({ batches, mode }: BatchListProps) {
    if (batches.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                <p>No batches found</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {batches.map((batch) => (
                <Link key={batch.id} href={`/batch/detail/${batch.id}`}>
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900">
                                    {batch.name}
                                </h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    {batch.total_items || 0} items • {batch.confirmed_items || 0} confirmed
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {batch.created_at && formatDistanceToNow(new Date(batch.created_at), { addSuffix: true })}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant={mode === 'done' ? 'default' : 'secondary'}>
                                    {batch.status || 'pending'}
                                </Badge>
                                {batch.total_items > 0 && (
                                    <span className="text-xs text-slate-600">
                                        {Math.round((batch.confirmed_items / batch.total_items) * 100)}% done
                                    </span>
                                )}
                            </div>
                        </div>
                    </Card>
                </Link>
            ))}
        </div>
    )
}
