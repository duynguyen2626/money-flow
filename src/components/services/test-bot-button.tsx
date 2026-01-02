'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bot, Loader2 } from 'lucide-react'
import { runAllServiceDistributionsAction } from '@/actions/service-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function TestBotButton() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleTestBot = async () => {
        try {
            setIsLoading(true)
            const result = await runAllServiceDistributionsAction()

            // Persistent Toast (duration: Infinity)
            toast.info('Bot Distribution Result', {
                duration: Infinity,
                description: (
                    <div className="mt-2 space-y-1">
                        <p className="font-bold text-slate-900">Summary:</p>
                        <ul className="text-xs space-y-1 list-disc pl-4">
                            <li>Success: {result.success}</li>
                            <li>Skipped: {result.skipped}</li>
                            <li>Failed: {result.failed}</li>
                        </ul>
                        {result.reports && result.reports.length > 0 && (
                            <>
                                <p className="font-bold text-slate-900 mt-2">Details:</p>
                                <div className="max-h-40 overflow-y-auto pr-2">
                                    {result.reports.map((report: any, idx: number) => (
                                        <div key={idx} className="text-[10px] flex items-center justify-between border-b py-1">
                                            <span className="font-medium">{report.name}</span>
                                            <span className={report.status === 'success' ? 'text-green-600' : 'text-amber-600'}>
                                                {report.status} {report.reason ? `(${report.reason})` : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-4 h-7 text-[10px]"
                            onClick={() => toast.dismiss()}
                        >
                            Dismiss
                        </Button>
                    </div>
                )
            })

            router.refresh()
        } catch (error) {
            console.error('Error running bot:', error)
            toast.error('Failed to run bot')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            onClick={handleTestBot}
            disabled={isLoading}
            variant="outline"
            className="rounded-lg border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 text-blue-700 h-10 px-4"
        >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            Test Bot
        </Button>
    )
}
