"use client"

import React, { useState, useEffect, useMemo } from "react";
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
import { Wallet, Info, Trash2, Banknote, CreditCard, Building, Coins, HandCoins, PiggyBank, Receipt, DollarSign, Plus, Copy, ChevronLeft, CheckCircle2, Check } from "lucide-react";
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
import { ChevronsUpDown, Loader2, RotateCcw } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { DayOfMonthPicker } from "@/components/ui/day-of-month-picker";
import { CategorySlideV2 } from "@/components/accounts/v2/CategorySlideV2";

interface AccountSlideV2Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: Account | null;
    allAccounts?: Account[];
    categories?: any[];
    existingAccountNumbers?: string[];
    existingReceiverNames?: string[];
    onEditAccount?: (account: Account) => void;
    onBack?: () => void;
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
    onEditAccount,
    onBack,
}: AccountSlideV2Props & { categories?: Category[] }) {
    const router = useRouter();
    const isEdit = !!account;
    const [loading, setLoading] = useState(false);
    // New fields
    const [annualFee, setAnnualFee] = useState<number>(0);
    const [annualFeeWaiverTarget, setAnnualFeeWaiverTarget] = useState<number>(0);
    const [receiverName, setReceiverName] = useState("");
    const [securedById, setSecuredById] = useState<string>("none");
    const [isCollateralLinked, setIsCollateralLinked] = useState(false);
    const [openCollateralCombo, setOpenCollateralCombo] = useState(false);
    const [maxCashback, setMaxCashback] = useState<number | undefined>(undefined);
    const [startDate, setStartDate] = useState<number | null>(null);
    const [parentAccountId, setParentAccountId] = useState<string | null>(null);
    const [activeMainType, setActiveMainType] = useState<'bank' | 'credit' | 'savings' | 'others'>('bank');
    const [openParentCombo, setOpenParentCombo] = useState(false);
    const [isCategoryRestricted, setIsCategoryRestricted] = useState(false);
    const [restrictedCategoryIds, setRestrictedCategoryIds] = useState<string[]>([]);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [activeCategoryCallback, setActiveCategoryCallback] = useState<((categoryId: string) => void) | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [type, setType] = useState<Account['type']>('bank');
    const [accountNumber, setAccountNumber] = useState("");
    const [creditLimit, setCreditLimit] = useState<number>(0);
    const [isActive, setIsActive] = useState(true);
    const [imageUrl, setImageUrl] = useState("");

    // Advanced settings
    const [cycleType, setCycleType] = useState<CashbackProgram['cycleType']>('calendar_month');
    const [statementDay, setStatementDay] = useState<number | null>(null);
    const [dueDate, setDueDate] = useState<number | null>(null);
    const [minSpendTarget, setMinSpendTarget] = useState<number | undefined>(undefined);
    const [defaultRate, setDefaultRate] = useState<number>(0);
    const [isAdvancedCashback, setIsAdvancedCashback] = useState(false);

    // Category Rules State
    interface RuleState {
        id: string;
        categoryIds: string[];
        rate: number;
        maxReward: number | null;
    }

    interface LevelState {
        id: string;
        name: string;
        minTotalSpend: number;
        defaultRate: number;
        rules: RuleState[];
    }

    const [levels, setLevels] = useState<LevelState[]>([]);

    // Parent-Child Credit Limit Sync logic
    useEffect(() => {
        if (parentAccountId) {
            const parent = allAccounts.find(a => a.id === parentAccountId);
            if (parent && parent.credit_limit !== undefined) {
                setCreditLimit(parent.credit_limit);
            }
        }
    }, [parentAccountId, allAccounts]);

    // Dirty check state
    const [initialState, setInitialState] = useState<string>("");
    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState<'close' | 'back' | null>(null);

    // Initial load
    useEffect(() => {
        if (open) {
            const loadedState = "";
            if (account) {
                const config = normalizeCashbackConfig(account.cashback_config);

                // Initial load
                const stateObj = {
                    name: account.name,
                    type: account.type,
                    accountNumber: account.account_number || "",
                    creditLimit: account.credit_limit || 0,
                    isActive: account.is_active !== false,
                    imageUrl: account.image_url || "",
                    annualFee: account.annual_fee || 0,
                    annualFeeWaiverTarget: account.annual_fee_waiver_target || 0,
                    receiverName: account.receiver_name || "",
                    parentAccountId: account.parent_account_id || null,
                    securedById: account.secured_by_account_id || "none",
                    isCollateralLinked: !!account.secured_by_account_id,
                    // Cashback config
                    cycleType: config.cycleType || 'calendar_month',
                    statementDay: config.statementDay || null,
                    dueDate: config.dueDate || null,
                    minSpendTarget: config.minSpendTarget || null,
                    defaultRate: config.defaultRate || 0,
                    maxCashback: config.maxBudget || null,
                    levels: (config.levels || []).map(lvl => ({
                        id: lvl.id,
                        name: lvl.name || "",
                        minTotalSpend: lvl.minTotalSpend || 0,
                        defaultRate: lvl.defaultRate || 0,
                        rules: (lvl.rules || []).map(r => ({
                            id: r.id,
                            categoryIds: [...(r.categoryIds || [])].sort(),
                            rate: r.rate || 0,
                            maxReward: r.maxReward || null
                        }))
                    })),
                    // Derived simple mode state for check
                    isCategoryRestricted: false,
                };

                // Normalizing logic for simple mode to match how valid levels look
                const loadedLevels = (config.levels || []).map(lvl => ({
                    id: lvl.id,
                    name: lvl.name || "",
                    minTotalSpend: lvl.minTotalSpend || 0,
                    defaultRate: lvl.defaultRate || 0,
                    rules: (lvl.rules || []).map(r => ({
                        id: r.id,
                        categoryIds: r.categoryIds || [],
                        rate: r.rate || 0,
                        maxReward: r.maxReward || null
                    }))
                }));

                // To properly check dirty, we need to capture the exact state we are setting.
                // Let's rely on the useEffect below that sets the individual states, and capture them *after* set. 
                // However, React batching makes that hard.
                // Alternative: Construct the "current" object on every render and compare with "initial".
            }
        }
    }, [open, account]);

    // Construct current state object for dirty checking
    const currentState = useMemo(() => {
        // Normalize levels for comparison (remove random IDs if they are new)
        const normalizedLevels = levels.map(lvl => ({
            name: lvl.name,
            minTotalSpend: lvl.minTotalSpend,
            defaultRate: lvl.defaultRate,
            rules: lvl.rules.map(r => ({
                categoryIds: [...r.categoryIds].sort(),
                rate: r.rate,
                maxReward: r.maxReward
            }))
        }));

        // Handle simple mode duality: if isCategoryRestricted, the levels are derived differently in 'handleSave', 
        // but for dirty check we should compare what the user *sees*.
        // Actually, let's compare the *output* payload we would send to save.

        let effectiveLevels = normalizedLevels;
        if (isCategoryRestricted && restrictedCategoryIds.length > 0) {
            effectiveLevels = [{
                name: 'Default',
                minTotalSpend: 0,
                defaultRate: 0,
                rules: [{
                    categoryIds: [...restrictedCategoryIds].sort(),
                    rate: defaultRate,
                    maxReward: null
                }]
            }];
        } else if (isCategoryRestricted && restrictedCategoryIds.length === 0) {
            effectiveLevels = [];
        } else if (!isAdvancedCashback && !isCategoryRestricted) {
            // Basic mode: 1 level, defaults.
            // But wait, the user might be editing existing advanced data.
            // If !isAdvancedCashback and !isCategoryRestricted, we usually don't send levels?
            // See handleSave: defaultRate is sent at top level. levels map is conditionally sent.
            effectiveLevels = [];
        }

        return JSON.stringify({
            name,
            type,
            accountNumber,
            creditLimit,
            isActive,
            imageUrl,
            annualFee,
            receiverName,
            parentAccountId,
            securedById: isCollateralLinked ? securedById : "none", // Normalize
            cycleType,
            statementDay,
            dueDate,
            minSpendTarget,
            defaultRate: isCategoryRestricted ? 0 : defaultRate,
            maxCashback,
            levels: effectiveLevels
        });
    }, [name, type, accountNumber, creditLimit, isActive, imageUrl, annualFee, receiverName, parentAccountId, securedById, isCollateralLinked, cycleType, statementDay, dueDate, minSpendTarget, defaultRate, maxCashback, levels, isCategoryRestricted, restrictedCategoryIds, isAdvancedCashback]);

    // Set initial state once when opening
    useEffect(() => {
        if (open && account) {
            const cb = (account.cashback_config as any)?.program || {};
            const loadedLevels = (cb.levels || []).map((lvl: any) => ({
                name: lvl.name || "",
                minTotalSpend: lvl.minTotalSpend || 0,
                defaultRate: lvl.defaultRate || 0,
                rules: (lvl.rules || []).map((r: any) => ({
                    categoryIds: [...(r.categoryIds || [])].sort(),
                    rate: r.rate || 0,
                    maxReward: r.maxReward || null
                }))
            }));

            // Re-derive the logic for isCategoryRestricted to match what we did in the initialization effect
            const effectiveInitLevels = loadedLevels;
            if (loadedLevels.length === 1 && loadedLevels[0].minTotalSpend === 0 && loadedLevels[0].rules.length === 1) {
                // This was detected as restricted mode
            }

            // Correction: The `currentState` logic generates the payload. We should generate the `initialState` payload similarly from the `account` prop.
            const initLevels = (cb.levels || []).map((lvl: any) => ({
                name: lvl.name || "",
                minTotalSpend: lvl.minTotalSpend || 0,
                defaultRate: lvl.defaultRate || 0,
                rules: (lvl.rules || []).map((r: any) => ({
                    categoryIds: [...(r.categoryIds || [])].sort(),
                    rate: r.rate || 0,
                    maxReward: r.maxReward || null
                }))
            }));

            setInitialState(JSON.stringify({
                name: account.name,
                type: account.type,
                accountNumber: account.account_number || "",
                creditLimit: account.credit_limit || 0,
                isActive: account.is_active !== false,
                imageUrl: account.image_url || "",
                annualFee: account.annual_fee || 0,
                annualFeeWaiverTarget: account.annual_fee_waiver_target || 0,
                receiverName: account.receiver_name || "",
                parentAccountId: account.parent_account_id || null,
                securedById: account.secured_by_account_id || "none",
                cycleType: cb.cycleType || 'calendar_month',
                statementDay: cb.statementDay || null,
                dueDate: cb.dueDate || null,
                minSpendTarget: cb.minSpendTarget || null,
                defaultRate: cb.defaultRate || 0,
                maxCashback: cb.maxBudget || null,
                levels: initLevels
            }));
        } else if (open && !account) {
            // New account default state
            setInitialState(JSON.stringify({
                name: "",
                type: 'bank',
                accountNumber: "",
                creditLimit: 0,
                isActive: true,
                imageUrl: "",
                annualFee: 0,
                receiverName: "",
                parentAccountId: null,
                securedById: "none",
                cycleType: 'calendar_month',
                statementDay: null,
                dueDate: null,
                minSpendTarget: null,
                defaultRate: 0,
                maxCashback: null,
                levels: []
            }));
        }
    }, [open, account]);

    const handleAttemptClose = () => {
        if (currentState !== initialState) {
            setPendingAction('close');
            setShowUnsavedConfirm(true);
        } else {
            onOpenChange(false);
        }
    };

    const handleAttemptBack = () => {
        if (!onBack) return;
        if (currentState !== initialState) {
            setPendingAction('back');
            setShowUnsavedConfirm(true);
        } else {
            onBack();
        }
    };

    const confirmAction = () => {
        setShowUnsavedConfirm(false);
        if (pendingAction === 'close') {
            onOpenChange(false);
        } else if (pendingAction === 'back' && onBack) {
            onBack();
        }
        setPendingAction(null);
    };
    // Load form state from account
    useEffect(() => {
        if (open) {
            if (account) {
                setName(account.name || "");
                setType(account.type || 'bank');
                setAccountNumber(account.account_number || "");
                setCreditLimit(account.credit_limit || 0);
                setIsActive(account.is_active !== false);
                setImageUrl(account.image_url || "");

                const cb = normalizeCashbackConfig(account.cashback_config) as any;
                setCycleType(cb.cycleType || 'calendar_month');
                setStatementDay(cb.statementDay ?? null);
                setDueDate(cb.dueDate ?? null);
                setMinSpendTarget(cb.minSpendTarget ?? undefined);
                setDefaultRate(cb.defaultRate || 0);
                setMaxCashback(cb.maxBudget ?? undefined);

                // New fields
                setAnnualFee(account.annual_fee || 0);
                setAnnualFeeWaiverTarget(account.annual_fee_waiver_target || 0);
                setReceiverName(account.receiver_name || "");
                setParentAccountId(account.parent_account_id || null);
                setStartDate((account as any).start_date);

                // Determine main type
                if (account.type === 'bank') setActiveMainType('bank');
                else if (account.type === 'credit_card') setActiveMainType('credit');
                else if (['savings', 'investment'].includes(account.type)) setActiveMainType('savings');
                else setActiveMainType('others');

                const secured = account.secured_by_account_id || "none";
                setSecuredById(secured);
                setIsCollateralLinked(secured !== "none");

                const loadedLevels = (cb.levels || []).map((lvl: any) => ({
                    id: lvl.id || Math.random().toString(36).substr(2, 9),
                    name: lvl.name || "",
                    minTotalSpend: lvl.minTotalSpend || 0,
                    defaultRate: lvl.defaultRate || 0,
                    rules: (lvl.rules || []).map((r: any) => ({
                        id: r.id || Math.random().toString(36).substr(2, 9),
                        categoryIds: r.categoryIds || [],
                        rate: r.rate || 0,
                        maxReward: r.maxReward || null
                    }))
                }));

                setLevels(loadedLevels);
                setIsAdvancedCashback(loadedLevels.length > 1 || (loadedLevels.length === 1 && loadedLevels[0].rules.length > 1));

                // Check if it's a simple restricted config
                if (loadedLevels.length === 1 && loadedLevels[0].minTotalSpend === 0 && loadedLevels[0].rules.length === 1) {
                    setIsCategoryRestricted(true);
                    setRestrictedCategoryIds(loadedLevels[0].rules[0].categoryIds);
                    setDefaultRate(loadedLevels[0].rules[0].rate);
                } else {
                    setIsCategoryRestricted(false);
                    setRestrictedCategoryIds([]);
                }

            } else {
                setName("");
                setType('bank');
                setAccountNumber("");
                setCreditLimit(0);
                setIsActive(true);
                setImageUrl("");
                setCycleType('calendar_month');
                setStatementDay(null);
                setDueDate(null);
                setMinSpendTarget(undefined);
                setDefaultRate(0);
                setMaxCashback(undefined);
                setAnnualFee(0);
                setReceiverName("");
                setSecuredById("none");
                setIsCollateralLinked(false);
                setParentAccountId(null);
                setActiveMainType('bank');
                setLevels([]);
                setIsAdvancedCashback(false);
                setIsCategoryRestricted(false);
                setRestrictedCategoryIds([]);
                setOpenCollateralCombo(false);
                setOpenParentCombo(false);
            }
        }
    }, [open, account]);

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
                    image_url: imageUrl,
                    annual_fee: annualFee,
                    annual_fee_waiver_target: annualFeeWaiverTarget,
                    receiver_name: receiverName,
                    parent_account_id: parentAccountId,
                    secured_by_account_id: isCollateralLinked && securedById !== "none" ? securedById : null,
                    cashback_config: {
                        program: {
                            cycleType,
                            statementDay,
                            dueDate,
                            minSpendTarget,
                            defaultRate: isCategoryRestricted ? 0 : defaultRate, // If restricted, base is 0
                            maxBudget: maxCashback,
                            levels: isAdvancedCashback ? levels.map(lvl => ({
                                id: lvl.id,
                                name: lvl.name,
                                minTotalSpend: lvl.minTotalSpend,
                                defaultRate: lvl.defaultRate,
                                rules: lvl.rules.map(r => ({
                                    id: r.id,
                                    categoryIds: r.categoryIds,
                                    rate: r.rate,
                                    maxReward: r.maxReward
                                }))
                            })) : (isCategoryRestricted && restrictedCategoryIds.length > 0 ? [{
                                id: 'lvl_1',
                                name: 'Default',
                                minTotalSpend: 0,
                                defaultRate: 0,
                                rules: [{
                                    id: 'rule_1',
                                    categoryIds: restrictedCategoryIds,
                                    rate: defaultRate,
                                    maxReward: null
                                }]
                            }] : [])
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
        <>
            <Sheet open={open} onOpenChange={(open) => {
                if (!open) {
                    // Intercept closing
                    handleAttemptClose();
                }
            }}>
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

                            <div className="space-y-2">
                                <Label htmlFor="image_url" className="text-xs font-black uppercase text-slate-500 tracking-wider">Image URL</Label>
                                <Input
                                    id="image_url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="Paste image URL here"
                                    className="h-10 border-slate-200"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">Account Type</Label>
                                <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-lg">
                                    {[
                                        { id: 'bank', icon: Building, label: 'Bank', color: 'text-blue-600' },
                                        { id: 'credit', icon: CreditCard, label: 'Credit', color: 'text-indigo-600' },
                                        { id: 'savings', icon: PiggyBank, label: 'Savings', color: 'text-amber-600' },
                                        { id: 'others', icon: Wallet, label: 'Others', color: 'text-slate-600' },
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveMainType(item.id as 'bank' | 'credit' | 'savings' | 'others');
                                                if (item.id === 'bank') setType('bank');
                                                else if (item.id === 'credit') setType('credit_card');
                                                else if (item.id === 'savings') setType('savings');
                                                else setType('cash');
                                            }}
                                            className={cn(
                                                "h-14 flex flex-col items-center justify-center gap-1 rounded-lg transition-all border",
                                                activeMainType === item.id
                                                    ? `bg-white shadow-sm border-slate-200 ${item.color}`
                                                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            <span className="text-[10px] font-bold">{item.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {activeMainType === 'savings' && (
                                    <div className="flex gap-2 justify-center pt-1 animate-in fade-in slide-in-from-top-1">
                                        {[
                                            { id: 'savings', label: 'Savings' },
                                            { id: 'investment', label: 'Invest' }
                                        ].map((sub: any) => (
                                            <button
                                                key={sub.id}
                                                type="button"
                                                onClick={() => setType(sub.id as any)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border",
                                                    type === sub.id
                                                        ? "bg-amber-100 border-amber-200 text-amber-700 shadow-sm"
                                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                                                )}
                                            >
                                                {sub.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeMainType === 'others' && (
                                    <div className="flex gap-2 justify-center pt-1 animate-in fade-in slide-in-from-top-1">
                                        {[
                                            { id: 'cash', label: 'Cash' },
                                            { id: 'ewallet', label: 'E-Wallet' }
                                        ].map(sub => (
                                            <button
                                                key={sub.id}
                                                type="button"
                                                onClick={() => setType(sub.id as any)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border",
                                                    type === sub.id
                                                        ? "bg-slate-700 border-slate-800 text-white shadow-sm"
                                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                                                )}
                                            >
                                                {sub.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
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

                            {/* Parent Account - Only for Credit Cards */}
                            {type === 'credit_card' && (
                                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Parent Account</Label>
                                            <p className="text-[9px] text-slate-400 font-medium">Link to a main group for shared limits.</p>
                                        </div>
                                        <Popover open={openParentCombo} onOpenChange={setOpenParentCombo}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    size="sm"
                                                    className="w-48 justify-between h-8 text-[11px] font-bold border-slate-200 bg-white"
                                                >
                                                    {parentAccountId ? (
                                                        <div className="flex items-center gap-1.5">
                                                            {(() => {
                                                                const sel = allAccounts.find(a => a.id === parentAccountId);
                                                                return sel ? (
                                                                    <>
                                                                        <div className="w-4 h-4 rounded-none overflow-hidden bg-slate-100 flex items-center justify-center">
                                                                            {sel.image_url ? (
                                                                                <img src={sel.image_url} alt="" className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <span className="text-[8px] font-bold text-slate-500">{sel.name[0]}</span>
                                                                            )}
                                                                        </div>
                                                                        <span className="truncate">{sel.name}</span>
                                                                    </>
                                                                ) : "None";
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">None</span>
                                                    )}
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-0" align="end">
                                                <Command>
                                                    <CommandInput placeholder="Search parent..." className="h-8 text-[11px]" />
                                                    <CommandList>
                                                        <CommandEmpty className="text-[11px] py-2 px-4">No account found.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandItem
                                                                onSelect={() => {
                                                                    toast.info("Account creation coming soon");
                                                                    setOpenParentCombo(false);
                                                                }}
                                                                className="text-blue-600 font-bold text-[11px]"
                                                            >
                                                                <Plus className="mr-2 h-3 w-3" />
                                                                Add New Group
                                                            </CommandItem>
                                                            <CommandItem
                                                                value="none"
                                                                onSelect={() => {
                                                                    setParentAccountId(null);
                                                                    setOpenParentCombo(false);
                                                                }}
                                                                className="text-[11px] font-medium"
                                                            >
                                                                <Check className={cn("mr-2 h-3 w-3", !parentAccountId ? "opacity-100" : "opacity-0")} />
                                                                None (Self)
                                                            </CommandItem>
                                                            {allAccounts
                                                                .filter(a => a.id !== account?.id)
                                                                .map((a) => (
                                                                    <CommandItem
                                                                        key={a.id}
                                                                        value={a.name}
                                                                        onSelect={() => {
                                                                            setParentAccountId(a.id);
                                                                            setOpenParentCombo(false);
                                                                        }}
                                                                        className="text-[11px]"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-4 h-4 rounded-none overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                                                {a.image_url ? (
                                                                                    <img src={a.image_url} alt="" className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <span className="text-[8px] font-bold text-slate-500">{a.name[0]}</span>
                                                                                )}
                                                                            </div>
                                                                            <span className="truncate">{a.name}</span>
                                                                        </div>
                                                                        <Check className={cn("ml-auto h-3 w-3", parentAccountId === a.id ? "opacity-100" : "opacity-0")} />
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            )}

                            {type === 'credit_card' && (
                                <div className="space-y-4 pt-2 border-t border-slate-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="limit" className="text-xs font-black uppercase text-slate-500 tracking-wider">Credit Limit</Label>
                                                {parentAccountId && (
                                                    <button
                                                        onClick={() => {
                                                            const parent = allAccounts.find(a => a.id === parentAccountId);
                                                            if (parent && onEditAccount) {
                                                                onEditAccount(parent);
                                                            } else {
                                                                toast.info("Parent account details coming soon");
                                                            }
                                                        }}
                                                        className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-[9px] font-black text-rose-500 uppercase tracking-tighter hover:bg-rose-100 transition-colors animate-pulse group"
                                                    >
                                                        {(() => {
                                                            const p = allAccounts.find(a => a.id === parentAccountId);
                                                            return p ? (
                                                                <>
                                                                    <div className="h-4 w-auto min-w-[20px] flex items-center justify-center">
                                                                        {p.image_url ? (
                                                                            <img src={p.image_url} alt="" className="h-full w-auto object-contain" />
                                                                        ) : (
                                                                            <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-1 rounded">{p.name[0]}</span>
                                                                        )}
                                                                    </div>
                                                                    Parent: {p.name}
                                                                    <RotateCcw className="h-2 w-2 group-hover:rotate-180 transition-transform" />
                                                                </>
                                                            ) : "Parent Link Limit";
                                                        })()}
                                                    </button>
                                                )}
                                            </div>
                                            <SmartAmountInput
                                                value={creditLimit}
                                                onChange={(val) => setCreditLimit(val ?? 0)}
                                                disabled={!!parentAccountId}
                                                hideLabel
                                                className={cn(
                                                    "h-10 border-slate-200",
                                                    parentAccountId && "bg-slate-50 text-slate-400 font-bold border-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.05)]"
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="fee" className="text-xs font-black uppercase text-slate-500 tracking-wider">Annual Fee</Label>
                                            <SmartAmountInput
                                                value={annualFee}
                                                onChange={(val) => setAnnualFee(val ?? 0)}
                                                hideLabel
                                                className="h-10 border-slate-200"
                                            />
                                        </div>
                                    </div>
                                    {annualFee > 0 && (
                                        <div className="space-y-2">
                                            <Label htmlFor="waiver-target" className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                                Fee Waiver Spending Target
                                            </Label>
                                            <SmartAmountInput
                                                value={annualFeeWaiverTarget}
                                                onChange={(val) => setAnnualFeeWaiverTarget(val ?? 0)}
                                                hideLabel
                                                placeholder="Annual spend to waive fee"
                                                className="h-10 border-slate-200"
                                            />
                                            <p className="text-[9px] text-slate-400 font-medium">
                                                Leave 0 if no waiver program available
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Collateral / Secured By - For all account types */}
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
                                                                    <div className="w-5 h-5 rounded-none overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
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
                                                            onSelect={() => {
                                                                toast.info("Savings creation coming soon");
                                                                setOpenCollateralCombo(false);
                                                            }}
                                                            className="text-blue-600 font-bold"
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
                                                                        <div className="w-6 h-6 rounded-none overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
                                                                            {a.image_url ? (
                                                                                <img src={a.image_url} alt="" className="w-full h-full object-contain" />
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold text-slate-500">{a.name[0]}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-medium">{a.name}</span>
                                                                            <span className="text-[10px] text-slate-400 font-mono">{(a.current_balance || 0).toLocaleString()} VND</span>
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

                            {/* Cashback Configuration */}
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
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Statement Cycle</Label>
                                                <Select
                                                    value={cycleType ?? 'calendar_month'}
                                                    onValueChange={(v) => {
                                                        setCycleType(v as any);
                                                        if (v === 'calendar_month') {
                                                            setStatementDay(1);
                                                        }
                                                    }}
                                                    items={[
                                                        { value: "calendar_month", label: "Calendar Month" },
                                                        { value: "statement_cycle", label: "Statement Cycle" },
                                                    ]}
                                                    className="h-9 font-bold bg-slate-50"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Statement Date</Label>
                                                <DayOfMonthPicker
                                                    value={cycleType === 'calendar_month' ? 1 : statementDay}
                                                    onChange={setStatementDay}
                                                    disabled={cycleType === 'calendar_month'}
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Base Rate (%)</Label>
                                                <SmartAmountInput
                                                    value={defaultRate * 100}
                                                    onChange={(val) => setDefaultRate((val ?? 0) / 100)}
                                                    unit="%"
                                                    hideLabel
                                                    className="h-9 font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Max Budget</Label>
                                                <SmartAmountInput
                                                    value={maxCashback}
                                                    onChange={setMaxCashback}
                                                    hideLabel
                                                    className="h-9 font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Due Day</Label>
                                                <DayOfMonthPicker
                                                    value={dueDate}
                                                    onChange={setDueDate}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Min Spend</Label>
                                                <SmartAmountInput
                                                    value={minSpendTarget}
                                                    onChange={setMinSpendTarget}
                                                    hideLabel
                                                    className="h-9 font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="space-y-1.5 text-rose-600 bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <Label className="text-[10px] font-black uppercase tracking-wider">Category Restriction</Label>
                                                        <Switch
                                                            checked={isCategoryRestricted}
                                                            onCheckedChange={setIsCategoryRestricted}
                                                            className="scale-[0.7] data-[state=checked]:bg-rose-500"
                                                        />
                                                    </div>
                                                    {isCategoryRestricted && (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="outline" size="sm" className="w-full h-8 px-2 text-[10px] font-bold justify-between bg-white border-rose-200 text-rose-700 hover:bg-rose-50 animate-in fade-in zoom-in-95">
                                                                    <span className="truncate">
                                                                        {restrictedCategoryIds.length === 0 ? "Pick Categories..." : `${restrictedCategoryIds.length} Selected`}
                                                                    </span>
                                                                    <Plus className="h-3 w-3 opacity-50" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-64 p-0" align="start">
                                                                <Command>
                                                                    <CommandInput placeholder="Search category..." className="h-8 text-[11px]" />
                                                                    <CommandList className="max-h-48">
                                                                        <CommandEmpty className="text-xs py-2 px-4">No category found.</CommandEmpty>
                                                                        <CommandGroup>
                                                                            {categories.map((cat) => (
                                                                                <CommandItem
                                                                                    key={cat.id}
                                                                                    value={cat.name}
                                                                                    onSelect={() => {
                                                                                        if (restrictedCategoryIds.includes(cat.id)) {
                                                                                            setRestrictedCategoryIds(restrictedCategoryIds.filter(id => id !== cat.id));
                                                                                        } else {
                                                                                            setRestrictedCategoryIds([...restrictedCategoryIds, cat.id]);
                                                                                        }
                                                                                    }}
                                                                                    className="text-[11px]"
                                                                                >
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-4 h-4 rounded-none overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                                                            {cat.image_url ? (
                                                                                                <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                                                                            ) : (
                                                                                                <span className="text-[8px] font-bold text-slate-500">{cat.name[0]}</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <span className="truncate">{cat.name}</span>
                                                                                    </div>
                                                                                    <Check className={cn("ml-auto h-3 w-3", restrictedCategoryIds.includes(cat.id) ? "opacity-100" : "opacity-0")} />
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                    <div className="p-1 border-t border-slate-100 bg-slate-50">
                                                                        <CommandItem
                                                                            onSelect={() => {
                                                                                setActiveCategoryCallback(() => (categoryId: string) => {
                                                                                    setRestrictedCategoryIds([...restrictedCategoryIds, categoryId]);
                                                                                });
                                                                                setIsCategoryDialogOpen(true);
                                                                            }}
                                                                            className="text-blue-600 font-bold text-[11px] justify-center cursor-pointer hover:bg-white"
                                                                        >
                                                                            <Plus className="mr-2 h-3 w-3" />
                                                                            Add New Category
                                                                        </CommandItem>
                                                                    </div>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                                <Info className="h-3 w-3 text-blue-500 shrink-0" />
                                                <p className="text-[9px] text-blue-700 font-medium leading-tight">
                                                    {isCategoryRestricted
                                                        ? "Rates will only apply to these categories. Everything else 0%."
                                                        : "Default rate applies to all spending."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {isAdvancedCashback && (
                                        <div className="bg-slate-50 border-t border-slate-100">
                                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">Cashback Levels</Label>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info className="h-3 w-3 text-slate-400 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>Define multi-tier cashback rules based on total spend.</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const newLevels = [...levels];
                                                        newLevels.push({
                                                            id: Math.random().toString(36).substr(2, 9),
                                                            name: `Level ${levels.length + 1}`,
                                                            minTotalSpend: 0,
                                                            defaultRate: 0,
                                                            rules: []
                                                        });
                                                        setLevels(newLevels);
                                                    }}
                                                    className="h-7 px-3 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-blue-600 font-bold uppercase tracking-wider shadow-sm"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> Add Level
                                                </Button>
                                            </div>

                                            <div className="divide-y divide-slate-100">
                                                {levels.length === 0 && (
                                                    <div className="text-center py-8 text-xs text-slate-400 italic">No levels defined. Add a level to start.</div>
                                                )}
                                                {levels.map((level, lIdx) => (
                                                    <div key={level.id} className="p-4 space-y-4 bg-white/50">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 space-y-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Level {lIdx + 1}</span>
                                                                    <Input
                                                                        value={level.name}
                                                                        onChange={(e) => {
                                                                            const newLevels = [...levels];
                                                                            newLevels[lIdx].name = e.target.value;
                                                                            setLevels(newLevels);
                                                                        }}
                                                                        placeholder="e.g. Premium Tier"
                                                                        className="h-8 text-sm font-bold bg-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                                                    onClick={() => {
                                                                        const newLevels = [...levels];
                                                                        const dupe = JSON.parse(JSON.stringify(level));
                                                                        dupe.id = Math.random().toString(36).substr(2, 9);
                                                                        newLevels.splice(lIdx + 1, 0, dupe);
                                                                        setLevels(newLevels);
                                                                    }}
                                                                >
                                                                    <RotateCcw className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-rose-500"
                                                                    onClick={() => setLevels(levels.filter((_, i) => i !== lIdx))}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Min Total Spend</Label>
                                                                    <Info className="h-3 w-3 text-slate-300" />
                                                                </div>
                                                                <SmartAmountInput
                                                                    value={level.minTotalSpend}
                                                                    onChange={(val) => {
                                                                        const newLevels = [...levels];
                                                                        newLevels[lIdx].minTotalSpend = val ?? 0;
                                                                        setLevels(newLevels);
                                                                    }}
                                                                    hideLabel
                                                                    className="h-9 bg-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Default Rate (%)</Label>
                                                                    <Info className="h-3 w-3 text-slate-300" />
                                                                </div>
                                                                <SmartAmountInput
                                                                    value={level.defaultRate * 100}
                                                                    onChange={(val) => {
                                                                        const newLevels = [...levels];
                                                                        newLevels[lIdx].defaultRate = (val ?? 0) / 100;
                                                                        setLevels(newLevels);
                                                                    }}
                                                                    unit="%"
                                                                    hideLabel
                                                                    placeholder="e.g. 0.1"
                                                                    className="h-9 bg-white"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Category Rules</Label>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const newLevels = [...levels];
                                                                        newLevels[lIdx].rules.push({
                                                                            id: Math.random().toString(36).substr(2, 9),
                                                                            categoryIds: [],
                                                                            rate: 0,
                                                                            maxReward: null
                                                                        });
                                                                        setLevels(newLevels);
                                                                    }}
                                                                    className="h-6 px-2 text-[9px] text-blue-600 font-bold bg-white border border-slate-100 hover:bg-slate-50"
                                                                >
                                                                    <Plus className="h-3 w-3 mr-1" /> Add Rule
                                                                </Button>
                                                            </div>

                                                            <div className="space-y-2">
                                                                {level.rules.map((rule: any, rIdx: number) => (
                                                                    <div key={rule.id} className="flex flex-col items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                                        <div className="w-full space-y-1">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Categories</Label>
                                                                                <Info className="h-2.5 w-2.5 text-slate-300" />
                                                                            </div>
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        className="w-full h-8 justify-between text-xs bg-white border-slate-200 font-medium"
                                                                                    >
                                                                                        <span className="truncate">
                                                                                            {(() => {
                                                                                                const validCount = rule.categoryIds.filter((id: string) => categories.some(c => c.id === id)).length;
                                                                                                return validCount === 0
                                                                                                    ? "Select categories..."
                                                                                                    : `${validCount} categories selected`;
                                                                                            })()}
                                                                                        </span>
                                                                                        <ChevronsUpDown className="h-3 w-3 opacity-50" />
                                                                                    </Button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-64 p-0" align="start">
                                                                                    <Command>
                                                                                        <CommandInput placeholder="Search category..." className="h-8 text-xs" />
                                                                                        <CommandList className="max-h-48">
                                                                                            <CommandEmpty className="text-xs py-2 px-4">No category found.</CommandEmpty>
                                                                                            <CommandGroup>
                                                                                                {categories.map((cat: any) => (
                                                                                                    <CommandItem
                                                                                                        key={cat.id}
                                                                                                        value={cat.name}
                                                                                                        onSelect={() => {
                                                                                                            const newLevels = [...levels];
                                                                                                            const currentIds = newLevels[lIdx].rules[rIdx].categoryIds;
                                                                                                            if (currentIds.includes(cat.id)) {
                                                                                                                newLevels[lIdx].rules[rIdx].categoryIds = currentIds.filter(id => id !== cat.id);
                                                                                                            } else {
                                                                                                                newLevels[lIdx].rules[rIdx].categoryIds.push(cat.id);
                                                                                                            }
                                                                                                            setLevels(newLevels);
                                                                                                        }}
                                                                                                        className="text-xs"
                                                                                                    >
                                                                                                        <div className="flex items-center gap-2 w-full">
                                                                                                            <div className={cn(
                                                                                                                "w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors",
                                                                                                                rule.categoryIds.includes(cat.id) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200"
                                                                                                            )}>
                                                                                                                <Check className="h-2.5 w-2.5" />
                                                                                                            </div>
                                                                                                            <div className="w-4 h-4 rounded-none overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                                                                                {cat.image_url ? (
                                                                                                                    <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                                                                                                ) : (
                                                                                                                    <span className="text-[8px] font-bold text-slate-500">{cat.name[0]}</span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <span>{cat.name}</span>
                                                                                                        </div>
                                                                                                    </CommandItem>
                                                                                                ))}
                                                                                                {categories.map((category) => (
                                                                                                    <CommandItem
                                                                                                        key={category.id}
                                                                                                        onSelect={() => {
                                                                                                            // Add category to current rule
                                                                                                            // Need to handle this via callback or better state management
                                                                                                            if (activeCategoryCallback) {
                                                                                                                activeCategoryCallback(category.id);
                                                                                                            } else {
                                                                                                                // Fallback: direct update if context allows (it doesn't easily here without passing ID up)
                                                                                                                const newLevels = [...levels];
                                                                                                                if (!newLevels[lIdx].rules[rIdx].categoryIds.includes(category.id)) {
                                                                                                                    newLevels[lIdx].rules[rIdx].categoryIds.push(category.id);
                                                                                                                    setLevels(newLevels);
                                                                                                                }
                                                                                                            }
                                                                                                        }}
                                                                                                        className="flex items-start gap-2 cursor-pointer py-2 pl-2"
                                                                                                    >
                                                                                                        {/* Checkbox */}
                                                                                                        <div className={cn(
                                                                                                            "w-3.5 h-3.5 mt-0.5 border rounded flex items-center justify-center transition-colors flex-shrink-0",
                                                                                                            rule.categoryIds.includes(category.id) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200"
                                                                                                        )}>
                                                                                                            {rule.categoryIds.includes(category.id) && <Check className="h-2.5 w-2.5" />}
                                                                                                        </div>

                                                                                                        <div className="flex-1 min-w-0">
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <div className="w-4 h-4 rounded-none overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0">
                                                                                                                    {category.image_url ? (
                                                                                                                        <img src={category.image_url} alt="" className="w-full h-full object-cover" />
                                                                                                                    ) : (
                                                                                                                        <span className="text-[10px]">{category.icon || "🏷️"}</span>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <span className="font-medium text-sm truncate">{category.name}</span>
                                                                                                            </div>
                                                                                                            {category.mcc_codes && category.mcc_codes.length > 0 && (
                                                                                                                <div className="text-[10px] text-slate-400 mt-1 ml-6 leading-tight">
                                                                                                                    MCC: {category.mcc_codes.join(", ")}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </CommandItem>
                                                                                                ))}
                                                                                            </CommandGroup>
                                                                                        </CommandList>
                                                                                        <div className="p-1 border-t border-slate-100 bg-slate-50">
                                                                                            <CommandItem
                                                                                                onSelect={() => {
                                                                                                    setActiveCategoryCallback(() => (categoryId: string) => {
                                                                                                        // This is for cashback level rules - would need different context
                                                                                                        // For now, just open the dialog
                                                                                                    });
                                                                                                    setIsCategoryDialogOpen(true);
                                                                                                }}
                                                                                                className="text-blue-600 font-bold text-[11px] justify-center cursor-pointer hover:bg-white"
                                                                                            >
                                                                                                <Plus className="mr-2 h-3 w-3" />
                                                                                                Add New Category
                                                                                            </CommandItem>
                                                                                        </div>
                                                                                    </Command>
                                                                                </PopoverContent>
                                                                            </Popover>

                                                                            {rule.categoryIds.length > 0 && (
                                                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                                                    {rule.categoryIds.map((id: string) => {
                                                                                        const cat = categories.find(c => c.id === id);
                                                                                        return cat ? (
                                                                                            <TooltipProvider key={id}>
                                                                                                <Tooltip delayDuration={300}>
                                                                                                    <TooltipTrigger asChild>
                                                                                                        <div className="flex items-center bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 rounded-full border border-blue-100 cursor-help max-w-full truncate h-5">
                                                                                                            {cat.image_url ? (
                                                                                                                <img src={cat.image_url} alt="" className="w-3 h-3 object-contain mr-1 flex-shrink-0" />
                                                                                                            ) : (
                                                                                                                <span className="mr-1 flex-shrink-0">{cat.icon || "🏷️"}</span>
                                                                                                            )}
                                                                                                            <span className="truncate">{cat.name}</span>
                                                                                                            {cat.mcc_codes && cat.mcc_codes.length > 0 && (
                                                                                                                <span className="text-[9px] text-blue-400 font-normal ml-1 hidden sm:inline-block">({cat.mcc_codes.join(', ')})</span>
                                                                                                            )}
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={(e) => {
                                                                                                                    e.stopPropagation(); // Prevent tooltip from interfering
                                                                                                                    const newLevels = [...levels];
                                                                                                                    newLevels[lIdx].rules[rIdx].categoryIds = rule.categoryIds.filter((cid: string) => cid !== id);
                                                                                                                    setLevels(newLevels);
                                                                                                                }}
                                                                                                                className="ml-1 hover:text-rose-500 flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-100"
                                                                                                            >
                                                                                                                &times;
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    </TooltipTrigger>
                                                                                                    <TooltipContent className="text-xs">
                                                                                                        <p className="font-bold">{cat.name}</p>
                                                                                                        {cat.mcc_codes && cat.mcc_codes.length > 0 && (
                                                                                                            <p className="text-slate-300 mt-1">MCC: {cat.mcc_codes.join(', ')}</p>
                                                                                                        )}
                                                                                                    </TooltipContent>
                                                                                                </Tooltip>
                                                                                            </TooltipProvider>
                                                                                        ) : null;
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-end gap-2 w-full">
                                                                            <div className="flex-1 sm:w-20 space-y-1">
                                                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider text-right block">Rate (%)</Label>
                                                                                <SmartAmountInput
                                                                                    value={rule.rate * 100}
                                                                                    onChange={(val) => {
                                                                                        const newLevels = [...levels];
                                                                                        newLevels[lIdx].rules[rIdx].rate = (val ?? 0) / 100;
                                                                                        setLevels(newLevels);
                                                                                    }}
                                                                                    unit="%"
                                                                                    hideLabel
                                                                                    className="h-8 text-xs text-right bg-white"
                                                                                    placeholder="%"
                                                                                />
                                                                            </div>
                                                                            <div className="flex-1 sm:w-28 space-y-1">
                                                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider text-right block">Max Reward</Label>
                                                                                <SmartAmountInput
                                                                                    value={rule.maxReward ?? undefined}
                                                                                    onChange={(val) => {
                                                                                        const newLevels = [...levels];
                                                                                        newLevels[lIdx].rules[rIdx].maxReward = val ?? null;
                                                                                        setLevels(newLevels);
                                                                                    }}
                                                                                    hideLabel
                                                                                    className="h-8 text-xs text-right bg-white"
                                                                                    placeholder="Max (opt)"
                                                                                />
                                                                            </div>
                                                                            <div className="pb-1">
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => {
                                                                                        const newLevels = [...levels];
                                                                                        const dupe = JSON.parse(JSON.stringify(rule));
                                                                                        dupe.id = Math.random().toString(36).substr(2, 9);
                                                                                        newLevels[lIdx].rules.splice(rIdx + 1, 0, dupe);
                                                                                        setLevels(newLevels);
                                                                                    }}
                                                                                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                                                                >
                                                                                    <Copy className="h-3 w-3" />
                                                                                </Button>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => {
                                                                                        const newLevels = [...levels];
                                                                                        newLevels[lIdx].rules = level.rules.filter((_, i) => i !== rIdx);
                                                                                        setLevels(newLevels);
                                                                                    }}
                                                                                    className="h-8 w-8 text-slate-400 hover:text-rose-500"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 mt-6 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-700">Account Status</p>
                                <p className="text-[10px] text-slate-500 font-medium">Toggle whether this account is currently active.</p>
                            </div>
                            <Button
                                variant={isActive ? "outline" : "secondary"}
                                size="sm"
                                onClick={() => {
                                    if (isActive) {
                                        setShowCloseConfirm(true);
                                    } else {
                                        setIsActive(true);
                                    }
                                }}
                                className={cn(
                                    "h-8 px-4 font-bold text-[10px] uppercase tracking-wider transition-all",
                                    isActive ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-slate-200 text-slate-600 border-transparent"
                                )}
                            >
                                {isActive ? "Active" : "Closed"}
                            </Button>
                        </div>
                    </div>

                    <ConfirmationModal
                        isOpen={showCloseConfirm}
                        onClose={() => setShowCloseConfirm(false)}
                        onConfirm={async () => {
                            setIsActive(false);
                            // Save immediately if editing
                            if (isEdit && account) {
                                setLoading(true);
                                try {
                                    const success = await updateAccountConfig(account.id, { is_active: false });
                                    if (success) {
                                        toast.success("Account closed");
                                        onOpenChange(false);
                                        router.refresh();
                                    }
                                } finally {
                                    setLoading(false);
                                }
                            }
                        }}
                        title="Close Account?"
                        description="This will hide the account from active lists. You can still reactivate it later."
                        confirmText="Yes, Close it"
                        variant="destructive"
                    />

                    <Sheet open={showUnsavedConfirm} onOpenChange={(open) => !open && setShowUnsavedConfirm(false)}>
                        <SheetContent side="bottom" showClose={false} className="rounded-t-2xl border-t border-slate-200 p-0 sm:max-w-xl mx-auto shadow-2xl">
                            <div className="p-6 space-y-4">
                                <SheetHeader className="space-y-2 text-left">
                                    <SheetTitle className="text-xl font-black text-rose-600 flex items-center gap-2">
                                        <Trash2 className="h-5 w-5" />
                                        Unsaved Changes
                                    </SheetTitle>
                                    <SheetDescription className="text-sm font-medium text-slate-500">
                                        You have made changes to this account. Navigating away will discard these changes correctly.
                                    </SheetDescription>
                                </SheetHeader>
                                <SheetFooter className="flex-col gap-3 sm:flex-row sm:justify-end pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowUnsavedConfirm(false)}
                                        className="h-12 w-full font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 order-2 sm:order-1"
                                    >
                                        Keep Editing
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={confirmAction}
                                        className="h-12 w-full font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm order-1 sm:order-2"
                                    >
                                        Discard Changes
                                    </Button>
                                </SheetFooter>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <SheetFooter className="p-6 bg-white border-t border-slate-200 sm:justify-end gap-3">
                        <div className="flex flex-1 gap-3">
                            {onBack && (
                                <Button variant="outline" onClick={handleAttemptBack} className="h-10 px-4 font-bold text-blue-600 border-blue-200 hover:bg-blue-50">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" onClick={handleAttemptClose} className="h-10 px-6 font-bold text-slate-500">
                                Cancel
                            </Button>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="h-10 px-8 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
                        >
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isEdit ? "Save Changes" : "Create Account"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet >

            {/* Category Slide for creating new categories */}
            < CategorySlideV2
                open={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
                defaultType="expense"
                onBack={() => setIsCategoryDialogOpen(false)
                }
                onSuccess={(newCategoryId) => {
                    if (newCategoryId && activeCategoryCallback) {
                        activeCategoryCallback(newCategoryId);
                    }
                    setIsCategoryDialogOpen(false);
                    toast.success("Category created successfully");
                }}
            />
        </>
    );
}
function formatMoneyVND(amount: number) {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('vi-VN').format(amount);
}
