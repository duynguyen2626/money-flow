'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { AccountRelationships } from '@/types/moneyflow.types'
import Link from 'next/link'
import { CreditCard, ArrowRight, Users } from 'lucide-react'

interface AccountFamilyModalProps {
    isOpen: boolean
    onClose: () => void
    parentName: string
    childrenAccounts: AccountRelationships['child_accounts']
    parentInfo?: AccountRelationships['parent_info']
}

function getAccountIcon(name: string) {
    return <CreditCard className="h-5 w-5" />
}

export function AccountFamilyModal({
    isOpen,
    onClose,
    parentName,
    childrenAccounts = [],
    parentInfo,
}: AccountFamilyModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Shared Limit Family
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 mt-2">
                    {/* Parent Section (if viewing from a child context) */}
                    {parentInfo && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Parent Entity</h4>
                            <Link
                                href={`/accounts/${parentInfo.id}`}
                                onClick={onClose}
                                className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50 hover:bg-blue-50 transition-colors group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 border-l-4 border-blue-500/50 rounded-lg pointer-events-none" />
                                <div className="h-10 w-10 shrink-0 overflow-hidden bg-white flex items-center justify-center rounded-none border border-blue-100 shadow-sm">
                                    {parentInfo.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={parentInfo.image_url}
                                            alt={parentInfo.name}
                                            className="h-full w-full object-contain p-1"
                                        />
                                    ) : (
                                        <div className="text-blue-300">
                                            {getAccountIcon(parentInfo.name)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-blue-900 group-hover:text-blue-700">{parentInfo.name}</span>
                                    <span className="text-xs text-blue-600 flex items-center gap-1 font-semibold">
                                        <Users className="h-3 w-3" />
                                        Shared Limit Parent
                                    </span>
                                </div>
                                <ArrowRight className="ml-auto h-4 w-4 text-blue-300 group-hover:text-blue-500" />
                            </Link>
                        </div>
                    )}

                    {/* Children Section */}
                    {childrenAccounts && childrenAccounts.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                {parentInfo ? 'Siblings & Related' : `Children of ${parentName}`}
                            </h4>
                            <div className="flex flex-col gap-2">
                                {childrenAccounts.map((child) => (
                                    <Link
                                        key={child.id}
                                        href={`/accounts/${child.id}`}
                                        onClick={onClose}
                                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="h-10 w-10 shrink-0 overflow-hidden bg-muted flex items-center justify-center rounded-none border border-slate-100">
                                            {child.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={child.image_url}
                                                    alt={child.name}
                                                    className="h-full w-full object-contain p-1"
                                                />
                                            ) : (
                                                <div className="text-muted-foreground">
                                                    {getAccountIcon(child.name)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{child.name}</span>
                                            <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                Child Card
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {childrenAccounts.length === 0 && !parentInfo && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                            No linked accounts found.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
