import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useUnsavedChanges(isDirty: boolean) {
    const router = useRouter()

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault()
                e.returnValue = ''
                return ''
            }
        }

        if (isDirty) {
            window.addEventListener('beforeunload', handleBeforeUnload)
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [isDirty])
}
