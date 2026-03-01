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
import { Wallet, Info, Trash2, Banknote, CreditCard, Building, Coins, HandCoins, PiggyBank, Receipt, DollarSign, Plus, Copy, ChevronLeft, CheckCircle2, Check, ChevronsUpDown, RotateCcw, Loader2, Sparkles, X, Infinity, Building2, Calendar, CalendarClock, FileText, Search } from "lucide-react";
import { updateAccountConfig } from "@/services/account.service";
import { createAccount } from "@/actions/account-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { normalizeCashbackConfig, CashbackProgram } from "@/lib/cashback";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    PopoverAnchor,
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
import { CashbackConfigForm } from "./forms/CashbackConfigForm";
import { CashbackRulesJson } from "@/types/cashback.types";
import { UnsavedChangesDialog } from "@/components/transaction/slide-v2/unsaved-changes-dialog";

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
    zIndex?: number;
}

import { Category, Person, Subscription } from "@/types/moneyflow.types";
import { PeopleSlideV2 } from "../../people/v2/people-slide-v2";
import { getPeopleAction } from "@/actions/people-actions";
import { getServicesAction } from "@/actions/service-actions";

type CashbackCycleType = 'calendar_month' | 'statement_cycle';

// PersonPickerDropdown: A cmdk-free searchable person picker
// Reason: cmdk v1.1.1's z() sort function uses appendChild() directly on DOM nodes,
// which crashes in React 19 when inside a Portal (Popover inside Sheet).
function PersonPickerDropdown({
    people,
    selectedId,
    onSelect,
    onCreateNew,
}: {
    people: Person[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCreateNew: () => void;
}) {
    const [search, setSearch] = React.useState('');
    const filtered = people
        .filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
        <div className="flex flex-col">
            {/* Search input — plain HTML, no cmdk */}
            <div className="flex items-center gap-2 border-b px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search person..."
                    className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-slate-400"
                    autoFocus
                />
            </div>
            {/* Filtered list */}
            <div className="max-h-[200px] overflow-y-auto p-1">
                {filtered.length === 0 && (
                    <div className="py-4 text-center text-[11px] text-slate-400">No person found.</div>
                )}
                {filtered.map(p => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelect(p.id)}
                        className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[11px] hover:bg-slate-50 transition-colors text-left",
                            selectedId === p.id && "bg-slate-100"
                        )}
                    >
                        <div className="w-5 h-5 rounded-none overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                            {p.image_url ? (
                                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[9px] font-bold text-slate-500">{(p.name || 'P')[0]}</span>
                            )}
                        </div>
                        <span className="truncate flex-1">{p.name}</span>
                        {selectedId === p.id && <Check className="h-3 w-3 text-slate-600 shrink-0" />}
                    </button>
                ))}
            </div>
            {/* Create new */}
            <div className="border-t border-slate-100 p-1">
                <button
                    type="button"
                    onClick={onCreateNew}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[10px] font-black uppercase text-indigo-600 hover:bg-slate-50 transition-colors"
                >
                    <Plus className="h-3 w-3" />
                    Create New Person
                </button>
            </div>
        </div>
    );
}

