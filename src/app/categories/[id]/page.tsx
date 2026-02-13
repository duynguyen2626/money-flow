import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCategoryById } from "@/services/category.service"
import { loadTransactions } from "@/services/transaction.service"
import { UnifiedTransactionTable } from "@/components/moneyflow/unified-transaction-table"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface CategoryDetailsPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CategoryDetailsPage({ params }: CategoryDetailsPageProps) {
    const { id } = await params
    const category = await getCategoryById(id)

    if (!category) {
        notFound()
    }

    const transactions = await loadTransactions({
        categoryId: id,
        limit: 100, // Load recent 100 transactions initially
    })

    return (
        <div className="w-full min-h-screen bg-slate-50/30 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-6 sticky top-0 z-20">
                <div className="max-w-[1800px] mx-auto">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/categories">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 -ml-2">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 text-2xl">
                                {category.image_url ? (
                                    <img src={category.image_url} className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <span>{category.icon || "📁"}</span>
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{category.name}</h1>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">{category.id.split('-')[0]}</span>
                                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold uppercase text-slate-500 tracking-wider border border-slate-200">
                                        {category.type}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-6 overflow-hidden flex flex-col">
                <div className="max-w-[1800px] mx-auto w-full h-full flex flex-col">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex-1 overflow-hidden flex flex-col">
                        <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>}>
                            <UnifiedTransactionTable
                                transactions={transactions}
                            />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    )
}
