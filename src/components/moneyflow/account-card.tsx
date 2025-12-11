'use client'

import { memo, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Landmark,
  Wallet,
  PiggyBank,
  User,
  CheckCircle,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  ChevronRight,
  Settings,
  Baby, // Try importing Baby
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  MoreVertical,
  ArrowRight,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Eye,
} from 'lucide-react'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { cn } from '@/lib/utils'
import { AccountFamilyModal } from './account-family-modal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AddTransactionDialog } from './add-transaction-dialog'
import { EditAccountDialog } from './edit-account-dialog'
import { updateQuickPeopleUsageAction } from '@/actions/settings-actions'
import { QuickPeopleSettingsDialog } from './quick-people-settings-dialog'

type AccountCardProps = {
  account: Account
  accounts?: Account[]
  categories?: Category[]
  people?: Person[]
  shops?: Shop[]
  collateralAccounts?: Account[]
  usageStats?: any // UsageStats from settings.service
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

function getAccountIcon(type: Account['type']) {
  switch (type) {
    case 'credit_card':
      return <CreditCard className="h-4 w-4" />
    case 'bank':
    case 'ewallet':
      return <Landmark className="h-4 w-4" />
    case 'cash':
      return <Wallet className="h-4 w-4" />
    case 'savings':
    case 'investment':
    case 'asset':
      return <PiggyBank className="h-4 w-4" />
    case 'debt':
      return <User className="h-4 w-4" />
    default:
      return <Wallet className="h-4 w-4" />
  }
}

function AccountCardComponent({
  account,
  accounts = [],
  categories = [],
  people = [],
  shops = [],
  collateralAccounts = [],
  usageStats = {},
}: AccountCardProps) {
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false)
  // Dialog States
  const [activeDialog, setActiveDialog] = useState<'income' | 'expense' | 'transfer' | 'debt' | 'repayment' | 'paid' | 'people-settings' | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  // People Menu State
  const [isPeopleMenuOpen, setIsPeopleMenuOpen] = useState(false)

  const stats = account.stats
  const relationships = account.relationships
  const childAccounts = relationships?.child_accounts ?? []
  const childCount = relationships?.child_count ?? childAccounts.length
  const parentInfo = relationships?.parent_info
  const parentAccountId = account.parent_account_id ?? parentInfo?.id ?? null
  const securedByAccountId = account.secured_by_account_id
  const isCreditCard = account.type === 'credit_card'
  const isParent = relationships?.is_parent || childCount > 0
  const isChild = !!parentAccountId
  const hasFamilyContext = isParent || isChild
  const showParentBadge = isParent
  const showChildBadge = !isParent && isChild
  const detailsHref = `/accounts/${account.id}`

  // Determine card urgency for background color
  const missing = stats?.missing_for_min ?? 0
  const hasSpendingTarget = stats?.min_spend && stats.min_spend > 0
  const daysUntilDue = stats?.due_date_display ? getDaysUntilDueFromStats(stats) : 999
  const isDueSoon = daysUntilDue <= 10 && Math.abs(account.current_balance ?? 0) > 0 // Added condition for non-zero balance
  const needsSpendMore = hasSpendingTarget && missing > 0

  // Format Helpers
  const formatCurrency = (val: number | null | undefined) => {
    return val !== null && val !== undefined ? numberFormatter.format(val) : '0'
  }

  // Helper to calculate days until due from stats
  function getDaysUntilDueFromStats(stats: any): number {
    if (!stats?.due_date_display) return 999
    // Parse the due date display (format: "DD-MM")
    const parts = stats.due_date_display.split('-')
    if (parts.length !== 2) return 999
    const day = parseInt(parts[0])
    const month = parseInt(parts[1])
    const now = new Date()
    const currentYear = now.getFullYear()
    const dueDate = new Date(currentYear, month - 1, day)
    if (dueDate < now) {
      dueDate.setFullYear(currentYear + 1)
    }
    const diffTime = dueDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Handle Parent Link Click (Stop Propagation to prevent Card Link)
  const isSecuredAsset = !!securedByAccountId

  // Check if this account is securing another account (Reverse Lookup)
  const securingAccount = useMemo(() => {
    return accounts.find(a => a.secured_by_account_id === account.id)
  }, [account.id, accounts])

  const handleFamilyBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFamilyModalOpen(true)
  }

  // Prevent bubble for direct links
  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const usageData = useMemo(() => {
    // UPDATED LOGIC per User Feedback:
    // For Credit Cards: "Limit 30m, Balance 27m" -> means 27m is AVAILABLE.
    // So Used = Limit - Balance.
    const limit = account.credit_limit ?? 0
    const balance = account.current_balance ?? 0

    let usedCheck = 0
    if (account.type === 'credit_card' && limit > 0) {
      // If balance > limit (rare, overpayment), used is 0.
      // If balance < 0 (debt in system), then used is just abs(balance).
      // User scenario implies Positive Balance = Available Limit.
      // Let's assume Positive means Available for this specific case as requested.
      // But to be safe, if balance is negative, it's definitely debt.
      if (balance >= 0) {
        usedCheck = Math.max(0, limit - balance)
      } else {
        // Negative balance implies debt in standard ledger, so Used = Abs(Balance)
        usedCheck = Math.abs(balance)
      }
    } else {
      usedCheck = Math.abs(balance)
    }

    const percent = limit > 0 ? (usedCheck / limit) * 100 : 0

    return {
      limit,
      usedAmount: usedCheck,
      percent, // 0-100+
      formattedLimit: formatCurrency(limit),
      formattedUsed: formatCurrency(usedCheck),
    }
  }, [account.credit_limit, account.current_balance, account.type])

  // Find "Credit Payment" category for the "Paid" action
  const creditPaymentCat = useMemo(() => {
    return categories.find(cat => cat.name === 'Credit Payment')
  }, [categories])

  // Sorting Logic for Quick People
  const { lendPeople, repayPeople } = useMemo(() => {
    const sortPeople = (type: 'lend' | 'repay') => {
      // Create a shallow copy to sort
      return [...people].sort((a, b) => {
        // Safe access with optional chaining and defaults
        const statsA = usageStats?.[a.id] || { [type === 'lend' ? 'lend_count' : 'repay_count']: 0, last_used_at: 0 }
        const statsB = usageStats?.[b.id] || { [type === 'lend' ? 'lend_count' : 'repay_count']: 0, last_used_at: 0 }

        // Priority 1: Last Used (Most recent first)
        const timeA = new Date(statsA.last_used_at || 0).getTime()
        const timeB = new Date(statsB.last_used_at || 0).getTime()
        if (timeA !== timeB) return timeB - timeA

        // Priority 2: Count (Most used first)
        const countKey = type === 'lend' ? 'lend_count' : 'repay_count'
        const countA = (statsA as any)[countKey] || 0
        const countB = (statsB as any)[countKey] || 0
        return countB - countA
      })
    }
    return {
      lendPeople: sortPeople('lend').slice(0, 5),
      repayPeople: sortPeople('repay').slice(0, 5)
    }
  }, [people, usageStats])

  // --- Render Sections ---

  // 1. Left Section (Visual)
  const renderVisualSection = () => (
    <div className="bg-muted/5 p-1.5 relative flex flex-col items-center border-r h-full overflow-hidden">
      {/* Top Badges Row - Due Date */}
      <div className="w-full flex justify-center items-center mb-2 min-h-[20px]">
        {stats?.due_date_display && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-100 shadow-sm">
            <span>Due: {stats.due_date_display}</span>
          </span>
        )}
      </div>

      {/* Relationship Badges Row */}
      <div className="w-full flex justify-center items-center gap-1.5 mb-2 min-h-[20px]">
        {showParentBadge && (
          <button
            onClick={handleFamilyBadgeClick}
            className="flex items-center gap-1 text-[9px] uppercase font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full hover:bg-violet-100 transition-colors border border-violet-100"
            title="Parent Account (Shared Limit)"
          >
            <Users className="w-3 h-3" />
            Parent
          </button>
        )}

        {showChildBadge && (
          <button
            onClick={handleFamilyBadgeClick}
            className="flex items-center gap-1 text-[9px] uppercase font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full hover:bg-violet-100 transition-colors border border-violet-100"
            title="Child Account (Shared Limit)"
          >
            <Baby className="w-3 h-3" />
            Child
          </button>
        )}

        {childCount > 1 && hasFamilyContext && (
          <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
            + {childCount}
          </span>
        )}
      </div>

      {/* Center: Image */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-20 h-20 aspect-square shrink-0 flex items-center justify-center select-none">
          {account.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.logo_url}
              alt={account.name}
              className="w-full h-full object-contain rounded-lg"
              loading="lazy"
            />
          ) : (
            <div className="text-muted-foreground/30">
              {getAccountIcon(account.type)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Meta Badges */}
      <div className="mt-auto w-full flex flex-col items-center gap-1.5 pt-2 pb-1">
        {stats?.cycle_range && (
          <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-md whitespace-nowrap border border-slate-300 shadow-sm">
            {stats.cycle_range}
          </span>
        )}

        {/* Case 1: This Account IS Linked to a Saving (e.g. Secured Credit Card) */}
        {isSecuredAsset && securedByAccountId && (
          <Link
            href={`/accounts/${securedByAccountId}`}
            onClick={handleLinkClick}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm"
            title={parentInfo?.name ?? 'Linked saving account'}
          >
            🔒 Linked Saving
          </Link>
        )}

        {/* Case 2: This Account IS the Saving Account Securing another (Reverse) */}
        {securingAccount && (
          <Link
            href={`/accounts/${securingAccount.id}`}
            onClick={handleLinkClick}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm max-w-[90px]"
            title={`Securing ${securingAccount.name}`}
          >
            <span className="truncate">🛡️ Securing {securingAccount.name}</span>
          </Link>
        )}
      </div>
    </div>
  )

  // 2. Right Section (Data)
  const renderDataSection = () => {
    const balance = account.current_balance ?? 0
    // Usage Color Logic
    const { limit, percent: usageVal, formattedLimit, formattedUsed } = usageData

    let progressColorClass = "bg-emerald-500" // < 30%
    if (usageVal >= 30 && usageVal <= 80) progressColorClass = "bg-yellow-500" // 30-80%
    if (usageVal > 80) progressColorClass = "bg-red-500" // > 80%

    // KPI Logic
    const missing = stats?.missing_for_min ?? 0
    const isMet = missing <= 0
    const showKPI = stats?.min_spend && stats.min_spend > 0

    return (
      <div className="p-3 pl-4 flex flex-col h-full w-full min-w-0 bg-white/50 backdrop-blur-[2px] relative group/right">
        {/* Detail/Edit Actions (Absolute Top Right - Show on hover of Right Section) */}
        <div className="absolute top-2 right-2 flex flex-wrap gap-2 opacity-0 group-hover/right:opacity-100 transition-opacity z-30">
          <Link
            href={detailsHref}
            onClick={handleLinkClick}
            className="rounded-full bg-white/90 border border-slate-200 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 shadow-sm"
          >
            Details
          </Link>
          <EditAccountDialog
            account={account}
            accounts={accounts}
            collateralAccounts={collateralAccounts}
            buttonClassName="rounded-full bg-white/90 border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            triggerContent="Edit"
          />
        </div>

        {/* Header - Compacted */}
        <div className="flex justify-between items-start mb-1 pt-1">
          <div className="flex flex-col min-w-0 pr-2">
            <h3 className="font-bold text-lg leading-tight truncate text-slate-900" title={account.name}>
              {account.name}
            </h3>
          </div>
          <div className={cn(
            "text-2xl font-bold tracking-tight whitespace-nowrap",
            balance < 0 ? "text-red-600" : "text-slate-900"
          )}>
            {formatCurrency(balance)}
          </div>
        </div>

        {/* KPI Area (Middle) - Collapsible */}
        {showKPI ? (
          <div className="flex-1 flex flex-col justify-center py-2">
            <div className="flex justify-between items-center bg-slate-50/80 p-2 rounded-sm text-sm border border-slate-100">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Target</span>
                <span className="font-bold text-xs text-slate-700">{formatCurrency(stats?.min_spend)}</span>
              </div>
              {/* Vertical Separator */}
              <div className="w-[1px] h-6 bg-slate-100 mx-2" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Spent</span>
                <span className="font-bold text-xs text-slate-700">{formatCurrency(stats?.spent_this_cycle)}</span>
              </div>

              <div className="ml-auto pl-2">
                {isMet ? (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-100/80 px-2 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200/50">
                    <CheckCircle className="h-3 w-3" />
                    Met
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 animate-pulse border border-amber-200/50">
                    Need {formatCurrency(missing)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[4px]" /> // Minimal spacer
        )}

        {/* Credit Health (Bottom) */}
        {isCreditCard && (
          <div className="mt-auto pt-2 border-t border-dashed border-slate-100">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                Limit: <span className="font-bold text-slate-700">{formattedLimit}</span>
              </span>
              <span className="text-[10px] font-bold text-right ml-2">
                <span className={cn(
                  usageVal > 80 ? "text-red-600" : "text-slate-600"
                )}>{Math.min(usageVal, 100).toFixed(0)}% Used</span>
              </span>
            </div>

            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden cursor-help relative">
                    <div
                      className={cn("h-full transition-all duration-700 ease-out rounded-full shadow-sm", progressColorClass)}
                      style={{ width: `${Math.min(usageVal, 100)}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6} className="z-[70] text-xs font-semibold">
                  Used: {formattedUsed} / Limit: {formattedLimit}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Quick Add Toolbar - For All Accounts, centered in right section */}
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-200",
          "bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200 rounded-xl p-3",
          "grid grid-cols-2 gap-2.5 w-[90%] max-w-[280px]",
          showKPI
            ? "opacity-0 group-hover/right:opacity-100 pointer-events-none group-hover/right:pointer-events-auto"
            : "opacity-100 pointer-events-auto"
        )}>
          {/* Income */}
          <button
            onClick={(e) => { e.stopPropagation(); setActiveDialog('income') }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm"
            title="Add Income"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Income
          </button>

          {/* Expense */}
          <button
            onClick={(e) => { e.stopPropagation(); setActiveDialog('expense') }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-all shadow-sm"
            title="Add Expense"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Expense
          </button>

          {/* Transfer (Hidden for Credit Cards) */}
          {!isCreditCard && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveDialog('transfer') }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 transition-all shadow-sm"
              title="Transfer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer
            </button>
          )}

          {/* Paid (Credit Card Only - Replaces Transfer) */}
          {isCreditCard && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveDialog('paid') }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-all shadow-sm"
              title="Pay Off Card"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Paid
            </button>
          )}

          {/* People Menu (Lend/Repay) with Hover & Nested Check */}
          <div
            className="relative isolate flex justify-center"
            onMouseEnter={() => setIsPeopleMenuOpen(true)}
            onMouseLeave={() => setIsPeopleMenuOpen(false)}
          >
            <button
              className="flex items-center justify-center w-full gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 transition-all shadow-sm"
              title="Lend / Repay"
            >
              <Users className="w-3.5 h-3.5" />
              People
            </button>

            {/* Dropdown Menu - Bridge Gap with padding instead of margin */}
            {isPeopleMenuOpen && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 w-32 flex flex-col items-center z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 flex flex-col gap-1">

                  {/* Settings Link (Top of Menu) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPeopleMenuOpen(false);
                      setActiveDialog('people-settings');
                    }}
                    className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg flex items-center gap-2 mb-1 border-b border-slate-50"
                  >
                    <Settings className="w-3 h-3" /> Settings
                  </button>

                  {/** Lend Group (Hover to Reveal Submenu) **/}
                  <div className="group/lend relative">
                    <button
                      className="w-full text-left px-2 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center justify-between"
                    >
                      <span>Lend</span>
                      <ChevronRight className="w-3 h-3 text-rose-400 group-hover/lend:text-rose-600 transition-colors" />
                    </button>
                    {/* Nested Submenu (LEFT side) - Bridge Gap with padding right */}
                    <div className="hidden group-hover/lend:block absolute bottom-0 right-full pr-1 z-[60] animate-in fade-in zoom-in-95 slide-in-from-right-2">
                      <div className="w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5">
                        {/* Manual Lend */}
                        <button
                          onClick={() => { setIsPeopleMenuOpen(false); setActiveDialog('debt') }}
                          className="w-full text-left px-2 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-2 mb-1"
                        >
                          <Plus className="w-3 h-3" /> New Lend
                        </button>
                        <div className="h-[1px] bg-slate-100 w-full mb-1" />
                        {/* Quick Select List */}
                        <div className="flex flex-col gap-0.5">
                          {lendPeople.length > 0 ? lendPeople.map(person => (
                            <button
                              key={`lend-${person.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuickPeopleUsageAction(person.id, 'lend');
                                setIsPeopleMenuOpen(false);
                                setSelectedPersonId(person.id);
                                setActiveDialog('debt');
                              }}
                              className="w-full text-left px-2 py-1.5 text-[10px] text-slate-700 hover:bg-rose-50 hover:text-rose-700 rounded transition-colors flex items-center gap-2 group/item"
                            >
                              {/* Thumbnail */}
                              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-slate-100 group-hover/item:border-rose-200">
                                {person.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[8px]">
                                    {person.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <span className="truncate flex-1">{person.name}</span>
                            </button>
                          )) : (
                            <span className="text-[9px] text-slate-400 px-2 py-1 italic">No people found</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-100 w-full" />

                  {/** Repay Group (Hover to Reveal Submenu) **/}
                  <div className="group/repay relative">
                    <button
                      className="w-full text-left px-2 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center justify-between"
                    >
                      <span>Repay</span>
                      <ChevronRight className="w-3 h-3 text-emerald-400 group-hover/repay:text-emerald-600 transition-colors" />
                    </button>
                    {/* Nested Submenu (LEFT side) - Bridge Gap with padding right */}
                    <div className="hidden group-hover/repay:block absolute bottom-0 right-full pr-1 z-[60] animate-in fade-in zoom-in-95 slide-in-from-right-2">
                      <div className="w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5">
                        {/* Manual Repay */}
                        <button
                          onClick={() => { setIsPeopleMenuOpen(false); setActiveDialog('repayment') }}
                          className="w-full text-left px-2 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2 mb-1"
                        >
                          <Plus className="w-3 h-3" /> New Repay
                        </button>
                        <div className="h-[1px] bg-slate-100 w-full mb-1" />
                        {/* Quick Select List */}
                        <div className="flex flex-col gap-0.5">
                          {repayPeople.length > 0 ? repayPeople.map(person => (
                            <button
                              key={`repay-${person.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuickPeopleUsageAction(person.id, 'repay');
                                setIsPeopleMenuOpen(false);
                                setSelectedPersonId(person.id);
                                setActiveDialog('repayment');
                              }}
                              className="w-full text-left px-2 py-1.5 text-[10px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded transition-colors flex items-center gap-2 group/item"
                            >
                              {/* Thumbnail */}
                              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-slate-100 group-hover/item:border-emerald-200">
                                {person.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[8px]">
                                    {person.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <span className="truncate flex-1">{person.name}</span>
                            </button>
                          )) : (
                            <span className="text-[9px] text-slate-400 px-2 py-1 italic">No people found</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          "group relative block w-full rounded-xl border-2 text-card-foreground shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] overflow-visible",
          isDueSoon
            ? "bg-red-50/30 border-red-200 hover:border-red-300"
            : needsSpendMore
              ? "bg-amber-50/30 border-amber-200 hover:border-amber-300"
              : "bg-white border-slate-200 hover:border-slate-300"
        )}
      >
        {/* Use specific grid proportions */}
        {/* Min-height relaxed to allow shrinking if no KPI */}
        <div className="grid grid-cols-[130px_1fr] h-full min-h-[170px]">
          {renderVisualSection()}
          {renderDataSection()}
        </div>
      </div>

      {/* Controlled Dialogs - Avoiding Nesting */}
      {/* Income */}
      <AddTransactionDialog
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
        defaultType="income"
        defaultSourceAccountId={account.id}
        isOpen={activeDialog === 'income'}
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
        isOpen={activeDialog === 'expense'}
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
        isOpen={activeDialog === 'transfer'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        buttonClassName="hidden"
      />
      {/* Paid (Transfer for Credit Card) */}
      <AddTransactionDialog
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
        defaultType="expense"
        defaultSourceAccountId={account.id}
        // Find "Credit Payment" category
        cloneInitialValues={{ category_id: categories.find(c => c.name === 'Credit Payment')?.id }}
        isOpen={activeDialog === 'paid'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        buttonClassName="hidden"
      />
      {/* Lend - Default Person Tuan */}
      <AddTransactionDialog
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
        defaultType="debt"
        defaultSourceAccountId={account.id}
        defaultPersonId={selectedPersonId ?? "d419fd12-ad21-4dfa-8054-c6205f6d6b02"} // Fallback to Tuan
        isOpen={activeDialog === 'debt'}
        onOpenChange={(open) => {
          if (!open) { setActiveDialog(null); setSelectedPersonId(null); }
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
        isOpen={activeDialog === 'repayment'}
        onOpenChange={(open) => {
          if (!open) { setActiveDialog(null); setSelectedPersonId(null); }
        }}
        buttonClassName="hidden"
      />

      {/* Quick People Settings Dialog */}
      <QuickPeopleSettingsDialog
        isOpen={activeDialog === 'people-settings'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        people={people}
      />

      {/* Family Modal */}
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
  )
}

export const AccountCard = memo(AccountCardComponent)
