'use client'

import { useMemo } from 'react'
import { Account, Category, Person, Shop, Transaction } from '@/types/moneyflow.types'
import { SplitBillRow, SplitBillGroup } from './split-bill-row'
import { FileText } from 'lucide-react'

interface SplitBillManagerProps {
    transactions: Transaction[]
    personId: string
    people: Person[]
    accounts: Account[]
    categories: Category[]
    shops: Shop[]
}

export function SplitBillManager({ transactions, personId, people, accounts, categories, shops }: SplitBillManagerProps) {
    const splitBills = useMemo(() => {
        const profile = people.find(p => p.id === personId)
        const isGroupProfile = Boolean(profile?.is_group)
        const groupName = profile?.name ?? null
        const personNameById = new Map(people.map(person => [person.id, person.name]))
        const ownerPersonId = people.find(person => person.is_owner)?.id ?? null

        const baseTransactions = new Map<string, Transaction>()
        transactions.forEach((transaction) => {
            const meta = transaction.metadata as any
            if (meta?.is_split_bill_base) {
                baseTransactions.set(transaction.id, transaction)
            }
        })

        const parseSplitHeader = (note: string) => {
            const headerMatch = note.match(/^\[(SplitBill|SplitRepay)(?:\sBase)?\]\s*(.+?)(?:\s\|\s|$)/)
            if (!headerMatch) return null
            const prefix = headerMatch[1] as 'SplitBill' | 'SplitRepay'
            const parsedGroupName = headerMatch[2]?.trim() || 'Group'
            const noteParts = note.split(' | ')
            const title = noteParts[1]?.trim() || 'Split Bill'
            const remainder = noteParts.slice(2).join(' | ').trim()
            return { prefix, groupName: parsedGroupName, title, remainder }
        }

        const grouped = new Map<string, SplitBillGroup>()

        transactions.forEach((transaction) => {
            const meta = transaction.metadata as any
            if (meta?.is_split_bill_base) return
            const note = transaction.note ?? ''
            const header = parseSplitHeader(note)
            if (!header) return

            const baseTransactionId = meta?.split_parent_id ?? null
            const baseTransaction = baseTransactionId ? baseTransactions.get(baseTransactionId) : null
            const baseMeta = (baseTransaction?.metadata as any) ?? null
            const baseHeader = baseTransaction?.note
                ? parseSplitHeader(baseTransaction.note ?? '')
                : null

            const resolvedGroupName =
                (meta?.split_group_name as string | undefined) ??
                (baseMeta?.split_group_name as string | undefined) ??
                baseHeader?.groupName ??
                header.groupName ??
                'Group'
            if (isGroupProfile && groupName && resolvedGroupName !== groupName) {
                return
            }

            const title = baseHeader?.title ?? header.title
            const baseNote = baseHeader?.title ?? header.title
            const key = baseTransactionId ?? `${header.prefix}:${resolvedGroupName}:${title}`

            const personId = transaction.person_id ?? ''
            if (!personId) return

            const participantName = personNameById.get(personId) ?? 'Unknown'
            const participant = {
                personId,
                name: participantName,
                amount: Math.abs(Number(transaction.amount ?? 0)),
                note: header.remainder || undefined,
                cashbackFixed: transaction.cashback_share_fixed ?? undefined,
                cashbackPercent: transaction.cashback_share_percent ?? undefined,
            }

            const existing = grouped.get(key)
            if (existing) {
                existing.participants.push(participant)
                if (baseTransaction?.occurred_at) {
                    existing.occurredAt = baseTransaction.occurred_at
                } else if (transaction.occurred_at > existing.occurredAt) {
                    existing.occurredAt = transaction.occurred_at
                }
                if (!existing.baseTransactionId && baseTransactionId) {
                    existing.baseTransactionId = baseTransactionId
                }
                if (!existing.baseNote && baseNote) {
                    existing.baseNote = baseNote
                }
                if (!existing.qrImageUrl && baseMeta?.split_qr_image_url) {
                    existing.qrImageUrl = baseMeta.split_qr_image_url
                }
            } else {
                grouped.set(key, {
                    id: key,
                    prefix: header.prefix,
                    groupName: resolvedGroupName,
                    title,
                    occurredAt: baseTransaction?.occurred_at ?? transaction.occurred_at,
                    participants: [participant],
                    baseTransactionId,
                    baseNote,
                    qrImageUrl: baseMeta?.split_qr_image_url ?? null,
                })
            }
        })

        return {
            bills: Array.from(grouped.values()).sort(
            (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
            ),
            ownerPersonId,
        }
    }, [people, personId, transactions])

    if (splitBills.bills.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <FileText className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm font-medium">No split bills found</p>
                <p className="text-xs">Create a split bill or split repayment to see it here.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Split Bill Manager</h3>
                <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    {splitBills.bills.length} Active Bills
                </div>
            </div>

            <div className="space-y-3">
                {splitBills.bills.map(bill => (
                    <SplitBillRow
                        key={bill.id}
                        bill={bill}
                        accounts={accounts}
                        categories={categories}
                        shops={shops}
                        people={people}
                        ownerPersonId={splitBills.ownerPersonId}
                    />
                ))}
            </div>
        </div>
    )
}
