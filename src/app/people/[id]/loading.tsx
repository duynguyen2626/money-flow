import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header Skeleton Mimic */}
            <div className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse" />
                        <div className="space-y-2">
                            <div className="w-32 h-6 bg-slate-100 animate-pulse rounded" />
                            <div className="w-24 h-4 bg-slate-100 animate-pulse rounded" />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-40 h-16 bg-slate-100 animate-pulse rounded-xl" />
                        <div className="w-40 h-16 bg-slate-100 animate-pulse rounded-xl" />
                    </div>
                </div>
            </div>

            {/* Content Area Loading */}
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                        <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse -z-10" />
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-black text-slate-900 tracking-tight">Updating Period</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Fetching financial data from BE...</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
