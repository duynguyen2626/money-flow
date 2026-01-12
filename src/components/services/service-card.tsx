'use client'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Person } from '@/types/moneyflow.types'
import { ServicePaymentDialog } from './service-payment-dialog'
import { Trash2, CreditCard, Cloud, Loader2, Save, Bot, Settings, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { getShopsAction } from '@/actions/shop-actions'
import { Select } from '@/components/ui/select'
import { toYYYYMMFromDate } from '@/lib/month-tag'

// TODO: These types should be properly defined and imported
type Service = {
  id: string
  name: string
  price: number | null
  note_template?: string
  shop_id?: string
  max_slots?: number | null
}

type ServiceMember = {
  id: string
  profile_id: string
  profile: {
    id: string
    image_url: string | null
    name: string
  }
  slots: number
  is_owner: boolean
}

interface ServiceCardProps {
  service: any
  members: any[]
  allPeople: Person[]
  isDetail?: boolean
}

export function ServiceCard({ service, members, allPeople, isDetail = false }: ServiceCardProps) {
  const [watchedMembers, setWatchedMembers] = useState<any[]>(members)
  const [isDistributing, setIsDistributing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [nextBillDate, setNextBillDate] = useState<string>('')

  // Inline Edit State
  const [name, setName] = useState(service.name)
  const [price, setPrice] = useState(service.price || 0)
  const [shopId, setShopId] = useState(service.shop_id || 'none')
  const [shops, setShops] = useState<any[]>([])
  const [isSavingDetails, setIsSavingDetails] = useState(false)

  // Bot Config State
  const [isBotEnabled, setIsBotEnabled] = useState(false)
  const [botRunDay, setBotRunDay] = useState(1)
  const [botNoteTemplate, setBotNoteTemplate] = useState('')
  const [maxSlots, setMaxSlots] = useState<number>(service.max_slots || 0) // 0 means unlimited
  const [isBotLoading, setIsBotLoading] = useState(false)
  const [isBotSaving, setIsBotSaving] = useState(false)

  // Undo/Redo State
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Payment Status State
  const [paymentStatus, setPaymentStatus] = useState<{ confirmed: boolean, amount: number }>({ confirmed: false, amount: 0 })
  const [checkingPayment, setCheckingPayment] = useState(false)

  // [M2-SP2] Tag Format: YYYY-MM (e.g., 2025-12)
  const dateObj = new Date()
  const monthTag = toYYYYMMFromDate(dateObj)

  useEffect(() => {
    setWatchedMembers(members)
  }, [members])

  useEffect(() => {
    loadBotConfig()
    checkPaymentStatus()
    fetchShops()
  }, [service.id])

  // History Helper Functions
  const updateTemplate = (newValue: string) => {
    setBotNoteTemplate(newValue)
    const newHistory = [...history.slice(0, historyIndex + 1), newValue]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleTemplateKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault()
      // Shift key check for Redo
      if (e.shiftKey) {
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1
          setHistoryIndex(newIndex)
          setBotNoteTemplate(history[newIndex])
        }
      } else {
        // Undo
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1
          setHistoryIndex(newIndex)
          setBotNoteTemplate(history[newIndex])
        }
      }
    }
  }

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
          const tmpl = c.noteTemplate || ''
          setBotNoteTemplate(tmpl)
          setHistory([tmpl])
          setHistoryIndex(0)
          // maxSlots is now in service table
        }
      } else {
        // Default values
        const defaultTmpl = service.note_template || `{service} {date} [{slots} slots] [{price}]`
        setBotNoteTemplate(defaultTmpl)
        setHistory([defaultTmpl])
        setHistoryIndex(0)
      }
    } catch (error) {
      console.error('Failed to load bot config:', error)
    } finally {
      setIsBotLoading(false)
    }
  }

  async function handleSaveSettings() {
    setIsSavingDetails(true)
    setIsBotSaving(true)
    try {
      // 1. Save Service Details
      const serviceUpdate = {
        id: service.id,
        name,
        price,
        shop_id: shopId === 'none' ? null : shopId,
        note_template: botNoteTemplate, // Save template to service too as backup/default
        max_slots: maxSlots
      }
      await upsertServiceAction(serviceUpdate)

      // 2. Save Bot Config
      await saveServiceBotConfigAction(service.id, {
        isEnabled: isBotEnabled,
        runDay: botRunDay,
        noteTemplate: botNoteTemplate
      })

      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSavingDetails(false)
      setIsBotSaving(false)
    }
  }

  async function handleDistribute() {
    setIsDistributing(true)
    try {
      // Use botNoteTemplate as the source of truth for template
      const result = await distributeServiceAction(service.id, nextBillDate, botNoteTemplate)
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

    // Validate Max Slots
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

    // Validate Max Slots
    if (maxSlots > 0) {
      const currentTotal = watchedMembers.reduce((sum, m) => sum + (m.slots || 0), 0)
      if (currentTotal + 1 > maxSlots) {
        toast.error(`Cannot add member. Max slots (${maxSlots}) reached.`)
        return
      }
    }

    const newMember = {
      profile_id: profileId,
      slots: 1,
      is_owner: false,
      profile: profile // Optimistic update
    }

    const updatedMembers = [...watchedMembers, newMember]
    setWatchedMembers(updatedMembers)
    await updateServiceMembersAction(service.id, updatedMembers)
    // setIsAddMemberDialogOpen(false) // Keep open as requested
    toast.success('Member added successfully')
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return
    const updatedMembers = watchedMembers.filter(m => m.id !== memberId)
    setWatchedMembers(updatedMembers)
    await updateServiceMembersAction(service.id, updatedMembers)
  }

  // Calculate preview note
  const totalSlots = watchedMembers.reduce((sum, m) => sum + (m.slots || 0), 0)
  const unitCost = totalSlots > 0 ? (price || 0) / totalSlots : 0
  const pricePerSlot = Math.round(unitCost)

  const previewNote = botNoteTemplate
    .replace('{service}', name)
    .replace('{member}', 'MemberName')
    .replace('{name}', name) // {name} should be Service Name
    .replace('{slots}', '1')
    .replace('{date}', monthTag)
    .replace('{price}', pricePerSlot.toLocaleString())
    .replace('{total_slots}', totalSlots.toString())
    .replace('{initialPrice}', (price || 0).toLocaleString())

  // Payment Status Logic
  const currentTotalCost = price || 0
  // Logic: 
  // 1. If not confirmed -> Show "Confirm Payment"
  // 2. If confirmed AND amount matches -> Show "Confirmed" (Disabled)
  // 3. If confirmed AND amount DIFFERS -> Show "Re-Confirm Payment" (Enabled)

  const isAmountChanged = paymentStatus.confirmed && paymentStatus.amount !== currentTotalCost
  const showReConfirm = paymentStatus.confirmed && isAmountChanged
  const showConfirmed = paymentStatus.confirmed && !isAmountChanged

  const isMaxSlotsReached = maxSlots > 0 && totalSlots >= maxSlots

  return (
    <Card className="w-full bg-white shadow-sm border-slate-200 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              {isDetail ? (
                service.name
              ) : (
                <Link href={`/services/${service.id}`} className="hover:underline">
                  {service.name}
                </Link>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Monthly</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {service.price?.toLocaleString()} đ
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6 flex-1">
        {/* Members Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Members</h4>
              {maxSlots > 0 && (
                <span className={`text-xs font-medium ${isMaxSlotsReached ? 'text-red-600' : 'text-slate-500'}`}>
                  ({totalSlots}/{maxSlots})
                </span>
              )}
            </div>
            <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={isMaxSlotsReached}>
                  + Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="Search people..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-4"
                  />
                  {isMaxSlotsReached && (
                    <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded border border-red-100">
                      Max slots reached ({maxSlots}). Cannot add more members.
                    </div>
                  )}
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {allPeople
                      .filter(p =>
                        p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                        !watchedMembers.some(m => m.profile_id === p.id)
                      )
                      .map(person => (
                        <div key={person.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded border">
                          <span>{person.name}</span>
                          <Button size="sm" onClick={() => handleAddMember(person.id)} disabled={isMaxSlotsReached}>Add</Button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {watchedMembers.map((member) => {
              const memberCost = Math.round(unitCost * (member.slots || 0));
              return (
                <div key={member.id || member.profile_id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${member.profile.is_owner ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                      {member.profile?.image_url ? (
                        <img src={member.profile.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        member.profile.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">
                        {member.profile.name} {member.profile.is_owner && '(Mine)'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {memberCost.toLocaleString()} đ
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Slots:</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-16 h-7 text-center"
                      value={member.slots}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                        handleUpdateMember(member.id, { slots: isNaN(val) ? 0 : val })
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-500"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Settings Section (Merged Automation & Details) */}
        <div className="pt-2 border-t border-slate-100">
          <CollapsibleSection title="Settings" defaultOpen={false}>
            <div className="space-y-6">

              {/* Service Details Inline Edit */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Details</h4>
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Price</Label>
                    <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="h-8" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Shop (Optional)</Label>
                    <Select
                      items={[
                        { value: 'none', label: 'None' },
                        ...shops.map(shop => ({ value: shop.id, label: shop.name }))
                      ]}
                      value={shopId}
                      onValueChange={setShopId}
                      placeholder="Select shop"
                      className="h-8"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Max Slots (0 = Unlimited)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={maxSlots}
                      onChange={(e) => setMaxSlots(Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Note Template</Label>
                    <Input
                      value={botNoteTemplate}
                      onChange={(e) => updateTemplate(e.target.value)}
                      onKeyDown={handleTemplateKeyDown}
                      className="h-8 font-mono text-xs"
                      placeholder="{service} {date}..."
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['{service}', '{name}', '{date}', '{slots}', '{price}', '{total_slots}', '{initialPrice}'].map(tag => (
                        <button
                          key={tag}
                          onClick={() => updateTemplate(botNoteTemplate + (botNoteTemplate.endsWith(' ') ? '' : ' ') + tag)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                      <p className="text-[10px] text-slate-400 font-medium mb-1">Preview:</p>
                      <p className="text-xs text-slate-600 font-mono">{previewNote}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Automation Config */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Automation</h4>
                  <Switch checked={isBotEnabled} onCheckedChange={setIsBotEnabled} />
                </div>

                {isBotEnabled && (
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Run Day (1-31)</Label>
                      <Input
                        type="number" min={1} max={31}
                        value={botRunDay}
                        onChange={(e) => setBotRunDay(parseInt(e.target.value))}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <Button onClick={handleSaveSettings} disabled={isSavingDetails || isBotSaving} className="w-full" size="sm">
                  {(isSavingDetails || isBotSaving) && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Save All Settings
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting} className="w-full">
                  {isDeleting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Trash2 className="mr-2 h-3 w-3" />}
                  Delete Service
                </Button>
              </div>

            </div>
          </CollapsibleSection>
        </div>

      </CardContent>

      <CardFooter className="bg-slate-50 p-4 rounded-b-lg border-t border-slate-100 flex gap-2 mt-auto">
        <Button
          onClick={() => !showConfirmed && setIsPaymentDialogOpen(true)}
          disabled={showConfirmed}
          variant={showConfirmed ? "ghost" : "outline"}
          className={cn(
            "flex-1 border-slate-300 text-slate-700 hover:bg-slate-100",
            showConfirmed && "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 opacity-100 disabled:opacity-100"
          )}
        >
          {showConfirmed ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirmed
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              {showReConfirm ? "Re-Confirm Payment" : "Confirm Payment"}
            </>
          )}
        </Button>
        <Button
          onClick={handleDistribute}
          disabled={isDistributing || watchedMembers.length === 0}
          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
        >
          {isDistributing ? 'Distributing...' : '⚡ Distribute Now'}
        </Button>
      </CardFooter>

      <ServicePaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        service={service}
        onConfirm={async (accountId, amount, date) => {
          await confirmServicePaymentAction(service.id, accountId, amount, date, monthTag)
          await checkPaymentStatus() // Refresh status after confirm
        }}
      />
    </Card>
  )
}
