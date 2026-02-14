"use client"

import React, { useState, useEffect, useMemo, startTransition } from "react";
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
import { Wallet, Info, Trash2, Banknote, CreditCard, Building, Coins, HandCoins, PiggyBank, Receipt, DollarSign, Plus, Copy, ChevronLeft, CheckCircle2, Check, ChevronsUpDown, RotateCcw, Loader2 } from "lucide-react";
import { updateAccountConfig } from "@/services/account.service";
import { createAccount } from "@/actions/account-actions";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import { DayOfMonthPicker } from "@/components/ui/day-of-month-picker";
import { CategorySlide } from "@/components/accounts/v2/CategorySlide";

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
    const [isCashbackEnabled, setIsCashbackEnabled] = useState(false);
    const [cbType, setCbType] = useState<'none' | 'simple' | 'tiered'>('none');

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
        description?: string;
    }

    interface LevelState {
        id: string;
        name: string;
        minTotalSpend: number;
        defaultRate: number | null;
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

    // Initial load helper
    const loadFromAccount = (acc: Account) => {
        setName(acc.name || "");
        setType(acc.type || 'bank');
        setAccountNumber(acc.account_number || "");
        setCreditLimit(acc.credit_limit || 0);
        setIsActive(acc.is_active !== false);
        setImageUrl(acc.image_url || "");

        // MF5.4: Use updated normalizeCashbackConfig with full account object
        const cb = normalizeCashbackConfig(acc.cashback_config, acc) as any;
        setCycleType(cb.cycleType || 'calendar_month');
        // Prioritize explicit columns, fallback to legacy config logic
        setStatementDay(acc.statement_day ?? cb.statementDay ?? null);
        setDueDate(acc.due_date ?? cb.dueDate ?? null);
        setMinSpendTarget(cb.minSpendTarget ?? undefined);
        setDefaultRate(cb.defaultRate || 0);
        setMaxCashback(cb.maxBudget ?? undefined);

        // New fields
        setAnnualFee(acc.annual_fee || 0);
        setAnnualFeeWaiverTarget(acc.annual_fee_waiver_target || 0);
        setReceiverName(acc.receiver_name || "");
        setParentAccountId(acc.parent_account_id || null);
        setStartDate((acc as any).start_date);

        // Determine main type
        if (acc.type === 'bank') setActiveMainType('bank');
        else if (acc.type === 'credit_card') setActiveMainType('credit');
        else if (['savings', 'investment'].includes(acc.type)) setActiveMainType('savings');
        else setActiveMainType('others');

        const secured = acc.secured_by_account_id || "none";
        setSecuredById(secured);
        setIsCollateralLinked(secured !== "none");

        // Explicit cb_type from DB or derived
        const rawCbType = acc.cb_type || (acc.cashback_config ? 'simple' : 'none');

        const loadedLevels = (cb.levels || []).map((lvl: any) => ({
            id: lvl.id || Math.random().toString(36).substr(2, 9),
            name: lvl.name || "",
            minTotalSpend: lvl.minTotalSpend || 0,
            defaultRate: lvl.defaultRate || 0,
            rules: (lvl.rules || []).map((r: any) => ({
                id: r.id || Math.random().toString(36).substr(2, 9),
                categoryIds: r.categoryIds || [],
                rate: r.rate || 0,
                maxReward: r.maxReward || null,
                description: r.description
            }))
        }));

        setLevels(loadedLevels);

        // Advanced mode detection
        const hasMultipleLevels = loadedLevels.length > 1;
        const hasMultipleRules = loadedLevels.some((lvl: any) => lvl.rules.length > 1);
        const hasCategoryRules = loadedLevels.some((lvl: any) =>
            lvl.rules.some((rule: any) => rule.categoryIds && rule.categoryIds.length > 0)
        );

        // Check if it's a simple restricted config (Restricted = 1 Level with 1 Rule)
        let isActuallyRestricted = false;
        if (loadedLevels.length === 1 && loadedLevels[0].minTotalSpend === 0 && loadedLevels[0].rules.length === 1) {
            if (cb.defaultRate === 0 && loadedLevels[0].rules[0].categoryIds.length > 0) {
                isActuallyRestricted = true;
            }
        }

        setIsCategoryRestricted(isActuallyRestricted);

        if (isActuallyRestricted) {
            setRestrictedCategoryIds(loadedLevels[0].rules[0].categoryIds);
            setDefaultRate(loadedLevels[0].rules[0].rate);
        } else {
            setRestrictedCategoryIds([]);
            setDefaultRate(cb.defaultRate || 0);
        }

        const isActuallyAdvanced = (rawCbType === 'tiered' || hasMultipleLevels || hasMultipleRules || (hasCategoryRules && !isActuallyRestricted)) && !isActuallyRestricted;

        setIsAdvancedCashback(isActuallyAdvanced);
        setIsCashbackEnabled(rawCbType !== 'none');
        // Force cb_type to tiered if isActuallyAdvanced is true, otherwise respect existing simple/none
        setCbType(isActuallyAdvanced ? 'tiered' : (rawCbType !== 'none' ? 'simple' : 'none'));

        // If we loaded data but levels is empty, ensure at least one level
        if (isActuallyAdvanced && loadedLevels.length === 0) {
            setLevels([{
                id: Math.random().toString(36).substr(2, 9),
                name: "Level 1",
                minTotalSpend: 0,
                defaultRate: cb.defaultRate || 0,
                rules: []
            }]);
        }
    };

    // Initial load
    useEffect(() => {
        if (open && account) {
            loadFromAccount(account);

            // Re-fetch to ensure fresh data
            import('@/services/account.service').then(({ getAccountDetails }) => {
                getAccountDetails(account.id).then(fresh => {
                    if (fresh) loadFromAccount(fresh);
                });
            });
        } else if (open && !account) {
            // New account default state
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
            setIsCashbackEnabled(false);
            setCbType('none');
            setIsCategoryRestricted(false);
            setRestrictedCategoryIds([]);
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
                maxReward: r.maxReward,
                description: r.description
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
            const cb = normalizeCashbackConfig(account.cashback_config, account);

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
                statementDay: cb.statementDay,
                dueDate: cb.dueDate,
                minSpendTarget: cb.minSpendTarget,
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
                // Initialize with prop data first (instant)
                const loadFromAccount = (acc: Account) => {
                    setName(acc.name || "");
                    setType(acc.type || 'bank');
                    setAccountNumber(acc.account_number || "");
                    setCreditLimit(acc.credit_limit || 0);
                    setIsActive(acc.is_active !== false);
                    setImageUrl(acc.image_url || "");

                    const cb = normalizeCashbackConfig(acc.cashback_config) as any;
                    setCycleType(cb.cycleType || 'calendar_month');
                    setStatementDay(cb.statementDay ?? null);
                    setDueDate(cb.dueDate ?? null);
                    setMinSpendTarget(cb.minSpendTarget ?? undefined);
                    setDefaultRate(cb.defaultRate || 0);
                    setMaxCashback(cb.maxBudget ?? undefined);

                    // New fields
                    setAnnualFee(acc.annual_fee || 0);
                    setAnnualFeeWaiverTarget(acc.annual_fee_waiver_target || 0);
                    setReceiverName(acc.receiver_name || "");
                    setParentAccountId(acc.parent_account_id || null);
                    setStartDate((acc as any).start_date);

                    // Determine main type
                    if (acc.type === 'bank') setActiveMainType('bank');
                    else if (acc.type === 'credit_card') setActiveMainType('credit');
                    else if (['savings', 'investment'].includes(acc.type)) setActiveMainType('savings');
                    else setActiveMainType('others');

                    const secured = acc.secured_by_account_id || "none";
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

                    // Advanced mode detection: 
                    // - Multiple levels, OR
                    // - Multiple rules in any level, OR
                    // - Any level has category-specific rules (rules with categoryIds)
                    const hasMultipleLevels = loadedLevels.length > 1;
                    const hasMultipleRules = loadedLevels.some((lvl: any) => lvl.rules.length > 1);
                    const hasCategoryRules = loadedLevels.some((lvl: any) =>
                        lvl.rules.some((rule: any) => rule.categoryIds && rule.categoryIds.length > 0)
                    );

                    setIsAdvancedCashback(hasMultipleLevels || hasMultipleRules || hasCategoryRules);
                    setIsCashbackEnabled(cb.defaultRate > 0 || loadedLevels.length > 0);

                    // Check if it's a simple restricted config
                    // MF5.4.3: Only trigger restricted mode if the overall default rate is 0.
                    // If defaultRate > 0, it means it's a tiered card (e.g. VCB Signature 0.5% base + 10% Edu)
                    if (loadedLevels.length === 1 && loadedLevels[0].minTotalSpend === 0 && loadedLevels[0].rules.length === 1 && cb.defaultRate === 0) {
                        setIsCategoryRestricted(true);
                        setRestrictedCategoryIds(loadedLevels[0].rules[0].categoryIds);
                        setDefaultRate(loadedLevels[0].rules[0].rate);
                    } else {
                        // If it's not restricted mode, they see Base Rate = cb.defaultRate.
                        // To see categories, they MUST use Advanced mode.
                        setIsCategoryRestricted(false);
                        setRestrictedCategoryIds([]);
                        setDefaultRate(cb.defaultRate || 0);
                    }
                };

                loadFromAccount(account);

                // Double check with fresh data from DB (in case props are stale)
                import('@/services/account.service').then(({ getAccountDetails }) => {
                    getAccountDetails(account.id).then(fresh => {
                        if (fresh) {
                            console.log('[AccountSlideV2] Refreshed data from DB', fresh);
                            // Only update if critical fields differ (avoid UI flicker for trivial things)
                            // Or just re-run load logic, React handles diffing.
                            // Especially important for account_number and receiver_name
                            if (fresh.account_number !== account.account_number || fresh.receiver_name !== account.receiver_name) {
                                setAccountNumber(fresh.account_number || "");
                                setReceiverName(fresh.receiver_name || "");
                            }
                            // Update checking other fields reference for completeness
                            loadFromAccount(fresh);
                        }
                    });
                });

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
                // Determine cb_type
                let effectiveCbType: 'none' | 'simple' | 'tiered' = 'none';
                if (isCashbackEnabled) {
                    effectiveCbType = (isAdvancedCashback || isCategoryRestricted) ? 'tiered' : 'simple';
                }

                // Map levels
                let finalLevels = [];
                if (effectiveCbType === 'tiered') {
                    if (isCategoryRestricted) {
                        finalLevels = [{
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
                        }];
                    } else {
                        finalLevels = levels.map(lvl => ({
                            id: lvl.id,
                            name: lvl.name,
                            minTotalSpend: lvl.minTotalSpend,
                            defaultRate: lvl.defaultRate,
                            rules: lvl.rules.map(r => ({
                                id: r.id,
                                categoryIds: r.categoryIds,
                                rate: r.rate,
                                maxReward: r.maxReward,
                                description: r.description
                            }))
                        }));
                    }
                }

                console.log('[AccountSlideV2] Calling updateAccountConfigAction...', { id: account.id, effectiveCbType });
                const { updateAccountConfigAction } = await import('@/actions/account-actions');
                const success = await updateAccountConfigAction({
                    id: account.id,
                    name,
                    type,
                    accountNumber: accountNumber,
                    creditLimit: creditLimit,
                    isActive: isActive,
                    imageUrl: imageUrl,
                    annualFee: annualFee,
                    annualFeeWaiverTarget: annualFeeWaiverTarget,
                    receiverName: receiverName,
                    parentAccountId: parentAccountId,

                    // New Column-based fields
                    cb_type: effectiveCbType,
                    cb_base_rate: isCategoryRestricted ? 0 : defaultRate,
                    cb_max_budget: maxCashback || 0,
                    cb_is_unlimited: !maxCashback,
                    cb_rules_json: effectiveCbType === 'tiered' ? finalLevels : null,

                    // Keep legacy config for safety during transition
                    cashbackConfig: isCashbackEnabled ? {
                        program: {
                            cycleType,
                            statementDay,
                            dueDate,
                            minSpendTarget,
                            defaultRate: isCategoryRestricted ? 0 : defaultRate,
                            maxBudget: maxCashback,
                            levels: finalLevels
                        }
                    } : null
                });

                if (success) {
                    console.log('[AccountSlideV2] Update success');
                    toast.success("Account updated successfully");
                    onOpenChange(false);
                    startTransition(() => {
                        router.refresh();
                    });
                } else {
                    console.error('[AccountSlideV2] Update failed');
                    toast.error("Failed to update account");
                }
            } else {
                // Determine cb_type
                let effectiveCbType: 'none' | 'simple' | 'tiered' = 'none';
                if (isCashbackEnabled) {
                    effectiveCbType = (isAdvancedCashback || isCategoryRestricted) ? 'tiered' : 'simple';
                }

                // Map levels
                let finalLevels = [];
                if (effectiveCbType === 'tiered') {
                    if (isCategoryRestricted) {
                        finalLevels = [{
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
                        }];
                    } else {
                        finalLevels = levels.map(lvl => ({
                            id: lvl.id,
                            name: lvl.name,
                            minTotalSpend: lvl.minTotalSpend,
                            defaultRate: lvl.defaultRate,
                            rules: lvl.rules.map(r => ({
                                id: r.id,
                                categoryIds: r.categoryIds,
                                rate: r.rate,
                                maxReward: r.maxReward,
                                description: r.description
                            }))
                        }));
                    }
                }

                // Implementation for create
                console.log('[AccountSlideV2] Creating account...', { name, effectiveCbType });
                const result = await createAccount({
                    name,
                    type,
                    accountNumber: accountNumber,
                    creditLimit: creditLimit,
                    imageUrl: imageUrl,
                    annualFee: annualFee,
                    annualFeeWaiverTarget: annualFeeWaiverTarget,
                    receiverName: receiverName,
                    parentAccountId: parentAccountId,

                    // New Column-based fields
                    cb_type: effectiveCbType,
                    cb_base_rate: isCategoryRestricted ? 0 : defaultRate,
                    cb_max_budget: maxCashback || 0,
                    cb_is_unlimited: !maxCashback,
                    cb_rules_json: effectiveCbType === 'tiered' ? finalLevels : null,

                    // Legacy config
                    cashbackConfig: isCashbackEnabled ? {
                        program: {
                            cycleType,
                            statementDay,
                            dueDate,
                            minSpendTarget,
                            defaultRate: isCategoryRestricted ? 0 : defaultRate,
                            maxBudget: maxCashback,
                            levels: finalLevels
                        }
                    } : null
                });

                if (result.error) {
                    console.error('[AccountSlideV2] Create failed', result.error);
                    toast.error(`Failed to create account: ${result.error.message}`);
                } else {
                    console.log('[AccountSlideV2] Create success');
                    toast.success("Account created successfully");
                    onOpenChange(false);
                    startTransition(() => {
                        router.refresh();
                    });
                }
            }
        } catch (error) {
            console.error('[AccountSlideV2] Handle save error', error);
            toast.error("An error occurred during save");
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
                <SheetContent side="right" className={cn("w-full transition-all duration-300 ease-in-out p-0 flex flex-col gap-0 border-l border-slate-200", isAdvancedCashback ? "sm:max-w-3xl" : "sm:max-w-xl")}>
                    <div className="p-6 bg-slate-50/50 border-b border-slate-200">
                        <SheetHeader className="text-left">
                            <div className="flex items-center gap-3 mb-2">
                                {onBack && (
                                    <button
                                        onClick={handleAttemptBack}
                                        className="h-9 w-9 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95"
                                        title="Back"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                )}
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
                                        { id: 'bank', icon: Building, label: 'Account', color: 'text-blue-600' },
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

                            {/* Collateral / Secured By - Only for Credit Cards */}
                            {type === 'credit_card' && (
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
                            )}

                            {/* Cashback Configuration - For Credit Cards & Bank/Debit Accounts */}
                            {(type === 'credit_card' || type === 'bank') && (
                                <div className="pt-4 border-t border-slate-200">
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-100 p-1.5 rounded-full">
                                                    <Coins className="h-3.5 w-3.5 text-amber-600" />
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-800">Chính sách Hoàn tiền</h3>
                                                <Switch
                                                    checked={isCashbackEnabled}
                                                    onCheckedChange={(checked) => {
                                                        setIsCashbackEnabled(checked);
                                                        if (checked && cbType === 'none') setCbType('simple');
                                                    }}
                                                    className="scale-75"
                                                />
                                            </div>
                                            {isCashbackEnabled && (
                                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                                    <button
                                                        onClick={() => {
                                                            setIsAdvancedCashback(false);
                                                            setCbType('simple');
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                                            !isAdvancedCashback ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                                        )}
                                                    >
                                                        Cố định (Simple)
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setIsAdvancedCashback(true);
                                                            setCbType('tiered');
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                                            isAdvancedCashback ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                                        )}
                                                    >
                                                        Phân bậc (Tiered)
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isCashbackEnabled && (
                                            <div className="flex flex-col">
                                                <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-1">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chu kỳ hoàn tiền</Label>
                                                                <CustomTooltip content="Chọn cách tính chu kỳ hoàn tiền: Theo tháng dương lịch hoặc theo ngày sao kê của thẻ.">
                                                                    <Info className="h-3 w-3 text-slate-300 cursor-help" />
                                                                </CustomTooltip>
                                                            </div>
                                                            <Select
                                                                value={cycleType ?? 'calendar_month'}
                                                                onValueChange={(v) => {
                                                                    setCycleType(v as any);
                                                                    // We no longer force statementDay to 1 here, as statementDay is now independent
                                                                }}
                                                                items={[
                                                                    { value: "calendar_month", label: "Tháng dương lịch" },
                                                                    { value: "statement_cycle", label: "Chu kỳ sao kê" },
                                                                ]}
                                                                className="h-9 font-bold bg-slate-50"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tiêu tối thiểu</Label>
                                                                <CustomTooltip content="Chi tiêu tối thiểu trong kỳ để bắt đầu được tính hoàn tiền (ví dụ: VIB Travel Elite yêu cầu 5tr).">
                                                                    <Info className="h-3 w-3 text-slate-300 cursor-help" />
                                                                </CustomTooltip>
                                                            </div>
                                                            <SmartAmountInput
                                                                value={minSpendTarget}
                                                                onChange={setMinSpendTarget}
                                                                hideLabel
                                                                className="h-9 font-bold"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tỷ lệ cơ bản (%)</Label>
                                                                <CustomTooltip content="Tỷ lệ hoàn tiền mặc định cho mọi giao dịch.">
                                                                    <Info className="h-3 w-3 text-slate-300 cursor-help" />
                                                                </CustomTooltip>
                                                            </div>
                                                            <SmartAmountInput
                                                                value={defaultRate * 100}
                                                                onChange={(val) => setDefaultRate((val ?? 0) / 100)}
                                                                unit="%"
                                                                hideLabel
                                                                className="h-9 font-bold"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hạn mức tối đa</Label>
                                                                <CustomTooltip content="Số tiền hoàn tối đa mỗi tháng (thường từ 300k - 1tr tùy thẻ).">
                                                                    <Info className="h-3 w-3 text-slate-300 cursor-help" />
                                                                </CustomTooltip>
                                                            </div>
                                                            <SmartAmountInput
                                                                value={maxCashback}
                                                                onChange={setMaxCashback}
                                                                hideLabel
                                                                placeholder="Vô hạn (0)"
                                                                className="h-9 font-bold"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Category Restriction Section (Only for simple mode or simple tiered) */}
                                                    {!isAdvancedCashback && (
                                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                                                            <div className="space-y-3">
                                                                <div className="space-y-1.5 text-rose-600 bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Label className="text-[10px] font-black uppercase tracking-wider">Giới hạn danh mục</Label>
                                                                            <CustomTooltip content="CHỈ hoàn tiền cho các danh mục được chọn. Các danh mục khác sẽ nhận 0%.">
                                                                                <Info className="h-3 w-3 text-rose-300 cursor-help" />
                                                                            </CustomTooltip>
                                                                        </div>
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
                                                                                        {restrictedCategoryIds.length === 0 ? "Chọn danh mục..." : `${restrictedCategoryIds.length} Đã chọn`}
                                                                                    </span>
                                                                                    <Plus className="h-3 w-3 opacity-50" />
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-64 p-0" align="start">
                                                                                <Command>
                                                                                    <CommandInput placeholder="Tìm danh mục..." className="h-8 text-[11px]" />
                                                                                    <CommandList className="max-h-48">
                                                                                        <CommandEmpty className="text-xs py-2 px-4">Không tìm thấy.</CommandEmpty>
                                                                                        <CommandGroup>
                                                                                            {categories?.map((cat) => (
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
                                                                                                    <div className="flex items-center gap-2 w-full">
                                                                                                        <div className="w-4 h-4 rounded-none overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                                                                            {cat.image_url ? (
                                                                                                                <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                                                                                            ) : (
                                                                                                                <span className="text-[8px] font-bold text-slate-500">{cat.name?.[0] || "?"}</span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                        <span className="truncate flex-1 text-left">{cat.name}</span>
                                                                                                        {restrictedCategoryIds.includes(cat.id) && (
                                                                                                            <Check className="ml-auto h-3 w-3 opacity-100" />
                                                                                                        )}
                                                                                                    </div>
                                                                                                </CommandItem>
                                                                                            ))}
                                                                                        </CommandGroup>
                                                                                        <div className="p-1 border-t border-slate-100 bg-slate-50">
                                                                                            <CommandItem
                                                                                                onSelect={() => {
                                                                                                    setActiveCategoryCallback(() => (categoryId: string) => {
                                                                                                        setRestrictedCategoryIds([...restrictedCategoryIds, categoryId]);
                                                                                                    });
                                                                                                    setIsCategoryDialogOpen(true);
                                                                                                }}
                                                                                                className="text-blue-600 font-bold text-[11px] justify-center cursor-pointer hover:bg-white w-full"
                                                                                            >
                                                                                                <Plus className="mr-2 h-3 w-3" />
                                                                                                Thêm Danh mục mới
                                                                                            </CommandItem>
                                                                                        </div>
                                                                                    </CommandList>
                                                                                </Command>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 bg-blue-50/50 p-2 rounded-lg border border-blue-100 max-h-[64px]">
                                                                <Info className="h-3 w-3 text-blue-500 shrink-0" />
                                                                <p className="text-[9px] text-blue-700 font-medium leading-tight">
                                                                    {isCategoryRestricted
                                                                        ? "Chỉ hoàn tiền cho các danh mục này. Các chi tiêu khác là 0%."
                                                                        : "Áp dụng tỷ lệ cơ bản cho mọi giao dịch."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Advanced Mode: Tiered Levels */}
                                                {isAdvancedCashback && (
                                                    <div className="bg-slate-50 border-t border-slate-100">
                                                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">Cơ chế Phân bậc (Levels)</Label>
                                                                <CustomTooltip content="Thiết lập các mốc chi tiêu (ví dụ: Tiêu mốc 1 hoàn 0.1%, tiêu mốc 2 hoàn 10% giáo dục).">
                                                                    <Info className="h-3 w-3 text-slate-400 cursor-help" />
                                                                </CustomTooltip>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setLevels([...levels, {
                                                                        id: Math.random().toString(36).substr(2, 9),
                                                                        name: `Bậc ${levels.length + 1}`,
                                                                        minTotalSpend: 0,
                                                                        defaultRate: 0,
                                                                        rules: []
                                                                    }]);
                                                                }}
                                                                className="h-7 px-3 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-blue-600 font-bold uppercase tracking-wider shadow-sm"
                                                            >
                                                                <Plus className="h-3 w-3 mr-1" /> Thêm Bậc
                                                            </Button>
                                                        </div>

                                                        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                                            {levels.length === 0 && (
                                                                <div className="text-center py-8 text-xs text-slate-400 italic">Chưa có mốc chi tiêu nào. Click Thêm Bậc để bắt đầu.</div>
                                                            )}
                                                            {levels.map((level, lIdx) => (
                                                                <div key={level.id} className="p-4 space-y-4 bg-white/50 hover:bg-white transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex-1 space-y-1.5 font-bold">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-[10px] font-black text-slate-400 uppercase">Bậc {lIdx + 1}</span>
                                                                                <Input
                                                                                    value={level.name}
                                                                                    onChange={(e) => {
                                                                                        const newLevels = [...levels];
                                                                                        newLevels[lIdx].name = e.target.value;
                                                                                        setLevels(newLevels);
                                                                                    }}
                                                                                    placeholder="Tên mốc (VD: Mốc tiêu chuẩn)"
                                                                                    className="h-8 text-sm font-bold bg-white"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
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

                                                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                                                        <div className="space-y-1.5">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tiêu tối thiểu</Label>
                                                                                <CustomTooltip content="Số tiền tổng chi tiêu trong tháng để kích hoạt bậc này.">
                                                                                    <Info className="h-3 w-3 text-slate-300 cursor-help" />
                                                                                </CustomTooltip>
                                                                            </div>
                                                                            <SmartAmountInput
                                                                                value={level.minTotalSpend}
                                                                                onChange={(val) => {
                                                                                    const newLevels = [...levels];
                                                                                    newLevels[lIdx].minTotalSpend = val ?? 0;
                                                                                    setLevels(newLevels);
                                                                                }}
                                                                                hideLabel
                                                                                className="h-9 bg-white font-bold"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tỷ lệ cơ bản Bậc (%)</Label>
                                                                                <CustomTooltip content="Tỷ lệ hoàn cho mọi chi tiêu khi đạt mốc này (nếu không khớp danh mục đặc biệt).">
                                                                                    <Info className="h-3 w-3 text-slate-300 cursor-help" />
                                                                                </CustomTooltip>
                                                                            </div>
                                                                            <SmartAmountInput
                                                                                value={(level.defaultRate || 0) * 100}
                                                                                onChange={(val) => {
                                                                                    const newLevels = [...levels];
                                                                                    newLevels[lIdx].defaultRate = (val ?? 0) / 100;
                                                                                    setLevels(newLevels);
                                                                                }}
                                                                                unit="%"
                                                                                hideLabel
                                                                                className="h-9 bg-white font-bold"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-2 mt-4">
                                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Quy tắc Danh mục Đặc biệt</Label>
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
                                                                                <Plus className="h-3 w-3 mr-1" /> Thêm Quy tắc
                                                                            </Button>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            {level.rules.length === 0 && (
                                                                                <p className="text-[10px] text-slate-400 italic py-2">Chưa có quy tắc danh mục đặc biệt nào.</p>
                                                                            )}
                                                                            {level.rules.map((rule: any, rIdx: number) => (
                                                                                <div key={rule.id} className="bg-slate-100/50 p-2 rounded-lg border border-slate-200 group relative">
                                                                                    <div className="flex flex-col sm:grid sm:grid-cols-[1.5fr_1fr_1.2fr_40px] gap-3">
                                                                                        {/* 1. Categories */}
                                                                                        <Popover>
                                                                                            <PopoverTrigger asChild>
                                                                                                <Button variant="outline" className="h-9 justify-between text-xs bg-white font-medium px-2">
                                                                                                    <span className="truncate">
                                                                                                        {rule.categoryIds.length === 0 ? "Chọn Danh mục..." : `${rule.categoryIds.length} DM`}
                                                                                                    </span>
                                                                                                    <ChevronsUpDown className="h-3 w-3 opacity-50 ml-1" />
                                                                                                </Button>
                                                                                            </PopoverTrigger>
                                                                                            <PopoverContent className="w-64 p-0" align="start">
                                                                                                <Command>
                                                                                                    <CommandInput placeholder="Tìm kiếm..." className="h-8 text-xs" />
                                                                                                    <CommandList className="max-h-48">
                                                                                                        <CommandGroup>
                                                                                                            {categories.map((cat: any) => (
                                                                                                                <CommandItem
                                                                                                                    key={cat.id}
                                                                                                                    value={cat.name}
                                                                                                                    onSelect={() => {
                                                                                                                        const newLevels = [...levels];
                                                                                                                        const ids = newLevels[lIdx].rules[rIdx].categoryIds;
                                                                                                                        newLevels[lIdx].rules[rIdx].categoryIds = ids.includes(cat.id) ? ids.filter(i => i !== cat.id) : [...ids, cat.id];
                                                                                                                        setLevels(newLevels);
                                                                                                                    }}
                                                                                                                    className="text-xs"
                                                                                                                >
                                                                                                                    <div className="flex items-center gap-2 w-full">
                                                                                                                        <div className="w-4 h-4 rounded-none overflow-hidden bg-slate-100 flex items-center justify-center">
                                                                                                                            {cat.image_url ? <img src={cat.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px] font-bold text-slate-500">{cat.name[0]}</span>}
                                                                                                                        </div>
                                                                                                                        <span>{cat.name}</span>
                                                                                                                    </div>
                                                                                                                    <Check className={cn("ml-auto h-3 w-3", rule.categoryIds.includes(cat.id) ? "opacity-100" : "opacity-0")} />
                                                                                                                </CommandItem>
                                                                                                            ))}
                                                                                                        </CommandGroup>
                                                                                                    </CommandList>
                                                                                                </Command>
                                                                                            </PopoverContent>
                                                                                        </Popover>

                                                                                        {/* 2. Rate */}
                                                                                        <div className="flex flex-col">
                                                                                            <SmartAmountInput
                                                                                                value={rule.rate > 0 ? (rule.rate || 0) * 100 : undefined}
                                                                                                onChange={(val) => {
                                                                                                    const newLevels = [...levels];
                                                                                                    newLevels[lIdx].rules[rIdx].rate = (val ?? 0) / 100;
                                                                                                    setLevels(newLevels);
                                                                                                }}
                                                                                                unit="%"
                                                                                                hideLabel
                                                                                                className="h-9 text-xs bg-white text-center font-bold"
                                                                                                placeholder={`${((level.defaultRate || 0) * 100).toFixed(2)}%`}
                                                                                            />
                                                                                            {rule.rate === 0 && (
                                                                                                <p className="text-[9px] text-slate-400 font-medium italic mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                                                                                                    Inherited
                                                                                                </p>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* 3. Max Reward */}
                                                                                        <SmartAmountInput
                                                                                            value={rule.maxReward ?? undefined}
                                                                                            onChange={(val) => {
                                                                                                const newLevels = [...levels];
                                                                                                newLevels[lIdx].rules[rIdx].maxReward = val ?? null;
                                                                                                setLevels(newLevels);
                                                                                            }}
                                                                                            hideLabel
                                                                                            className="h-9 text-xs bg-white text-right font-bold"
                                                                                            placeholder="Thưởng tối đa"
                                                                                        />

                                                                                        {/* 4. Delete */}
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-9 w-9 text-slate-300 hover:text-rose-500"
                                                                                            onClick={() => {
                                                                                                const newLevels = [...levels];
                                                                                                newLevels[lIdx].rules.splice(rIdx, 1);
                                                                                                setLevels(newLevels);
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </div>

                                                                                    {/* Tags Row (Full Width Below) */}
                                                                                    {rule.categoryIds.length > 0 && (
                                                                                        <div className="flex flex-wrap gap-1 mt-2 border-t border-slate-100 pt-2">
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
                                                                                                                        <span className="text-[9px] text-blue-400 font-normal ml-1">({cat.mcc_codes.join(', ')})</span>
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
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Credit Card Settings (Statement & Due Date) - Always visible for credit cards */}
                            {activeMainType === 'credit' && (
                                <div className="p-4 bg-slate-50 border-y border-slate-100 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-indigo-100 p-1 rounded-md">
                                            <CreditCard className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cấu hình thẻ tín dụng</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ngày sao kê</Label>
                                                <CustomTooltip content="Ngày ngân hàng chốt sao kê hàng tháng.">
                                                    <Info className="h-3 w-3 text-slate-300 cursor-help" />
                                                </CustomTooltip>
                                            </div>
                                            <DayOfMonthPicker
                                                value={statementDay}
                                                onChange={setStatementDay}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hạn thanh toán</Label>
                                                <CustomTooltip content="Ngày hạn chót thanh toán dư nợ.">
                                                    <Info className="h-3 w-3 text-slate-300 cursor-help" />
                                                </CustomTooltip>
                                            </div>
                                            <DayOfMonthPicker
                                                value={dueDate}
                                                onChange={setDueDate}
                                                className="h-9"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-white border-y border-slate-100 flex items-center justify-between">
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
                    </div>

                    <SheetFooter className="p-6 bg-white border-t border-slate-200 sm:justify-end gap-3">
                        <div className="flex flex-1 gap-3">
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
            </Sheet>

            {/* Category Slide for creating new categories */}
            <CategorySlide
                open={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
                defaultType="expense"
                onBack={() => setIsCategoryDialogOpen(false)}
                onSuccess={(newCategoryId) => {
                    if (newCategoryId && activeCategoryCallback) {
                        activeCategoryCallback(newCategoryId);
                    }
                    setIsCategoryDialogOpen(false);
                    toast.success("Category created successfully");
                    // Refresh to update categories prop from parent
                    router.refresh();
                }}
            />
        </>
    );
}
function formatMoneyVND(amount: number) {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('vi-VN').format(amount);
}
