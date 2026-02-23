'use client'

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { BatchMasterManager } from '@/components/batch/BatchMasterManager'
import { Sparkles } from 'lucide-react'

interface BatchMasterSlideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    bankType: 'MBB' | 'VIB'
    accounts: any[]
    bankMappings: any[]
}

export function BatchMasterSlide({
    open,
    onOpenChange,
    bankType,
    accounts,
    bankMappings
}: BatchMasterSlideProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-4xl overflow-y-auto bg-slate-50 p-0">
                <SheetHeader className="p-6 pb-4 border-b bg-white top-0 sticky z-10 shadow-sm">
                    <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Master Template Checklist - {bankType}
                    </SheetTitle>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Global Recurring Payment Targets
                    </p>
                </SheetHeader>
                <div className="p-6">
                    <BatchMasterManager
                        bankType={bankType}
                        accounts={accounts}
                        bankMappings={bankMappings}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
