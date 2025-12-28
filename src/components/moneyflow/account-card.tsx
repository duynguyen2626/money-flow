"use client";

import { memo, useMemo, useState } from "react";
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
  UserPlus,
  Baby,
  TrendingUp,
  Edit,
  ShieldCheck,
  Lock,
  Info,
  CalendarClock,
  Unlock,
  UserMinus,
} from "lucide-react";
import { Account, Category, Person, Shop, AccountCashbackSnapshot } from "@/types/moneyflow.types";
import { cn } from "@/lib/utils";
import { AccountFamilyModal } from "./account-family-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { EditAccountDialog } from "./edit-account-dialog";
import { QuickPeopleSettingsDialog } from "./quick-people-settings-dialog";
import { getCardActionState } from "@/lib/card-utils";
import { getDisplayBalance } from "@/lib/display-balance";
import { SYSTEM_CATEGORIES } from "@/lib/constants";
import { getCreditCardUsage } from "@/lib/account-balance";

type AccountCardProps = {
  account: Account;
  accounts?: Account[];
  categories?: Category[];
  people?: Person[];
  shops?: Shop[];
  collateralAccounts?: Account[];
  pendingBatchAccountIds?: string[];
  cashbackById?: Record<string, AccountCashbackSnapshot | undefined>;
  className?: string;
  hideSecuredBadge?: boolean;
  isClusterParent?: boolean;
  isClusterChild?: boolean;
  childCount?: number;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function getAccountIcon(type: Account["type"]) {
  switch (type) {
    case "credit_card":
      return <CreditCard className="h-4 w-4" />;
    case "bank":
    case "ewallet":
      return <Landmark className="h-4 w-4" />;
    case "cash":
      return <Wallet className="h-4 w-4" />;
    case "savings":
    case "investment":
    case "asset":
      return <PiggyBank className="h-4 w-4" />;
    case "debt":
      return <User className="h-4 w-4" />;
    default:
      return <Wallet className="h-4 w-4" />;
  }
}

function getDaysDiff(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function AccountCardComponent({
  account,
  accounts = [],
  categories = [],
  people = [],
  shops = [],
  collateralAccounts = [],
  pendingBatchAccountIds = [],
  cashbackById,
  className,
  hideSecuredBadge = false,
  isClusterParent = false,
  isClusterChild = false,
  childCount: explicitChildCount,
}: AccountCardProps) {
  const router = useRouter();
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);

  const handleCardClick = () => {
    router.push(detailsHref);
  };

  // Dialog States
  const [activeDialog, setActiveDialog] = useState<
    | "income"
    | "expense"
    | "transfer"
    | "debt"
    | "repayment"
    | "paid"
    | "shopping"
    | "people-settings"
    | null
  >(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const stats = account.stats;
  const relationships = account.relationships;
  const childAccounts = relationships?.child_accounts ?? [];
  const childCount = explicitChildCount ?? relationships?.child_count ?? childAccounts.length;
  const parentInfo = relationships?.parent_info;
  const parentAccountId = account.parent_account_id ?? parentInfo?.id ?? null;
  const isCreditCard = account.type === "credit_card";
  const detailsHref = `/accounts/${account.id}`;
  const hasPendingBatch = pendingBatchAccountIds.includes(account.id);

  // Secured Badge Logic
  const securingAccount = useMemo(() => {
    if (!account.secured_by_account_id) return null;
    return collateralAccounts?.find(a => a.id === account.secured_by_account_id)
      || accounts.find(a => a.id === account.secured_by_account_id);
  }, [account.secured_by_account_id, collateralAccounts, accounts]);


  // State
  const cardState = useMemo(
    () => getCardActionState(account, hasPendingBatch),
    [account, hasPendingBatch],
  );

  // Format Helpers
  const formatCurrency = (val: number | null | undefined) => {
    return val !== null && val !== undefined
      ? numberFormatter.format(val)
      : "0";
  };

  const displayBalance = useMemo(() => {
    const familyContext = hideSecuredBadge || isClusterChild || isClusterParent;
    const context = familyContext ? "family_tab" : "card";
    // If Child with Parent -> Return Parent Balance logic handled in util, but stricter here
    if ((isClusterChild || !!parentAccountId) && parentAccountId) {
      const parent = accounts.find((a) => a.id === parentAccountId);
      if (parent) return getDisplayBalance(parent, "family_tab", accounts);
    }
    return getDisplayBalance(account, context, accounts);
  }, [account, hideSecuredBadge, accounts, isClusterChild, isClusterParent, parentAccountId]);

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

  // Advanced Cashback Config Calculation
  const cashbackConfig = useMemo(() => {
    if (!account.cashback_config) return null;
    try {
      const rawConfig = account.cashback_config;
      const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;

      // Use type assertion instead of ignore for lint safety
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const program = (config as any)?.program;
      if (!program) return null;

      const defaultRate = program.defaultRate ?? 0;
      const levels = program.levels ?? [];

      return {
        defaultRate,
        levels,
        hasAdvanced: defaultRate > 0 || levels.length > 0
      };
    } catch (e) {
      console.error("Error parsing cashback config", e);
      return null;
    }
  }, [account.cashback_config]);


  // IDs
  const creditPaymentCatId = "e0000000-0000-0000-0000-000000000091";
  const shoppingCatId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99";
  const shopeeShopId = "ea3477cb-30dd-4b7f-8826-a89a1b919661";

  // Card Styling Determination
  const borderColor = useMemo(() => {
    if (cardState.badges.due) return "border-red-500 shadow-sm"; // Urgent
    if (cardState.badges.spend) return "border-amber-400"; // Warning
    return "border-slate-100"; // Default Clean Slate
  }, [cardState.badges]);

  // --- Render Sections ---

  return (
    <>
      <div
        onClick={handleCardClick}
        className={cn(
          "group relative flex flex-col w-full rounded-[2rem] border-2 bg-white transition-all hover:shadow-lg hover:border-slate-300 cursor-pointer overflow-hidden",
          borderColor,
          className
        )}
      >
        {/* TOP SECTION: Header + Split Body */}
        <div className="px-5 pt-3 pb-3">

          {/* 1. HEADER ROW: Due Date & Security */}
          <div className="flex items-center justify-between mb-3 min-h-[24px]">
            {/* Due Date - Larger & Cleaner */}
            {stats?.due_date ? (
              <div className={cn(
                "flex items-center gap-2",
                getDaysDiff(stats.due_date) <= 5 ? "text-rose-600" : "text-amber-600"
              )}>
                <div className={cn("p-1.5 rounded-full", getDaysDiff(stats.due_date) <= 5 ? "bg-rose-100" : "bg-amber-100")}>
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Due in</span>
                  <span className="text-sm font-black tracking-tight">{getDaysDiff(stats.due_date)} Days</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-300">
                <div className="p-1.5 rounded-full bg-slate-50"><CheckCircle className="w-4 h-4" /></div>
                <span className="text-xs font-bold">No Due Date</span>
              </div>
            )}

            {/* Secured Badge & Edit */}
            {isCreditCard && (
              <div className="flex items-center gap-2">
                {account.secured_by_account_id ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 cursor-help transition-colors hover:bg-emerald-100">
                          <Lock className="w-3 h-3" /> Secured
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs font-medium">
                        Secured by: <span className="font-bold text-emerald-400">{securingAccount?.name || "Unknown Asset"}</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Unlock className="w-3 h-3" /> Unsecured
                  </div>
                )}

                <div onClick={(e) => e.stopPropagation()} className="bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                  <EditAccountDialog
                    account={account}
                    accounts={accounts}
                    collateralAccounts={collateralAccounts}
                    triggerContent={<Edit className="w-3.5 h-3.5" />}
                    buttonClassName=""
                  />
                </div>
              </div>
            )}
            {!isCreditCard && (
              <div onClick={(e) => e.stopPropagation()} className="ml-auto bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                <EditAccountDialog
                  account={account}
                  accounts={accounts}
                  collateralAccounts={collateralAccounts}
                  triggerContent={<Edit className="w-3.5 h-3.5" />}
                  buttonClassName=""
                />
              </div>
            )}
          </div>

          {/* 2. SPLIT BODY: LEFT IMAGE | RIGHT INFO */}
          <div className="flex gap-4">
            {/* LEFT: Card Image - Uncropped Aspect Ratio */}
            {/* Using aspect-square container (or 2/3) but object-contain to avoid crop */}
            <div className="w-[30%] shrink-0 self-start">
              <div className="relative w-full aspect-[2/3] rounded-2xl bg-slate-100 overflow-hidden shadow-sm border border-slate-200 flex items-center justify-center">
                {account.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.image_url}
                    alt=""
                    className={cn(
                      "w-full h-full transition-transform origin-center",
                      account.type === 'credit_card' ? "object-contain -rotate-90 scale-150" : "object-cover"
                    )}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    {getAccountIcon(account.type)}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Info Block */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Name & Badges Inline */}
              <div className="mb-1 flex flex-wrap items-start gap-x-2 gap-y-1">
                <h3 className="font-bold text-slate-900 text-base leading-tight">
                  {account.name}
                </h3>
                {/* Parent/Child Badges Logic */}
                {(isClusterParent || isClusterChild) && (
                  <div className="inline-flex items-center self-center">
                    {isClusterParent && (
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-help md:hover:bg-indigo-200 transition-colors">
                              Parent +{childCount}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs p-2 bg-indigo-900 text-indigo-50 border-indigo-800">
                            <p className="font-semibold mb-1 border-b border-indigo-700 pb-1">Children Accounts:</p>
                            <ul className="space-y-0.5">
                              {account.relationships?.child_accounts.map(c => (
                                <li key={c.id} className="flex items-center gap-1.5">
                                  <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                  {c.name}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {isClusterChild && (
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200 cursor-help md:hover:bg-purple-200 transition-colors">
                              Child
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs bg-purple-900 text-purple-50 border-purple-800">
                            Linked to: <span className="font-bold">{account.relationships?.parent_info?.name || 'Parent'}</span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>

              {/* Balance */}
              <div className="text-2xl font-black text-slate-900 tracking-tight mb-3">
                {formatCurrency(displayBalance)} <span className="text-sm text-slate-400 font-bold">₫</span>
              </div>

              {/* UNIFIED STATS BLOCK */}
              <div className="mt-auto bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                {/* Need / Spent Columns - Larger Typography */}
                <div className="flex items-center justify-between mb-3">
                  {/* LEFT COL: Need (Min Spend) OR Remains (Cap) */}
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      {(stats?.missing_for_min ?? 0) > 0 ? "Need (Min)" : (stats?.remains_cap != null ? "Remains" : "Need")}
                      {/* Show Rate if available */}
                      {cashbackConfig?.defaultRate > 0 && (
                        <span className="ml-1 text-[9px] font-normal text-emerald-600 bg-emerald-50 px-1 rounded">
                          {(cashbackConfig!.defaultRate * 100).toFixed(1)}%
                        </span>
                      )}
                      <ArrowDownLeft className="w-2.5 h-2.5" />
                    </span>
                    <span className={cn(
                      "text-sm font-bold",
                      (stats?.missing_for_min ?? 0) > 0 ? "text-indigo-600" : (stats?.remains_cap != null ? "text-emerald-600" : "text-slate-400")
                    )}>
                      {(stats?.missing_for_min ?? 0) > 0
                        ? formatCurrency(stats!.missing_for_min!)
                        : (stats?.remains_cap != null ? formatCurrency(stats.remains_cap) : "Done")}
                    </span>
                  </div>

                  <div className="w-px h-8 bg-slate-200 mx-2" />

                  {/* RIGHT COL: Spent OR Need (Cap) */}
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      {(stats?.missing_for_min ?? 0) <= 0 && stats?.remains_cap != null ? "Need (Cap)" : "Spent"} <ArrowUpRight className="w-2.5 h-2.5" />
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      {(stats?.missing_for_min ?? 0) <= 0 && stats?.remains_cap != null && cashbackConfig?.defaultRate
                        ? formatCurrency(stats!.remains_cap / (cashbackConfig.defaultRate || 0.01))
                        : formatCurrency(stats?.spent_this_cycle ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar (Only if Need > 0) */}
                {(stats?.missing_for_min ?? 0) > 0 && (
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden w-full mb-2">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.max(5, Math.min(100, 100 - ((stats?.missing_for_min ?? 0) / (stats?.min_spend || 1) * 100)))}%` }} />
                  </div>
                )}

                {/* Cycle Date - Full Width Below Progress Bar - Centered */}
                {stats?.cycle_range && (
                  <div className="w-full pt-2 border-t border-slate-200/50 flex justify-center">
                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      Cycle: {stats.cycle_range}
                    </span>
                  </div>
                )}

                {/* Smart Cashback Display */}
                {/* Rule: If defaultRate > 0, show fixed rate. Else if levels, show active level or next goal. */}
                {cashbackConfig && cashbackConfig.hasAdvanced && (
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 cursor-help group/cb">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="bg-emerald-100 text-emerald-600 p-0.5 rounded-full"><ShieldCheck className="w-3 h-3" /></div>
                            <span className="font-bold text-slate-700 group-hover/cb:text-emerald-700 transition-colors">
                              {cashbackConfig?.defaultRate && cashbackConfig.defaultRate > 0
                                ? `${(cashbackConfig.defaultRate * 100).toFixed(1)}% ${cashbackConfig.levels?.[0]?.rules?.[0]?.maxReward || (account.cashback_config as any)?.maxAmount ? 'Limit' : 'Unlimited'}`
                                : (
                                  // Find active level
                                  (() => {
                                    const spend = stats?.spent_this_cycle ?? 0;
                                    const activeLevel = [...cashbackConfig.levels].reverse().find((l: any) => spend >= l.minTotalSpend);
                                    return activeLevel ? `Tier: ${activeLevel.name} Active` : "Tier 0 (Start)";
                                  })()
                                )
                              }
                            </span>
                          </div>
                          <Info className="w-3 h-3 text-slate-300" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="p-0 border-none shadow-xl">
                        <div className="bg-white rounded-xl border border-slate-100 p-3 w-64">
                          <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2 flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Cashback Rules
                          </h4>
                          <div className="space-y-2">
                            {cashbackConfig.defaultRate > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Base Rate</span>
                                <span className="font-bold text-emerald-600">{(cashbackConfig.defaultRate * 100).toFixed(2)}%</span>
                              </div>
                            )}
                            {cashbackConfig.levels.map((lvl: any, idx: number) => (
                              <div key={idx} className={cn(
                                "p-2 rounded-lg text-xs border",
                                (stats?.spent_this_cycle ?? 0) >= lvl.minTotalSpend ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100 opacity-70"
                              )}>
                                <div className="flex justify-between font-bold mb-1">
                                  <span>{lvl.name}</span>
                                  <span>{lvl.rules?.length || 0} Rules</span>
                                </div>
                                <div className="text-[10px] text-slate-500">Min Spend: {formatCurrency(lvl.minTotalSpend)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Full Width Features */}
        <div className="mt-auto">
          {/* Live Cashback Banner */}
          {cashbackById?.[account.id]?.potential_earned && (cashbackById?.[account.id]?.potential_earned ?? 0) !== 0 ? (
            <div className="w-full bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-t border-emerald-100 px-5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white p-1 rounded-full shadow-sm text-emerald-600"><TrendingUp className="w-3 h-3" /></div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  {(cashbackById?.[account.id]?.potential_earned || 0) / (cashbackById?.[account.id]?.total_spend_eligible || 1) * 100 > 0 ? `${((cashbackById?.[account.id]?.potential_earned || 0) / (cashbackById?.[account.id]?.total_spend_eligible || 1) * 100).toFixed(1)}% Yield` : "Active"}
                </span>
              </div>
              <div className="text-sm font-bold text-emerald-700">
                +{formatCurrency(cashbackById?.[account.id]?.potential_earned)}
              </div>
            </div>
          ) : null}

          {/* LIMIT BAR */}
          {isCreditCard && (
            <div className="bg-white px-5 py-2.5 border-t border-slate-50">
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {stats?.due_date_display || "No Due Date"}
                  </span>
                </div>
                <span className={cn("text-[10px] font-bold", usageData.percent > 90 ? "text-red-600" : "text-slate-900")}>
                  {usageData.percent.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", usageData.percent > 90 ? "bg-red-500" : "bg-slate-800")} style={{ width: `${Math.min(100, usageData.percent)}%` }} />
              </div>
            </div>
          )}

          {/* ACTION BAR - Compact & Colored */}
          <div className="flex border-t border-slate-100 divide-x divide-slate-100">
            {/* 1. Income/Repay (Green) */}
            <div className="flex-1 py-3 flex items-center justify-center hover:bg-emerald-50 cursor-pointer group/btn transition-colors" onClick={(e) => { e.stopPropagation(); setActiveDialog("income"); }}>
              <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm group-hover/btn:bg-emerald-100 group-hover/btn:border-emerald-200 transition-all">
                <UserPlus className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            {/* 2. Expense (Red) */}
            <div className="flex-1 py-3 flex items-center justify-center hover:bg-rose-50 cursor-pointer group/btn transition-colors" onClick={(e) => { e.stopPropagation(); setActiveDialog("expense"); }}>
              <div className="p-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 shadow-sm group-hover/btn:bg-rose-100 group-hover/btn:border-rose-200 transition-all">
                <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            {/* 3. Transfer (Blue/Amber) */}
            <div className="flex-1 py-3 flex items-center justify-center hover:bg-amber-50 cursor-pointer group/btn transition-colors" onClick={(e) => { e.stopPropagation(); setActiveDialog("paid"); }}>
              {isCreditCard ? (
                <div className="p-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 shadow-sm group-hover/btn:bg-amber-100 group-hover/btn:border-amber-200 transition-all">
                  <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="p-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm group-hover/btn:bg-blue-100 group-hover/btn:border-blue-200 transition-all" onClick={(e) => { e.stopPropagation(); setActiveDialog("transfer"); }}>
                  <ArrowRightLeft className="w-4 h-4" strokeWidth={2.5} />
                </div>
              )}
            </div>
            {/* 4. Lend (Red) */}
            <div className="flex-1 py-3 flex items-center justify-center hover:bg-red-50 cursor-pointer group/btn transition-colors" onClick={(e) => { e.stopPropagation(); setActiveDialog("debt"); }}>
              <div className="p-1.5 rounded-full bg-red-50 text-red-500 border border-red-100 shadow-sm group-hover/btn:bg-red-100 group-hover/btn:border-red-200 transition-all">
                <UserMinus className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Controlled Dialogs */}
      {/* Income */}
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
      {/* Expense */}
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
      {/* Transfer */}
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
      {/* Paid (Transfer for Credit Card) - FIX: Use Transfer, Dest=Account */}
      <AddTransactionDialog
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
        defaultType="transfer"
        defaultSourceAccountId={undefined} // Paid FROM somewhere else
        cloneInitialValues={{
          category_id: creditPaymentCatId,
          debt_account_id: account.id, // Paid TO this card (technically 'debt_account_id' helper or just destination)
          // Actually for Transfer, destination_account_id is key. But AddTransactionDialog might use a different prop for defaults.
          // Let's rely on standard 'transfer' logic where user picks source (Bank) and dest (This Card).
        }}
        isOpen={activeDialog === "paid"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        buttonClassName="hidden"
      />

      {/* Shopping (for Credit Card) */}
      <AddTransactionDialog
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
        defaultType="expense"
        defaultSourceAccountId={account.id}
        cloneInitialValues={{
          category_id: shoppingCatId,
          shop_id: shopeeShopId,
        }}
        isOpen={activeDialog === "shopping"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        buttonClassName="hidden"
      />

      {/* Lend */}
      <AddTransactionDialog
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
        defaultType="debt"
        defaultSourceAccountId={account.id}
        defaultPersonId={
          selectedPersonId ?? "d419fd12-ad21-4dfa-8054-c6205f6d6b02"
        } // Fallback to Tuan
        isOpen={activeDialog === "debt"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
            setSelectedPersonId(null);
          }
        }}
        buttonClassName="hidden"
      />
      {/* Repayment */}
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

      {/* Quick People Settings Dialog */}
      <QuickPeopleSettingsDialog
        isOpen={activeDialog === "people-settings"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        people={people}
      />

      {/* Family Modal */}
      {/* Obsolete? We keep it for now as a detailed view if clicked */}
      <AccountFamilyModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        parentName={account.name}
        childrenAccounts={childAccounts}
        parentInfo={parentInfo}
      />
    </>
  );
}

export const AccountCard = memo(AccountCardComponent);
