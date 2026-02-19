import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsPopoverProps {
    originalLend: number
    cashback: number
    netLend: number
    repay: number
    remains: number
    paidRollover?: number
    receiveRollover?: number
    children?: React.ReactNode
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function StatsPopover({
    originalLend,
    cashback,
    netLend,
    repay,
    remains,
    paidRollover,
    receiveRollover,
    children
}: StatsPopoverProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                {children || (
                    <button className="flex items-center justify-center h-6 w-6 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors ml-2">
                        <FileText className="h-3.5 w-3.5" />
                    </button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-4" align="center" side="bottom">
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <h4 className="font-bold text-sm text-slate-900">Balance Calculation</h4>
                </div>

                <div className="flex items-center justify-between text-xs mb-2 text-slate-500">
                    <span>Flow logic</span>
                    <span>Values</span>
                </div>

                <div className="space-y-3 relative">
                    {/* Flow Line */}
                    <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-slate-100 -z-10" />

                    {/* Step 1: Original */}
                    <div className="flex items-center justify-between bg-white border border-slate-100 p-2 rounded-lg shadow-sm z-10">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-slate-400" />
                            <span className="text-xs font-medium text-slate-600">Original Spend</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-slate-900">
                            {numberFormatter.format(originalLend)}
                        </span>
                    </div>

                    {/* Arrow Down */}
                    <div className="flex justify-center -my-1">
                        <ArrowRight className="h-3 w-3 text-slate-300 rotate-90" />
                    </div>

                    {/* Step 2: Cashback Deduction */}
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-100 p-2 rounded-lg z-10">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-xs font-medium text-amber-700">Less Cashback</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-amber-700">
                            -{numberFormatter.format(cashback)}
                        </span>
                    </div>

                    {/* Arrow Down */}
                    <div className="flex justify-center -my-1">
                        <ArrowRight className="h-3 w-3 text-slate-300 rotate-90" />
                    </div>

                    {/* Step 3: Net Lend */}
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2 rounded-lg z-10">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <span className="text-xs font-medium text-blue-700">Net Lend</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-blue-700">
                            {numberFormatter.format(netLend)}
                        </span>
                    </div>

                    {/* Step 4: Repay Deduction */}
                    <div className="flex flex-col gap-2 bg-emerald-50 border border-emerald-100 p-2 rounded-lg z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-medium text-emerald-700">Total Repay</span>
                            </div>
                            <span className="font-mono text-sm font-bold text-emerald-700">
                                -{numberFormatter.format(repay)}
                            </span>
                        </div>
                        {(paidRollover || 0) > 0 && (
                            <div className="flex items-center justify-between pl-4 text-[10px] text-emerald-600/80 italic">
                                <span>incl. Paid Rollover</span>
                                <span>-{numberFormatter.format(paidRollover || 0)}</span>
                            </div>
                        )}
                    </div>

                    {/* Step 5: Receive Rollover (If any) */}
                    {(receiveRollover || 0) > 0 && (
                        <>
                            <div className="flex justify-center -my-1">
                                <ArrowRight className="h-3 w-3 text-slate-300 rotate-90" />
                            </div>
                            <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-slate-400" />
                                        <span className="text-xs font-medium text-slate-600">Opening Balance</span>
                                    </div>
                                    <span className="font-mono text-sm font-bold text-slate-900">
                                        {numberFormatter.format(receiveRollover || 0)}
                                    </span>
                                </div>
                                <div className="pl-4 text-[10px] text-slate-400 italic">
                                    From previous cycle
                                </div>
                            </div>
                        </>
                    )}

                    {/* Divider */}
                    <div className="h-px bg-slate-200 my-2" />

                    {/* Final: Remains */}
                    <div className="flex items-center justify-between bg-rose-50 border border-rose-200 p-3 rounded-lg z-10 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                            <span className="text-sm font-bold text-rose-800">REMAINS</span>
                        </div>
                        <span className="font-mono text-lg font-bold text-rose-600">
                            {numberFormatter.format(remains)}
                        </span>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
