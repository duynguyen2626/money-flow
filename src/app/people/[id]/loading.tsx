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

            {/* Content Area Loading Skeleton */}
            <div className="flex-1 px-8 py-6 space-y-6">
                {/* Control Bar Skeleton */}
                <div className="h-14 bg-white border border-slate-200 rounded-xl flex items-center px-4 animate-pulse">
                    <div className="flex gap-3">
                        <div className="w-24 h-8 bg-slate-100 rounded-lg" />
                        <div className="w-24 h-8 bg-slate-100 rounded-lg" />
                        <div className="w-40 h-8 bg-slate-100 rounded-lg" />
                    </div>
                </div>

                {/* Table Header Skeleton */}
                <div className="space-y-3">
                    <div className="flex gap-4 border-b border-slate-200 pb-3">
                        <div className="w-24 h-4 bg-slate-200/60 rounded animate-pulse" />
                        <div className="w-full h-4 bg-slate-200/60 rounded animate-pulse" />
                        <div className="w-32 h-4 bg-slate-200/60 rounded animate-pulse" />
                    </div>
                    {/* Table Rows Skeleton */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-4 border-b border-slate-100 py-4 opacity-50" style={{ opacity: 1 - (i * 0.15) }}>
                            <div className="w-24 h-6 bg-slate-100 rounded animate-pulse" />
                            <div className="w-full h-6 bg-slate-100 rounded animate-pulse" />
                            <div className="w-32 h-6 bg-slate-100 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Overlaid Center Loader */}
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center pt-32">
                <div className="flex flex-col items-center gap-4 bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/50">
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                        <div className="absolute inset-0 blur-2xl bg-indigo-500/30 animate-pulse -z-10" />
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <p className="text-sm font-black text-slate-900 tracking-tight">Syncing details</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Preparing financial history...</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
