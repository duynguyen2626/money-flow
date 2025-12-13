'use client'

import React from 'react'
import Link from 'next/link'
import {
  Loader2,
  Zap,
  CreditCard,
  Landmark,
  Wallet,
  PiggyBank,
  User,
  ShieldCheck,
  Link as LinkIcon,
  Users,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

import {
  parseSavingsConfig,
  formatCurrency,
  getAccountTypeLabel,
} from '@/lib/account-utils'
import { Account } from '@/types/moneyflow.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditAccountDialog } from './edit-account-dialog'
import { cn } from '@/lib/utils'
import { parseCashbackConfig } from '@/lib/cashback'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type AccountTableProps = {
  accounts: Account[]
  onToggleStatus?: (accountId: string, nextValue: boolean) => void
  pendingId?: string | null
  collateralAccounts?: Account[]
  allAccounts?: Account[]
}

// Reuse icon logic
function getAccountIcon(type: Account['type'], className = "h-4 w-4") {
  switch (type) {
    case 'credit_card': return <CreditCard className={className} />
    case 'bank':
    case 'ewallet': return <Landmark className={className} />
    case 'cash': return <Wallet className={className} />
    case 'savings':
    case 'investment':
    case 'asset': return <PiggyBank className={className} />
    case 'debt': return <User className={className} />
    default: return <Wallet className={className} />
  }
}

import { getDisplayBalance } from '@/lib/display-balance' // Add import

export function AccountTable({
  accounts,
  onToggleStatus,
  pendingId,
  collateralAccounts = [],
  allAccounts = [],
}: AccountTableProps) {

  // Track which sections are expanded (only credit expanded by default)
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    credit: true,
    bank: false,
    savings: false,
    debt: false,
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Sorting Helper
  const getDaysUntilDue = (account: Account) => {
    if (!account.stats?.due_date) return 999
    if (account.stats.due_date) {
      const today = new Date()
      const due = new Date(account.stats.due_date)
      const diff = due.getTime() - today.getTime()
      return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }
    return 999
  }

  // Enhanced Sorting for Credit Cards: Nearest Due Date First
  const sortCreditCards = (items: Account[]) => {
    return [...items].sort((a, b) => {
      // Sort by Due Date urgency
      const aDue = a.stats?.due_date ? new Date(a.stats.due_date).getTime() : 9999999999999
      const bDue = b.stats?.due_date ? new Date(b.stats.due_date).getTime() : 9999999999999
      return aDue - bDue // Ascending (nearest first)
    })
  }

  // Grouping Logic
  const groupedAccounts = {
    credit: accounts.filter(a => a.type === 'credit_card'),
    bank: accounts.filter(a => ['bank', 'cash', 'ewallet'].includes(a.type)),
    savings: accounts.filter(a => ['savings', 'investment', 'asset'].includes(a.type)),
    debt: accounts.filter(a => a.type === 'debt'),
  }

  // Apply sorting to credit cards
  groupedAccounts.credit = sortCreditCards(groupedAccounts.credit)

  const sections = [
    { key: 'credit', title: 'Credit Cards', icon: <CreditCard className="h-4 w-4" />, items: groupedAccounts.credit },
    { key: 'bank', title: 'Payment Accounts', icon: <Landmark className="h-4 w-4" />, items: groupedAccounts.bank },
    { key: 'savings', title: 'Savings & Assets', icon: <PiggyBank className="h-4 w-4" />, items: groupedAccounts.savings },
    { key: 'debt', title: 'Debt', icon: <User className="h-4 w-4" />, items: groupedAccounts.debt },
  ].filter(s => s.items.length > 0)

  // Empty State
  if (accounts.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg bg-slate-50 text-slate-500">
        No accounts found for this filter.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="w-[340px]">Identity</TableHead>
              <TableHead className="text-right w-[110px]">Family Bal.</TableHead>
              <TableHead className="text-right w-[110px]">Real Bal.</TableHead>
              <TableHead className="text-right w-[110px]">Limit</TableHead>
              <TableHead className="w-[180px]">Cashback / KPI</TableHead>
              <TableHead className="w-[120px]">Cycle</TableHead>
              <TableHead className="w-[140px]">Family</TableHead>
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map(section => {
              const isExpanded = expandedSections[section.key] ?? false

              return (
                <React.Fragment key={section.key}>
                  {/* Collapsible Group Header */}
                  <TableRow className="bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={() => toggleSection(section.key)}>
                    <TableCell colSpan={8} className="py-2">
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-500">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {section.icon}
                        {section.title}
                        <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[10px]">{section.items.length}</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {isExpanded && section.items.map(account => {
                    const stats = account.stats
                    const config = typeof account.cashback_config === 'string' ? JSON.parse(account.cashback_config) : account.cashback_config
                    // Parse manually if stats missing or for extra fields
                    const parsedConfig = config ? parseCashbackConfig(config) : null

                    const isNegative = (account.current_balance ?? 0) < 0
                    const isActive = typeof account.is_active === 'boolean' ? account.is_active : true
                    const isPending = pendingId === account.id
                    // Use displayBalance helper for Family Balance column context
                    const balance = getDisplayBalance(account, 'family_tab', allAccounts) // Use 'family_tab' context logic (show parent if child)
                    const limit = account.credit_limit ?? 0

                    // Usage % for tooltip
                    const usage = limit > 0 ? (Math.abs(balance) / limit) * 100 : 0
                    const usageColor = usage > 80 ? 'text-red-600' : usage > 30 ? 'text-amber-600' : 'text-emerald-600'

                    return (
                      <TableRow key={account.id} className="group hover:bg-slate-50/50">
                        {/* Col 1: Identity */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-16 shrink-0 overflow-hidden flex items-center justify-center rounded-none bg-white">
                              {account.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={account.logo_url} alt={account.name} className="h-full w-full object-contain" />
                              ) : (
                                <div className="text-slate-300">
                                  {getAccountIcon(account.type, "h-5 w-5")}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                {/* Due Date Badges */}
                                {account.type === 'credit_card' && stats?.due_date_display && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="inline-flex items-center rounded-sm bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 whitespace-nowrap">
                                      {stats.due_date_display}
                                    </span>
                                    {/* Simple heuristic for "days left" would go here if available in stats */}
                                  </div>
                                )}
                                <Link href={`/accounts/${account.id}`} className="font-bold text-slate-900 hover:text-blue-700 hover:underline decoration-blue-700/30 underline-offset-4 transition-colors truncate">
                                  {account.name}
                                </Link>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{account.id.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Col 2: Family Balance (Parent's if Child) */}
                        <TableCell className="text-right">
                          <span className={cn("font-bold text-sm", isNegative ? "text-red-600" : "text-slate-900")}>
                            {/* Logic: If is child in family, show parent balance? 
                                Actually, Table View usually shows Standalone data. 
                                But user asked for "Standalone Balance" column, implying "Balance" column might be Family Balance.
                                However, standard Table View should probably keep "Balance" as is (Official Balance), 
                                and "Standalone Balance" is redundant if "Balance" is already Standalone.
                                
                                User Request: "New Column Standalone Balance... Shows card's own balance (never family-adjusted)"
                                IMPLICATION: Expected "Balance" column MIGHT be family adjusted (like in Family Cards view).
                                
                                Implementation decision: 
                                - "Family Bal." column: Displays Parent Balance if child (Same as Family Cards view logic)
                                - "Real Bal." column: Displays actual account balance
                            */}
                            {formatCurrency(balance)} {/* For now, keeping as is, but renamed header to Family Bal/Real Bal distinction if logic changes */}
                          </span>
                        </TableCell>

                        {/* Col 3: Standalone Balance (Real Balance) */}
                        <TableCell className="text-right">
                          <span className={cn("font-medium text-sm text-slate-600")}>
                            {formatCurrency(account.current_balance)}
                          </span>
                        </TableCell>

                        {/* Col 3: Limit */}
                        <TableCell className="text-right">
                          {account.type === 'credit_card' && limit > 0 ? (
                            <TooltipProvider>
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <span className={cn("text-sm font-medium cursor-help border-b border-dotted", usageColor)}>
                                    {formatCurrency(limit)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Utilization: {usage.toFixed(1)}%
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Col 4: Cashback KPI */}
                        <TableCell>
                          {account.type === 'credit_card' && stats ? (
                            <div className="flex flex-col gap-1">
                              {/* Cap Left */}
                              {stats.remains_cap !== null && (
                                <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold whitespace-nowrap">
                                  Cap: {formatCurrency(stats.remains_cap)}
                                </span>
                              )}

                              {/* Min Spend Status */}
                              {stats.min_spend && stats.min_spend > 0 && (
                                <div>
                                  {(stats.missing_for_min ?? 0) > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm border border-amber-100 whitespace-nowrap">
                                      Need {formatCurrency(stats.missing_for_min ?? 0)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-100 whitespace-nowrap">
                                      <CheckCircle className="h-2.5 w-2.5" /> Met
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Col 5: Cycle */}
                        <TableCell>
                          {stats ? (
                            <div className="text-[10px] text-slate-500 font-medium">
                              {stats.cycle_range}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Col 6: Family */}
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            {account.relationships?.is_parent && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-sm">
                                <Users className="h-3 w-3" />
                                Parent
                              </div>
                            )}
                            {account.relationships?.parent_info && (
                              <Link href={`/accounts/${account.relationships.parent_info.id}`} className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm hover:underline decoration-blue-700/30">
                                {account.relationships.parent_info.type === 'savings' ? (
                                  <ShieldCheck className="h-3 w-3" />
                                ) : (
                                  <User className="h-3 w-3" />
                                )}
                                {account.relationships.parent_info.type === 'savings' ? 'Secured' : 'Child'}
                              </Link>
                            )}
                          </div>
                        </TableCell>

                        {/* Col 7: Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <EditAccountDialog
                              account={account}
                              collateralAccounts={collateralAccounts}
                              triggerContent={<Zap className="h-4 w-4 text-slate-400 hover:text-slate-700 transition-colors" />}
                              buttonClassName="p-2 hover:bg-slate-100 rounded-full"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div >
  )
}
