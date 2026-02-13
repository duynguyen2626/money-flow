"use client"

import React, { useState } from 'react'
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
import { Edit2, Store, ArrowUpDown, Archive, ArchiveRestore, X, Copy, ExternalLink, TrendingDown, TrendingUp, ArrowRightLeft } from "lucide-react"
import { CustomTooltip } from "@/components/ui/custom-tooltip"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ShopTableProps {
    shops: Shop[]
    categories: Category[]
    onEdit: (shop: Shop) => void
    searchQuery: string
    categoryFilter?: string
    isArchived?: boolean
    onArchive?: (shop: Shop) => void
    onDelete?: (shop: Shop) => void
    selectedIds?: Set<string>
    onSelect?: (id: string) => void
    onSelectAll?: (ids: string[]) => void
}

type SortKey = 'name' | 'category' | 'type';
type SortDirection = 'asc' | 'desc';

export function ShopTable({
    shops,
    categories,
    onEdit,
    searchQuery,
    categoryFilter = "all",
    isArchived = false,
    onArchive,
    onDelete,
    selectedIds = new Set(),
    onSelect,
    onSelectAll
}: ShopTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'type', direction: 'asc' });

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredShops = shops.filter(shop => {
        const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase())

        // Archive Filter
        if (!!shop.is_archived !== !!isArchived) {
            return false
        }

        let matchesCategory = true
        if (categoryFilter === "none") {
            matchesCategory = !shop.default_category_id
        } else if (categoryFilter !== "all") {
            matchesCategory = shop.default_category_id === categoryFilter
        }

        return matchesSearch && matchesCategory
    }).sort((a, b) => {
        const { key, direction } = sortConfig;
        const multiplier = direction === 'asc' ? 1 : -1;

        if (key === 'category') {
            const catA = categories.find(c => c.id === a.default_category_id)?.name || '';
            const catB = categories.find(c => c.id === b.default_category_id)?.name || '';
            return catA.localeCompare(catB) * multiplier;
        }

        if (key === 'type') {
            const catA = categories.find(c => c.id === a.default_category_id)?.type || 'z';
            const catB = categories.find(c => c.id === b.default_category_id)?.type || 'z';
            return catA.localeCompare(catB) * multiplier;
        }

        if (key === 'name') {
            return a.name.localeCompare(b.name) * multiplier;
        }

        return 0;
    });

    const copyToClipboard = (text: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        toast.success("Shop ID copied to clipboard");
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        return <ArrowUpDown className={cn(
            "ml-1 h-3 w-3 transition-colors",
            sortConfig.key === colKey ? "text-blue-600 opacity-100" : "text-slate-300 opacity-0 group-hover:opacity-50"
        )} />
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm w-full h-[calc(100vh-140px)] flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md shadow-sm">
                        <TableRow className="hover:bg-transparent border-slate-100 uppercase text-[10px] font-black text-slate-500 tracking-wider">
                            <TableHead className="w-10 px-4">
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={filteredShops.length > 0 && selectedIds.size === filteredShops.length}
                                        onChange={() => onSelectAll?.(filteredShops.map(s => s.id))}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="w-[350px] h-10 px-4 cursor-pointer group select-none hover:text-slate-800 transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center">Shop / Merchant <SortIcon colKey="name" /></div>
                            </TableHead>
                            <TableHead className="h-10 px-4 cursor-pointer group select-none hover:text-slate-800 transition-colors" onClick={() => handleSort('category')}>
                                <div className="flex items-center">Default Category <SortIcon colKey="category" /></div>
                            </TableHead>
                            <TableHead className="w-[150px] h-10 px-4 cursor-pointer group select-none hover:text-slate-800 transition-colors" onClick={() => handleSort('type')}>
                                <div className="flex items-center">Type <SortIcon colKey="type" /></div>
                            </TableHead>
                            <TableHead className="w-[120px] text-right h-10">Action</TableHead>
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
                                    <TableRow key={shop.id} className={cn(
                                        "group hover:bg-slate-50/80 transition-colors border-slate-100",
                                        selectedIds.has(shop.id) && "bg-blue-50/50 hover:bg-blue-50/80"
                                    )}>
                                        <TableCell className="px-4 py-3 w-10">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(shop.id)}
                                                    onChange={() => onSelect?.(shop.id)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100 border border-slate-200">
                                                    {shop.image_url ? (
                                                        <img src={shop.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Store className="h-4 w-4 text-slate-400" />
                                                    )}
                                                </div>
                                                <CustomTooltip
                                                    content={
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-bold">{shop.name}</span>
                                                            <span className="text-xs text-slate-400 font-mono">{shop.id}</span>
                                                        </div>
                                                    }
                                                    side="right"
                                                >
                                                    <div className="group/link relative flex items-center gap-2 max-w-[250px]">
                                                        <div className="flex flex-col min-w-0">
                                                            <Link
                                                                href={`/shops/${shop.id}`}
                                                                target="_blank"
                                                                className="font-black text-slate-900 text-[13px] tracking-tight truncate hover:text-blue-600 transition-colors uppercase group-hover:underline flex items-center gap-1.5"
                                                            >
                                                                {shop.name}
                                                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                                                            </Link>
                                                            <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider truncate flex items-center gap-1">
                                                                {shop.id.slice(0, 8)}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => copyToClipboard(shop.id, e)}
                                                            className="opacity-0 group-hover/link:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                            title="Copy ID"
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </CustomTooltip>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            {defaultCat ? (
                                                <div className="flex items-center gap-3 opacity-90">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200">
                                                        {defaultCat.image_url ? (
                                                            <img src={defaultCat.image_url} alt="" className="w-full h-full object-contain p-1" />
                                                        ) : (
                                                            <span className="text-sm font-black text-slate-300 uppercase">{defaultCat.icon || defaultCat.name[0]}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{defaultCat.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-300 italic font-medium">Uncategorized</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            {defaultCat ? (
                                                <div className={cn(
                                                    "flex items-center gap-2 px-2.5 py-1 rounded-md w-fit border shadow-sm",
                                                    defaultCat.type === 'expense' ? "bg-rose-50 text-rose-700 border-rose-100" :
                                                        defaultCat.type === 'income' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                            "bg-blue-50 text-blue-700 border-blue-100"
                                                )}>
                                                    {defaultCat.type === 'expense' && <TrendingDown className="h-3.5 w-3.5" />}
                                                    {defaultCat.type === 'income' && <TrendingUp className="h-3.5 w-3.5" />}
                                                    {defaultCat.type === 'transfer' && <ArrowRightLeft className="h-3.5 w-3.5" />}
                                                    <span className="text-[10px] font-black uppercase tracking-wider">{defaultCat.type}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-300 italic font-medium">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <CustomTooltip content="Edit Shop">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onEdit(shop)}
                                                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm border border-transparent hover:border-blue-100 rounded-lg"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </CustomTooltip>

                                                {isArchived ? (
                                                    <>
                                                        <CustomTooltip content="Unarchive Shop">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => onArchive?.(shop)}
                                                                className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm border border-transparent hover:border-emerald-100 rounded-lg"
                                                            >
                                                                <ArchiveRestore className="h-4 w-4" />
                                                            </Button>
                                                        </CustomTooltip>
                                                        <CustomTooltip content="Delete Shop">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => onDelete?.(shop)}
                                                                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm border border-transparent hover:border-rose-100 rounded-lg"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </CustomTooltip>
                                                    </>
                                                ) : (
                                                    <CustomTooltip content="Archive Shop">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => onArchive?.(shop)}
                                                            className="h-8 w-8 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all shadow-sm border border-transparent hover:border-orange-100 rounded-lg"
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                        </Button>
                                                    </CustomTooltip>
                                                )}
                                            </div>
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
