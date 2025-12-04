"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { distributeAllServicesAction } from "@/actions/service-actions"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"

export function DistributeAllButton() {
    const [isLoading, setIsLoading] = useState(false)

    const handleDistributeAll = async () => {
        if (!confirm("Are you sure you want to distribute ALL active services? This will create transactions for the current month.")) {
            return
        }

        setIsLoading(true)
        try {
            const result = await distributeAllServicesAction()

            if (!result.success || !result.results) {
                toast.error(`Failed to distribute services: ${result.error || 'Unknown error'}`)
                return
            }

            const successCount = result.results.filter((r: any) => r.status === 'success').length
            const errorCount = result.results.filter((r: any) => r.status === 'error').length

            if (errorCount === 0) {
                toast.success(`Successfully distributed ${successCount} services.`)
            } else {
                toast.warning(`Distributed ${successCount} services. Failed: ${errorCount}. Check console for details.`)
                console.error('Distribute All Errors:', result.results)
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to distribute services.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            variant="default"
            onClick={handleDistributeAll}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Distributing...
                </>
            ) : (
                <>
                    <Send className="mr-2 h-4 w-4" />
                    Distribute All
                </>
            )}
        </Button>
    )
}
