"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    CreditCard,
    Landmark,
    Wallet,
    PiggyBank,
    User,
    CheckCircle,
    Users,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowRightLeft,
    Settings,
    Baby,
    Edit,
    Eye,
    ShieldCheck,
    Lock,
    Info,
    Loader2,
} from "lucide-react";
import { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { cn } from "@/lib/utils";
import { AccountFamilyModal } from "./account-family-modal";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { EditAccountDialog } from "./edit-account-dialog";
import {
    UsageStats,
    QuickPeopleConfig,
    DEFAULT_QUICK_PEOPLE_CONFIG,
} from "@/types/settings.types";
import { QuickPeopleSettingsDialog } from "./quick-people-settings-dialog";
import { Button } from "@/components/ui/button";
import { getCardActionState } from "@/lib/card-utils";
import { getDisplayBalance } from "@/lib/display-balance";
import { SYSTEM_CATEGORIES } from "@/lib/constants";
import { getAccountInitial } from "@/lib/utils";
import { getCreditCardUsage } from "@/lib/account-balance";

type NewAccountCardProps = {
    account: Account;
    accounts?: Account[];
    categories?: Category[];
    people?: Person[];
    shops?: Shop[];
    collateralAccounts?: Account[];
    usageStats?: UsageStats;
    quickPeopleConfig?: QuickPeopleConfig;
    pendingBatchAccountIds?: string[];
    className?: string;
    hideSecuredBadge?: boolean;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
});

function getAccountIcon(type: Account["type"]) {
    switch (type) {
        case "credit_card":
            return <CreditCard className="h-5 w-5" />;
        case "bank":
        case "ewallet":
            return <Landmark className="h-5 w-5" />;
        case "cash":
            return <Wallet className="h-5 w-5" />;
        case "savings":
        case "investment":
        case "asset":
            return <PiggyBank className="h-5 w-5" />;
        case "debt":
            return <User className="h-5 w-5" />;
        default:
            return <Wallet className="h-5 w-5" />;
    }
}

