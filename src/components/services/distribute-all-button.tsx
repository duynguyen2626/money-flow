'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'
import { runAllServiceDistributionsAction } from '@/actions/service-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function DistributeAllButton() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleRunAll = async () => {
        try {
            setIsLoading(true)
            const result = await runAllServiceDistributionsAction()

            if (result.failed > 0) {
                toast.warning(`Completed with issues. Success: ${result.success}, Failed: ${result.failed}`)
            } else {
                toast.success(`Successfully distributed ${result.success} services`)
            }

            router.refresh()
        } catch (error) {
            console.error('Error running distribution:', error)
            toast.error('Failed to run distribution')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            variant="default"
            onClick={handleRunAll}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
            <Zap className={`mr-2 h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
            {isLoading ? 'Running...' : 'Run All Auto-Distribution'}
        </Button>
    )
}
