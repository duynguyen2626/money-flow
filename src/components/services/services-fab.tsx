'use client'

import { useState } from 'react'
import { Bot, Send, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { runAllServiceDistributionsAction } from '@/actions/service-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ServiceCreateDialog } from './service-create-dialog'

export function ServicesFAB() {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isDistributing, setIsDistributing] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const router = useRouter()

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
        <div
            className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3"
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* New Service */}
            <ServiceCreateDialog
                trigger={
                    <button
                        className={cn(
                            "flex items-center gap-3 rounded-full bg-slate-700 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-slate-800",
                            isExpanded ? "h-12 px-5" : "h-14 w-14 justify-center"
                        )}
                    >
                        <Plus className="h-5 w-5 shrink-0" />
                        {isExpanded && (
                            <span className="whitespace-nowrap text-sm font-semibold">
                                New Service
                            </span>
                        )}
                    </button>
                }
            />

            {/* Distribute All */}
            <button
                onClick={handleDistributeAll}
                disabled={isDistributing}
                className={cn(
                    "flex items-center gap-3 rounded-full bg-purple-600 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-purple-700 disabled:opacity-50",
                    isExpanded ? "h-12 px-5" : "h-14 w-14 justify-center"
                )}
            >
                <Send className="h-5 w-5 shrink-0" />
                {isExpanded && (
                    <span className="whitespace-nowrap text-sm font-semibold">
                        {isDistributing ? 'Running...' : 'Distribute All'}
                    </span>
                )}
            </button>

            {/* Test Bot */}
            <button
                onClick={handleTestBot}
                disabled={isTesting}
                className={cn(
                    "flex items-center gap-3 rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-blue-700 disabled:opacity-50",
                    isExpanded ? "h-12 px-5" : "h-14 w-14 justify-center"
                )}
            >
                <Bot className="h-5 w-5 shrink-0" />
                {isExpanded && (
                    <span className="whitespace-nowrap text-sm font-semibold">
                        {isTesting ? 'Testing...' : 'Test Bot'}
                    </span>
                )}
            </button>
        </div>
    )
}
