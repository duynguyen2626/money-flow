"use client"

import React, { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SmartAmountInput } from "@/components/ui/smart-amount-input"
import { Plus, Trash2, Coins, Sparkles, ChevronRight, Info, Check, ChevronsUpDown, X, Infinity } from "lucide-react"
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

interface CashbackConfigFormProps {
    cb_type: 'simple' | 'tiered' | 'none'
    cb_base_rate: number
    cb_max_budget: number | null
    cb_is_unlimited: boolean
    cb_rules_json: CashbackRulesJson | null
    cb_min_spend: number
    categories: Category[]
    onChange: (updates: {
        cb_type?: 'simple' | 'tiered' | 'none'
        cb_base_rate?: number
        cb_max_budget?: number | null
        cb_is_unlimited?: boolean
        cb_rules_json?: CashbackRulesJson | null
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
        if (cb_type === 'simple') {
            const ruleCount = simpleRules.length
            return `Standard ${cb_base_rate}% cashback on all spend${ruleCount > 0 ? `, plus ${ruleCount} special category rules` : ""}.`
        }
        if (cb_type === 'tiered') {
            const tierCount = tieredConfig.tiers.length
            if (tierCount === 0) return `Tiered strategy active with ${tieredConfig.base_rate}% base rate, but no tiers defined yet.`

            const firstTier = tieredConfig.tiers[0]
            const lastTier = tieredConfig.tiers[tieredConfig.tiers.length - 1]

            if (tierCount === 1) {
                return `Earn ${tieredConfig.base_rate}% base rate. At ${firstTier.min_spend.toLocaleString()} VND spend, special rates apply.`
            }
            return `Multistage rewards across ${tierCount} tiers (from ${firstTier.min_spend.toLocaleString()} to ${lastTier.min_spend.toLocaleString()} VND spend).`
        }
        return ""
    }, [cb_type, cb_base_rate, simpleRules, tieredConfig])

