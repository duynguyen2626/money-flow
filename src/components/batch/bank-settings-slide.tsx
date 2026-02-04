'use client'

import { useState } from 'react'
import { Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BatchSettingsPage } from './batch-settings-page'

export function BankSettingsSlideTrigger() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button variant="outline" size="lg" onClick={() => setOpen(true)}>
                <Settings className="mr-2 h-5 w-5" />
                Settings
            </Button>

            {open && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
                    onClick={() => setOpen(false)}
                />
            )}

            <div
                className={`fixed right-0 top-0 h-full w-[720px] max-w-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-slate-50 to-white">
                    <h2 className="text-lg font-semibold text-slate-900">Batch Settings</h2>
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <BatchSettingsPage hideHeader />
                </div>
            </div>
        </>
    )
}
