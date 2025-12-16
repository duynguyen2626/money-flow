'use client'

import { memo, useState, MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    User,
    Pencil,
    ChevronRight,
    ArrowUpRight,
    ArrowDownLeft,
    Check,
    AlertTriangle,
    ExternalLink,
    Bot,
} from 'lucide-react'

import { Account, Category, Person, Shop, Subscription, MonthlyDebtSummary } from '@/types/moneyflow.types'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { EditPersonDialog } from '@/components/people/edit-person-dialog'
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { updatePersonAction } from '@/actions/people-actions'

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
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [showDebtsModal, setShowDebtsModal] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [selectedRepaymentDebt, setSelectedRepaymentDebt] = useState<MonthlyDebtSummary | null>(null)

    const balance = person.balance ?? 0
    const currentCycleDebt = person.current_cycle_debt ?? 0
    const cycleLabel = person.current_cycle_label ?? 'Current'
    const isSettled = Math.abs(balance) < 1
    const hasDebt = balance > 0

    // Monthly debts for display
    const monthlyDebts = person.monthly_debts ?? []
    // Count of outstanding debts (excluding settled)
    const outstandingDebtsCount = monthlyDebts.filter(d => Math.abs(d.amount) >= 1).length

    const handleArchive = async () => {
        await updatePersonAction(person.id, { is_archived: true })
        setShowArchiveConfirm(false)
    }

    const openDetails = (e?: MouseEvent, tag?: string) => {
        e?.stopPropagation()
        const url = tag
            ? `/people/${person.id}?tag=${encodeURIComponent(tag)}`
            : `/people/${person.id}`
        router.push(url)
    }

    const stopPropagation = (event: MouseEvent) => event.stopPropagation()

    const dialogBaseProps = { accounts, categories, people: [person], shops }

    // Determine header gradient based on debt status
    const headerGradient = isSettled
        ? 'bg-gradient-to-br from-emerald-50 to-teal-50'
        : hasDebt
            ? 'bg-gradient-to-br from-amber-50 to-orange-50'
            : 'bg-gradient-to-br from-slate-50 to-slate-100'

    // Service badges
    const services = person.subscription_details ?? []

    return (
        <>
            {/* Card - Wider minimum width */}
            <div
                className={cn(
                    "group relative flex flex-col overflow-hidden rounded-lg border shadow-sm transition hover:shadow-md min-w-[200px]",
                    "border-slate-200 bg-white"
                )}
            >
                {/* ROW 1: Header - Avatar + Name + Services */}
                <div className={cn("flex flex-col gap-3 p-3 relative flex-1", headerGradient)}>
                    <div className="flex items-start gap-3">
                        {/* Square Avatar */}
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0">
                            {person.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={person.avatar_url}
                                    alt={person.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className={cn(
                                    "h-full w-full flex items-center justify-center",
                                    isSettled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                                )}>
                                    <User className="h-6 w-6" />
                                </div>
                            )}
                        </div>

                        {/* Name + Owner Badge */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-base font-bold text-slate-900 truncate" title={person.name}>
                                    {person.name}
                                </span>
                                {person.is_owner && (
                                    <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">Owner</span>
                                )}
                            </div>

                            {/* Service Badges in Header - Right aligned/Vertical */}
                            <div className="mt-1 flex flex-col items-end gap-1.5">
                                {services.map(service => (
                                    <div key={service.id} className="inline-flex items-center gap-1 bg-white/80 border border-slate-200 rounded px-1.5 py-0.5 text-xs shadow-sm" title={service.name}>
                                        {service.logo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={service.logo_url} alt="" className="h-3.5 w-3.5 object-cover rounded-sm" />
                                        ) : (
                                            <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-0.5 rounded">{service.name.substring(0, 1)}</span>
                                        )}
                                        <span className="font-medium text-slate-700 whitespace-nowrap">{service.name}: {service.slots}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* HOVER OVERLAY - Smaller Buttons */}
                    <div
                        className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-lg"
                        onClick={stopPropagation}
                    >
                        {/* Edit */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowEditDialog(true) }}
                            className="p-2 rounded-full bg-white text-slate-600 hover:bg-slate-100 shadow-lg transition-all hover:scale-110"
                            title="Edit"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                        {/* Lend */}
                        <AddTransactionDialog
                            {...dialogBaseProps}
                            defaultType="debt"
                            defaultPersonId={person.id}
                            buttonClassName="p-2 rounded-full bg-white text-rose-600 hover:bg-rose-50 shadow-lg transition-all hover:scale-110"
                            triggerContent={<ArrowUpRight className="h-4 w-4" />}
                        />
                        {/* Repay */}
                        <AddTransactionDialog
                            {...dialogBaseProps}
                            defaultType="repayment"
                            defaultPersonId={person.id}
                            buttonClassName="p-2 rounded-full bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg transition-all hover:scale-110"
                            triggerContent={<ArrowDownLeft className="h-4 w-4" />}
                        />
                    </div>
                </div>

                {/* ROW 2: Footer - Larger Debt Badge + Count + Detail Arrow */}
                <div className="flex items-center justify-between gap-2 px-3 py-3 bg-white border-t border-slate-100">
                    {/* Debt Badge - Full Amount */}
                    <div onClick={stopPropagation} className="flex-1">
                        <AddTransactionDialog
                            {...dialogBaseProps}
                            defaultType="repayment"
                            defaultPersonId={person.id}
                            defaultAmount={balance > 0 ? balance : undefined}
                            buttonClassName={cn(
                                "flex items-center justify-between w-full gap-2 rounded-lg px-3 py-2 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity border shadow-sm",
                                isSettled
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : hasDebt
                                        ? "bg-amber-50 text-amber-900 border-amber-200" // Darker text for readability
                                        : "bg-slate-50 text-slate-600 border-slate-200"
                            )}
                            triggerContent={
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="opacity-70 text-xs font-semibold">{cycleLabel}:</span>
                                        <span className="text-base">{numberFormatter.format(currentCycleDebt)}</span>
                                    </div>
                                    {isSettled ? <Check className="h-4 w-4" /> : hasDebt ? <AlertTriangle className="h-4 w-4" /> : null}
                                </>
                            }
                        />
                    </div>

                    {/* Outstanding debts count badge */}
                    {outstandingDebtsCount > 1 && (
                        <CustomTooltip content={`${outstandingDebtsCount} outstanding debt cycles - Click to view all`}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDebtsModal(true) }}
                                className="inline-flex items-center justify-center h-8 px-2 rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors text-xs font-bold border border-rose-200"
                            >
                                +{outstandingDebtsCount - 1}
                            </button>
                        </CustomTooltip>
                    )}

                </div>

                {/* ROW 3: Sheets Linked Badge + Detail Arrow */}
                <div className="px-3 pb-3 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Sheets Linked:</span>
                        {person.google_sheet_url ? (
                            <div className="flex items-center gap-1">
                                <a
                                    href={person.google_sheet_url}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 hover:bg-green-100 transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="font-semibold">View Sheet</span>
                                </a>
                                {person.sheet_link && (
                                    <CustomTooltip content="Script Link (API)">
                                        <a
                                            href={person.sheet_link}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center justify-center bg-blue-50 text-blue-700 p-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors h-full aspect-square"
                                        >
                                            <Bot className="h-3 w-3" />
                                        </a>
                                    </CustomTooltip>
                                )}
                            </div>
                        ) : person.sheet_link ? (
                            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                <Check className="h-3 w-3" />
                                <span className="font-semibold">Script Only</span>
                            </span>
                        ) : (
                            <span className="text-slate-400 italic">None Link</span>
                        )}
                    </div>

                    {/* Detail Arrow - Moved here */}
                    <Link
                        href={`/people/${person.id}`}
                        onClick={stopPropagation}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
                        title="View Details"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            {/* Edit Dialog */}
            {showEditDialog && (
                <EditPersonDialog
                    person={person}
                    subscriptions={subscriptions}
                    initiallyOpen={true}
                    onClose={() => setShowEditDialog(false)}
                />
            )}

            {/* Enhanced Debts Modal */}
            <Dialog open={showDebtsModal} onOpenChange={setShowDebtsModal}>
                <DialogContent className="max-w-md" onClick={stopPropagation}>
                    <DialogHeader>
                        <DialogTitle className="text-base">{person.name}&apos;s Debts</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {monthlyDebts.map((debt, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group/row"
                            >
                                {/* Tag - Clickable to open details with tag filter */}
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
                                    {/* Amount */}
                                    <span className="font-bold text-amber-700 text-sm">
                                        {numberFormatter.format(debt.amount)}
                                    </span>

                                    {/* Quick Repay Button */}
                                    <div onClick={stopPropagation}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedRepaymentDebt(debt)
                                                setShowDebtsModal(false)
                                            }}
                                            className="p-1.5 rounded-md bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors flex items-center justify-center"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t text-sm">
                        <span className="text-slate-600 font-medium">Total:</span>
                        <span className="font-bold text-amber-700 text-base">{numberFormatter.format(balance)}</span>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Repayment Dialog from Debts List - Hoisted outside Debts Modal to avoid unmounting */}
            {selectedRepaymentDebt && (
                <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="repayment"
                    defaultPersonId={person.id}
                    defaultTag={selectedRepaymentDebt.tagLabel}
                    defaultAmount={Math.abs(selectedRepaymentDebt.amount)}
                    isOpen={true}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSelectedRepaymentDebt(null)
                        }
                    }}
                    // Dummy content required by implementation but won't be visible/clickable since isOpen=true
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
        </>
    )
}

export const PersonCard = memo(PersonCardComponent)