    return (
        <div className="space-y-6">
            {/* Header / Switcher */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-100 p-1.5 rounded-lg">
                            <Coins className="h-4 w-4 text-amber-600" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Reward Strategy</h3>
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg scale-90 origin-right">
                        <button
                            onClick={() => onChange({ cb_type: 'simple' })}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                cb_type === 'simple' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Simple
                        </button>
                        <button
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
            </div>

            {cb_type === 'simple' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    {/* Base Settings */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Base Rate (%)</Label>
                            <SmartAmountInput
                                value={cb_base_rate}
                                onChange={(val) => {
                                    const nextRate = val ?? 0
                                    onChange({ cb_base_rate: nextRate > 100 ? 100 : nextRate })
                                }}
                                unit="%"
                                hideLabel
                                compact
                                className="h-10 font-black bg-white border-slate-300"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Min Spend</Label>
                            <SmartAmountInput
                                value={cb_min_spend}
                                onChange={(val) => onChange({ cb_min_spend: val ?? 0 })}
                                hideLabel
                                compact
                                placeholder="Min Spend..."
                                className="h-10 font-bold bg-white border-slate-300"
                            />
                            <div className="text-[9px] font-bold text-blue-600/60 truncate h-3">
                                {cb_min_spend > 0 && formatVietnameseCurrencyText(cb_min_spend).map((p, i) => (
                                    <React.Fragment key={i}>
                                        <span className="text-rose-600">{p.value}</span>
                                        <span className="text-blue-500 ml-0.5">{p.unit} </span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Monthly Cap</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <SmartAmountInput
                                        value={cb_is_unlimited ? 0 : (cb_max_budget ?? 0)}
                                        onChange={(val) => onChange({ cb_max_budget: val, cb_is_unlimited: !val || val === 0 })}
                                        hideLabel
                                        compact
                                        placeholder={cb_is_unlimited ? "Unlimited" : "Max amount"}
                                        className={cn("h-10 font-bold bg-white border-slate-200", cb_is_unlimited && "text-slate-300")}
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
                                    onClick={() => onChange({ cb_is_unlimited: !cb_is_unlimited, cb_max_budget: !cb_is_unlimited ? null : 0 })}
                                    className={cn(
                                        "h-10 px-2 text-[10px] font-black border transition-all",
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
                        </div>
                    </div>

                    {/* Category Rules */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Category Exceptions</Label>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[10px] font-bold border-dashed hover:bg-slate-50 text-blue-600"
                                onClick={() => {
                                    updateSimpleRules([...simpleRules, { cat_ids: [], rate: 0, max: null }])
                                }}
                            >
                                <Plus className="h-3 w-3 mr-1" /> Add Override
                            </Button>
                        </div>

                        <div className="space-y-2 text-slate-100">
                            {simpleRules.length === 0 && (
                                <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                    <p className="text-[11px] text-slate-400 font-medium italic">No category overrides. Base rate applies to all.</p>
                                </div>
                            )}
                            {simpleRules.map((rule, idx) => (
                                <CashbackRuleRow
                                    key={idx}
                                    rule={rule}
                                    categories={categories}
                                    onUpdate={(updated) => {
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
                                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Tiered Strategy</span>
                            </div>
                            <Button
                                className="h-6 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[9px] uppercase tracking-wider px-2"
                                size="sm"
                                onClick={() => {
                                    const newTier: CashbackTier = {
                                        min_spend: 0,
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
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Catch-all Rate (%)</Label>
                                <SmartAmountInput
                                    value={tieredConfig.base_rate}
                                    onChange={(val) => {
                                        const r = val ?? 0
                                        updateTieredConfig({ ...tieredConfig, base_rate: r > 100 ? 100 : r })
                                    }}
                                    unit="%"
                                    hideLabel
                                    compact
                                    className="h-9 font-black bg-slate-50 border-slate-200 text-slate-900"
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
                            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
                                    <div className="p-3 bg-white rounded-full shadow-sm">
                                        <ChevronRight className="h-6 w-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-600">No Volume Tiers</p>
                                    <p className="text-[11px] text-slate-400">Click "New Threshold" to add reward steps for high spending months (e.g. VPBank Lady).</p>
                                </div>
                            </div>
                        )}

                        {tieredConfig.tiers.map((tier, tIdx) => (
                            <div key={tIdx} className="border border-slate-200 rounded-xl bg-white shadow-sm transition-all hover:border-slate-300">
                                <div className="p-2 px-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="flex h-6 px-2.5 items-center justify-center bg-slate-200 text-slate-600 text-[9px] font-black rounded-full uppercase tracking-widest shrink-0">
                                            Tier {tIdx + 1}
                                        </div>
                                        <div className="flex flex-col gap-0 min-w-[100px]">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">Spend From</span>
                                            <div className="relative">
                                                <SmartAmountInput
                                                    value={tier.min_spend}
                                                    onChange={(val) => {
                                                        const next = { ...tieredConfig }
                                                        next.tiers[tIdx].min_spend = val ?? 0
                                                        updateTieredConfig(next)
                                                    }}
                                                    placeholder="Enter Amt..."
                                                    hideLabel
                                                    hideCurrencyText
                                                    hideClearButton
                                                    className="h-8 text-base font-black p-0 border-none shadow-none focus-visible:ring-0 bg-transparent text-blue-700 w-full"
                                                />
                                                <div className="text-[9px] font-bold text-blue-600/60 -mt-0.5 truncate h-3">
                                                    {formatVietnameseCurrencyText(tier.min_spend).map(p => p.value + p.unit).join(' ')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-rose-500"
                                        onClick={() => {
                                            const next = { ...tieredConfig }
                                            next.tiers.splice(tIdx, 1)
                                            updateTieredConfig(next)
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>

                                </div>

                                <div className="p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Special Rules for this tier</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-[9px] font-black text-blue-600 uppercase hover:bg-blue-50"
                                            onClick={() => {
                                                const next = { ...tieredConfig }
                                                next.tiers[tIdx].policies.push({ cat_ids: [], rate: 0, max: null })
                                                updateTieredConfig(next)
                                            }}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add Rule
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {tier.policies.length === 0 && (
                                            <p className="text-[10px] text-slate-400 italic py-2 text-center">No overrides in this tier. Catch-all rate applies.</p>
                                        )}
                                        {tier.policies.map((p, pIdx) => (
                                            <CashbackRuleRow
                                                key={pIdx}
                                                rule={p}
                                                categories={categories}
                                                onUpdate={(updated) => {
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
            )
            }

            {/* Summary Sentence footer */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="p-1 px-2 bg-slate-200 rounded text-[9px] font-bold text-slate-600 uppercase mt-0.5">Summary</div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                    "{summary}"
                </p>
            </div>
        </div >
    )
}

function CashbackRuleRow({ rule, categories, onUpdate, onDelete, onOpenCategoryCreator }: {
    rule: CashbackCategoryRule,
    categories: Category[],
    onUpdate: (rule: CashbackCategoryRule) => void,
    onDelete: () => void,
    onOpenCategoryCreator?: () => void
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
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                onClick={() => setOpen(true)}
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
                        </div>
                    </PopoverAnchor>
                    <PopoverContent className="w-[var(--radix-popover-anchor-width)] p-0 shadow-2xl border-slate-200 rounded-xl" align="start">
                        <Command className="rounded-xl overflow-hidden">
                            <CommandInput placeholder="Search name or MCC..." className="h-10 text-xs" />
                            <div className="p-1 border-b border-slate-50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setOpen(false)
                                        onOpenCategoryCreator?.((newId) => {
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
                                                // Don't close popover to allow multi-select
                                            }}
                                            className="text-xs h-10 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 w-full">
                                                <div className={cn(
                                                    "w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all overflow-hidden",
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
                                    <Button size="sm" className="w-full h-8 text-[10px] font-black uppercase" onClick={() => setOpen(false)}>
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
                    onClick={onDelete}
                    className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Row 2: Category Chips (if any) */}
            {
                selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                        {selectedCategories.map((cat) => (
                            <div key={cat.id} className="flex items-center gap-1.5 bg-white border border-slate-200 pl-1 pr-1.5 py-1 rounded-md shadow-sm animate-in fade-in zoom-in-95 overflow-hidden">
                                <div className="w-5 h-5 rounded-sm bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                                    onClick={() => removeCategory(cat.id)}
                                    className="ml-1 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )
            }

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
        </div >
    )
}
