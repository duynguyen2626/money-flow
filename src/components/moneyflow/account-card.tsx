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
  const childCount = relationships?.child_count ?? childAccounts.length;
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
        {/* Round 8: Reduced Vertical Padding (pt-1) */}
        <div className="px-3 pt-1 pb-1.5">

          {/* 1. HEADER BADGES */}
          <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
            {/* Days Left */}
            {stats?.due_date !== undefined && stats?.due_date !== null ? (
              <div className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm",
                getDaysDiff(stats.due_date) <= 5
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-700"
              )}>
                {cardState.badges.due ? (
                  <>
                    <span>⏳</span>
                    <span>{cardState.badges.due.days} Days left</span>
                  </>
                ) : (
                  <>
                    <CalendarClock className="w-3 h-3" />
                    <span>{getDaysDiff(stats.due_date)} Days left</span>
                  </>
                )}
                <span className="ml-1 text-[9px] opacity-80">{stats.due_date_display}</span>
              </div>
            ) : (<div />)}

            {/* Secured Badge with Tooltip */}
            {isCreditCard && (
              <div className="flex items-center gap-1">
                {account.secured_by_account_id ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 cursor-help transition-colors hover:bg-emerald-100">
                          <Lock className="w-3 h-3" /> Secured
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Secured by: <span className="font-bold">{securingAccount?.name || "Unknown Asset"}</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <Unlock className="w-3 h-3" /> Unsecured
                  </div>
                )}
                {/* Edit Button */}
                <div onClick={(e) => e.stopPropagation()} className="ml-1 text-slate-300 hover:text-slate-600">
                  <EditAccountDialog
                    account={account}
                    accounts={accounts}
                    collateralAccounts={collateralAccounts}
                    triggerContent={<Edit className="w-3.5 h-3.5" />}
                    buttonClassName="p-1 hover:bg-slate-100 rounded-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. SPLIT BODY: LEFT IMAGE | RIGHT INFO */}
          <div className="flex gap-3">
            {/* LEFT: Portrait Image - Round 8 Reduced Width (26%) */}
            <div className="w-[26%] shrink-0 self-start">
              <div className="relative w-full aspect-[2/3] rounded-xl bg-slate-100 overflow-hidden shadow-sm border border-slate-200">
                {account.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.image_url}
                    alt=""
                    // Scale up (160%) to cover crop gaps from aspect ratio mismatch on rotation
                    className="absolute left-1/2 top-1/2 w-[160%] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    {getAccountIcon(account.type)}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Info Block */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Name */}
              <div className="mb-0.5">
                <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">
                  {account.name}
                </h3>
              </div>

              {/* Balance */}
              <div className="text-lg font-bold text-slate-900 tracking-tight mb-1">
                {formatCurrency(displayBalance)} <span className="text-xs text-slate-400 font-medium">₫</span>
              </div>

              {/* Parent / Child Badges - BELOW BALANCE */}
              {(isClusterParent || isClusterChild) && (
                <div className="flex items-center gap-1 mb-2">
                  {isClusterParent && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Users className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase">Parent +{childCount}</span>
                    </div>
                  )}
                  {isClusterChild && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                      <Baby className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase">Child</span>
                    </div>
                  )}
                </div>
              )}

              {/* UNIFIED STATS BLOCK (Gray Bg) */}
              {/* Added 'Cashback Config' here */}
              <div className="mt-auto bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                {/* Cycle Date */}
                <div className="flex items-center gap-1.5 mb-2 text-slate-400">
                  <CalendarClock className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{stats?.cycle_range || "Current Cycle"}</span>
                </div>

                {/* Need / Spent Columns */}
                <div className="flex items-center justify-between">
                  {/* Need */}
                  <div>
                    <div className="flex items-center gap-1 text-[8px] uppercase font-bold text-slate-400 mb-0.5">
                      Need <ArrowDownLeft className="w-2 h-2" />
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {stats?.missing_for_min && stats.missing_for_min > 0 ? formatCurrency(stats.missing_for_min) : "---"}
                    </div>
                  </div>
                  {/* Divider */}
                  <div className="w-px h-8 bg-slate-200 mx-2" />
                  {/* Spent */}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-[8px] uppercase font-bold text-slate-400 mb-0.5">
                      Spent <ArrowUpRight className="w-2 h-2" />
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {formatCurrency(stats?.spent_this_cycle ?? 0)}
                    </div>
                  </div>
                </div>

                {/* Target Completion */}
                {stats?.missing_for_min && stats.missing_for_min > 0 && (
                  <div className="mt-2.5 w-full">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Target</span>
                      <span className="text-[8px] font-bold text-blue-600">{usageData.percent < 100 ? `${(100 - (stats.missing_for_min / (stats.min_spend || 1) * 100)).toFixed(0)}%` : "100%"}</span>
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, 100 - (stats.missing_for_min / (stats.min_spend || 1) * 100)))}%` }} />
                    </div>
                  </div>
                )}

                {/* CASHBACK CONFIG - MOVED INSIDE STATS BLOCK */}
                {cashbackConfig && cashbackConfig.hasAdvanced && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between cursor-help group/adv px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="text-emerald-600"><ShieldCheck className="w-3 h-3" /></div>
                              <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider leading-tight">
                                {cashbackConfig.defaultRate > 0
                                  ? `+${(cashbackConfig.defaultRate * 100).toFixed(1)}% Unlimited`
                                  : "Cashback Active"
                                }
                              </span>
                            </div>
                            <Info className="w-3 h-3 text-slate-300 group-hover/adv:text-emerald-500 transition-colors" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-3 max-w-[240px]">
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">Cashback Policy</p>
                            {cashbackConfig.defaultRate > 0 && (
                              <div className="flex items-start gap-2 text-[10px] leading-tight">
                                <CheckCircle className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />
                                <span className="text-slate-600">
                                  Base Rate: <span className="font-bold text-slate-800">{(cashbackConfig.defaultRate * 100).toFixed(2)}%</span> on all spend
                                </span>
                              </div>
                            )}
                            {cashbackConfig.levels.map((lvl: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-[10px] leading-tight">
                                <CheckCircle className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" />
                                <span className="text-slate-600">
                                  {lvl.name}: {lvl.rules?.length > 0 ? "Tiered Rules Applied" : "Custom Rate"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Full Width Features */}
        <div className="mt-auto">
          {/* Live Cashback Banner */}
          {cashbackById?.[account.id]?.potential_earned && cashbackById?.[account.id]?.potential_earned !== 0 && (
            <div className="w-full bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-t border-emerald-100 px-4 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white p-1 rounded-full shadow-sm text-emerald-600"><TrendingUp className="w-3 h-3" /></div>
                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                  {(cashbackById?.[account.id]?.potential_earned || 0) / (cashbackById?.[account.id]?.total_spend_eligible || 1) * 100 > 0 ? `${((cashbackById?.[account.id]?.potential_earned || 0) / (cashbackById?.[account.id]?.total_spend_eligible || 1) * 100).toFixed(1)}% Yield` : "Active"}
                </span>
              </div>
              <div className="text-xs font-bold text-emerald-700">
                +{formatCurrency(cashbackById?.[account.id]?.potential_earned)}
              </div>
            </div>
          )}

          {/* LIMIT BAR */}
          {isCreditCard && (
            <div className="bg-white px-4 py-2 border-t border-slate-50">
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-3 h-3 text-slate-400" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Limit: {usageData.formattedLimit}</span>
                </div>
                <span className={cn("text-[9px] font-bold", usageData.percent > 90 ? "text-red-600" : "text-slate-900")}>
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
            {/* 1. Income (Green) */}
            <div className="flex-1 py-2.5 flex items-center justify-center hover:bg-emerald-50 cursor-pointer group/btn transition-colors" onClick={(e) => { e.stopPropagation(); setActiveDialog("income"); }}>
              <div className="p-1.5 rounded-full bg-slate-50 group-hover/btn:bg-white text-slate-400 group-hover/btn:text-emerald-600 transition-all border border-transparent group-hover/btn:border-emerald-100 group-hover/btn:shadow-sm">
                <ArrowDownLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
            </div>
            {/* 2. Expense (Red) */}
            <div className="flex-1 py-2.5 flex items-center justify-center hover:bg-rose-50 cursor-pointer group/btn transition-colors" onClick={(e) => { e.stopPropagation(); setActiveDialog("expense"); }}>
              <div className="p-1.5 rounded-full bg-slate-50 group-hover/btn:bg-white text-slate-400 group-hover/btn:text-rose-600 transition-all border border-transparent group-hover/btn:border-rose-100 group-hover/btn:shadow-sm">
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
            </div>
            {/* 3. Transfer */}
            <div className="flex-1 py-2.5 flex items-center justify-center hover:bg-amber-50 cursor-pointer group/btn transition-colors" onClick={(e) => { e.stopPropagation(); setActiveDialog("paid"); }}>
              {isCreditCard ? (
                <div className="p-1.5 rounded-full bg-slate-50 group-hover/btn:bg-white text-slate-400 group-hover/btn:text-amber-600 transition-all border border-transparent group-hover/btn:border-amber-100 group-hover/btn:shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="p-1.5 rounded-full bg-slate-50 group-hover/btn:bg-white text-slate-400 group-hover/btn:text-blue-600 transition-all border border-transparent group-hover/btn:border-blue-100 group-hover/btn:shadow-sm" onClick={(e) => { e.stopPropagation(); setActiveDialog("transfer"); }}>
                  <ArrowRightLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
              )}
            </div>
            {/* 4. Lend (Red) */}
            <div className="flex-1 py-2.5 flex items-center justify-center hover:bg-red-50 cursor-pointer group/btn transition-colors" onClick={(e) => { e.stopPropagation(); setActiveDialog("debt"); }}>
              <div className="p-1.5 rounded-full bg-slate-50 group-hover/btn:bg-white text-slate-400 group-hover/btn:text-red-500 transition-all border border-transparent group-hover/btn:border-red-100 group-hover/btn:shadow-sm">
                <UserMinus className="w-3.5 h-3.5" strokeWidth={2.5} />
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
