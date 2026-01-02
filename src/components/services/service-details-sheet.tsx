'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    deleteServiceAction,
    updateServiceMembersAction,
    distributeServiceAction,
    confirmServicePaymentAction,
    getServiceBotConfigAction,
    saveServiceBotConfigAction,
    getServicePaymentStatusAction,
    upsertServiceAction
} from '@/actions/service-actions'
import { toast } from 'sonner'
import { Trash2, CreditCard, Loader2, Bot, CheckCircle2, Users, UserPlus, Settings, Check, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { getShopsAction } from '@/actions/shop-actions'
import { Select } from '@/components/ui/select'
import { toYYYYMMFromDate } from '@/lib/month-tag'
import { ServicePaymentDialog } from './service-payment-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ServiceTransactionsTable } from './service-transactions-table'

interface ServiceDetailsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    service: any
    members: any[]
    allPeople: any[]
}

export function ServiceDetailsSheet({ open, onOpenChange, service, members, allPeople }: ServiceDetailsSheetProps) {
    const [watchedMembers, setWatchedMembers] = useState<any[]>(members)
    const [isDistributing, setIsDistributing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
    const router = useRouter()

    // Settings State
    const [name, setName] = useState(service.name)
    const [price, setPrice] = useState(service.price || 0)
    const [shopId, setShopId] = useState(service.shop_id || 'none')
    const [shops, setShops] = useState<any[]>([])
    const [isSavingDetails, setIsSavingDetails] = useState(false)
    const [maxSlots, setMaxSlots] = useState<number>(service.max_slots || 0)

    // Bot Config State
    const [isBotEnabled, setIsBotEnabled] = useState(false)
    const [botRunDay, setBotRunDay] = useState(1)
    const [botRunHour, setBotRunHour] = useState(9)
    const [botNoteTemplate, setBotNoteTemplate] = useState('')
    const [isBotLoading, setIsBotLoading] = useState(false)

    // Payment Status State
    const [paymentStatus, setPaymentStatus] = useState<{ confirmed: boolean, amount: number }>({ confirmed: false, amount: 0 })
    const [checkingPayment, setCheckingPayment] = useState(false)

    const dateObj = new Date()
    const monthTag = toYYYYMMFromDate(dateObj)

    useEffect(() => {
        if (open) {
            setWatchedMembers(members)
            setName(service.name)
            setPrice(service.price || 0)
            setShopId(service.shop_id || 'none')
            setMaxSlots(service.max_slots || 0)
            loadBotConfig()
            checkPaymentStatus()
            fetchShops()
        }
    }, [open, service.id, members])

    async function fetchShops() {
        const data = await getShopsAction()
        if (data) setShops(data)
    }

    async function checkPaymentStatus() {
        setCheckingPayment(true)
        try {
            const status = await getServicePaymentStatusAction(service.id, monthTag)
            setPaymentStatus(status)
        } catch (error) {
            console.error('Failed to check payment status:', error)
        } finally {
            setCheckingPayment(false)
        }
    }

    async function loadBotConfig() {
        setIsBotLoading(true)
        try {
            const config: any = await getServiceBotConfigAction(service.id)
            if (config) {
                setIsBotEnabled(config.is_enabled || false)
                if (config.config) {
                    const c = config.config as any
                    setBotRunDay(c.runDay || 1)
                    setBotRunHour(c.runHour || 9)
                    setBotNoteTemplate(c.noteTemplate || service.note_template || '')
                }
            } else {
                setBotNoteTemplate(service.note_template || `{service} {date} [{slots} slots] [{price}]`)
            }
        } catch (error) {
            console.error('Failed to load bot config:', error)
        } finally {
            setIsBotLoading(false)
        }
    }

    async function handleSaveSettings() {
        setIsSavingDetails(true)
        try {
            const serviceUpdate = {
                id: service.id,
                name,
                price,
                shop_id: shopId === 'none' ? null : shopId,
                note_template: botNoteTemplate,
                max_slots: maxSlots
            }
            await upsertServiceAction(serviceUpdate)
            await saveServiceBotConfigAction(service.id, {
                isEnabled: isBotEnabled,
                runDay: botRunDay,
                runHour: botRunHour,
                noteTemplate: botNoteTemplate
            })
            toast.success('Settings saved successfully')
        } catch (error) {
            toast.error('Failed to save settings')
        } finally {
            setIsSavingDetails(false)
        }
    }

    async function handleDistribute() {
        setIsDistributing(true)
        try {
            const result = await distributeServiceAction(service.id, undefined, botNoteTemplate)
            if (result.success) {
                toast.success('Service distributed successfully')
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Failed to distribute service')
        } finally {
            setIsDistributing(false)
        }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this service?')) return
        setIsDeleting(true)
        try {
            const result = await deleteServiceAction(service.id)
            if (result.success) {
                toast.success('Service deleted successfully')
                onOpenChange(false)
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Failed to delete service')
        } finally {
            setIsDeleting(false)
        }
    }

    async function handleUpdateMember(memberId: string, updates: any) {
        const updatedMembers = watchedMembers.map(m =>
            m.id === memberId ? { ...m, ...updates } : m
        )
        if (maxSlots > 0) {
            const newTotal = updatedMembers.reduce((sum, m) => sum + (m.slots || 0), 0)
            if (newTotal > maxSlots) {
                toast.error(`Cannot exceed max slots (${maxSlots})`)
                return
            }
        }
        setWatchedMembers(updatedMembers)
        await updateServiceMembersAction(service.id, updatedMembers)
    }

    async function handleAddMember(profileId: string) {
        const profile = allPeople.find(p => p.id === profileId)
        if (!profile) return
        if (maxSlots > 0) {
            const currentTotal = watchedMembers.reduce((sum, m) => sum + (m.slots || 0), 0)
            if (currentTotal + 1 > maxSlots) {
                toast.error(`Cannot add member. Max slots (${maxSlots}) reached.`)
                return
            }
        }
        const newMember = { profile_id: profileId, slots: 1, is_owner: false, profile }
        const updatedMembers = [...watchedMembers, newMember]
        setWatchedMembers(updatedMembers)
        await updateServiceMembersAction(service.id, updatedMembers)
        toast.success('Member added')
        setSearchQuery('')
        setIsAddMemberDialogOpen(false)
    }

    async function handleRemoveMember(memberId: string) {
        if (!confirm('Are you sure you want to remove this member?')) return
        const updatedMembers = watchedMembers.filter(m => m.id !== memberId)
        setWatchedMembers(updatedMembers)
        await updateServiceMembersAction(service.id, updatedMembers)
    }

    const totalSlots = watchedMembers.reduce((sum, m) => sum + (m.slots || 0), 0)
    const unitCost = totalSlots > 0 ? (price || 0) / totalSlots : 0
    const isAmountChanged = paymentStatus.confirmed && paymentStatus.amount !== price
    const showConfirmed = paymentStatus.confirmed && !isAmountChanged

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 rounded-xl flex flex-col">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            {service.name}
                        </DialogTitle>
                        <div className="flex items-center gap-2 mr-8">
                            <Button
                                onClick={() => !showConfirmed && setIsPaymentDialogOpen(true)}
                                disabled={showConfirmed}
                                size="sm"
                                variant="outline"
                                className={cn(
                                    "rounded-lg h-9 transition-all",
                                    showConfirmed
                                        ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                                        : "border-green-200 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600"
                                )}
                            >
                                {showConfirmed ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                                {showConfirmed ? 'Confirmed' : 'Confirm'}
                            </Button>
                            <Button
                                onClick={handleDistribute}
                                disabled={isDistributing || watchedMembers.length === 0}
                                size="sm"
                                variant="outline"
                                className="border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 rounded-lg h-9 transition-all disabled:opacity-50"
                            >
                                {isDistributing ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                                Distribute
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* 2-Column Layout: Settings (Left) + People (Right) */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="grid grid-cols-2 gap-4 p-6 overflow-hidden">
                        {/* Left Column: Settings - Determines Height */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Service Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Service Name</Label>
                                        <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Monthly Price</Label>
                                        <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="rounded-lg" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max Slots</Label>
                                        <Input type="number" value={maxSlots} onChange={(e) => setMaxSlots(Number(e.target.value))} className="rounded-lg" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Note Template</Label>
                                        <Input value={botNoteTemplate} onChange={(e) => setBotNoteTemplate(e.target.value)} className="font-mono text-sm rounded-lg" />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-6 space-y-4">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Bot Configuration</h3>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Bot className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <Label className="text-base font-medium">Auto Distribute</Label>
                                                <p className="text-sm text-slate-500">Automatically distribute this service monthly</p>
                                            </div>
                                        </div>
                                        <Switch checked={isBotEnabled} onCheckedChange={setIsBotEnabled} />
                                    </div>
                                    {isBotEnabled && (
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-slate-600">Run Day (1-31)</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={31}
                                                    value={botRunDay || ''}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value)
                                                        setBotRunDay(isNaN(val) ? 0 : val)
                                                    }}
                                                    className="rounded-lg h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-slate-600">Run Hour (0-23)</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={23}
                                                    value={botRunHour === 0 ? 0 : (botRunHour || '')}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value)
                                                        setBotRunHour(isNaN(val) ? 0 : val)
                                                    }}
                                                    className="rounded-lg h-9"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: People List - Matches Height */}
                        <div className="relative min-h-[300px]">
                            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden space-y-4 pr-1">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-600">
                                        {maxSlots > 0 && <span>{totalSlots} / {maxSlots} slots used</span>}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 rounded-lg border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                                        onClick={() => setIsAddMemberDialogOpen(true)}
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        Add Member
                                    </Button>
                                </div>

                                <div className="grid gap-3">
                                    {watchedMembers.map((member) => (
                                        <div
                                            key={member.id || member.profile_id}
                                            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all group"
                                            onClick={() => router.push(`/people/${member.profile_id}`)}
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0",
                                                    member.profile.is_owner ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600')}>
                                                    {member.profile.avatar_url ? (
                                                        <img src={member.profile.avatar_url} alt="" className="h-full w-full object-cover rounded-lg" />
                                                    ) : (
                                                        member.profile.name.substring(0, 1).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-base font-semibold text-slate-900 truncate">{member.profile.name}</span>
                                                    <span className="text-sm text-slate-500">{Math.round(unitCost * member.slots).toLocaleString()} ₫ per slot</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-sm text-slate-600">Slots:</Label>
                                                    <Input
                                                        type="number"
                                                        className="w-20 h-9 text-center rounded-lg"
                                                        value={member.slots}
                                                        onChange={(e) => handleUpdateMember(member.id, { slots: parseInt(e.target.value) || 0 })}
                                                    />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                    onClick={() => handleRemoveMember(member.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer: Save/Delete buttons spanning both columns */}
                <div className="border-t p-6 flex gap-3">
                    <Button
                        onClick={handleSaveSettings}
                        variant="outline"
                        className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-lg h-11 transition-all"
                        disabled={isSavingDetails}
                    >
                        {isSavingDetails ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                        Save Settings
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-lg h-11 px-6 transition-all"
                    >
                        {isDeleting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Delete
                    </Button>
                </div>




                {/* Add Member Dialog */}
                <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4 text-blue-600" />
                                Add Member
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <Input
                                placeholder="🔍 Search member..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="rounded-lg"
                                autoFocus
                            />
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                {allPeople
                                    .filter(p =>
                                        !watchedMembers.some(m => m.profile_id === p.id) &&
                                        (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    )
                                    .map(person => (
                                        <button
                                            key={person.id}
                                            onClick={() => handleAddMember(person.id)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all text-left border border-transparent hover:border-slate-200"
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                {person.avatar_url ? (
                                                    <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    person.name.substring(0, 1).toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-slate-900">{person.name}</span>
                                                <span className="text-xs text-slate-500 truncate">{person.email || 'No email'}</span>
                                            </div>
                                        </button>
                                    ))}
                                {allPeople.filter(p =>
                                    !watchedMembers.some(m => m.profile_id === p.id) &&
                                    (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                ).length === 0 && (
                                        <div className="p-8 text-center text-sm text-slate-400">No members found</div>
                                    )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <ServicePaymentDialog
                    open={isPaymentDialogOpen}
                    onOpenChange={setIsPaymentDialogOpen}
                    service={service}
                    onConfirm={async (accountId, amount, date) => {
                        await confirmServicePaymentAction(service.id, accountId, amount, date, monthTag)
                        await checkPaymentStatus()
                    }}
                />
            </DialogContent>
        </Dialog >
    )
}
