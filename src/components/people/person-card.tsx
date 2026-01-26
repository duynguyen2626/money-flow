'use client'

import { memo, useState, MouseEvent, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    User,
    Eye,
    HandCoins,
    Banknote,
    Check,
    ExternalLink,
    Bot,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    TrendingDown,
    Pencil,
    Loader2,
    FileSpreadsheet
} from 'lucide-react'

import { Account, Category, Person, Shop, Subscription, MonthlyDebtSummary } from '@/types/moneyflow.types'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { EditPersonDialog } from '@/components/people/edit-person-dialog'
import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { updatePersonAction } from '@/actions/people-actions'
import { format, parseISO, isValid } from 'date-fns'

interface PersonCardProps {
    person: Person
    subscriptions: Subscription[]
    isSelected?: boolean
    onSelect?: () => void
    accounts?: Account[]
    categories?: Category[]
    shops?: Shop[]
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
})

function PersonCardComponent({
    person,
    subscriptions,
    accounts = [],
    categories = [],
    shops = [],
}: PersonCardProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [showDebtsModal, setShowDebtsModal] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [selectedRepaymentDebt, setSelectedRepaymentDebt] = useState<MonthlyDebtSummary | null>(null)

    const balance = person.balance ?? 0
    const cycleLabel = person.current_cycle_label ?? 'Current'
    const isSettled = Math.abs(balance) < 1
    const hasDebt = balance > 0

    // Monthly debts for display - ONLY show debts > 0
    const monthlyDebts = (person.monthly_debts ?? []).filter(d => Math.abs(d.amount) >= 1)
    // Count of outstanding debts
    const outstandingDebtsCount = monthlyDebts.length

    // Separate current and old debts
    const currentDebt = monthlyDebts.find(d => d.tagLabel === cycleLabel)
    const oldDebts = monthlyDebts.filter(d => d.tagLabel !== cycleLabel)

    const handleArchive = async () => {
        await updatePersonAction(person.id, { is_archived: true })
        setShowArchiveConfirm(false)
    }

    const openDetails = (e?: MouseEvent, tag?: string) => {
        e?.stopPropagation()
        const url = tag
            ? `/people/details?id=${person.id}&tag=${encodeURIComponent(tag)}`
            : `/people/details?id=${person.id}`
        startTransition(() => {
            router.push(url)
        })
    }

    const stopPropagation = (event: MouseEvent) => event.stopPropagation()

    const dialogBaseProps = { accounts, categories, people: [person], shops }

    // Service badges
    const services = person.subscription_details ?? []

    // Find the detailed debt summary for the current cycle
    const currentDebtDetails = monthlyDebts.find(d => d.tagLabel === cycleLabel)

    // Data for Inner Content Box
    const displayCycleBalance = currentDebtDetails ? currentDebtDetails.amount : (person.current_cycle_debt ?? 0)
    const displayCycleRepaid = currentDebtDetails?.total_repaid ?? 0
    const displayCycleTotal = currentDebtDetails?.total_debt ?? (Math.max(0, displayCycleBalance) + displayCycleRepaid)

    // Formatting - ALWAYS show full numbers (no compact/shorthand)
    const formattedBigBalance = numberFormatter.format(Math.abs(displayCycleBalance))

    // Determine debt color for Big Number
    const bigNumberColorClass = displayCycleBalance > 0
        ? "text-rose-600"
        : displayCycleBalance < 0
            ? "text-emerald-600"
            : "text-slate-400"

    // Format Date Badge: "JAN '26"
    let dateBadgeText = cycleLabel
    try {
        const date = parseISO(`${cycleLabel}-01`)
        if (isValid(date)) {
            dateBadgeText = format(date, "MMM ''yy").toUpperCase()
        }
    } catch (e) {
        // fallback
    }

    return (
        <>
            <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md w-full p-2.5 gap-2.5 rounded-xl border-slate-100 shadow-sm">

                {/* Header: Avatar + Name + Edit Icon */}
                <div className="flex items-center gap-2">
                    {/* Rounded Avatar Background */}
                    <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-blue-50/50 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {person.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={person.image_url}
                                alt={person.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span>{person.name.substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>

                    {/* Name + Service Icons */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-bold text-slate-900 leading-tight truncate">
                            {person.name}
                        </span>
                        {services.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                                {services.slice(0, 3).map((s, i) => (
                                    <div key={i} className="bg-slate-50 border border-slate-100 rounded px-1.5 py-1 flex items-center gap-1" title={s.name}>
                                        {s.image_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={s.image_url} className="w-4 h-4 object-cover rounded-full" alt="" />
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-400">{s.name[0]}</span>
                                        )}
                                        <span className="text-[9px] font-medium text-slate-600">{s.slots}</span>
                                    </div>
                                ))}
                                {services.length > 3 && (
                                    <span className="text-[9px] text-slate-400">+{services.length - 3}</span>
                                )}
                            </div>
                        )}
                    </div>

                    <Button variant="ghost" size="icon" className="ml-auto h-6 w-6 text-slate-300 hover:text-slate-600" onClick={() => setShowEditDialog(true)}>
                        <Pencil className="w-3 h-3" />
                    </Button>
                </div>

                {/* Inner Content Box */}
                <div className="bg-slate-50/80 rounded-lg p-2.5 flex flex-col gap-2 border border-slate-100">

                    {/* Top Row: Date Badge Only */}
                    <div className="flex items-center">
                        <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-slate-100 shadow-sm">
                            <Calendar className="w-2.5 h-2.5 text-blue-500" />
                            <span className="text-[9px] font-bold text-slate-700">{dateBadgeText}</span>
                        </div>
                    </div>

                    {/* Middle Row: Big Balance + Status Badge */}
                    <div className="flex items-end justify-between gap-2">
                        <div className="flex flex-col gap-0 flex-1 min-w-0">
                            <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Remains</span>
                            <div className="flex items-baseline gap-0.5">
                                <span className={cn("text-base font-black tracking-tight tabular-nums", bigNumberColorClass)}>
                                    {formattedBigBalance}
                                </span>
                                <span className="text-xs font-bold text-slate-300 shrink-0">đ</span>
                            </div>
                        </div>

                        {/* Status Badge - Moved here */}
                        {outstandingDebtsCount > 1 ? (
                            <Badge
                                variant="secondary"
                                className="bg-rose-100 text-rose-600 hover:bg-rose-200 border-rose-200 text-[9px] px-2 h-6 rounded-md cursor-pointer font-bold shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowDebtsModal(true)
                                }}
                            >
                                +{outstandingDebtsCount - 1} OLD
                            </Badge>
                        ) : hasDebt ? (
                            <Badge variant="secondary" className="bg-rose-50 text-rose-500 border-rose-100 text-[8px] px-1.5 h-5 rounded-md shrink-0">
                                ACTIVE
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-500 border-emerald-100 text-[8px] px-1.5 h-5 rounded-md shrink-0">
                                PAID
                            </Badge>
                        )}
                    </div>

                    {/* Bottom Row: Separator + Mini Stats */}
                    <div className="h-px bg-slate-200 w-full" />

                    <div className="flex items-center gap-2.5">
                        {/* Total Added */}
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded bg-rose-50 flex items-center justify-center text-rose-400">
                                <ArrowUpRight className="w-2.5 h-2.5" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-600">{compactNumberFormatter.format(displayCycleTotal)}</span>
                        </div>

                        {/* Paid */}
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded bg-emerald-50 flex items-center justify-center text-emerald-400">
                                <ArrowDownLeft className="w-2.5 h-2.5" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-600">{compactNumberFormatter.format(displayCycleRepaid)}</span>
                        </div>
                    </div>

                </div>

                {/* Footer Actions - 4 buttons: LEND, REPAY, Sheet, Eye */}
                <div className="grid grid-cols-4 gap-1.5 mt-auto">
                    {/* Lend Button - Reduced size */}
                    <div onClick={stopPropagation}>
                        <AddTransactionDialog
                            {...dialogBaseProps}
                            defaultType="debt"
                            defaultPersonId={person.id}
                            defaultDebtAccountId={person.debt_account_id ?? undefined}
                            buttonClassName="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 shadow-sm h-8 rounded-lg text-[9px] font-bold flex items-center justify-center gap-0.5"
                            triggerContent={
                                <>
                                    <HandCoins className="w-3 h-3" />
                                    LEND
                                </>
                            }
                        />
                    </div>

                    {/* Repay Button - Reduced size */}
                    <div onClick={stopPropagation}>
                        <AddTransactionDialog
                            {...dialogBaseProps}
                            defaultType="repayment"
                            defaultPersonId={person.id}
                            defaultDebtAccountId={person.debt_account_id ?? undefined}
                            defaultAmount={displayCycleBalance > 0 ? displayCycleBalance : undefined}
                            buttonClassName="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 shadow-sm h-8 rounded-lg text-[9px] font-bold flex items-center justify-center gap-0.5"
                            triggerContent={
                                <>
                                    <Banknote className="w-3 h-3" />
                                    REPAY
                                </>
                            }
                        />
                    </div>

                    {/* Sheet Icon Button - Opens Manage Sheet Dialog */}
                    <div onClick={stopPropagation} className="w-full">
                        <ManageSheetButton
                            personId={person.id}
                            cycleTag={person.current_cycle_label ?? ''}
                            initialSheetUrl={person.sheet_link ?? null}
                            scriptLink={person.google_sheet_url ?? null}
                            googleSheetUrl={person.google_sheet_url ?? null}
                            sheetFullImg={person.sheet_full_img ?? null}
                            showBankAccount={person.sheet_show_bank_account ?? false}
                            showQrImage={person.sheet_show_qr_image ?? false}
                            buttonClassName="h-8 w-full rounded-lg border border-slate-100 bg-white shadow-sm text-emerald-500 hover:text-emerald-600 hover:border-emerald-200 flex items-center justify-center transition-colors"
                            iconOnly={true}
                        />
                    </div>

                    {/* View Details Button as Link */}
                    <Link
                        href={`/people/details?id=${person.id}`}
                        className="h-8 w-full rounded-lg border border-slate-100 bg-white shadow-sm text-blue-500 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center justify-center"
                        title="View Details"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {/* Hidden Modals/Dialogs kept for functionality */}
                {showEditDialog && (
                    <EditPersonDialog
                        person={person}
                        subscriptions={subscriptions}
                        initiallyOpen={true}
                        showTrigger={false}
                        onClose={() => setShowEditDialog(false)}
                    />
                )}

                <Dialog open={showDebtsModal} onOpenChange={setShowDebtsModal}>
                    <DialogContent className="max-w-md" onClick={stopPropagation}>
                        <DialogHeader>
                            <DialogTitle className="text-base">{person.name}&apos;s Debts</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto">
                            {/* Current Cycle */}
                            {currentDebt && (
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Current Cycle
                                    </h4>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border-2 border-emerald-200">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setShowDebtsModal(false)
                                                openDetails(undefined, currentDebt.tagLabel)
                                            }}
                                            className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
                                        >
                                            <span>{currentDebt.tagLabel}</span>
                                            <ExternalLink className="h-3 w-3" />
                                        </button>
                                        <span className="font-bold text-emerald-700 text-sm">
                                            {numberFormatter.format(currentDebt.amount)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Old Cycles */}
                            {oldDebts.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Previous Cycles
                                    </h4>
                                    <div className="space-y-2">
                                        {oldDebts.map((debt, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group/row"
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setShowDebtsModal(false)
                                                        openDetails(undefined, debt.tagLabel)
                                                    }}
                                                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
                                                >
                                                    <span>{debt.tagLabel}</span>
                                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-amber-700 text-sm">
                                                        {numberFormatter.format(debt.amount)}
                                                    </span>
                                                    <div onClick={stopPropagation}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedRepaymentDebt(debt)
                                                                setShowDebtsModal(false)
                                                            }}
                                                            className="p-1.5 rounded-md bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors flex items-center justify-center border border-emerald-200"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {monthlyDebts.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">No outstanding debts.</p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {selectedRepaymentDebt && (
                    <AddTransactionDialog
                        {...dialogBaseProps}
                        defaultType="repayment"
                        defaultPersonId={person.id}
                        defaultTag={selectedRepaymentDebt.tagLabel}
                        defaultAmount={Math.abs(selectedRepaymentDebt.amount)}
                        isOpen={true}
                        onOpenChange={(open) => {
                            if (!open) setSelectedRepaymentDebt(null)
                        }}
                        buttonClassName="hidden"
                        triggerContent={<span className="hidden">Repay</span>}
                    />
                )}
                <ConfirmDialog
                    open={showArchiveConfirm}
                    onOpenChange={setShowArchiveConfirm}
                    title="Archive Person"
                    description={`Are you sure you want to archive ${person.name}?`}
                    onConfirm={handleArchive}
                    confirmText="Archive"
                    variant="destructive"
                />

            </Card>

            {/* Page-level loading overlay */}
            {isPending && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-slate-700">Loading...</span>
                    </div>
                </div>
            )}
        </>
    )
}

export const PersonCard = memo(PersonCardComponent)
