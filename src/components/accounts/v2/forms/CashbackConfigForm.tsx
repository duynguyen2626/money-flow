"use client"

import React, { useState, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SmartAmountInput } from "@/components/ui/smart-amount-input"
import { Plus, Trash2, Coins, Sparkles, ChevronRight, Check, ChevronsUpDown, X, Infinity, AlertTriangle, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatVietnameseCurrencyText } from "@/lib/number-to-text"
import { Category } from "@/types/moneyflow.types"
import {
    CashbackRulesJson,
    TieredCashbackConfig,
    CashbackCategoryRule,
    CashbackTier
} from "@/types/cashback.types"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    PopoverAnchor,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

function CashbackRuleRow({ rule, categories, onUpdate, onDelete, onOpenCategoryCreator }: {
    rule: CashbackCategoryRule,
    categories: Category[],
    onUpdate: (rule: CashbackCategoryRule) => void,
    onDelete: () => void,
    onOpenCategoryCreator?: (callback?: (newCategoryId: string) => void) => void
}) {
    const [open, setOpen] = useState(false)

    // MF5.5: Support Multiple Categories
    const selectedCategories = useMemo(() =>
        categories.filter(c => rule.cat_ids?.includes(c.id))
        , [categories, rule.cat_ids])

    const removeCategory = (id: string) => {
        const nextIds = (rule.cat_ids || []).filter(catId => catId !== id)
        onUpdate({ ...rule, cat_ids: nextIds })
    }

    return (
        <div className="flex flex-col gap-3 bg-white p-3 border border-slate-200 rounded-xl group hover:border-slate-300 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-100">
            {/* Row 1: Category Picker + Action Button */}
            <div className="flex gap-2">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverAnchor asChild>
                        <div className="flex-1">
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    type="button"
                                    className="w-full justify-between h-10 text-[11px] font-bold border-slate-200 bg-slate-50/50 hover:bg-slate-100 px-3"
                                >
                                    <div className="flex items-center gap-1.5 truncate">
                                        {selectedCategories.length > 0 ? (
                                            <>
                                                <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                                                <span className="truncate text-slate-900 font-extrabold">{selectedCategories.length} Categories Selected</span>
                                            </>
                                        ) : (
                                            <span className="text-slate-400 font-medium whitespace-nowrap italic">Pick Categories & MCCs...</span>
                                        )}
                                    </div>
                                    <ChevronsUpDown className="ml-0.5 h-3.5 w-3.5 shrink-0 opacity-40" />
                                </Button>
                            </PopoverTrigger>
                        </div>
                    </PopoverAnchor>
                    <PopoverContent className="w-[var(--radix-popover-anchor-width)] p-0 shadow-2xl border-slate-200 rounded-xl" align="start">
                        <Command
                            className="rounded-xl overflow-hidden"
                            filter={(value, search) => {
                                const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase()
                                if (normalize(value).includes(normalize(search))) return 1
                                return 0
                            }}
                        >
                            <CommandInput placeholder="Search name or MCC..." className="h-10 text-xs" />
                            <div className="p-1 border-b border-slate-50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    onClick={() => {
                                        setOpen(false)
                                        onOpenCategoryCreator?.((newId: string) => {
                                            const currentIds = rule.cat_ids || []
                                            if (!currentIds.includes(newId)) {
                                                onUpdate({ ...rule, cat_ids: [...currentIds, newId] })
                                            }
                                        })
                                    }}
                                    className="w-full justify-start text-blue-600 font-bold text-xs h-9 px-2 hover:bg-blue-50"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-2" />
                                    <span>Create New Category</span>
                                </Button>
                            </div>
                            <CommandList
                                className="max-h-[300px] overflow-y-auto overscroll-contain pb-1"
                                onWheel={(e) => e.stopPropagation()}
                            >
                                <CommandEmpty className="py-6 text-center text-xs text-slate-400 italic">
                                    No category matching query
                                </CommandEmpty>
                                <CommandGroup heading="Select Multiple">
                                    {categories.map((cat) => (
                                        <CommandItem
                                            key={cat.id}
                                            value={`${cat.name} ${cat.mcc_codes?.join(' ')}`}
                                            onSelect={() => {
                                                const currentIds = rule.cat_ids || []
                                                const nextIds = currentIds.includes(cat.id)
                                                    ? currentIds.filter(id => id !== cat.id)
                                                    : [...currentIds, cat.id]
                                                onUpdate({ ...rule, cat_ids: nextIds })
                                            }}
                                            className="text-xs h-10 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 w-full">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-none flex items-center justify-center flex-shrink-0 transition-all overflow-hidden",
                                                    rule.cat_ids?.includes(cat.id) ? "bg-blue-600 shadow-sm" : "bg-slate-100"
                                                )}>
                                                    {cat.image_url ? (
                                                        <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className={cn(
                                                            "text-[10px] font-bold",
                                                            rule.cat_ids?.includes(cat.id) ? "text-white" : "text-slate-500 opacity-50"
                                                        )}>
                                                            {cat.icon || cat.name[0]}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                                    <span className={cn("truncate font-medium", rule.cat_ids?.includes(cat.id) ? "text-blue-600 font-bold" : "text-slate-600")}>
                                                        {cat.name}
                                                    </span>
                                                    {cat.mcc_codes && cat.mcc_codes.length > 0 && (
                                                        <span className="text-[8px] text-slate-400 font-mono">MCC {cat.mcc_codes.join(', ')}</span>
                                                    )}
                                                </div>
                                                {rule.cat_ids?.includes(cat.id) && (
                                                    <Check className="h-3 w-3 text-blue-600 stroke-[3px]" />
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                            {selectedCategories.length > 0 && (
                                <div className="p-2 border-t border-slate-100 bg-slate-50">
                                    <Button size="sm" type="button" className="w-full h-8 text-[10px] font-black uppercase" onClick={() => setOpen(false)}>
                                        Confirm Selection ({selectedCategories.length})
                                    </Button>
                                </div>
                            )}
                        </Command>
                    </PopoverContent>
                </Popover>

                <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={onDelete}
                    className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Row 2: Category Chips (if any) */}
            {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                    {selectedCategories.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-1.5 bg-white border border-slate-200 pl-1 pr-1.5 py-1 rounded-none shadow-sm animate-in fade-in zoom-in-95 overflow-hidden">
                            <div className="w-5 h-5 rounded-none bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {cat.image_url ? (
                                    <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px]">{cat.icon || "•"}</span>
                                )}
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] font-bold text-slate-700">{cat.name}</span>
                                {cat.mcc_codes && cat.mcc_codes.length > 0 && (
                                    <span className="text-[8px] text-slate-400 font-mono">MCC {cat.mcc_codes[0]}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => removeCategory(cat.id)}
                                className="ml-1 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Row 3: Inputs side by side */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cashback Rate (%)</Label>
                    <SmartAmountInput
                        value={rule.rate}
                        onChange={(val) => {
                            const nextRate = val ?? 0
                            onUpdate({ ...rule, rate: nextRate > 100 ? 100 : nextRate })
                        }}
                        unit="%"
                        allowDecimal
                        hideLabel
                        hideCurrencyText
                        hideClearButton
                        compact
                        placeholder="0 %"
                        className="h-10 text-sm font-black text-center bg-white border-slate-300 focus:border-blue-500 transition-colors"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider text-right block">Limit Cap (VND)</Label>
                    <SmartAmountInput
                        value={rule.max ?? 0}
                        onChange={(val) => onUpdate({ ...rule, max: val || null })}
                        placeholder="Unlimited"
                        hideLabel
                        hideCurrencyText
                        hideClearButton
                        compact
                        className="h-10 text-sm font-bold text-right bg-white border-slate-300 focus:border-blue-500 transition-colors"
                    />
                    <div className="text-[9px] font-bold text-slate-400 text-right uppercase tracking-tighter truncate h-3">
                        {rule.max ? (
                            formatVietnameseCurrencyText(rule.max).map((p, i) => (
                                <React.Fragment key={i}>
                                    <span className="text-rose-600">{p.value}</span>
                                    <span className="text-blue-500 ml-0.5">{p.unit} </span>
                                </React.Fragment>
                            ))
                        ) : (
                            <span className="flex items-center justify-end gap-1">
                                <Infinity className="h-3 w-3" /> Unlimited
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

interface CashbackConfigFormProps {
    cb_type: 'simple' | 'tiered' | 'none'
    cb_base_rate: number
    cb_max_budget: number | null
    cb_is_unlimited: boolean
    cb_rules_json: CashbackRulesJson | null
    cb_cycle_type: 'calendar_month' | 'statement_cycle'
    cb_min_spend: number
    categories: Category[]
    onChange: (updates: {
        cb_type?: 'simple' | 'tiered' | 'none'
        cb_base_rate?: number
        cb_max_budget?: number | null
        cb_is_unlimited?: boolean
        cb_rules_json?: CashbackRulesJson | null
        cb_cycle_type?: 'calendar_month' | 'statement_cycle'
        cb_min_spend?: number
    }) => void
    onOpenCategoryCreator?: (callback?: (newCategoryId: string) => void) => void
}

export function CashbackConfigForm({
    cb_type,
    cb_base_rate,
    cb_max_budget,
    cb_is_unlimited,
    cb_rules_json,
    cb_cycle_type,
    cb_min_spend,
    categories,
    onChange,
    onOpenCategoryCreator,
}: CashbackConfigFormProps) {

    // Internal mapping or normalization
    const simpleRules = useMemo(() => {
        if (cb_type === 'simple' && Array.isArray(cb_rules_json)) {
            return cb_rules_json as CashbackCategoryRule[]
        }
        return []
    }, [cb_type, cb_rules_json])

    const tieredConfig = useMemo(() => {
        if (cb_type === 'tiered' && cb_rules_json && !Array.isArray(cb_rules_json)) {
            return cb_rules_json as TieredCashbackConfig
        }
        return {
            base_rate: cb_base_rate || 0,
            tiers: []
        } as TieredCashbackConfig
    }, [cb_type, cb_rules_json, cb_base_rate])

    // Helpers to update
    const updateSimpleRules = (rules: CashbackCategoryRule[]) => {
        onChange({ cb_rules_json: rules })
    }

    const updateTieredConfig = (config: TieredCashbackConfig) => {
        onChange({ cb_rules_json: config })
    }

    // Summary logic
    const summary = useMemo(() => {
        if (cb_type === 'none') return "Cashback is disabled for this account."
        const cycleText = cb_cycle_type === 'statement_cycle' ? "statement cycle" : "calendar month"
        if (cb_type === 'simple') {
            const ruleCount = simpleRules.length
            return `Standard ${cb_base_rate}% cashback on all spend (${cycleText})${ruleCount > 0 ? `, plus ${ruleCount} special category rules` : ""}.`
        }
        if (cb_type === 'tiered') {
            const tierCount = tieredConfig.tiers.length
            if (tierCount === 0) return `Tiered strategy active with ${tieredConfig.base_rate}% base rate (${cycleText}), but no tiers defined yet.`

            const firstTier = tieredConfig.tiers[0]
            const lastTier = tieredConfig.tiers[tieredConfig.tiers.length - 1]

            if (tierCount === 1) {
                return `Earn ${tieredConfig.base_rate}% base rate. At ${firstTier.min_spend.toLocaleString()} VND spend, special rates apply (${cycleText}).`
            }
            return `Multistage rewards across ${tierCount} tiers (${cycleText}) (from ${firstTier.min_spend.toLocaleString()} to ${lastTier.min_spend.toLocaleString()} VND spend).`
        }
        return ""
    }, [cb_type, cb_base_rate, simpleRules, tieredConfig, cb_cycle_type])

    return (
        <div className="space-y-6">
            {/* Header / Switcher */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-100 p-1.5 rounded-lg">
                            <Coins className="h-4 w-4 text-amber-600" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Reward Strategy</h3>
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg scale-90 origin-right">
                        <button
                            type="button"
                            onClick={() => onChange({ cb_type: 'simple' })}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                cb_type === 'simple' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Simple
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ cb_type: 'tiered' })}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                cb_type === 'tiered' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Tiered
                        </button>
                    </div>
                </div>

                <div className="text-[10px] text-slate-500 font-medium px-1">
                    Chọn "Simple" cho mức cơ bản, "Tiered" cho thẻ có nhiều mức hoàn tiền.
                </div>

                {/* Global Settings (Visible for both Simple & Tiered) */}
                {(cb_type === 'simple' || cb_type === 'tiered') && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/20 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-top-1">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Min Spend to Qualify</Label>
                            <SmartAmountInput
                                value={cb_min_spend}
                                onChange={(val) => onChange({ cb_min_spend: val ?? 0 })}
                                hideLabel
                                compact
                                placeholder="Min Spend..."
                                className="h-9 font-bold bg-white border-slate-300 shadow-sm"
                            />
                            <div className="text-[9px] font-bold text-blue-600/60 truncate h-3">
                                {cb_min_spend > 0 && formatVietnameseCurrencyText(cb_min_spend).map((p, i) => (
                                    <React.Fragment key={i}>
                                        <span className="text-rose-600">{p.value}</span>
                                        <span className="text-blue-500 ml-0.5">{p.unit} </span>
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium mt-1">Tổng chi tiêu tối thiểu trong kỳ để bắt đầu được hoàn tiền.</div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Overall Monthly Cap</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <SmartAmountInput
                                        value={cb_is_unlimited ? 0 : (cb_max_budget ?? 0)}
                                        onChange={(val) => onChange({ cb_max_budget: val, cb_is_unlimited: !val || val === 0 })}
                                        hideLabel
                                        compact
                                        placeholder={cb_is_unlimited ? "Unlimited" : "Max amount"}
                                        className={cn("h-9 font-bold bg-white border-slate-200 shadow-sm", cb_is_unlimited && "text-slate-300")}
                                        disabled={cb_is_unlimited}
                                    />
                                    {cb_is_unlimited && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                                            <Infinity className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => onChange({ cb_is_unlimited: !cb_is_unlimited, cb_max_budget: !cb_is_unlimited ? null : 0 })}
                                    className={cn(
                                        "h-9 px-2 text-[10px] font-black border transition-all",
                                        cb_is_unlimited
                                            ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                                            : "bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-500"
                                    )}
                                >
                                    {cb_is_unlimited ? "INF" : "CAP"}
                                </Button>
                            </div>
                            <div className="text-[9px] font-bold text-blue-600/60 truncate h-3">
                                {!cb_is_unlimited && (cb_max_budget ?? 0) > 0 && formatVietnameseCurrencyText(cb_max_budget ?? 0).map((p, i) => (
                                    <React.Fragment key={i}>
                                        <span className="text-rose-600">{p.value}</span>
                                        <span className="text-blue-500 ml-0.5">{p.unit} </span>
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium mt-1">Hạn mức hoàn tiền tối đa mỗi tháng (nhập 0 ngàn nếu không giới hạn).</div>
                        </div>

                        {/* Unified Calculation Cycle Selection */}
                        <div className="col-span-2 pt-4 mt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-50 p-1 rounded-lg">
                                            <Calendar className="h-4 w-4 text-blue-500" />
                                        </div>
                                        <Label className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Calculation Cycle</Label>
                                    </div>
                                    <p className="text-[12px] text-indigo-700 font-bold ml-7">
                                        {cb_cycle_type === 'statement_cycle' ? "Follows card statement day" : "Standard Calendar Month"}
                                    </p>
                                </div>
                                <div className="flex bg-slate-200/60 p-1 rounded-xl shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => onChange({ cb_cycle_type: 'calendar_month' })}
                                        className={cn(
                                            "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all",
                                            cb_cycle_type === 'calendar_month' ? "bg-white text-amber-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Month
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onChange({ cb_cycle_type: 'statement_cycle' })}
                                        className={cn(
                                            "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all",
                                            cb_cycle_type === 'statement_cycle' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Statement
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {cb_type === 'simple' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Global Base Rate (%)</Label>
                                <SmartAmountInput
                                    value={cb_base_rate}
                                    onChange={(val) => {
                                        const nextRate = val ?? 0
                                        onChange({ cb_base_rate: nextRate > 100 ? 100 : nextRate })
                                    }}
                                    unit="%"
                                    allowDecimal
                                    hideLabel
                                    compact
                                    className="h-10 font-black bg-white border-slate-300 shadow-sm"
                                />
                                <div className="text-[10px] text-slate-500 font-medium mt-1">Tỷ lệ hoàn tiền mặc định cho mọi giao dịch hợp lệ.</div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Category Exceptions</Label>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            type="button"
                                            className="h-7 px-2 text-[10px] font-bold border-dashed hover:bg-slate-50 text-blue-600"
                                            onClick={() => {
                                                updateSimpleRules([...simpleRules, { cat_ids: [], rate: 0, max: null }])
                                            }}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add Override
                                        </Button>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium">Thiết lập tỷ lệ hoàn riêng cho từng danh mục. Base rate tính nếu không có ngoại lệ.</div>
                                </div>

                                {!cb_is_unlimited && (cb_max_budget || 0) > 0 && simpleRules.reduce((acc, rule) => acc + (rule.max || 0), 0) > (cb_max_budget || 0) && (
                                    <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-medium leading-relaxed">
                                            Tổng Limit Cap của các danh mục ngoại lệ ({(simpleRules.reduce((acc, rule) => acc + (rule.max || 0), 0) / 1000).toLocaleString()}k) đang lớn hơn Overall Cap ({(cb_max_budget || 0) / 1000}k). Thực tế bạn sẽ được hoàn tối đa {(cb_max_budget || 0) / 1000}k.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {simpleRules.length === 0 && (
                                        <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                            <p className="text-[11px] text-slate-400 font-medium italic">No category overrides. Base rate applies to all.</p>
                                        </div>
                                    )}
                                    {simpleRules.map((rule, idx) => (
                                        <CashbackRuleRow
                                            key={idx}
                                            rule={rule}
                                            categories={categories}
                                            onUpdate={(updated: CashbackCategoryRule) => {
                                                const next = [...simpleRules]
                                                next[idx] = updated
                                                updateSimpleRules(next)
                                            }}
                                            onDelete={() => {
                                                updateSimpleRules(simpleRules.filter((_, i) => i !== idx))
                                            }}
                                            onOpenCategoryCreator={onOpenCategoryCreator}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {cb_type === 'tiered' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            {/* Tiered Header - Compact */}
                            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Tiered Strategy Dashboard</span>
                                    </div>
                                    <Button
                                        className="h-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-wider px-2 shadow-sm"
                                        size="sm"
                                        type="button"
                                        onClick={() => {
                                            const newTier: CashbackTier = {
                                                min_spend: 0,
                                                base_rate: cb_base_rate,
                                                max_reward: null,
                                                policies: []
                                            }
                                            updateTieredConfig({
                                                ...tieredConfig,
                                                tiers: [...tieredConfig.tiers, newTier].sort((a, b) => a.min_spend - b.min_spend)
                                            })
                                        }}
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> Add Threshold
                                    </Button>
                                </div>

                                <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                                    <div className="space-y-1 block w-full">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Base Rate (Catch-all) (%)</Label>
                                        <SmartAmountInput
                                            value={tieredConfig.base_rate}
                                            onChange={(val) => {
                                                const r = val ?? 0
                                                updateTieredConfig({ ...tieredConfig, base_rate: r > 100 ? 100 : r })
                                            }}
                                            unit="%"
                                            allowDecimal
                                            hideLabel
                                            compact
                                            className="h-9 font-black bg-slate-50 border-slate-200 text-slate-900 shadow-inner"
                                        />
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-400 italic max-w-[150px] text-right pt-4">
                                        Base rate applies when no tier threshold is met.
                                    </div>
                                </div>
                            </div>

                            {/* Tiers List */}
                            <div className="space-y-4">
                                {tieredConfig.tiers.length === 0 && (
                                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-100/20">
                                        <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
                                            <div className="p-3 bg-white rounded-full shadow-sm">
                                                <ChevronRight className="h-6 w-6 text-slate-300" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-600">No Volume Tiers Defined</p>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">Click "Add Threshold" to define reward levels based on monthly volume.</p>
                                        </div>
                                    </div>
                                )}

                                {tieredConfig.tiers.map((tier, tIdx) => (
                                    <div key={tIdx} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden group">
                                        <div className="p-2.5 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="flex h-7 px-3 items-center justify-center bg-slate-600 text-white text-[10px] font-black rounded uppercase tracking-widest shrink-0 shadow-sm">
                                                    Level {tIdx + 1}
                                                </div>
                                                <div className="flex flex-col gap-0 min-w-[120px] flex-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">Spend Threshold</span>
                                                    <div className="relative">
                                                        <SmartAmountInput
                                                            value={tier.min_spend}
                                                            onChange={(val) => {
                                                                const next = { ...tieredConfig }
                                                                next.tiers[tIdx].min_spend = val ?? 0
                                                                updateTieredConfig(next)
                                                            }}
                                                            placeholder="Enter Amount..."
                                                            hideLabel
                                                            hideCurrencyText
                                                            hideClearButton
                                                            className="h-8 text-lg font-black p-0 border-none shadow-none focus-visible:ring-0 bg-transparent text-blue-600 w-full"
                                                        />
                                                        <div className="text-[9px] font-black text-blue-600/60 -mt-1 truncate h-3">
                                                            {formatVietnameseCurrencyText(tier.min_spend).map(p => p.value + p.unit).join(' ')}
                                                        </div>
                                                    </div>
                                                    <div className="text-[9px] text-slate-500 font-medium text-left mt-1.5 leading-tight pr-4">Mức tổng chi tiêu tối thiểu trong kỳ để đạt hạng này.</div>
                                                </div>

                                                <div className="flex flex-col gap-0 items-end min-w-[80px]">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">Tier Base Rate</span>
                                                    <div className="flex items-center">
                                                        <SmartAmountInput
                                                            value={tier.base_rate ?? cb_base_rate}
                                                            onChange={(val) => {
                                                                const next = { ...tieredConfig }
                                                                next.tiers[tIdx].base_rate = val ?? 0
                                                                updateTieredConfig(next)
                                                            }}
                                                            unit="%"
                                                            allowDecimal
                                                            hideLabel
                                                            hideCurrencyText
                                                            hideClearButton
                                                            compact
                                                            className="h-8 text-sm font-black p-0 border-none shadow-none focus-visible:ring-0 bg-transparent text-slate-800 text-right w-12"
                                                        />
                                                        <span className="text-xs font-black text-slate-400 ml-0.5">%</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-0 items-end min-w-[100px]">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight text-right">Rules Shared Cap</span>
                                                    <div className="relative">
                                                        <SmartAmountInput
                                                            value={tier.max_reward ?? 0}
                                                            onChange={(val) => {
                                                                const next = { ...tieredConfig }
                                                                next.tiers[tIdx].max_reward = val || null
                                                                updateTieredConfig(next)
                                                            }}
                                                            placeholder="Unlimited"
                                                            hideLabel
                                                            hideCurrencyText
                                                            hideClearButton
                                                            compact
                                                            className={cn(
                                                                "h-8 text-sm font-black p-0 border-none shadow-none focus-visible:ring-0 bg-transparent text-right w-24",
                                                                !tier.max_reward ? "text-slate-300" : "text-rose-600"
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                                                onClick={() => {
                                                    const next = { ...tieredConfig }
                                                    next.tiers.splice(tIdx, 1)
                                                    updateTieredConfig(next)
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="p-4 space-y-4 bg-white">
                                            <div className="flex items-center justify-between px-1">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Category Policies (MCC Group)</Label>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    type="button"
                                                    className="h-7 px-2 text-[9px] font-black text-blue-600 uppercase hover:bg-blue-50 bg-blue-50/50"
                                                    onClick={() => {
                                                        const next = { ...tieredConfig }
                                                        next.tiers[tIdx].policies.push({ cat_ids: [], rate: 0, max: null })
                                                        updateTieredConfig(next)
                                                    }}
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Category Rule
                                                </Button>
                                            </div>

                                            {!cb_is_unlimited && (cb_max_budget || 0) > 0 && tier.policies.reduce((acc, policy) => acc + (policy.max || 0), 0) > (cb_max_budget || 0) && (
                                                <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                                                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] font-medium leading-relaxed">
                                                        Tổng Limit Cap của các danh mục ({(tier.policies.reduce((acc, policy) => acc + (policy.max || 0), 0) / 1000).toLocaleString()}k) đang lớn hơn Overall Cap ({(cb_max_budget || 0) / 1000}k). Thực tế bạn sẽ được hoàn tối đa {(cb_max_budget || 0) / 1000}k.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                {tier.policies.length === 0 && (
                                                    <div className="py-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                                                        <p className="text-[11px] text-slate-400 font-bold italic">No special categories for this tier. Using Base Rate only.</p>
                                                    </div>
                                                )}
                                                {tier.policies.map((p, pIdx) => (
                                                    <CashbackRuleRow
                                                        key={pIdx}
                                                        rule={p}
                                                        categories={categories}
                                                        onUpdate={(updated: CashbackCategoryRule) => {
                                                            const next = { ...tieredConfig }
                                                            next.tiers[tIdx].policies[pIdx] = updated
                                                            updateTieredConfig(next)
                                                        }}
                                                        onDelete={() => {
                                                            const next = { ...tieredConfig }
                                                            next.tiers[tIdx].policies.splice(pIdx, 1)
                                                            updateTieredConfig(next)
                                                        }}
                                                        onOpenCategoryCreator={onOpenCategoryCreator}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary Sentence footer */}
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 shadow-inner">
                    <div className="shrink-0 px-2 py-0.5 bg-slate-200 rounded text-[9px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Plan Summary</div>
                    <p className="text-[10px] text-slate-600 font-semibold italic truncate">
                        "{summary}"
                    </p>
                </div>
            </div>
        </div>
    )
}
