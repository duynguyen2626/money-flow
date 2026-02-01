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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Extract Cashback Category Badges
  const cashbackBadges = useMemo(() => {
    if (!cashbackConfig || !categories.length) return [];

    // Collect all unique category IDs from all rules
    const allCategoryIds = new Set<string>();
    cashbackConfig.levels.forEach((level: any) => {
      if (level.rules) {
        level.rules.forEach((rule: any) => {
          if (rule.categoryIds) {
            rule.categoryIds.forEach((id: string) => allCategoryIds.add(id));
          }
        });
      }
    });

    return Array.from(allCategoryIds)
      .map(id => categories.find(c => c.id === id))
      .filter(Boolean) as Category[];
  }, [cashbackConfig, categories]);


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
      <Card
        onClick={handleCardClick}
        className={cn(
          "group relative flex flex-col w-full rounded-xl border transition-all hover:shadow-md cursor-pointer overflow-hidden bg-white p-3 gap-3",
          cardState.badges.due ? "border-rose-200" : cardState.badges.spend ? "border-amber-200" : "border-slate-100",
          className
        )}
      >
        {/* HEADER: Status Badges & Edit */}
        <div className="flex items-center justify-between min-h-[24px]">
          <div className="flex items-center gap-2">
            {/* Due Date Badge */}
            {stats?.due_date ? (
              getDaysDiff(stats.due_date) <= 5 ? (
                <Badge variant="secondary" className="bg-rose-50 text-rose-600 border-rose-100 text-[9px] px-1.5 h-6 rounded-md font-bold flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  {getDaysDiff(stats.due_date)} Days
                </Badge>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {stats.due_date_display || "Due Soon"}
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">No Due Date</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Secured Badge */}
            {isCreditCard && account.secured_by_account_id && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] px-1.5 h-6 rounded-md font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Secured
              </Badge>
            )}
            {isCreditCard && !account.secured_by_account_id && !hideSecuredBadge && (
              <div className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-slate-300 border border-slate-100 flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Unsecured
              </div>
            )}

            {/* Edit Button */}
            <div onClick={(e) => e.stopPropagation()} className="text-slate-300 hover:text-slate-600 transition-colors">
              <EditAccountDialog
                account={account}
                accounts={accounts}
                collateralAccounts={collateralAccounts}
                triggerContent={<Edit className="w-3.5 h-3.5" />}
                buttonClassName=""
              />
            </div>
          </div>
        </div>

        {/* BODY: Image & Info */}
        <div className="flex gap-3 items-stretch">
          {/* LEFT: Card Image (Compact, Rounded, No Border) */}
          <div className="w-20 shrink-0 flex flex-col justify-start">
            <div className="relative w-full aspect-[2/3] rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center shadow-inner">
              {account.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={account.image_url}
                  alt=""
                  className={cn(
                    "w-full h-full transition-transform origin-center",
                    isCreditCard ? "object-contain -rotate-90 scale-[1.4]" : "object-cover"
                  )}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  {getAccountIcon(account.type)}
                </div>
              )}
            </div>
            {/* Tiny Cycle Info under image if space? No, keep layout clean */}
          </div>

          {/* RIGHT: Stats */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Name */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">
                  {account.name}
                </h3>
                {/* Parent/Child Badge */}
                {(isClusterParent || isClusterChild) && (
                  <span className={cn(
                    "text-[9px] font-extrabold uppercase px-1 rounded",
                    isClusterParent ? "bg-indigo-50 text-indigo-600" : "bg-purple-50 text-purple-600"
                  )}>
                    {isClusterParent ? "Parent" : "Child"}
                  </span>
                )}
                {!account.is_active && (
                  <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-slate-100 text-slate-500">
                    Archived
                  </span>
                )}
              </div>
              {/* Balance */}
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(displayBalance)}
                </span>
                <span className="text-xs font-bold text-slate-400">₫</span>
              </div>
            </div>

            {/* Cashback Category Badges (MCC) */}
            {cashbackBadges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5 mb-1">
                {cashbackBadges.slice(0, 4).map(cat => (
                  <TooltipProvider key={cat.id}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 bg-blue-50/50 text-blue-600 border-blue-100 font-bold cursor-help truncate max-w-[80px]">
                          {cat.icon} {cat.name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        <div className="font-bold">{cat.name}</div>
                        {cat.mcc_codes && cat.mcc_codes.length > 0 ? (
                          <div className="text-slate-400">MCC: {cat.mcc_codes.join(', ')}</div>
                        ) : (
                          <div className="text-slate-400">All MCCs supported</div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {cashbackBadges.length > 4 && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 text-slate-400 border-slate-100">
                    +{cashbackBadges.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Mini Stats Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 p-2 bg-slate-50/50 rounded-lg border border-slate-100/50">
              {/* Need / Remains */}
              <div className="flex flex-col">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  {(stats?.missing_for_min ?? 0) > 0 ? "Need (Min)" : "Remains"}
                </span>
                <span className={cn(
                  "text-xs font-bold tabular-nums",
                  (stats?.missing_for_min ?? 0) > 0 ? "text-indigo-600" : "text-emerald-600"
                )}>
                  {(stats?.missing_for_min ?? 0) > 0
                    ? formatCurrency(stats!.missing_for_min!)
                    : (stats?.remains_cap != null ? formatCurrency(stats.remains_cap) : "Done")}
                </span>
              </div>
              {/* Cap / Spent */}
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  {(stats?.missing_for_min ?? 0) <= 0 && stats?.remains_cap != null ? "Need (Cap)" : "Spent"}
                </span>
                <span className="text-xs font-bold text-slate-700 tabular-nums">
                  {(stats?.missing_for_min ?? 0) <= 0 && stats?.remains_cap != null && cashbackConfig?.defaultRate
                    ? formatCurrency(stats!.remains_cap / (cashbackConfig.defaultRate || 0.01))
                    : formatCurrency(stats?.spent_this_cycle ?? 0)}
                </span>
              </div>

              {/* Progress / Cycle */}
              <div className="col-span-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {/* Shield Icon or Rate */}
                  {cashbackConfig?.defaultRate && cashbackConfig.defaultRate > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-2.5 h-2.5" /> {(cashbackConfig.defaultRate * 100).toFixed(1)}%
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                    {usageData.percent > 0 && (
                      <span className={usageData.percent > 90 ? "text-rose-500" : "text-slate-500"}>
                        {usageData.percent.toFixed(0)}% Use
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-400">
                  {stats?.cycle_range?.split(' to ')[0]} - {stats?.cycle_range?.split(' to ')[1]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER: Action Buttons Grid */}
        <div className="grid grid-cols-4 gap-1.5 mt-auto pt-2 border-t border-slate-50">
          {/* Income */}
          <div onClick={(e) => { e.stopPropagation(); setActiveDialog("income"); }}
            className="flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-100"
            title="Add Income"
          >
            <UserPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          {/* Expense */}
          <div onClick={(e) => { e.stopPropagation(); setActiveDialog("expense"); }}
            className="flex items-center justify-center p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer border border-rose-100"
            title="Add Expense"
          >
            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          {/* Transfer/Paid */}
          <div onClick={(e) => { e.stopPropagation(); setActiveDialog(isCreditCard ? "paid" : "transfer"); }}
            className="flex items-center justify-center p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-100"
            title={isCreditCard ? "Pay Balance" : "Transfer"}
          >
            {isCreditCard ? <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} /> : <ArrowRightLeft className="w-3.5 h-3.5" strokeWidth={2.5} />}
          </div>
          {/* Lend */}
          <div onClick={(e) => { e.stopPropagation(); setActiveDialog("debt"); }}
            className="flex items-center justify-center p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer border border-amber-100"
            title="Lend"
          >
            <UserMinus className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
        </div>

      </Card>

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