function NewAccountCardComponent({
    account,
    accounts = [],
    categories = [],
    people = [],
    shops = [],
    collateralAccounts = [],
    usageStats = {},
    quickPeopleConfig = DEFAULT_QUICK_PEOPLE_CONFIG,
    pendingBatchAccountIds = [],
    className,
    hideSecuredBadge = false,
}: NewAccountCardProps) {
    const router = useRouter();
    const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [activeDialog, setActiveDialog] = useState<
        | "income"
        | "expense"
        | "transfer"
        | "debt"
        | "repayment"
        | "paid"
        | null
    >(null);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [isLandscape, setIsLandscape] = useState(false);

    const stats = account.stats;
    const relationships = account.relationships;
    const childAccounts = relationships?.child_accounts ?? [];
    const childCount = relationships?.child_count ?? childAccounts.length;
    const parentInfo = relationships?.parent_info;
    const parentAccountId = account.parent_account_id ?? parentInfo?.id ?? null;
    const securedByAccountId = account.secured_by_account_id;
    const isCreditCard = account.type === "credit_card";
    const isParent = relationships?.is_parent || childCount > 0;
    const isChild = !!parentAccountId;
    const hasFamilyContext = isParent || isChild;
    const detailsHref = `/accounts/${account.id}`;
    const hasPendingBatch = pendingBatchAccountIds.includes(account.id);

    const cardState = useMemo(
        () => getCardActionState(account, hasPendingBatch),
        [account, hasPendingBatch],
    );

    const formatCurrency = (val: number | null | undefined) => {
        return val !== null && val !== undefined
            ? numberFormatter.format(val)
            : "0";
    };

    const displayBalance = useMemo(() => {
        const familyContext = hideSecuredBadge || isChild || isParent;
        const context = familyContext ? "family_tab" : "card";

        if (isChild && parentAccountId) {
            const parent = accounts.find((a) => a.id === parentAccountId);
            if (parent) return getDisplayBalance(parent, "family_tab", accounts);
        }

        return getDisplayBalance(account, context, accounts);
    }, [account, hideSecuredBadge, accounts, isChild, parentAccountId, isParent]);

    const handleCardClick = () => {
        setIsNavigating(true);
        router.push(detailsHref);
    };

    const handleLinkClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const usageData = useMemo(() => {
        const limit = account.credit_limit ?? 0;
        const balance = account.current_balance ?? 0;

        let usedCheck = 0;
        let percent = 0;

        if (account.type === "credit_card") {
            const usage = getCreditCardUsage({
                type: account.type,
                credit_limit: limit,
                current_balance: balance,
            });
            usedCheck = usage.used;
            percent = usage.percent;
        } else {
            usedCheck = Math.abs(balance);
            percent = limit > 0 ? (usedCheck / limit) * 100 : 0;
        }

        return {
            limit,
            usedAmount: usedCheck,
            percent,
            formattedLimit: formatCurrency(limit),
            formattedUsed: formatCurrency(usedCheck),
        };
    }, [account.credit_limit, account.current_balance, account.type]);

    const sortedPeople = useMemo(() => {
        const pinnedIds = new Set(quickPeopleConfig?.pinned_ids || []);
        const pinnedPeople: Person[] = [];
        const otherPeople: Person[] = [];

        if (people) {
            people.forEach((p) => {
                if (pinnedIds.has(p.id)) {
                    pinnedPeople.push(p);
                } else {
                    otherPeople.push(p);
                }
            });
        }

        if (quickPeopleConfig?.mode === "smart" && usageStats) {
            otherPeople.sort((a, b) => {
                const statsA = usageStats[a.id];
                const statsB = usageStats[b.id];
                const countA = (statsA?.lend_count || 0) + (statsA?.repay_count || 0);
                const countB = (statsB?.lend_count || 0) + (statsB?.repay_count || 0);

                if (countA !== countB) return countB - countA;

                const timeA = statsA?.last_used_at
                    ? new Date(statsA.last_used_at).getTime()
                    : 0;
                const timeB = statsB?.last_used_at
                    ? new Date(statsB.last_used_at).getTime()
                    : 0;
                return timeB - timeA;
            });
        }

        const result = [...pinnedPeople];
        if (quickPeopleConfig?.mode === "smart") {
            const slotsNeeded = 5 - pinnedPeople.length;
            if (slotsNeeded > 0) {
                result.push(...otherPeople.slice(0, slotsNeeded));
            }
        }
        return result;
    }, [people, quickPeopleConfig, usageStats]);

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (img.naturalWidth >= img.naturalHeight) {
            setIsLandscape(true);
        }
    };

    // Calculate days until due
    const daysLeft = cardState.badges.due?.days;
    const dueDate = cardState.badges.due?.date;

    // Determine border color based on urgency
    const getBorderColor = () => {
        if (daysLeft && daysLeft <= 3) return "border-red-500";
        if (daysLeft && daysLeft <= 7) return "border-amber-500";
        return "border-slate-200";
    };

    // KPI Logic
    const minSpendValue = stats?.min_spend;
    const missing = stats?.missing_for_min ?? 0;
    const isMet =
        minSpendValue === null || minSpendValue === undefined
            ? true
            : missing <= 0;
    const showKPI = typeof minSpendValue === "number" && minSpendValue > 0;
    const hasCashbackConfig =
        stats?.remains_cap !== null && stats?.remains_cap !== undefined;

    const { percent: usageVal, formattedLimit, formattedUsed } = usageData;
    let progressColorClass = "bg-emerald-500";
    if (usageVal >= 30 && usageVal <= 80) progressColorClass = "bg-yellow-500";
    if (usageVal > 80) progressColorClass = "bg-red-500";

    const isSecuredAsset = !!securedByAccountId;

    return (
        <>
            <div
                onClick={handleCardClick}
                className={cn(
                    "group/card relative block w-full rounded-3xl border-2 shadow-sm transition-all overflow-hidden cursor-pointer hover:shadow-lg",
                    "bg-white",
                    getBorderColor(),
                    "min-h-[380px] flex flex-col",
                    className,
                )}
            >
                {/* Loading Overlay */}
                {isNavigating && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-3xl">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                )}

                {/* Header Zone */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    {/* Left: Days Left Badge */}
                    <div className="flex-1">
                        {daysLeft && (
                            <div
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold",
                                    daysLeft <= 3
                                        ? "bg-red-100 text-red-700 border border-red-200"
                                        : daysLeft <= 7
                                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                                            : "bg-slate-100 text-slate-700 border border-slate-200",
                                )}
                            >
                                <span className="text-sm font-extrabold">{daysLeft}</span>
                                <span className="text-[10px]">Days</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Secured/Unsecured Badge */}
                    <div className="flex-1 flex justify-end">
                        {isCreditCard && !hideSecuredBadge && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
                                    isSecuredAsset
                                        ? "bg-green-100 text-green-700 border border-green-200"
                                        : "bg-amber-100 text-amber-700 border border-amber-200",
                                )}
                            >
                                {isSecuredAsset ? (
                                    <>
                                        <Lock className="w-3 h-3" />
                                        Secured
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-3 h-3" />
                                        Unsecured
                                    </>
                                )}
                            </span>
                        )}
                    </div>
                </div>

                {/* Card Image + Content */}
                <div className="flex-1 flex flex-col p-4 gap-3">
                    {/* Image Section - Integrated */}
                    <div className="relative w-full h-32 bg-slate-100 rounded-xl overflow-hidden">
                        {account.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={account.image_url}
                                alt={account.name}
                                onLoad={handleImageLoad}
                                className={cn(
                                    "w-full h-full transition-opacity duration-300",
                                    isLandscape
                                        ? "object-contain"
                                        : "object-cover object-center",
                                )}
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                                {getAccountIcon(account.type)}
                            </div>
                        )}

                        {/* Hover Edit Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 bg-black/10 backdrop-blur-[1px]">
                            <div className="flex gap-2">
                                <Link
                                    href={detailsHref}
                                    onClick={handleLinkClick}
                                    className="text-white p-2 rounded-full hover:bg-black/60 transition-all border border-white/30"
                                >
                                    <Eye className="w-5 h-5" strokeWidth={2.5} />
                                </Link>
                                <div>
                                    <EditAccountDialog
                                        account={account}
                                        accounts={accounts}
                                        collateralAccounts={collateralAccounts}
                                        buttonClassName="text-white p-2 rounded-full hover:bg-black/60 transition-all border border-white/30 flex items-center justify-center"
                                        triggerContent={
                                            <Edit className="w-5 h-5" strokeWidth={2.5} />
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Name + Balance */}
                    <div>
                        <h3 className="font-bold text-base text-slate-900 truncate mb-1">
                            {account.name}
                        </h3>
                        <div className="flex items-baseline gap-2">
                            <span
                                className={cn(
                                    "text-2xl font-black tracking-tight",
                                    displayBalance < 0 ? "text-red-600" : "text-indigo-950",
                                )}
                            >
                                {formatCurrency(displayBalance)}
                            </span>
                            {isChild && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                <Info className="w-4 h-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">Shared balance with parent</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </div>

                    {/* Need/Spent Zone OR Cashback Zone */}
                    <div className="min-h-[44px]">
                        {showKPI && !isMet && (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 p-2 rounded-md border border-amber-100">
                                <div className="flex items-center gap-3 w-full">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-amber-600/80 uppercase font-bold">
                                            NEED
                                        </span>
                                        <span className="font-bold text-amber-800 text-sm">
                                            {formatCurrency(missing)}
                                        </span>
                                    </div>
                                    <div className="w-[1px] h-6 bg-amber-200/50" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-amber-600/80 uppercase font-bold">
                                            SPENT
                                        </span>
                                        <span className="font-bold text-amber-800 text-sm">
                                            {formatCurrency(stats?.spent_this_cycle ?? 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {((showKPI && isMet) ||
                            (!showKPI && isCreditCard && hasCashbackConfig)) && (
                                <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 p-2 rounded-md border border-emerald-100">
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-emerald-600/80 uppercase font-bold">
                                                Share
                                            </span>
                                            <span className="font-bold text-emerald-800 text-sm">
                                                {formatCurrency(stats?.shared_cashback ?? 0)}
                                            </span>
                                        </div>
                                        <div className="w-[1px] h-6 bg-emerald-200/50" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-emerald-600/80 uppercase font-bold">
                                                Remains
                                            </span>
                                            <span className="font-bold text-emerald-800 text-sm">
                                                {stats?.remains_cap !== null &&
                                                    stats?.remains_cap !== undefined
                                                    ? formatCurrency(stats.remains_cap)
                                                    : "--"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {!showKPI && isCreditCard && !hasCashbackConfig && (
                            <div className="flex items-center justify-center bg-slate-50/50 p-2 rounded-md border border-slate-100 text-slate-400 italic text-xs">
                                No cashback for this
                            </div>
                        )}
                    </div>

                    {/* Progress Bar (Credit Cards) */}
                    {isCreditCard && (
                        <div className="min-h-[44px]">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[10px] text-slate-500 font-medium">
                                    Limit:{" "}
                                    <span className="font-bold text-slate-700">
                                        {formattedLimit}
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        "text-[10px] font-bold",
                                        usageVal > 80 ? "text-red-600" : "text-slate-600",
                                    )}
                                >
                                    {Math.min(usageVal, 100).toFixed(0)}% Used
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-700 ease-out rounded-full",
                                        progressColorClass,
                                    )}
                                    style={{ width: `${Math.min(usageVal, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div className="grid grid-cols-4 gap-1 p-2 border-t border-slate-100">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDialog("income");
                                    }}
                                    className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"
                                >
                                    <ArrowDownLeft className="w-4 h-4" />
                                    <span className="text-[9px] font-bold">Income</span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Add Income</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDialog("expense");
                                    }}
                                    className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all"
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                    <span className="text-[9px] font-bold">Expense</span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Add Expense</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDialog(isCreditCard ? "paid" : "transfer");
                                    }}
                                    className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                                >
                                    {isCreditCard ? (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-[9px] font-bold">Pay</span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowRightLeft className="w-4 h-4" />
                                            <span className="text-[9px] font-bold">Transfer</span>
                                        </>
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {isCreditCard ? "Pay Credit Card" : "Transfer Money"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <HoverCard>
                        <HoverCardTrigger asChild>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDialog("debt");
                                }}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-md bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all"
                            >
                                <ArrowUpRight className="w-4 h-4" />
                                <span className="text-[9px] font-bold">Lend</span>
                            </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-56 p-1" align="center" side="top">
                            <div className="grid gap-1">
                                <p className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase">
                                    Quick Lend To
                                </p>
                                {sortedPeople.map((person) => (
                                    <button
                                        key={person.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPersonId(person.id);
                                            setActiveDialog("debt");
                                        }}
                                        className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left hover:bg-violet-50 rounded-md"
                                    >
                                        {person.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={person.avatar_url}
                                                alt=""
                                                className="w-4 h-4 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">
                                                {getAccountInitial(person.name)}
                                            </div>
                                        )}
                                        <span className="truncate">{person.name}</span>
                                    </button>
                                ))}
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                </div>
            </div>

            {/* Dialogs - Same as original */}
            <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="income"
                defaultSourceAccountId={account.id}
                isOpen={activeDialog === "income"}
                onOpenChange={(open) => !open && setActiveDialog(null)}
                buttonClassName="hidden"
            />
            <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="expense"
                defaultSourceAccountId={account.id}
                isOpen={activeDialog === "expense"}
                onOpenChange={(open) => !open && setActiveDialog(null)}
                buttonClassName="hidden"
            />
            <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="transfer"
                defaultSourceAccountId={account.id}
                cloneInitialValues={{
                    category_id: SYSTEM_CATEGORIES.MONEY_TRANSFER,
                }}
                isOpen={activeDialog === "transfer"}
                onOpenChange={(open) => !open && setActiveDialog(null)}
                buttonClassName="hidden"
            />
            <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="transfer"
                cloneInitialValues={{
                    category_id: "e0000000-0000-0000-0000-000000000091",
                    debt_account_id: account.id,
                }}
                isOpen={activeDialog === "paid"}
                onOpenChange={(open) => !open && setActiveDialog(null)}
                buttonClassName="hidden"
            />
            <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="debt"
                defaultSourceAccountId={account.id}
                defaultPersonId={
                    selectedPersonId ?? "d419fd12-ad21-4dfa-8054-c6205f6d6b02"
                }
                isOpen={activeDialog === "debt"}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveDialog(null);
                        setSelectedPersonId(null);
                    }
                }}
                buttonClassName="hidden"
            />
            <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="repayment"
                defaultSourceAccountId={account.id}
                isOpen={activeDialog === "repayment"}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveDialog(null);
                        setSelectedPersonId(null);
                    }
                }}
                buttonClassName="hidden"
            />

            {hasFamilyContext && (
                <AccountFamilyModal
                    isOpen={isFamilyModalOpen}
                    onClose={() => setIsFamilyModalOpen(false)}
                    parentName={account.name}
                    childrenAccounts={childAccounts}
                    parentInfo={parentInfo}
                />
            )}
        </>
    );
}

export const NewAccountCard = memo(NewAccountCardComponent);
