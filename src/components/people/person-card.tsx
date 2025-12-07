'use client'

import { memo, useState, MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
    User,
    Pencil,
    ChevronRight,
    ArrowUpRight,
    ArrowDownLeft,
    Check,
    AlertTriangle,
    MoreHorizontal,
} from 'lucide-react'

import { Account, Category, Person, Shop, Subscription } from '@/types/moneyflow.types'
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

    const balance = person.balance ?? 0
    const currentCycleDebt = person.current_cycle_debt ?? 0
    const cycleLabel = person.current_cycle_label ?? 'Current'
    const isSettled = Math.abs(balance) < 1
    const hasDebt = balance > 0

    // Monthly debts for display
    const monthlyDebts = person.monthly_debts ?? []

    const handleArchive = async () => {
        await updatePersonAction(person.id, { is_archived: true })
        setShowArchiveConfirm(false)
    }

    const openDetails = (e?: MouseEvent) => {
        e?.stopPropagation()
        router.push(`/people/${person.id}`)
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
    const visibleServices = services.slice(0, 3)
    const remainingServiceCount = Math.max(0, services.length - 3)

    return (
        <>
            {/* Card */}
            <div
                className={cn(
                    "group relative flex flex-col overflow-hidden rounded-lg border shadow-sm transition hover:shadow-md",
                    "border-slate-200 bg-white"
                )}
            >
                {/* ROW 1: Header - Avatar + Name */}
                <div className={cn("flex items-center gap-2 p-2.5 relative", headerGradient)}>
                    {/* Square Avatar */}
                    <div className="h-10 w-10 rounded-md overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0">
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
                                <User className="h-5 w-5" />
                            </div>
                        )}
                    </div>

                    {/* Name + Owner Badge */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900 truncate" title={person.name}>
                                {person.name}
                            </span>
                            {person.is_owner && (
                                <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">Owner</span>
                            )}
                        </div>
                    </div>

                    {/* HOVER OVERLAY - Centered Large Buttons */}
                    <div
                        className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={stopPropagation}
                    >
                        {/* Edit */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowEditDialog(true) }}
                            className="p-3 rounded-full bg-white text-slate-600 hover:bg-slate-100 shadow-lg transition-all hover:scale-110"
                            title="Edit"
                        >
                            <Pencil className="h-5 w-5" />
                        </button>
                        {/* Lend */}
                        <AddTransactionDialog
                            {...dialogBaseProps}
                            defaultType="debt"
                            defaultPersonId={person.id}
                            buttonClassName="p-3 rounded-full bg-white text-orange-600 hover:bg-orange-50 shadow-lg transition-all hover:scale-110"
                            triggerContent={<ArrowUpRight className="h-5 w-5" />}
                        />
                        {/* Repay */}
                        <AddTransactionDialog
                            {...dialogBaseProps}
                            defaultType="repayment"
                            defaultPersonId={person.id}
                            buttonClassName="p-3 rounded-full bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg transition-all hover:scale-110"
                            triggerContent={<ArrowDownLeft className="h-5 w-5" />}
                        />
                    </div>
                </div>

                {/* ROW 2: Footer - Debt Badge + Services + Detail Arrow */}
                <div className="flex items-center gap-2 px-2.5 py-2 bg-white border-t border-slate-100">
                    {/* Debt Badge - Clickable for Repay */}
                    <div onClick={stopPropagation}>
                        <AddTransactionDialog
                            {...dialogBaseProps}
                            defaultType="repayment"
                            defaultPersonId={person.id}
                            defaultAmount={balance > 0 ? balance : undefined}
                            buttonClassName={cn(
                                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity",
                                isSettled
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : hasDebt
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-slate-50 text-slate-600 border border-slate-200"
                            )}
                            triggerContent={
                                <>
                                    <span className="opacity-70">{cycleLabel}:</span>
                                    <span>{compactNumberFormatter.format(currentCycleDebt)}</span>
                                    {isSettled ? <Check className="h-3 w-3" /> : hasDebt ? <AlertTriangle className="h-3 w-3" /> : null}
                                </>
                            }
                        />
                    </div>

                    {/* More debts */}
                    {monthlyDebts.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowDebtsModal(true) }}
                            className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200"
                            title="View all debts"
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Service badges - Before detail arrow */}
                    <div className="flex items-center gap-1">
                        {visibleServices.map(service => (
                            <CustomTooltip key={service.id} content={service.name}>
                                <div className="h-5 w-5 rounded overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                                    {service.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={service.logo_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-[7px] font-bold text-slate-400">{service.name.substring(0, 2)}</span>
                                    )}
                                </div>
                            </CustomTooltip>
                        ))}
                        {remainingServiceCount > 0 && (
                            <span className="text-[9px] text-slate-400 font-medium">+{remainingServiceCount}</span>
                        )}
                    </div>

                    {/* Detail Arrow */}
                    <button
                        onClick={openDetails}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="View Details"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
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

            {/* Debts Modal */}
            <Dialog open={showDebtsModal} onOpenChange={setShowDebtsModal}>
                <DialogContent className="max-w-sm" onClick={stopPropagation}>
                    <DialogHeader>
                        <DialogTitle className="text-sm">{person.name}&apos;s Debts</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {monthlyDebts.map((debt, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                                <span className="text-slate-600">{debt.tagLabel}</span>
                                <span className="font-bold text-amber-700">{numberFormatter.format(debt.amount)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t text-sm">
                        <span className="text-slate-600">Total:</span>
                        <span className="font-bold text-amber-700">{numberFormatter.format(balance)}</span>
                    </div>
                </DialogContent>
            </Dialog>

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
