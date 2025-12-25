
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from "lucide-react"

interface TableShellFooterProps {
    pageSize: number
    onPageSizeChange: (size: number) => void
    currentPage: number
    onPageChange: (page: number) => void
    totalPages: number
    fontSize: number
    onFontSizeChange: (size: number) => void
    onResetView: () => void
}

export function TableShellFooter({
    pageSize,
    onPageSizeChange,
    currentPage,
    onPageChange,
    totalPages,
    fontSize,
    onFontSizeChange,
    onResetView,
}: TableShellFooterProps) {
    return (
        <div className="flex-none bg-white border-t border-slate-200 p-3 pb-6 lg:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-30 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">

            {/* Left: Items per Page */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap hidden sm:inline">Rows per page</span>
                <select
                    className="h-8 w-16 rounded-md border border-slate-200 text-xs font-semibold focus:border-blue-500 focus:outline-none bg-white"
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                    {[10, 20, 50, 100, 200, 500].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>

            {/* Center: Pagination */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-sm font-medium whitespace-nowrap">
                    Page {currentPage} <span className="text-slate-400">/ {totalPages}</span>
                </div>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Font Size & Reset - Mobile Optimized */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                    <button
                        onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
                        className="rounded p-1 hover:bg-slate-200 disabled:opacity-50"
                        disabled={fontSize <= 10}
                    >
                        <Minus className="h-3 w-3 text-slate-600" />
                    </button>
                    <span className="text-[10px] font-bold w-6 text-center">{fontSize}</span>
                    <button
                        onClick={() => onFontSizeChange(Math.min(20, fontSize + 1))}
                        className="rounded p-1 hover:bg-slate-200 disabled:opacity-50"
                        disabled={fontSize >= 20}
                    >
                        <Plus className="h-3 w-3 text-slate-600" />
                    </button>
                </div>

                <button
                    onClick={onResetView}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                    title="Reset View"
                >
                    <RotateCcw className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
