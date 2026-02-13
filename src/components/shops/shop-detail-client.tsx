"use client"

import { useState, useMemo, useTransition, useEffect } from "react"
import { useBreadcrumbs } from "@/context/breadcrumb-context"
import { usePathname } from "next/navigation"
import { Archive, ChevronLeft, Search, Loader2, Plus, Store, Copy } from "lucide-react"
import { Suspense } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { bulkMoveToCategory } from "@/actions/transaction-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { UnifiedTransactionTable } from "@/components/moneyflow/unified-transaction-table"
import { TransactionSlideV2 } from "@/components/transaction/slide-v2/transaction-slide-v2"
import { Shop, TransactionWithDetails, Category, Account, Person } from "@/types/moneyflow.types"
import Link from "next/link"

interface ShopDetailClientProps {
    shop: Shop
    transactions: TransactionWithDetails[]
    allShops: Shop[]
    allCategories: Category[]
    accounts: Account[]
    people: Person[]
}

export function ShopDetailClient({ shop, transactions, allShops, allCategories, accounts, people }: ShopDetailClientProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isMoving, setIsMoving] = useState(false)
    const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const pathname = usePathname()
    const { setCustomName } = useBreadcrumbs()

    useEffect(() => {
        if (shop.is_archived) {
            setCustomName(pathname, "Archived Shop")
        } else {
            setCustomName(pathname, shop.name)
        }
    }, [shop.is_archived, shop.name, pathname, setCustomName])

    const handleSelectionChange = (ids: Set<string>) => {
        setSelectedIds(ids)
    }

    const handleBulkMove = async (targetCategoryId: string) => {
        if (selectedIds.size === 0) return

        setIsMoving(true)
        const ids = Array.from(selectedIds)

        try {
            const result = await bulkMoveToCategory(ids, targetCategoryId)
            if (result.success) {
                toast.success(`Moved ${ids.length} transactions to new category`)
                setSelectedIds(new Set())
                startTransition(() => {
                    router.refresh()
                })
            } else {
                toast.error(result.error || "Failed to move transactions")
            }
        } catch (error) {
            toast.error("An error occurred while moving transactions")
        } finally {
            setIsMoving(false)
        }
    }

    const copyId = () => {
        navigator.clipboard.writeText(shop.id)
        toast.success("Shop ID copied")
    }

    const initialDataForNewTxn = useMemo(() => ({
        shop_id: shop.id,
        category_id: shop.default_category_id,
        occurred_at: new Date(),
        type: 'expense' as const
    }), [shop])

    return (
        <div className="w-full min-h-screen bg-slate-50/30 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
                <div className="max-w-[1800px] mx-auto flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/categories?tab=shops">
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                            </Link>

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                                    {shop.image_url ? (
                                        <img src={shop.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Store className="h-6 w-6 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">{shop.name}</h1>
                                        {shop.is_archived && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-100 border border-orange-200 text-orange-700 text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                <Archive className="h-3 w-3" /> Archived
                                            </div>
                                        )}
                                        <button onClick={copyId} className="p-1 text-slate-300 hover:text-blue-500 transition-colors">
                                            <Copy className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Merchant Detail</span>
                                        <span className="text-[10px] font-mono text-slate-300">{shop.id}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bulk Actions & Search */}
                        <div className="flex items-center gap-3">
                            {selectedIds.size > 0 && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 mr-2">{selectedIds.size} selected</span>
                                    <div className="w-60">
                                        <Select
                                            items={allCategories
                                                .map(c => ({ value: c.id, label: c.name }))
                                            }
                                            placeholder="Change category..."
                                            onValueChange={(val) => val && handleBulkMove(val)}
                                            disabled={isMoving}
                                            className="h-9 bg-slate-50 border-slate-200 text-xs font-bold"
                                        />
                                    </div>
                                    <div className="w-px h-6 bg-slate-200 mx-2" />
                                </div>
                            )}

                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search transactions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg text-sm"
                                />
                            </div>

                            <Button
                                onClick={() => setIsAddTransactionOpen(true)}
                                className="h-9 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.1em] text-[10px] px-4 rounded-lg shadow-sm active:scale-95 transition-all shrink-0"
                            >
                                <Plus className="mr-1.5 h-3.5 w-3.5 stroke-[3px]" />
                                Add Txn
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-hidden">
                <div className="max-w-[1800px] mx-auto w-full h-full flex flex-col">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex-1 overflow-hidden flex flex-col relative">
                        {(isMoving || isPending) && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px] transition-all duration-300">
                                <div className="flex flex-col items-center gap-3 scale-110">
                                    <div className="relative">
                                        <div className="h-10 w-10 rounded-full border-2 border-slate-100 border-t-blue-600 animate-spin" />
                                        <Loader2 className="h-5 w-5 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] animate-pulse">Refreshing...</span>
                                </div>
                            </div>
                        )}
                        <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>}>
                            <UnifiedTransactionTable
                                transactions={transactions}
                                hiddenColumns={['shop']}
                                searchQuery={searchQuery}
                                selectedTxnIds={selectedIds}
                                onSelectionChange={handleSelectionChange}
                            />
                        </Suspense>
                    </div>
                </div>
            </div>

            <TransactionSlideV2
                open={isAddTransactionOpen}
                onOpenChange={setIsAddTransactionOpen}
                initialData={initialDataForNewTxn}
                accounts={accounts}
                categories={allCategories}
                people={people}
                shops={allShops}
                onSuccess={() => {
                    setIsAddTransactionOpen(false)
                    startTransition(() => {
                        router.refresh()
                    })
                }}
            />
        </div>
    )
}
