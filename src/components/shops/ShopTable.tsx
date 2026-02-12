"use client"

import React from 'react'
import { Shop, Category } from "@/types/moneyflow.types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit2, Store } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShopTableProps {
    shops: Shop[]
    categories: Category[]
    onEdit: (shop: Shop) => void
    searchQuery: string
}

export function ShopTable({ shops, categories, onEdit, searchQuery }: ShopTableProps) {
    const filteredShops = shops.filter(shop =>
        shop.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm w-full h-[calc(100vh-250px)] flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md shadow-sm">
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="w-[350px] h-12 uppercase text-[11px] font-black text-slate-500 tracking-wider">Shop / Merchant</TableHead>
                            <TableHead className="h-12 uppercase text-[11px] font-black text-slate-500 tracking-wider">Default Category</TableHead>
                            <TableHead className="w-[100px] text-right h-12 uppercase text-[11px] font-black text-slate-500 tracking-wider">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredShops.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-slate-400 text-sm font-medium italic">
                                    No shops found matching your search.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredShops.map((shop) => {
                                const defaultCat = categories.find(c => c.id === shop.default_category_id)
                                return (
                                    <TableRow key={shop.id} className="group hover:bg-slate-50/80 transition-colors border-slate-100">
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100 border border-slate-200">
                                                    {shop.image_url ? (
                                                        <img src={shop.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Store className="h-5 w-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-slate-900 text-sm truncate">{shop.name}</span>
                                                    {shop.image_url && <span className="text-[9px] text-slate-400 font-mono truncate max-w-[200px]">{shop.image_url}</span>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            {defaultCat ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 w-fit">
                                                    <span className="text-sm">{defaultCat.icon || "📁"}</span>
                                                    <span className="text-xs font-semibold text-slate-700">{defaultCat.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic pl-2">None</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(shop)}
                                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