// AccountNumberPicker: cmdk-free account number picker
function AccountNumberPicker({
    allAccounts,
    selectedNumber,
    receiverName,
    onSelect,
    onClose,
    setReceiverName,
}: {
    allAccounts: Account[];
    selectedNumber: string;
    receiverName: string;
    onSelect: (num: string) => void;
    onClose: () => void;
    setReceiverName: (name: string) => void;
}) {
    const [search, setSearch] = React.useState('');
    const uniqueAccounts = React.useMemo(() => {
        const seen = new Set<string>();
        return allAccounts.filter(a => {
            if (!a.account_number || seen.has(a.account_number)) return false;
            seen.add(a.account_number);
            return true;
        });
    }, [allAccounts]);

    const filtered = uniqueAccounts.filter(a =>
        (a.account_number || '').includes(search) ||
        (a.receiver_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleUseTyped = () => {
        if (search) {
            onSelect(search);
            const match = allAccounts.find(a => a.account_number === search);
            if (match?.receiver_name && !receiverName) {
                setReceiverName(match.receiver_name);
                toast.success(`Found owner: ${match.receiver_name}`);
            }
            onClose();
        }
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Type to search or add new..."
                    className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-slate-400"
                    autoFocus
                />
            </div>
            <div className="max-h-[260px] overflow-y-auto p-1">
                {filtered.length === 0 ? (
                    <div className="py-3 px-4 flex flex-col items-center gap-2">
                        <span className="text-[11px] text-slate-400">No matching account found.</span>
                        {search && (
                            <button type="button" onClick={handleUseTyped}
                                className="w-full h-7 text-[10px] border border-dashed border-blue-200 text-blue-600 bg-blue-50/50 rounded-md flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors">
                                <Plus className="h-3 w-3" /> Use &quot;{search}&quot;
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Suggestions</div>
                        {filtered.map(acc => {
                            const isCredit = acc.type === 'credit_card';
                            const displayNum = isCredit ? `...${acc.account_number!.slice(-4)}` : acc.account_number;
                            return (
                                <button key={acc.id} type="button"
                                    onClick={() => {
                                        onSelect(acc.account_number!);
                                        if (acc.receiver_name && !receiverName) {
                                            setReceiverName(acc.receiver_name);
                                            toast.success(`Filled owner: ${acc.receiver_name}`);
                                        }
                                        onClose();
                                    }}
                                    className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-[11px] hover:bg-slate-50 transition-colors text-left",
                                        selectedNumber === acc.account_number && "bg-slate-100")}>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700">{displayNum}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {acc.receiver_name || acc.name}{isCredit && " (Credit Card)"}
                                        </span>
                                    </div>
                                    {selectedNumber === acc.account_number && <Check className="h-3 w-3 text-blue-600 shrink-0" />}
                                </button>
                            );
                        })}
                        {search && (
                            <button type="button" onClick={handleUseTyped}
                                className="w-full mt-1 h-7 text-[10px] border border-dashed border-blue-200 text-blue-600 bg-blue-50/50 rounded-md flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors">
                                <Plus className="h-3 w-3" /> Use &quot;{search}&quot;
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ReceiverNamePicker: cmdk-free receiver name picker
function ReceiverNamePicker({
    allAccounts,
    selectedName,
    onSelect,
    onClose,
}: {
    allAccounts: Account[];
    selectedName: string;
    onSelect: (name: string) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = React.useState('');
    const uniqueNames = React.useMemo(() => {
        const seen = new Set<string>();
        return allAccounts.filter(a => {
            if (!a.receiver_name || seen.has(a.receiver_name)) return false;
            seen.add(a.receiver_name);
            return true;
        });
    }, [allAccounts]);

    const filtered = uniqueNames.filter(a =>
        (a.receiver_name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Type to search or add new..."
                    className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-slate-400"
                    autoFocus
                />
            </div>
            <div className="max-h-[260px] overflow-y-auto p-1">
                {filtered.length === 0 ? (
                    <div className="py-3 px-4 flex flex-col items-center gap-2">
                        <span className="text-[11px] text-slate-400">No name found.</span>
                        {search && (
                            <button type="button" onClick={() => { onSelect(search.toUpperCase()); onClose(); }}
                                className="w-full h-7 text-[10px] border border-dashed border-blue-200 text-blue-600 bg-blue-50/50 rounded-md flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors">
                                <Plus className="h-3 w-3" /> Use &quot;{search.toUpperCase()}&quot;
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {filtered.map(acc => (
                            <button key={acc.id} type="button"
                                onClick={() => { onSelect(acc.receiver_name!.toUpperCase()); onClose(); }}
                                className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-[11px] hover:bg-slate-50 transition-colors text-left uppercase font-medium",
                                    selectedName === acc.receiver_name?.toUpperCase() && "bg-slate-100")}>
                                <span>{acc.receiver_name?.toUpperCase()}</span>
                                {selectedName === acc.receiver_name?.toUpperCase() && <Check className="h-3 w-3 text-blue-600 shrink-0" />}
                            </button>
                        ))}
                        {search && !filtered.some(a => a.receiver_name?.toLowerCase() === search.toLowerCase()) && (
                            <button type="button" onClick={() => { onSelect(search.toUpperCase()); onClose(); }}
                                className="w-full mt-1 h-7 text-[10px] border border-dashed border-blue-200 text-blue-600 bg-blue-50/50 rounded-md flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors">
                                <Plus className="h-3 w-3" /> Use &quot;{search.toUpperCase()}&quot;
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ParentAccountPicker: cmdk-free parent account picker
function ParentAccountPicker({
    allAccounts,
    currentAccountId,
    nameFilter,
    selectedId,
    onSelect,
    onClose,
}: {
    allAccounts: Account[];
    currentAccountId: string | undefined;
    nameFilter: string;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = React.useState('');
    const candidates = allAccounts
        .filter(a => a.id !== currentAccountId && (a.type === 'bank' || a.type === 'credit_card' || a.type === 'ewallet'))
        .filter(a => {
            if (nameFilter && nameFilter.length >= 3) {
                const prefix = nameFilter.substring(0, 4).toLowerCase();
                return a.name.toLowerCase().startsWith(prefix);
            }
            return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const filtered = search
        ? candidates.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
        : candidates;

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search parent..."
                    className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-slate-400"
                    autoFocus
                />
            </div>
            <div className="max-h-[200px] overflow-y-auto p-1">
                {/* None option */}
                <button type="button" onClick={() => { onSelect(null); onClose(); }}
                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[11px] hover:bg-slate-50 transition-colors text-left font-medium",
                        !selectedId && "bg-slate-100")}>
                    <Check className={cn("h-3 w-3 shrink-0", !selectedId ? "opacity-100" : "opacity-0")} />
                    None (Self)
                </button>
                {filtered.length === 0 && search && (
                    <div className="py-2 text-center text-[11px] text-slate-400">No account found.</div>
                )}
                {filtered.map(a => (
                    <button key={a.id} type="button" onClick={() => { onSelect(a.id); onClose(); }}
                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[11px] hover:bg-slate-50 transition-colors text-left",
                            selectedId === a.id && "bg-slate-100")}>
                        <div className="w-6 h-6 rounded-none overflow-hidden flex items-center justify-center shrink-0">
                            {a.image_url ? (
                                <img src={a.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-[10px] font-bold text-slate-500">{a.name[0]}</span>
                            )}
                        </div>
                        <span className="truncate flex-1">{a.name}</span>
                        {selectedId === a.id && <Check className="h-3 w-3 text-slate-600 shrink-0" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

// CollateralAccountPicker: cmdk-free collateral/secured-by account picker
function CollateralAccountPicker({
    allAccounts,
    currentAccountId,
    selectedId,
    onSelect,
    onClose,
}: {
    allAccounts: Account[];
    currentAccountId: string | undefined;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = React.useState('');
    const candidates = allAccounts
        .filter(a => a.id !== currentAccountId && (a.type === 'bank' || a.type === 'savings' || a.type === 'investment'));
    const filtered = search
        ? candidates.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
        : candidates;

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search account..."
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
                    autoFocus
                />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1">
                <button type="button" onClick={() => { toast.info("Savings creation coming soon"); onClose(); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-blue-600 font-bold hover:bg-slate-50 transition-colors text-left">
                    <Plus className="h-4 w-4" /> Create New Savings
                </button>
                {filtered.length === 0 && search ? (
                    <div className="py-2 text-center text-sm text-slate-400">No account found.</div>
                ) : filtered.map(a => (
                    <button key={a.id} type="button" onClick={() => { onSelect(a.id); onClose(); }}
                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-slate-50 transition-colors text-left",
                            selectedId === a.id && "bg-slate-100")}>
                        <div className="w-6 h-6 rounded-none overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                            {a.image_url ? (
                                <img src={a.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-[10px] font-bold text-slate-500">{a.name[0]}</span>
                            )}
                        </div>
                        <div className="flex flex-col flex-1">
                            <span className="font-medium">{a.name}</span>
                            <span className="text-[10px] text-slate-400">{(a.current_balance || 0).toLocaleString()} VND</span>
                        </div>
                        {selectedId === a.id && <Check className="h-4 w-4 text-slate-600 shrink-0" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

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
    zIndex = 500,
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
    const [isRefreshing, startRefresh] = React.useTransition();
    const [activeCategoryCallback, setActiveCategoryCallback] = useState<((categoryId: string) => void) | null>(null);
    // MF5.5 Rebooted Cashback States (Phase 16)
    const [cbType, setCbType] = useState<'none' | 'simple' | 'tiered'>('none');
    const [cbBaseRate, setCbBaseRate] = useState<number>(0);
    const [cbMaxBudget, setCbMaxBudget] = useState<number | null>(null);
    const [cbIsUnlimited, setCbIsUnlimited] = useState(true);
    const [cbRulesJson, setCbRulesJson] = useState<CashbackRulesJson | null>(null);
    const [cbMinSpend, setCbMinSpend] = useState<number>(0);
    const [isCashbackEnabled, setIsCashbackEnabled] = useState(false);
    const [openAccNumPopover, setOpenAccNumPopover] = useState(false);
    const [openRxPopover, setOpenRxPopover] = useState(false);
    const [holderType, setHolderType] = useState<'me' | 'relative' | 'other'>('me');
    const [holderPersonId, setHolderPersonId] = useState<string | null>(null);
    const [people, setPeople] = useState<Person[]>([]);
    const [openHolderPersonPopover, setOpenHolderPersonPopover] = useState(false);
    const [isPeopleSlideOpen, setIsPeopleSlideOpen] = useState(false);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

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

    // Automatic Name Suffix logic based on ownership
    useEffect(() => {
        if (!name || !open) return;

        // Current pattern: "Base Name #Owner"
        const parts = name.split(' #');
        const baseName = parts[0];
        const currentSuffix = parts.length > 1 ? parts[1] : null;

        if (holderType === 'relative' && holderPersonId) {
            const person = people.find(p => p.id === holderPersonId);
            if (person) {
                const targetSuffix = person.name;
                if (currentSuffix !== targetSuffix) {
                    setName(`${baseName} #${targetSuffix}`);
                }
            }
        } else if (holderType === 'me') {
            if (currentSuffix !== null) {
                setName(baseName);
            }
        }
    }, [holderType, holderPersonId, people, open]);

    // Initial data fetch
    useEffect(() => {
        if (open) {
            getPeopleAction().then(setPeople);
            getServicesAction().then(res => setSubscriptions(res as any));
        }
    }, [open]);

    const handlePersonCreated = (result: any) => {
        if (result && result.person) {
            setPeople(prev => [...prev, result.person as Person]);
            setHolderPersonId(result.person.id);
            setHolderType('relative');
        }
    };

    // MF5.5 Dirty check state
    const [initialState, setInitialState] = useState<string>("");
    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState<'close' | 'back' | null>(null);

    // Initial load helper
    const loadFromAccount = (acc: Account) => {
        console.log('[AccountSlideV2] loadFromAccount starting for:', acc.name, 'cb_type:', acc.cb_type);
        setName(acc.name || "");
        setType(acc.type || 'bank');
        setAccountNumber(acc.account_number || "");
        setCreditLimit(acc.credit_limit || 0);
        setIsActive(acc.is_active !== false);
        setImageUrl(acc.image_url || "");
        setHolderType(acc.holder_type || 'me');
        setHolderPersonId(acc.holder_person_id || null);

        // --- REBOOTED CASHBACK LOAD (Phase 16) ---
        const effectiveCbType = acc.cb_type || (acc.cashback_config ? 'simple' : 'none');
        setCbType(effectiveCbType);
        setIsCashbackEnabled(effectiveCbType !== 'none');

        // Use new columns if available, otherwise fallback to legacy config parsing
        const cb = normalizeCashbackConfig(acc.cashback_config, acc) as any;

        setCbBaseRate((acc.cb_base_rate ?? cb.defaultRate ?? 0) * 100);
        setCbMaxBudget(acc.cb_max_budget ?? cb.maxBudget ?? null);
        setCbIsUnlimited(acc.cb_is_unlimited ?? (!acc.cb_max_budget && !cb.maxBudget));
        setCbMinSpend(acc.cb_min_spend ?? cb.minSpendTarget ?? 0);

        // Map rules - prioritizing new column
        if (acc.cb_rules_json) {
            const rawRules = acc.cb_rules_json as any;
            if (effectiveCbType === 'tiered') {
                // Tiered config object
                setCbRulesJson({
                    base_rate: (rawRules.base_rate || 0) * 100,
                    tiers: (rawRules.tiers || []).map((t: any) => ({
                        ...t,
                        base_rate: (t.base_rate ?? t.defaultRate ?? 0) * 100,
                        max_reward: t.max_reward ?? t.maxReward ?? null,
                        policies: (t.policies || t.rules || []).map((p: any) => ({
                            cat_ids: p.cat_ids || p.categoryIds || [],
                            rate: (p.rate || 0) * 100,
                            max: p.max ?? p.maxReward ?? null
                        }))
                    }))
                });
            } else {
                // Simple rules array
                setCbRulesJson(rawRules.map((r: any) => ({
                    ...r,
                    rate: (r.rate || 0) * 100
                })));
            }
        } else if (cb.levels && cb.levels.length > 0) {
            // Legacy conversion to new structure if possible
            if (effectiveCbType === 'tiered') {
                setCbRulesJson({
                    base_rate: (cb.defaultRate || 0) * 100,
                    tiers: cb.levels.map((lvl: any) => ({
                        min_spend: lvl.minTotalSpend || 0,
                        policies: (lvl.rules || []).map((r: any) => ({
                            cat_ids: (r.categoryIds || []).filter(Boolean),
                            rate: (r.rate || 0) * 100,
                            max: r.maxReward || null
                        }))
                    }))
                });
            } else {
                // Simple mode rules from first level
                const firstLevel = cb.levels[0];
                const rules = (firstLevel.rules || []).map((r: any) => ({
                    cat_ids: (r.categoryIds || []).filter(Boolean),
                    rate: (r.rate || 0) * 100,
                    max: r.maxReward || null
                }));
                setCbRulesJson(rules);
            }
        } else {
            setCbRulesJson(null);
        }

        // Prioritize explicit columns, then legacy config logic
        const finalCycleType = acc.cb_cycle_type || (acc.statement_day || cb.cycleType === 'statement_cycle' ? 'statement_cycle' : 'calendar_month');
        setCycleType(finalCycleType as CashbackCycleType);

        setStatementDay(acc.statement_day ?? cb.statementDay ?? null);
        setDueDate(acc.due_date ?? cb.dueDate ?? null);
        setIsAdvancedCashback(effectiveCbType === 'tiered');

        // Restore missing fields from previous backup
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
            setCbMinSpend(0);
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
                    rate: cbBaseRate,
                    maxReward: null,
                    description: undefined
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
            defaultRate: cbBaseRate,
            maxCashback: cbMaxBudget,
            levels: effectiveLevels
        });
    }, [name, type, accountNumber, creditLimit, isActive, imageUrl, annualFee, receiverName, parentAccountId, securedById, isCollateralLinked, cycleType, statementDay, dueDate, cbBaseRate, cbMaxBudget, cbMinSpend, levels, isCategoryRestricted, restrictedCategoryIds, isAdvancedCashback]);

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
                cb_cycle_type: cb.cycleType || 'calendar_month',
                statementDay: cb.statementDay,
                dueDate: cb.dueDate,
                cb_min_spend: cb.minSpendTarget,
                cb_base_rate: (cb.defaultRate || 0) * 100,
                cb_max_budget: cb.maxBudget || null,
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
                cb_cycle_type: 'calendar_month',
                statementDay: null,
                dueDate: null,
                cb_min_spend: 0,
                cb_base_rate: 0,
                cb_max_budget: null,
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

    // Confirm action helper for unsaved changes
    const confirmAction = () => {
        setShowUnsavedConfirm(false);
        if (pendingAction === 'close') {
            onOpenChange(false);
        } else if (pendingAction === 'back' && onBack) {
            onBack();
        }
        setPendingAction(null);
    };

    const handleSave = async () => {
        if (!name) {
            toast.error("Account name is required");
            return;
        }

        setLoading(true);
        try {
            const transformRulesForSave = (rules: any) => {
                if (!rules) return null;
                if (Array.isArray(rules)) {
                    return rules.map((r: any) => ({
                        ...r,
                        rate: (r.rate || 0) / 100
                    }));
                }
                return {
                    ...rules,
                    base_rate: (rules.base_rate || 0) / 100,
                    tiers: (rules.tiers || []).map((t: any) => ({
                        ...t,
                        base_rate: t.base_rate !== undefined ? t.base_rate / 100 : undefined,
                        policies: (t.policies || []).map((p: any) => ({
                            ...p,
                            rate: (p.rate || 0) / 100
                        }))
                    }))
                };
            };

            if (isEdit && account) {
                // Determine cb_type
                let effectiveCbType: 'none' | 'simple' | 'tiered' = 'none';
                if (isCashbackEnabled) {
                    effectiveCbType = (isAdvancedCashback || isCategoryRestricted) ? 'tiered' : 'simple';
                }

                // Map levels
                let finalLevels: any[] = [];
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
                                rate: cbBaseRate,
                                maxReward: null,
                                description: undefined
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

                console.log('[AccountSlideV2] Calling updateAccountConfigAction...', { id: account.id, cbType });

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
                    securedByAccountId: isCollateralLinked ? (securedById === 'none' ? null : securedById) : null,

                    // New Column-based fields
                    cb_type: isCashbackEnabled ? cbType : 'none',
                    cb_base_rate: cbBaseRate / 100,
                    cb_max_budget: cbMaxBudget,
                    cb_is_unlimited: cbIsUnlimited,
                    cb_rules_json: transformRulesForSave(cbRulesJson),
                    cb_min_spend: cbMinSpend,
                    cb_cycle_type: cycleType as any,
                    statementDay: statementDay,
                    dueDate: dueDate,
                    holder_type: holderType,
                    holder_person_id: holderPersonId,

                    // Keep legacy config for safety during transition
                    cashbackConfig: isCashbackEnabled ? {
                        program: {
                            cycleType,
                            statementDay,
                            dueDate,
                            minSpendTarget: cbMinSpend,
                            defaultRate: cbBaseRate / 100,
                            maxBudget: cbMaxBudget,
                            rules_json_v2: transformRulesForSave(cbRulesJson)
                        }
                    } as any : null
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
                // Implementation for create
                console.log('[AccountSlideV2] Creating account...', { name, cbType });
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
                    securedByAccountId: isCollateralLinked ? (securedById === 'none' ? null : securedById) : null,

                    // New Column-based fields
                    cb_type: isCashbackEnabled ? cbType : 'none',
                    cb_base_rate: cbBaseRate / 100,
                    cb_max_budget: cbMaxBudget,
                    cb_is_unlimited: cbIsUnlimited,
                    cb_rules_json: transformRulesForSave(cbRulesJson),
                    cb_min_spend: cbMinSpend,
                    cb_cycle_type: cycleType as any,
                    statementDay: statementDay,
                    dueDate: dueDate,
                    holder_type: holderType,
                    holder_person_id: holderPersonId,

                    // Legacy config
                    cashbackConfig: isCashbackEnabled ? {
                        program: {
                            cycleType,
                            statementDay,
                            dueDate,
                            minSpendTarget: cbMinSpend,
                            defaultRate: cbBaseRate / 100,
                            maxBudget: cbMaxBudget,
                            rules_json_v2: transformRulesForSave(cbRulesJson)
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
                <SheetContent
                    side="right"
                    className={cn("w-full transition-all duration-300 ease-in-out p-0 flex flex-col gap-0 border-l border-slate-200", isAdvancedCashback ? "sm:!max-w-[900px]" : "sm:!max-w-[700px]")}
                    zIndex={zIndex}
                    onPointerDownOutside={(e) => {
                        if (currentState !== initialState) {
                            e.preventDefault();
                            handleAttemptClose();
                        }
                    }}
                    onEscapeKeyDown={(e) => {
                        if (currentState !== initialState) {
                            e.preventDefault();
                            handleAttemptClose();
                        }
                    }}
                >
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

                                {(activeMainType === 'savings' || ['savings', 'investment'].includes(type)) && (
                                    <div className="flex items-start gap-2 bg-amber-50/50 border border-amber-100 p-2.5 rounded-lg mt-2">
                                        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                                            <span className="font-bold">Asset Management Tip:</span> Money moved into this account should be recorded as a <span className="font-bold">Transfer</span> instead of an Expense. This keeps your net worth accurate without inflating your monthly spending reports.
                                        </p>
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

                            {/* Ownership Selection */}
                            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Account Ownership</Label>
                                        <p className="text-[9px] text-slate-400 font-medium">Who owns this account/card?</p>
                                    </div>
                                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                                        {[
                                            { id: 'me' as const, label: 'Me', icon: Sparkles },
                                            { id: 'relative' as const, label: 'Relative', icon: HandCoins }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                    setHolderType(opt.id as any);
                                                    if (opt.id === 'me') setHolderPersonId(null);
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
                                                    holderType === opt.id
                                                        ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                <opt.icon className="h-3 w-3" />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {holderType === 'relative' && (
                                    <div className="flex items-center justify-between gap-4 pt-1 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex-1">
                                            <Popover open={openHolderPersonPopover} onOpenChange={setOpenHolderPersonPopover}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        size="sm"
                                                        className="w-full justify-between h-9 text-[11px] font-bold border-slate-200 bg-white shadow-sm"
                                                    >
                                                        {holderPersonId ? (
                                                            <div className="flex items-center gap-2">
                                                                {(() => {
                                                                    const sel = people.find(p => p.id === holderPersonId);
                                                                    return sel ? (
                                                                        <>
                                                                            <div className="w-5 h-5 rounded-none overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                                                                                {sel.image_url ? (
                                                                                    <img src={sel.image_url} alt="" className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <span className="text-[9px] font-bold text-slate-500">{sel.name[0]}</span>
                                                                                )}
                                                                            </div>
                                                                            <span className="truncate">{sel.name}</span>
                                                                        </>
                                                                    ) : "Select relative...";
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">Select relative...</span>
                                                        )}
                                                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-64 p-0" align="start">
                                                    <PersonPickerDropdown
                                                        people={people}
                                                        selectedId={holderPersonId}
                                                        onSelect={(id) => {
                                                            setHolderPersonId(id);
                                                            setOpenHolderPersonPopover(false);
                                                        }}
                                                        onCreateNew={() => {
                                                            setOpenHolderPersonPopover(false);
                                                            setIsPeopleSlideOpen(true);
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="acc_num" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Number <span className="font-normal text-slate-400 normal-case">(Optional)</span></Label>
                                    <Popover open={openAccNumPopover} onOpenChange={setOpenAccNumPopover}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openAccNumPopover}
                                                className="w-full justify-between h-10 border-slate-200 bg-white px-3 font-normal"
                                            >
                                                {accountNumber ? (
                                                    <span className="text-[12px] font-bold text-slate-700">{accountNumber}</span>
                                                ) : (
                                                    <span className="text-[12px] text-slate-400 italic">Select or type number...</span>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    {accountNumber && (
                                                        <div
                                                            role="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAccountNumber("");
                                                            }}
                                                            className="h-4 w-4 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center mr-1"
                                                        >
                                                            <X className="h-2.5 w-2.5 text-slate-500" />
                                                        </div>
                                                    )}
                                                    <ChevronsUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                                                </div>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[340px] p-0" align="start">
                                            <AccountNumberPicker
                                                allAccounts={allAccounts}
                                                selectedNumber={accountNumber}
                                                receiverName={receiverName}
                                                onSelect={setAccountNumber}
                                                onClose={() => setOpenAccNumPopover(false)}
                                                setReceiverName={setReceiverName}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="receiver" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Receiver Name</Label>
                                    <Popover open={openRxPopover} onOpenChange={setOpenRxPopover}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openRxPopover}
                                                className="w-full justify-between h-10 border-slate-200 bg-white px-3 font-normal"
                                            >
                                                {receiverName ? (
                                                    <span className="text-[12px] font-bold text-slate-700 uppercase">{receiverName}</span>
                                                ) : (
                                                    <span className="text-[12px] text-slate-400 italic">Select or type name...</span>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    {receiverName && (
                                                        <div
                                                            role="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setReceiverName("");
                                                            }}
                                                            className="h-4 w-4 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center mr-1"
                                                        >
                                                            <X className="h-2.5 w-2.5 text-slate-500" />
                                                        </div>
                                                    )}
                                                    <ChevronsUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                                                </div>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[340px] p-0" align="start">
                                            <ReceiverNamePicker
                                                allAccounts={[
                                                    ...allAccounts,
                                                    ...existingReceiverNames.map((name, i) => ({ id: `ext-${i}`, receiver_name: name } as Account))
                                                ]}
                                                selectedName={receiverName}
                                                onSelect={setReceiverName}
                                                onClose={() => setOpenRxPopover(false)}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Parent Account - Only for Credit Cards */}
                            {
                                type === 'credit_card' && (
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
                                                                            <div className="w-4 h-4 rounded-none overflow-hidden flex items-center justify-center shrink-0">
                                                                                {sel.image_url ? (
                                                                                    <img src={sel.image_url} alt="" className="w-full h-full object-contain" />
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
                                                    <ParentAccountPicker
                                                        allAccounts={allAccounts}
                                                        currentAccountId={account?.id}
                                                        nameFilter={name}
                                                        selectedId={parentAccountId}
                                                        onSelect={(id) => {
                                                            setParentAccountId(id);
                                                            setOpenParentCombo(false);
                                                        }}
                                                        onClose={() => setOpenParentCombo(false)}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        {parentAccountId && (() => {
                                            const p = allAccounts.find(a => a.id === parentAccountId);
                                            return p ? (
                                                <div className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded text-[10px] text-indigo-600 animate-in fade-in slide-in-from-top-1">
                                                    <Info className="h-3 w-3" />
                                                    <span>This account will be a <span className="font-bold">Child</span> of {p.name}.</span>
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>
                                )
                            }

                            {
                                type === 'credit_card' && (
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
                                )
                            }

                            {/* Security & Collateral - Only for Credit Cards */}
                            {
                                type === 'credit_card' && (
                                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-slate-100 p-1.5 rounded-md">
                                                    <Coins className="h-4 w-4 text-slate-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-800">Security & Collateral</h3>
                                                    <p className="text-[10px] text-slate-500 font-medium italic">Link a savings/deposit account if this credit limit is secured.</p>
                                                </div>
                                            </div>
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
                                                        className="w-full justify-between h-10 border-slate-200 bg-slate-50/50"
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
                                                    <CollateralAccountPicker
                                                        allAccounts={allAccounts}
                                                        currentAccountId={account?.id}
                                                        selectedId={securedById}
                                                        onSelect={(id) => {
                                                            setSecuredById(id);
                                                            setOpenCollateralCombo(false);
                                                        }}
                                                        onClose={() => setOpenCollateralCombo(false)}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>
                                )
                            }

                            {/* Rebooted Cashback Configuration (Phase 16) */}
                            <div className="pt-4 border-t border-slate-200">
                                <div className="px-4 py-2 bg-slate-50 border border-slate-200 border-b-0 rounded-t-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-amber-100 p-1 rounded-md">
                                            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Cashback Optimization</h3>
                                    </div>
                                    <Switch
                                        checked={isCashbackEnabled}
                                        onCheckedChange={(checked) => {
                                            setIsCashbackEnabled(checked);
                                            if (checked && cbType === 'none') {
                                                setCbType('simple');
                                            } else if (!checked) {
                                                setCbType('none');
                                            }
                                        }}
                                        className="scale-75 data-[state=checked]:bg-amber-500"
                                    />
                                </div>

                                {isCashbackEnabled ? (
                                    <div className="p-5 bg-white border border-slate-200 rounded-b-xl space-y-4">
                                        <CashbackConfigForm
                                            cb_type={cbType}
                                            cb_base_rate={cbBaseRate}
                                            cb_max_budget={cbMaxBudget}
                                            cb_is_unlimited={cbIsUnlimited}
                                            cb_rules_json={cbRulesJson}
                                            cb_cycle_type={cycleType || 'calendar_month'}
                                            cb_min_spend={cbMinSpend}
                                            categories={categories}
                                            onOpenCategoryCreator={(callback?: (categoryId: string) => void) => {
                                                setActiveCategoryCallback(() => callback || null);
                                                setIsCategoryDialogOpen(true);
                                            }}
                                            onChange={(updates) => {
                                                if (updates.cb_type !== undefined) {
                                                    setCbType(updates.cb_type);
                                                    setIsAdvancedCashback(updates.cb_type === 'tiered');
                                                }
                                                if (updates.cb_base_rate !== undefined) setCbBaseRate(updates.cb_base_rate);
                                                if (updates.cb_max_budget !== undefined) setCbMaxBudget(updates.cb_max_budget);
                                                if (updates.cb_is_unlimited !== undefined) setCbIsUnlimited(updates.cb_is_unlimited);
                                                if (updates.cb_rules_json !== undefined) setCbRulesJson(updates.cb_rules_json);
                                                if (updates.cb_min_spend !== undefined) setCbMinSpend(updates.cb_min_spend);
                                                if (updates.cb_cycle_type !== undefined) setCycleType(updates.cb_cycle_type);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-8 border border-slate-200 border-t-0 rounded-b-xl bg-slate-50/30 flex flex-col items-center justify-center text-center opacity-60">
                                        <Coins className="h-8 w-8 text-slate-300 mb-2" />
                                        <p className="text-xs font-bold text-slate-400">Cashback tracking is disabled</p>
                                        <p className="text-[10px] text-slate-400">Enable it to configure special reward rules for this card.</p>
                                    </div>
                                )}
                            </div>

                            {/* Credit Card Settings (Statement & Due Date) - Always visible for credit cards */}
                            {
                                activeMainType === 'credit' && (
                                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="bg-indigo-100 p-1 rounded-md">
                                                <CreditCard className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Credit Card Configuration</h3>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Payment Due Day (Moved up) */}
                                            <div className="space-y-1.5 pt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarClock className="h-3.5 w-3.5 text-rose-600" />
                                                    <Label className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Payment Due Day</Label>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium">The deadline for paying your credit card balance.</div>
                                                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                                                    <DayOfMonthPicker
                                                        value={dueDate}
                                                        onChange={setDueDate}
                                                        className="h-9 w-full"
                                                    />
                                                    <div className="text-[10px] font-medium text-slate-400 italic px-2">
                                                        of next month
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 pt-2 animate-in fade-in slide-in-from-top-1">
                                                <div className="flex items-center gap-1.5">
                                                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                                                    <Label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Statement Day</Label>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium">The day your bank generates the monthly statement.</div>
                                                <DayOfMonthPicker
                                                    value={statementDay}
                                                    onChange={setStatementDay}
                                                    className="h-9 w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            }

                            {/* Account Status & Closing Logic */}
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

                <PeopleSlideV2
                    open={isPeopleSlideOpen}
                    onOpenChange={(isOpen) => {
                        setIsPeopleSlideOpen(isOpen);
                    }}
                    onBack={() => setIsPeopleSlideOpen(false)}
                    zIndex={zIndex + 100}
                    subscriptions={subscriptions}
                    onSuccess={handlePersonCreated}
                />
            </Sheet>

            <ConfirmationModal
                isOpen={showCloseConfirm}
                onClose={() => setShowCloseConfirm(false)}
                onConfirm={async () => {
                    setIsActive(false);
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

            <UnsavedChangesDialog
                open={showUnsavedConfirm}
                onOpenChange={setShowUnsavedConfirm}
                onConfirm={confirmAction}
                onCancel={() => setShowUnsavedConfirm(false)}
            />

            <CategorySlide
                open={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
                defaultType="expense"
                onBack={() => setIsCategoryDialogOpen(false)}
                zIndex={zIndex + 100}
                isExternalLoading={isRefreshing}
                onSuccess={(newCategoryId) => {
                    startRefresh(() => {
                        if (newCategoryId && activeCategoryCallback) {
                            activeCategoryCallback(newCategoryId);
                        }
                        router.refresh();
                        setIsCategoryDialogOpen(false);
                        toast.success("Category created successfully");
                    });
                }}
            />
        </>
    );
}

function formatMoneyVND(amount: number) {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('vi-VN').format(amount);
}
