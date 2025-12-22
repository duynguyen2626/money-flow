import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Info, X, Copy } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function CashbackGuideModal() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Info Icon with Hover Tooltip */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => setIsOpen(true)}
                            className="inline-flex items-center justify-center rounded-full p-1 text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                            <Info className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                        <p className="text-sm font-semibold">How to configure tiered cashback</p>
                        <p className="text-xs text-slate-300 mt-1">Click to see VPBank Lady example</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Full Guide Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <Info className="h-5 w-5 text-blue-600" />
                                How to Configure Tiered Cashback
                            </DialogTitle>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-full p-1 hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 text-base">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <p className="font-bold text-blue-900 mb-3 text-lg">Example: VPBank Lady Mastercard</p>

                            <div className="space-y-4">
                                <div>
                                    <p className="font-semibold text-slate-800 mb-2">Step 1: Create Level 1 (Premium Tier ≥15M)</p>
                                    <ul className="list-disc list-inside ml-2 text-slate-700 space-y-1">
                                        <li>Name: "Premium (≥15M)"</li>
                                        <li>Min Total Spend: 15,000,000</li>
                                        <li>Default Rate: 0.1% (for "other" categories)</li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-800 mb-2">Step 2: Add Rules to Level 1</p>
                                    <ul className="list-disc list-inside ml-2 text-slate-700 space-y-1">
                                        <li>Rule 1: Insurance → 15%, max 300K</li>
                                        <li>Rule 2: Education → 15%, max 200K</li>
                                        <li>Rule 3: Beauty/Healthcare/Fashion/Entertainment → 15%, max 300K</li>
                                        <li>Rule 4: Supermarket → 5%, max 200K</li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-800 mb-2">Step 3: Create Level 2 (Standard Tier &lt;15M)</p>
                                    <ul className="list-disc list-inside ml-2 text-slate-700 space-y-1">
                                        <li>Name: "Standard (&lt;15M)"</li>
                                        <li>Min Total Spend: 0</li>
                                        <li>Default Rate: 0.1%</li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-800 mb-2">Step 4: Copy Rules from Level 1 to Level 2</p>
                                    <ul className="list-disc list-inside ml-2 text-slate-700 space-y-1">
                                        <li>Click the <Copy className="h-3 w-3 inline" /> icon on each rule in Level 1</li>
                                        <li>Select "Level 2" as target</li>
                                        <li>Choose "Clone All" mode</li>
                                        <li>Manually adjust rates: 15% → 7.5%, 5% → 2.5%</li>
                                        <li>Adjust max rewards: 300K → 150K, 200K → 100K, etc.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-slate-600 bg-slate-50 rounded p-3 border border-slate-200">
                            <p className="font-semibold mb-1">💡 Tip:</p>
                            <p>Use the <Copy className="h-3 w-3 inline" /> "Copy" button on rules to quickly duplicate category selections across levels, then adjust rates and limits as needed.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
