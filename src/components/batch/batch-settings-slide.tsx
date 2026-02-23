'use client'

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { BatchSettingsPage } from '@/components/batch/batch-settings-page'
import { Settings } from 'lucide-react'

interface BatchSettingsSlideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function BatchSettingsSlide({
    open,
    onOpenChange
}: BatchSettingsSlideProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-slate-50 p-0">
                <SheetHeader className="p-6 pb-4 border-b bg-white top-0 sticky z-10 shadow-sm">
                    <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                        <Settings className="w-5 h-5 text-indigo-600" />
                        Global Batch Settings
                    </SheetTitle>
                </SheetHeader>
                <div className="p-0 relative">
                    <BatchSettingsPage hideHeader={true} onSuccess={() => onOpenChange(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
