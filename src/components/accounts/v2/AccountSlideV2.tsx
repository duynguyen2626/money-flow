"use client"

import React, { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import { Account } from "@/types/moneyflow.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Wallet, Info, Trash2, Banknote, CreditCard, Building, Coins, HandCoins, PiggyBank, Receipt, DollarSign, Plus } from "lucide-react";
import { updateAccountConfig } from "@/services/account.service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { normalizeCashbackConfig, CashbackProgram } from "@/lib/cashback";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

interface AccountSlideV2Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: Account | null;
    allAccounts?: Account[];
    categories?: any[];
    existingAccountNumbers?: string[];
    existingReceiverNames?: string[];
}

import { Category } from "@/types/moneyflow.types";

export function AccountSlideV2({
    open,
    onOpenChange,
    account,
    allAccounts = [],
    categories = [],
    existingAccountNumbers = [],
    existingReceiverNames = [],
}: AccountSlideV2Props & { categories?: Category[] }) {
    const router = useRouter();
    const isEdit = !!account;
    const [loading, setLoading] = useState(false);
    // New fields
    const [annualFee, setAnnualFee] = useState<number>(0);
    const [receiverName, setReceiverName] = useState("");
    const [securedById, setSecuredById] = useState<string>("none");
    const [isCollateralLinked, setIsCollateralLinked] = useState(false);
    const [openCollateralCombo, setOpenCollateralCombo] = useState(false);
    const [maxCashback, setMaxCashback] = useState<number | null>(null);
    const [startDate, setStartDate] = useState<number | null>(null); // For future use if schema supports it, reusing statement day logic for now or keeping separate? Schema uses statementDay/dueDate. User wants "Start Date"? 
    // Slide design asks for "Base Rate", "Cycle Type", "Max Budget", "Min Spend", "Statement Day", "Due Day".

    // Form state
    const [name, setName] = useState("");
    const [type, setType] = useState<Account['type']>('bank');
    const [accountNumber, setAccountNumber] = useState("");
    const [creditLimit, setCreditLimit] = useState<number>(0);
    const [isActive, setIsActive] = useState(true);

    // Advanced settings
    const [cycleType, setCycleType] = useState<CashbackProgram['cycleType']>('calendar_month');
    const [statementDay, setStatementDay] = useState<number | null>(null);
    const [dueDate, setDueDate] = useState<number | null>(null);
    const [minSpendTarget, setMinSpendTarget] = useState<number | null>(null);
    const [defaultRate, setDefaultRate] = useState<number>(0);
    const [isAdvancedCashback, setIsAdvancedCashback] = useState(false);

    // Category Rules State
    interface RuleState {
        id: string;
        categoryId: string;
        rate: number;
        maxReward: number | null;
    }
    const [categoryRules, setCategoryRules] = useState<RuleState[]>([]);

    useEffect(() => {
        if (account) {
            setName(account.name || "");
            setType(account.type || 'bank');
            setAccountNumber(account.account_number || "");
            setCreditLimit(account.credit_limit || 0);
            setIsActive(account.is_active !== false);

            const cb = normalizeCashbackConfig(account.cashback_config);
            setCycleType(cb.cycleType || 'calendar_month');
            setStatementDay(cb.statementDay);
            setDueDate(cb.dueDate);
            setMinSpendTarget(cb.minSpendTarget); // Fix: this was duplicated in my view, hopefully clean now
            setDefaultRate(cb.defaultRate || 0);
            setMaxCashback(cb.maxBudget || null);

            // New fields
            setAnnualFee(account.annual_fee || 0);
            setReceiverName(account.receiver_name || "");

            const secured = account.secured_by_account_id || "none";
            setSecuredById(secured);
            setIsCollateralLinked(secured !== "none");

            // Advanced Rules (assume Level 1 rules)
            const rules = cb.levels?.[0]?.rules || [];
            setCategoryRules(rules.map(r => ({
                id: r.id || Math.random().toString(36).substr(2, 9),
                categoryId: r.categoryIds?.[0] || "",
                rate: r.rate || 0,
                maxReward: r.maxReward || null
            })));
            setIsAdvancedCashback(rules.length > 0);

        } else {
            setName("");
            setType('bank');
            setAccountNumber("");
            setCreditLimit(0);
            setIsActive(true);
            setCycleType('calendar_month');
            setStatementDay(null);
            setDueDate(null);
            setStatementDay(null);
            setDueDate(null);
            setMinSpendTarget(null);
            setDefaultRate(0);
            setMaxCashback(null);
            setAnnualFee(0);
            setReceiverName("");
            setSecuredById("none");
            setSecuredById("none");
            setIsCollateralLinked(false);
            setCategoryRules([]);
            setIsAdvancedCashback(false);
            setOpenCollateralCombo(false);
        }
    }, [account]);

    const handleSave = async () => {
        if (!name) {
            toast.error("Account name is required");
            return;
        }

        setLoading(true);
        try {
            if (isEdit && account) {
                const success = await updateAccountConfig(account.id, {
                    name,
                    type,
                    account_number: accountNumber,
                    credit_limit: creditLimit,
                    is_active: isActive,
                    annual_fee: annualFee,
                    receiver_name: receiverName,
                    secured_by_account_id: isCollateralLinked && securedById !== "none" ? securedById : null,
                    cashback_config: {
                        program: {
                            cycleType,
                            statementDay,
                            dueDate,
                            minSpendTarget,
                            defaultRate,
                            maxBudget: maxCashback,
                            levels: isAdvancedCashback ? [{
                                id: 'l1',
                                name: 'Standard',
                                minTotalSpend: 0,
                                defaultRate: defaultRate,
                                rules: categoryRules.map(r => ({
                                    id: r.id,
                                    categoryIds: [r.categoryId],
                                    rate: r.rate,
                                    maxReward: r.maxReward
                                }))
                            }] : []
                        }
                    }
                });
                if (success) {
                    toast.success("Account updated successfully");
                    onOpenChange(false);
                    router.refresh();
                } else {
                    toast.error("Failed to update account");
                }
            } else {
                // Implementation for create would go here
                toast.info("Account creation via Slide is coming soon. Using existing dialog for now.");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0 border-l border-slate-200">
                <div className="p-6 bg-slate-50/50 border-b border-slate-200">
                    <SheetHeader className="text-left">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-9 w-9 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-blue-600">
                                <Wallet className="h-4 w-4" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-black text-slate-900 leading-tight">
                                    {isEdit ? "Edit Account" : "New Account"}
                                </SheetTitle>
                                <SheetDescription className="text-xs font-medium text-slate-500">
                                    {isEdit ? `Modifying details for ${account.name}` : "Add a new financial account to track your money flow."}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase text-slate-500 tracking-wider">Account Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. VIB Online Plus"
                                className="h-10 border-slate-200 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">Account Type</Label>
                            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-lg">
                                {[
                                    { id: 'bank', icon: Building, label: 'Bank', color: 'text-blue-600' },
                                    { id: 'credit_card', icon: CreditCard, label: 'Credit Card', color: 'text-indigo-600' },
                                    { id: 'ewallet', icon: Wallet, label: 'E-Wallet', color: 'text-purple-600' },
                                    { id: 'cash', icon: Banknote, label: 'Cash', color: 'text-emerald-600' },
                                    { id: 'debt', icon: HandCoins, label: 'Debt/Loan', color: 'text-rose-600' },
                                    { id: 'savings', icon: PiggyBank, label: 'Savings', color: 'text-amber-600' },
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setType(item.id as Account['type'])}
                                        className={cn(
                                            "h-16 flex flex-col items-center justify-center gap-1.5 rounded-lg transition-all border",
                                            type === item.id
                                                ? `bg-white shadow-sm border-slate-200 ${item.color}`
                                                : "bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span className="text-[10px] font-bold">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="acc_num" className="text-xs font-black uppercase text-slate-500 tracking-wider">Account Number <span className="text-slate-300 font-normal normal-case">(Optional)</span></Label>
                                <Input
                                    list="existing-acc-nums"
                                    id="acc_num"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder="Last 4 digits or full"
                                    className="h-10 border-slate-200"
                                />
                                <datalist id="existing-acc-nums">
                                    {existingAccountNumbers.map((num) => (
                                        <option key={num} value={num} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="receiver" className="text-xs font-black uppercase text-slate-500 tracking-wider">Bank Receiver Name</Label>
                                <Input
                                    list="existing-rx-names"
                                    id="receiver"
                                    value={receiverName}
                                    onChange={(e) => setReceiverName(e.target.value)}
                                    placeholder="Short name (e.g. NAM)"
                                    className="h-10 border-slate-200"
                                />
                                <datalist id="existing-rx-names">
                                    {existingReceiverNames.map((name) => (
                                        <option key={name} value={name} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        {type === 'credit_card' && (
                            <div className="space-y-4 pt-2 border-t border-slate-100">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="limit" className="text-xs font-black uppercase text-slate-500 tracking-wider">Credit Limit</Label>
                                        <div className="relative">
                                            <Input
                                                id="limit"
                                                type="number"
                                                value={creditLimit}
                                                onChange={(e) => setCreditLimit(Number(e.target.value))}
                                                className="h-10 pl-3 border-slate-200"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">VND</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fee" className="text-xs font-black uppercase text-slate-500 tracking-wider">Annual Fee</Label>
                                        <div className="relative">
                                            <Input
                                                id="fee"
                                                type="number"
                                                value={annualFee}
                                                onChange={(e) => setAnnualFee(Number(e.target.value))}
                                                className="h-10 pl-3 border-slate-200"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">VND</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">Collateral / Secured By</Label>
                                <Switch
                                    checked={isCollateralLinked}
                                    onCheckedChange={(checked) => {
                                        setIsCollateralLinked(checked);
                                        if (!checked) setSecuredById("none");
                                    }}
                                    className="scale-75"
                                />
                            </div>

                            {isCollateralLinked && (
                                <Popover open={openCollateralCombo} onOpenChange={setOpenCollateralCombo}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCollateralCombo}
                                            className="w-full justify-between h-10 border-slate-200"
                                        >
                                            {securedById && securedById !== "none" ? (
                                                <div className="flex items-center gap-2">
                                                    {(() => {
                                                        const sel = allAccounts.find(a => a.id === securedById);
                                                        return sel ? (
                                                            <>
                                                                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
                                                                    {sel.image_url ? (
                                                                        <img src={sel.image_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold text-slate-500">{sel.name[0]}</span>
                                                                    )}
                                                                </div>
                                                                <span className="truncate">{sel.name}</span>
                                                            </>
                                                        ) : "Select Account...";
                                                    })()}
                                                </div>
                                            ) : (
                                                "Select Account..."
                                            )}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search account..." />
                                            <CommandList>
                                                <CommandEmpty>No account found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="create_new_savings"
                                                        onSelect={() => {
                                                            // Logic to switch to Add New Savings mode?
                                                            // For now, toast info as placeholder or separate logic
                                                            toast.info("Add New Savings Shortcut clicked");
                                                            setOpenCollateralCombo(false);
                                                        }}
                                                        className="text-indigo-600 font-bold"
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Create New Savings
                                                    </CommandItem>
                                                    {allAccounts
                                                        .filter(a => a.id !== account?.id && (a.type === 'bank' || a.type === 'savings'))
                                                        .map((a) => (
                                                            <CommandItem
                                                                key={a.id}
                                                                value={a.name}
                                                                onSelect={() => {
                                                                    setSecuredById(a.id);
                                                                    setOpenCollateralCombo(false);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2 w-full">
                                                                    <div className="w-6 h-6 rounded-sm overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
                                                                        {a.image_url ? (
                                                                            <img src={a.image_url} alt="" className="w-full h-full object-contain" />
                                                                        ) : (
                                                                            <span className="text-[10px] font-bold text-slate-500">{a.name[0]}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium">{a.name}</span>
                                                                        <span className="text-[10px] text-slate-400 font-mono">{formatMoneyVND(a.current_balance)}</span>
                                                                    </div>
                                                                    <Check
                                                                        className={cn(
                                                                            "ml-auto h-4 w-4",
                                                                            securedById === a.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-700">Account Status</p>
                                <p className="text-[10px] text-slate-500 font-medium">Toggle whether this account is currently active.</p>
                            </div>
                            <Button
                                variant={isActive ? "outline" : "secondary"}
                                size="sm"
                                onClick={() => setIsActive(!isActive)}
                                className={cn(
                                    "h-8 px-4 font-bold text-[10px] uppercase tracking-wider transition-all",
                                    isActive ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-slate-200 text-slate-600 border-transparent"
                                )}
                            >
                                {isActive ? "Active" : "Closed"}
                            </Button>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-amber-100 p-1.5 rounded-full">
                                            <Coins className="h-3.5 w-3.5 text-amber-600" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800">Cashback Policy</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Advanced?</span>
                                        <Switch
                                            checked={isAdvancedCashback}
                                            onCheckedChange={setIsAdvancedCashback}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Base Rate (%)</Label>
                                            <Input
                                                type="number"
                                                value={defaultRate * 100}
                                                onChange={(e) => setDefaultRate(Number(e.target.value) / 100)}
                                                step="0.01"
                                                className="h-9 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cycle Type</Label>
                                            <Select
                                                value={cycleType ?? 'calendar_month'}
                                                onValueChange={(v) => setCycleType(v as any)}
                                                items={[
                                                    { value: "calendar_month", label: "Calendar Month" },
                                                    { value: "statement_cycle", label: "Statement Cycle" },
                                                ]}
                                                className="h-9 font-bold bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Max Budget</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={maxCashback || ''}
                                                    onChange={(e) => setMaxCashback(e.target.value ? Number(e.target.value) : null)}
                                                    placeholder="e.g. 500k"
                                                    className="h-9 font-bold"
                                                />
                                                {maxCashback && maxCashback > 0 && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 rounded">
                                                        {(maxCashback / 1000).toFixed(0)}k
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Min Spend</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={minSpendTarget || ''}
                                                    onChange={(e) => setMinSpendTarget(e.target.value ? Number(e.target.value) : null)}
                                                    placeholder="e.g. 5m"
                                                    className="h-9 font-bold"
                                                />
                                                {minSpendTarget && minSpendTarget > 0 && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 rounded">
                                                        {(minSpendTarget / 1000000).toFixed(0)}m
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Statement Day</Label>
                                            <Input
                                                type="number"
                                                value={statementDay || ''}
                                                onChange={(e) => setStatementDay(e.target.value ? Number(e.target.value) : null)}
                                                placeholder="DD"
                                                className="h-9 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Due Day</Label>
                                            <Input
                                                type="number"
                                                value={dueDate || ''}
                                                onChange={(e) => setDueDate(e.target.value ? Number(e.target.value) : null)}
                                                placeholder="Day"
                                                className="h-9 font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isAdvancedCashback && (
                                    <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">Category Rules</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCategoryRules([...categoryRules, { id: Math.random().toString(36).substr(2, 9), categoryId: "", rate: 0, maxReward: null }])}
                                                className="h-6 px-2 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold uppercase tracking-wider"
                                            >
                                                <Plus className="h-3 w-3 mr-1" /> Add Rule
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            {categoryRules.length === 0 && (
                                                <div className="text-center py-4 text-xs text-slate-400 italic">No specific category rules defined.</div>
                                            )}
                                            {categoryRules.map((rule, idx) => (
                                                <div key={rule.id} className="flex items-start gap-2 bg-white p-2 rounded border border-slate-200 shadow-sm">
                                                    <div className="flex-1 space-y-1">
                                                        <Select
                                                            value={rule.categoryId}
                                                            onValueChange={(val) => {
                                                                const newRules = [...categoryRules];
                                                                newRules[idx].categoryId = val;
                                                                setCategoryRules(newRules);
                                                            }}
                                                            items={categories.map(c => ({ value: c.id || '', label: c.name || 'Unknown' }))}
                                                            placeholder="Select Category"
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="w-20 space-y-0 relative">
                                                        <Input
                                                            type="number"
                                                            value={rule.rate * 100}
                                                            onChange={(e) => {
                                                                const newRules = [...categoryRules];
                                                                newRules[idx].rate = Number(e.target.value) / 100;
                                                                setCategoryRules(newRules);
                                                            }}
                                                            className="h-8 text-xs pr-4 text-right"
                                                            placeholder="%"
                                                        />
                                                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                                                    </div>
                                                    <div className="w-24 space-y-0">
                                                        <Input
                                                            type="number"
                                                            value={rule.maxReward || ''}
                                                            onChange={(e) => {
                                                                const newRules = [...categoryRules];
                                                                newRules[idx].maxReward = e.target.value ? Number(e.target.value) : null;
                                                                setCategoryRules(newRules);
                                                            }}
                                                            className="h-8 text-xs text-right"
                                                            placeholder="Max (opt)"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setCategoryRules(categoryRules.filter(r => r.id !== rule.id))}
                                                        className="h-8 w-8 text-slate-400 hover:text-rose-500"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <SheetFooter className="p-6 bg-white border-t border-slate-200 sm:justify-end gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-10 px-6 font-bold text-slate-500">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="h-10 px-8 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
                    >
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isEdit ? "Save Changes" : "Create Account"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
function formatMoneyVND(amount: number) {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('vi-VN').format(amount);
}
