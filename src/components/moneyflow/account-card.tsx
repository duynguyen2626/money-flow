'use client'

import { memo, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  Baby,
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
  ShoppingBag,
  ShieldCheck,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { getCardActionState } from '@/lib/card-utils'
import { SYSTEM_CATEGORIES } from '@/lib/constants'

type AccountCardProps = {
  account: Account
  accounts?: Account[]
  categories?: Category[]
  people?: Person[]
  shops?: Shop[]
  collateralAccounts?: Account[]
  usageStats?: any // UsageStats from settings.service
  pendingBatchAccountIds?: string[]
  className?: string
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
  pendingBatchAccountIds = [],
  className,
}: AccountCardProps) {
  const router = useRouter()
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false)
  // Dialog States
  const [activeDialog, setActiveDialog] = useState<'income' | 'expense' | 'transfer' | 'debt' | 'repayment' | 'paid' | 'shopping' | 'people-settings' | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [isLandscape, setIsLandscape] = useState(false)

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
  const hasPendingBatch = pendingBatchAccountIds.includes(account.id)

  // State from unified helper
  const cardState = useMemo(() => getCardActionState(account, hasPendingBatch), [account, hasPendingBatch])
  const { isDueSoon, needsSpendMore } = useMemo(() => ({
    isDueSoon: cardState.badges.due,
    needsSpendMore: cardState.badges.spend
  }), [cardState])


  // Format Helpers
  const formatCurrency = (val: number | null | undefined) => {
    return val !== null && val !== undefined ? numberFormatter.format(val) : '0'
  }

  // Handle Parent Link Click (Stop Propagation to prevent Card Link)
  const isSecuredAsset = !!securedByAccountId

  const handleFamilyBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFamilyModalOpen(true)
  }

  // Prevent bubble for direct links
  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleCardClick = () => {
    router.push(detailsHref)
  }

  const usageData = useMemo(() => {
    const limit = account.credit_limit ?? 0
    const balance = account.current_balance ?? 0

    let usedCheck = 0
    if (account.type === 'credit_card' && limit > 0) {
      if (balance >= 0) {
        usedCheck = Math.max(0, limit - balance)
      } else {
        usedCheck = Math.abs(balance)
      }
    } else {
      usedCheck = Math.abs(balance)
    }

    const percent = limit > 0 ? (usedCheck / limit) * 100 : 0

    return {
      limit,
      usedAmount: usedCheck,
      percent,
      formattedLimit: formatCurrency(limit),
      formattedUsed: formatCurrency(usedCheck),
    }
  }, [account.credit_limit, account.current_balance, account.type])

  // IDs
  const creditPaymentCatId = 'e0000000-0000-0000-0000-000000000091'
  const shoppingCatId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'
  const shopeeShopId = 'ea3477cb-30dd-4b7f-8826-a89a1b919661'

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    // Consider square images (1:1) as "Landscape-like" for vertical slots -> Rotate them
    if (img.naturalWidth >= img.naturalHeight) {
      setIsLandscape(true)
    }
  }

  // --- Render Sections ---

  // 1. Left Section (Visual) - Portrait Strip (NO SQUARE CROP)
  const renderVisualSection = () => {
    return (
      <div className="relative h-full w-[148px] sm:w-[160px] bg-muted/5 overflow-hidden group-hover/card:bg-muted/10 transition-colors border-r border-slate-100">
        {/* Image Container - Fills entire portrait strip */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-100">
          {account.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.logo_url}
              alt={account.name}
              onLoad={handleImageLoad}
              className={cn(
                "absolute opacity-100 transition-opacity duration-300",
                "!rounded-none !border-none",
                // Landscape/Square images: Rotate 90° and show 100% of image (object-contain)
                // Portrait images: Fill container (object-cover)
                isCreditCard && isLandscape
                  ? "rotate-90 w-full h-full object-contain"
                  : "w-full h-full object-cover object-center"
              )}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-muted-foreground/40">
              {getAccountIcon(account.type)}
            </div>
          )}

          {/* Overlay Badges - Top Left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10 pointer-events-none">
            {/* Removed Confirm Paid from here - moved to header */}
          </div>

          {/* Overlay Badges - Bottom Left */}
          <div className="absolute bottom-2 left-2 flex flex-col gap-1.5 z-10 w-full px-2 items-start">
            {showParentBadge && (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-sm shadow-sm border border-indigo-200 pointer-events-auto cursor-help backdrop-blur-sm w-[106px] justify-center"
                      onClick={handleFamilyBadgeClick}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Parent {childCount > 1 ? `+${childCount}` : ''}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-semibold mb-1">Linked Accounts:</p>
                    <ul className="list-disc pl-3 space-y-0.5">
                      {childAccounts.map(c => (
                        <li key={c.id}>{c.name}</li>
                      ))}
                      {childAccounts.length === 0 && <li>No specific selection</li>}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {showChildBadge && (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100/90 px-2 py-0.5 rounded-sm shadow-sm border border-purple-200 pointer-events-auto cursor-help backdrop-blur-sm w-[106px] justify-center"
                      onClick={handleFamilyBadgeClick}
                    >
                      <Baby className="w-3.5 h-3.5" />
                      Child
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    Linked to {parentInfo?.name || "Parent Account"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Standalone Badge */}
            {cardState.badges.standalone && isCreditCard && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold bg-slate-800/80 text-white shadow-sm border border-slate-600 backdrop-blur-md w-[106px] justify-center">
                Standalone
              </span>
            )}

            {/* Timeline Badge */}
            {stats?.cycle_range && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold shadow-sm backdrop-blur-sm w-[106px] justify-center truncate",
                stats.cycle_range === "Month Cycle"
                  ? "bg-teal-100/90 text-teal-800 border border-teal-200"
                  : "bg-slate-800/80 text-white border border-slate-600"
              )}>
                {stats.cycle_range === "Month Cycle" ? "Month Cycle" : stats?.cycle_range}
              </span>
            )}

            {/* Unsecured Badge - REMOVED (Moved to Data Section) */}
          </div>
        </div>
      </div>
    )
  }

  // 2. Right Section (Data)
  const renderDataSection = () => {
    const balance = account.current_balance ?? 0
    const { percent: usageVal, formattedLimit, formattedUsed } = usageData

    let progressColorClass = "bg-emerald-500" // < 30%
    if (usageVal >= 30 && usageVal <= 80) progressColorClass = "bg-yellow-500" // 30-80%
    if (usageVal > 80) progressColorClass = "bg-red-500" // > 80%

    // KPI Logic
    const missing = stats?.missing_for_min ?? 0
    const isMet = missing <= 0
    const showKPI = stats?.min_spend && stats.min_spend > 0
    const hasCashbackConfig = stats?.remains_cap !== undefined

    return (
      <div className="flex flex-col h-full p-2.5 min-w-0 relative">
        {/* 1. TOP ROW: Name + Action Buttons */}
        <div className="flex justify-between items-start gap-1 mb-1">
          {/* Account Name */}
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <h3 className="font-bold text-sm leading-tight truncate text-slate-900 flex-1 min-w-0 cursor-default max-w-[120px]">
                  {account.name}
                </h3>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[80] text-xs font-medium max-w-[200px]">
                {account.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Right: Action Buttons */}
          <div className="flex flex-col gap-1 shrink-0 items-end">
            {/* Row 1: Edit + Details (Icon Only, Circular) */}
            <div className="flex items-center gap-1.5">
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div>
                      <EditAccountDialog
                        account={account}
                        accounts={accounts}
                        collateralAccounts={collateralAccounts}
                        buttonClassName="flex items-center justify-center rounded-full bg-slate-100 border border-slate-200 w-7 h-7 text-slate-700 hover:bg-slate-200 hover:text-slate-900 hover:border-slate-300 active:scale-95 active:bg-slate-300 transition-all shadow-sm"
                        triggerContent={<Edit className="w-3.5 h-3.5" />}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-semibold">
                    Edit Account
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Link
                      href={detailsHref}
                      onClick={handleLinkClick}
                      className="flex items-center justify-center rounded-full bg-blue-50 border border-blue-200 w-7 h-7 text-blue-600 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300 active:scale-95 active:bg-blue-200 transition-all shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-semibold">
                    View Details
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Row 2: Confirm Paid (Moved to Balance Row) */}
          </div>
        </div>

        {/* 2. SECOND ROW: Balance + Confirm Button (Inline) */}
        <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[28px]">
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className={cn(
                  "text-xl font-bold tracking-tight truncate flex-1 min-w-0",
                  balance < 0 ? "text-red-600" : "text-slate-900"
                )}>
                  {formatCurrency(balance)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-semibold">
                {formatCurrency(balance)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Confirm Button (Inline with Balance) */}
          {cardState.badges.pendingBatch && (
            <button
              onClick={(e) => { e.stopPropagation(); /* TODO: Open confirm dialog */ }}
              className="flex items-center justify-center gap-1 rounded-md bg-green-100 border border-green-200 px-2 py-1 text-[10px] font-bold text-green-700 hover:bg-green-200 hover:border-green-300 active:scale-95 transition-all text-sm shrink-0 shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Confirm
            </button>
          )}
        </div>

        {/* 3. MIDDLE: Smart KPI Display */}

        {/* PRIORITY 1: Has Spending Target AND Not Met Yet */}
        {showKPI && !isMet && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 p-2 rounded-md text-xs border border-amber-100 mb-2 shadow-sm">
            <span className="text-xl shrink-0">⚠️</span>
            <div className="flex items-center gap-3 w-full">
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-[10px] text-amber-600/80 uppercase font-bold">NEED</span>
                <span className="font-bold text-amber-800 text-sm">{formatCurrency(missing)}</span>
              </div>
              <div className="w-[1px] h-6 bg-amber-200/50" />
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-[10px] text-amber-600/80 uppercase font-bold">SPENT</span>
                <span className="font-bold text-amber-800 text-sm">{formatCurrency(stats?.spent_this_cycle ?? 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* PRIORITY 2: Qualified OR No Target+Cashback */}
        {((showKPI && isMet) || (!showKPI && isCreditCard && hasCashbackConfig)) && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 p-2 rounded-md text-xs border border-emerald-100 mb-2 shadow-sm">
            <span className="text-xl shrink-0">💰</span>
            <div className="flex items-center gap-3 w-full">
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-[10px] text-emerald-600/80 uppercase font-bold">Share</span>
                <span className="font-bold text-emerald-800 text-sm">{formatCurrency(stats?.shared_cashback ?? 0)}</span>
              </div>
              <div className="w-[1px] h-6 bg-emerald-200/50" />
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-[10px] text-emerald-600/80 uppercase font-bold">Remains</span>
                <span className="font-bold text-emerald-800 text-sm">{formatCurrency(stats?.remains_cap)}</span>
              </div>
            </div>
            {isMet && (
              <div className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        )}

        {/* PRIORITY 3: No Cashback Config */}
        {!showKPI && isCreditCard && !hasCashbackConfig && (
          <div className="flex items-center justify-center bg-slate-50/50 p-2 rounded-md text-xs border border-slate-100 mb-2 text-slate-400 italic font-medium">
            No cashback for this
          </div>
        )}

        {/* 4. Secured By OR Unsecured Badge (MUST be BEFORE Limit bar) */}
        {isCreditCard && (
          <div className="mb-2 text-center">
            {isSecuredAsset && securedByAccountId ? (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/accounts/${securedByAccountId}`}
                      onClick={handleLinkClick}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      <PiggyBank className="w-3 h-3" />
                      Secured by Savings
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Linked to {parentInfo?.name || 'Savings Account'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                <ShieldCheck className="w-3 h-3" />
                Unsecured
              </span>
            )}
          </div>
        )}

        {/* 5. Credit Card Progress Bar (MUST be AFTER Secured by) */}
        {isCreditCard && (
          <div className="mb-2">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] text-slate-500 font-medium">
                Limit: <span className="font-bold text-slate-700">{formattedLimit}</span>
              </span>
              <span className={cn(
                "text-[10px] font-bold",
                usageVal > 80 ? "text-red-600" : "text-slate-600"
              )}>{Math.min(usageVal, 100).toFixed(0)}% Used</span>
            </div>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden cursor-help">
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

        {/* 6. BOTTOM: Quick Add Buttons (ALWAYS LAST) */}
        <div className="mt-auto grid grid-cols-5 gap-1 pt-1.5 border-t border-slate-50">
          {/* Income */}
          <button
            onClick={(e) => { e.stopPropagation(); setActiveDialog('income') }}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all"
            title="Add Income"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Income
          </button>

          {/* Expense */}
          <button
            onClick={(e) => { e.stopPropagation(); setActiveDialog('expense') }}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-all"
            title="Add Expense"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Expense
          </button>

          {/* Transfer or Paid (for Credit Cards) */}
          {isCreditCard ? (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveDialog('paid') }}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-all"
              title="Credit Pay"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Pay
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveDialog('transfer') }}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[9px] font-bold bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 transition-all"
              title="Transfer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer
            </button>
          )}

          {/* Lend OR Shopping (for Credit Card) */}
          {isCreditCard ? (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveDialog('shopping') }}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[9px] font-bold bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100 transition-all"
              title="Shopping"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Shop
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveDialog('debt') }}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 transition-all"
              title="Lend Money"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Lend
            </button>
          )}

          {/* Repay */}
          <button
            onClick={(e) => { e.stopPropagation(); setActiveDialog('repayment') }}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100 transition-all"
            title="Receive Repayment"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Repay
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative">
        {/* Due Banner - At top of left section with rounded top-left corner */}
        {/* Show for ALL Credit Cards with a due date */}
        {isCreditCard && stats?.due_date_display && (
          <div className="absolute top-[2px] left-[2px] z-20 w-[148px] sm:w-[160px]">
            <div className={cn(
              "px-2 py-0.5 rounded-tl-[9px] rounded-br-lg shadow-sm text-[10px] text-center leading-tight transition-colors border-b border-r",
              cardState.badges.due
                ? "bg-red-50 border-red-200 text-red-800" // Urgent
                : "bg-amber-50 border-amber-200 text-amber-800" // Not Urgent
            )}>
              {/* Days Left - First */}
              <div className="text-[9px] uppercase tracking-tight opacity-90 mb-px">
                <span className="font-bold text-[10px] mr-1">{cardState.priorities.daysUntilDue}</span>
                days left
              </div>

              {/* Date Display - Second */}
              <div className="font-medium text-xs">
                {stats.due_date_display.split(' ')[0]} <span className="font-bold">{stats.due_date_display.split(' ')[1]}</span>
              </div>
            </div>
          </div>
        )}

        <div
          onClick={handleCardClick}
          className={cn(
            "group/card relative block w-full rounded-xl border-2 shadow-sm transition-all overflow-hidden h-full",
            // Border Color Logic
            cardState.badges.due
              ? "bg-red-50/50 border-red-500 shadow-md" // Urgent
              : needsSpendMore
                ? "bg-amber-50/50 border-amber-400" // Needs Spend
                : "bg-white border-slate-300", // Default
            className
          )}
        >
          {/* Portrait Strip Layout: Fixed width left (120px/132px), flexible right */}
          <div className="grid grid-cols-[auto_1fr] h-full">
            {renderVisualSection()}
            {renderDataSection()}
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
        cloneInitialValues={{
          category_id: SYSTEM_CATEGORIES.MONEY_TRANSFER
        }}
        isOpen={activeDialog === 'transfer'}
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
        // Source should be user specified (Bank), so we remove defaultSourceAccountId
        // We set destination to this card
        cloneInitialValues={{
          category_id: creditPaymentCatId,
          debt_account_id: account.id
        }}
        isOpen={activeDialog === 'paid'}
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
          shop_id: shopeeShopId
        }}
        isOpen={activeDialog === 'shopping'}
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
