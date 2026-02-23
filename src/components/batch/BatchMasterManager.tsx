'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Edit2, Loader2, AlertCircle, Search } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { deleteBatchMasterItemAction, getBatchMasterItemsAction } from '@/actions/batch-master.actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BatchMasterItemSlide } from './BatchMasterItemSlide'

interface BatchMasterManagerProps {
    bankType: 'MBB' | 'VIB'
    accounts: any[]
    bankMappings: any[]
}

export function BatchMasterManager({ bankType, accounts, bankMappings }: BatchMasterManagerProps) {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isSlideOpen, setIsSlideOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<any | null>(null)

    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        loadItems()
    }, [bankType])

    const filteredItems = items.filter(i => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            i.receiver_name?.toLowerCase().includes(query) ||
            i.bank_name?.toLowerCase().includes(query) ||
            i.bank_number?.toLowerCase().includes(query)
        )
    })

    async function loadItems() {
        setLoading(true)
        try {
            const result = await getBatchMasterItemsAction(bankType)
            if (result.success) {
                setItems(result.data || [])
            }
        } catch (error) {
            console.error('Info: Failed to load master items', error)
        } finally {
            setLoading(false)
        }
    }

    function handleAdd() {
        setSelectedItem(null)
        setIsSlideOpen(true)
    }

    function handleEdit(item: any) {
        setSelectedItem(item)
        setIsSlideOpen(true)
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this master item?')) return

        try {
            const result = await deleteBatchMasterItemAction(id)
            if (result.success) {
                toast.success('Item removed')
                setItems(prev => prev.filter(i => i.id !== id))
            }
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    if (loading) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading master list...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Master List ({bankType})</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Define recurring payment targets for the 12-month grid.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 z-10" />
                        <Button onClick={handleAdd} size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 font-bold text-xs h-10 px-6 pl-10 rounded-xl">
                            ADD TARGET
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search master targets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-indigo-500"
                    />
                </div>
            </div>

            <Tabs defaultValue="before" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 w-full md:w-auto shadow-sm">
                    <TabsTrigger
                        value="before"
                        className="rounded-xl px-12 h-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-black text-xs uppercase tracking-widest transition-all"
                    >
                        Phase 1: Before
                    </TabsTrigger>
                    <TabsTrigger
                        value="after"
                        className="rounded-xl px-12 h-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-black text-xs uppercase tracking-widest transition-all"
                    >
                        Phase 2: After
                    </TabsTrigger>
                </TabsList>

                {['before', 'after'].map(p => (
                    <TabsContent key={p} value={p} className="mt-6 space-y-6">
                        <div className="space-y-3">
                            {filteredItems.filter(i => i.cutoff_period === p).length === 0 ? (
                                <div className="text-center py-16 border-2 border-dashed rounded-3xl border-slate-100 bg-slate-50/50 col-span-2">
                                    <p className="text-sm font-bold text-slate-400">No items found for this phase.</p>
                                </div>
                            ) : (
                                filteredItems.filter(i => i.cutoff_period === p).map(item => (
                                    <div
                                        key={item.id}
                                        className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-none bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                                {item.accounts?.image_url ? (
                                                    <img src={item.accounts.image_url} alt="" className="w-full h-full object-contain rounded-none" />
                                                ) : (
                                                    <div className="font-black text-[12px] text-slate-400 uppercase tracking-tighter">
                                                        {item.bank_name?.substring(0, 3)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-900 uppercase tracking-tight text-sm">{item.receiver_name}</span>
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-100 text-[9px] font-black px-1.5 h-4 uppercase tracking-wider">
                                                        {item.bank_name}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className="text-[11px] font-bold text-slate-400 tabular-nums">{item.bank_number}</span>
                                                    {item.accounts ? (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600/70">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                                            {item.accounts.name}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500/70">
                                                            <AlertCircle className="h-2.5 w-2.5" /> Missing Account Link
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl" onClick={() => handleEdit(item)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            <BatchMasterItemSlide
                isOpen={isSlideOpen}
                onOpenChange={setIsSlideOpen}
                bankType={bankType}
                accounts={accounts}
                bankMappings={bankMappings}
                item={selectedItem}
                onSuccess={loadItems}
            />
        </div>
    )
}

