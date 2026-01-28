'use client'

import { useEffect, useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, RefreshCcw, ExternalLink, Settings2, Save, Link2, FileJson, Landmark, QrCode, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ManageCycleSheetResponse } from '@/types/sheet.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn'
import { Combobox, ComboboxItem } from '@/components/ui/combobox'
import { Search, ChevronDown, Check, ChevronsUpDown } from 'lucide-react'
import { isYYYYMM } from '@/lib/month-tag'
import { updatePersonAction } from '@/actions/people-actions'
import { SyncReportDialog } from './sync-report-dialog'
import { Account } from '@/types/moneyflow.types'

function isValidLink(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed)
}

export interface ManageSheetButtonProps {
  personId?: string | null
  cycleTag: string
  initialSheetUrl?: string | null
  scriptLink?: string | null
  googleSheetUrl?: string | null
  sheetFullImg?: string | null
  showBankAccount?: boolean
  sheetBankInfo?: string | null
  sheetLinkedBankId?: string | null
  showQrImage?: boolean
  accounts?: Account[]
  className?: string
  buttonClassName?: string
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'default'
  iconOnly?: boolean
  linkedLabel?: string
  unlinkedLabel?: string
  disabled?: boolean
  openAfterSuccess?: boolean
  showCycleAction?: boolean
  connectHref?: string
  showViewLink?: boolean
  splitMode?: boolean
}

export function ManageSheetButton({
  personId,
  cycleTag,
  initialSheetUrl = null,
  scriptLink = null,
  googleSheetUrl = null,
  sheetFullImg = null,
  showBankAccount = false,
  sheetBankInfo = null,
  sheetLinkedBankId = null,
  showQrImage = false,
  accounts = [],
  className,
  buttonClassName,
  size = 'sm',
  iconOnly = false,
  linkedLabel = 'Manage Sheet',
  unlinkedLabel = 'Manage Sheet',
  disabled,
  openAfterSuccess = false,
  showCycleAction = true,
  connectHref,
  showViewLink = false,
  splitMode = false,
}: ManageSheetButtonProps) {
  const [sheetUrl, setSheetUrl] = useState<string | null>(initialSheetUrl ?? null)
  const [isManaging, startManageTransition] = useTransition()
  const [isSaving, startSaveTransition] = useTransition()
  const [showPopover, setShowPopover] = useState(false)

  // Sync Report State
  const [showReport, setShowReport] = useState(false)
  const [syncStats, setSyncStats] = useState<any>(null)

  // State for all settings
  const [currentScriptLink, setCurrentScriptLink] = useState(scriptLink ?? '')
  const [currentSheetUrl, setCurrentSheetUrl] = useState(googleSheetUrl ?? '')
  const [currentSheetImg, setCurrentSheetImg] = useState(sheetFullImg ?? '')
  const [currentShowBankAccount, setCurrentShowBankAccount] = useState(showBankAccount)
  const [currentBankInfo, setCurrentBankInfo] = useState(sheetBankInfo ?? '')
  const [currentLinkedBankId, setCurrentLinkedBankId] = useState<string | null>(sheetLinkedBankId ?? null)
  const [currentShowQrImage, setCurrentShowQrImage] = useState(showQrImage)
  const [accountSearch, setAccountSearch] = useState('')

  const router = useRouter()

  useEffect(() => {
    setSheetUrl(initialSheetUrl ?? null)
  }, [initialSheetUrl])

  // Reset state when popover opens
  useEffect(() => {
    if (!showPopover) return
    setCurrentScriptLink(scriptLink ?? '')
    setCurrentSheetUrl(googleSheetUrl ?? '')
    setCurrentSheetImg(sheetFullImg ?? '')
    setCurrentShowBankAccount(showBankAccount)
    setCurrentBankInfo(sheetBankInfo ?? '')
    setCurrentLinkedBankId(sheetLinkedBankId ?? null)
    setCurrentShowQrImage(showQrImage)
  }, [scriptLink, googleSheetUrl, sheetFullImg, showBankAccount, sheetBankInfo, sheetLinkedBankId, showQrImage, showPopover])

  const label = sheetUrl ? linkedLabel : unlinkedLabel
  const icon = sheetUrl ? RefreshCcw : FileSpreadsheet
  const Icon = icon
  const isDisabled = disabled || !personId || isManaging || isSaving
  const hasValidCycle = isYYYYMM(cycleTag)
  const hasValidScriptLink = isValidLink(currentScriptLink)

  const hasUnsavedChanges =
    currentScriptLink !== (scriptLink ?? '') ||
    currentSheetUrl !== (googleSheetUrl ?? '') ||
    currentSheetImg !== (sheetFullImg ?? '') ||
    currentShowBankAccount !== showBankAccount ||
    currentBankInfo !== (sheetBankInfo ?? '') ||
    currentLinkedBankId !== (sheetLinkedBankId ?? null) ||
    currentShowQrImage !== showQrImage

  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const handleSaveSettings = () => {
    if (!personId) {
      toast.error('Missing person profile.')
      return
    }

    startSaveTransition(async () => {
      const toastId = toast.loading('Saving settings...')
      try {
        const ok = await updatePersonAction(personId, {
          sheet_link: currentScriptLink.trim() || null,
          google_sheet_url: currentSheetUrl.trim() || null,
          sheet_full_img: currentSheetImg.trim() || null,
          sheet_show_bank_account: currentShowBankAccount,
          sheet_bank_info: currentBankInfo.trim() || null,
          sheet_linked_bank_id: currentLinkedBankId || null,
          sheet_show_qr_image: currentShowQrImage,
        })
        if (!ok) {
          toast.dismiss(toastId)
          toast.error('Unable to save settings.')
          return
        }
        toast.dismiss(toastId)
        toast.success('Settings saved.')
        router.refresh()
      } catch (error) {
        toast.dismiss(toastId)
        toast.error('Saving settings failed.')
      }
    })
  }

  const handleManageCycle = () => {
    if (!hasValidCycle) {
      toast.error('Cycle tag must be YYYY-MM.')
      return
    }
    if (!hasValidScriptLink) {
      toast.error('Add a valid Script Link before syncing.')
      return
    }

    startManageTransition(async () => {
      const toastId = toast.loading(sheetUrl ? 'Syncing sheet...' : 'Creating sheet...')
      try {
        const res = await fetch('/api/sheets/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId, cycleTag }),
        })

        const data = (await res.json()) as ManageCycleSheetResponse

        if (!res.ok || data?.error) {
          toast.dismiss(toastId)
          const errorMessage = data?.error ?? res.statusText
          toast.error(errorMessage || 'Manage sheet failed')
          return
        }

        const nextUrl = data.sheetUrl ?? sheetUrl
        if (data.sheetUrl) {
          setSheetUrl(data.sheetUrl)
        }
        toast.dismiss(toastId)

        if (data.status === 'created' || data.status === 'synced') {
          // Success! Show report instead of just a toast
          setSyncStats({
            syncedCount: data.syncedCount,
            manualPreserved: data.manualPreserved,
            totalRows: data.totalRows,
            sheetUrl: nextUrl
          })
          setShowPopover(false) // Close settings popover
          setShowReport(true) // Open report dialog

          if (data.status === 'created') {
            toast.success('Sheet created & synced.')
          }
        } else {
          toast.error('Failed to sync sheet.')
        }

        router.refresh()
      } catch (error) {
        toast.dismiss(toastId)
        toast.error('Manage sheet failed.')
      }
    })
  }

  return (
    <div className={cn(splitMode ? 'flex items-center rounded-md border-2 border-slate-300 hover:border-slate-400 overflow-hidden transition-colors' : 'inline-flex items-center gap-2', className)}>
      <SyncReportDialog
        open={showReport}
        onOpenChange={setShowReport}
        stats={syncStats}
        cycleTag={cycleTag}
      />

      <Popover open={showPopover} onOpenChange={setShowPopover}>
        {splitMode ? (
          <>
            {/* Sync Action Button */}
            <Button
              variant="ghost"
              size={size === 'md' ? 'default' : size}
              className={cn("rounded-none border-r border-slate-300 px-3 hover:bg-slate-100 h-8", buttonClassName)}
              disabled={isDisabled || !hasValidScriptLink || !hasValidCycle}
              onClick={(e) => {
                e.stopPropagation();
                handleManageCycle();
              }}
            >
              <RefreshCcw className={cn("h-3.5 w-3.5 mr-1.5", isManaging && "animate-spin")} />
              {isManaging ? (
                'Syncing'
              ) : (
                <span className="font-bold">{cycleTag || 'Sheet'}</span>
              )}
            </Button>

            {/* Settings Trigger Icon */}
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size={size === 'md' ? 'default' : size}
                className="rounded-none px-2 hover:bg-slate-100 h-8 text-slate-500 border-l border-slate-200"
                disabled={isDisabled}
                onClick={handleTriggerClick}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>

            {/* Open Sheet Link (New) */}
            {currentSheetUrl && isValidLink(currentSheetUrl) && (
              <Button
                variant="ghost"
                size={size === 'md' ? 'default' : size}
                className="rounded-none px-2 hover:bg-slate-100 h-8 text-emerald-600 border-l border-slate-200"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(currentSheetUrl, '_blank', 'noopener,noreferrer')
                }}
                title="Open Google Sheet"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size={size === 'md' ? 'default' : size}
              className={cn(buttonClassName)}
              disabled={isDisabled}
              onClick={handleTriggerClick}
            >
              <Icon className={cn('h-4 w-4', !iconOnly && 'mr-2')} />
              {!iconOnly && label}
            </Button>
          </PopoverTrigger>
        )}

        <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
          <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50/50">
            <Settings2 className="h-4 w-4 text-slate-500" />
            <h4 className="font-bold text-sm text-slate-900">Sheet Configuration</h4>
          </div>

          <div className="p-4 space-y-4">
            {/* 1. Scripts & Links */}
            <div className="space-y-3">
              <div className="relative">
                <FileJson className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={currentScriptLink}
                  onChange={(e) => setCurrentScriptLink(e.target.value)}
                  placeholder="https://script.google.com/.../exec"
                  className="h-8 pl-8 text-xs font-mono"
                />
              </div>

              <div className="relative">
                <Link2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={currentSheetUrl}
                  onChange={(e) => setCurrentSheetUrl(e.target.value)}
                  placeholder="Google Sheet URL"
                  className="h-8 pl-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* 2. Toggles Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Bank Info Support */}
              <div className={cn("flex flex-col p-2 rounded-lg border border-slate-100 bg-slate-50/50 transition-all", currentShowBankAccount && "border-indigo-200 bg-indigo-50/30 col-span-2")}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Landmark className={cn("h-3.5 w-3.5", currentShowBankAccount ? "text-indigo-500" : "text-slate-500")} />
                    <span className={cn("text-xs font-medium", currentShowBankAccount ? "text-indigo-900" : "text-slate-700")}>Bank Info</span>
                  </div>
                  <Switch
                    checked={currentShowBankAccount}
                    onCheckedChange={setCurrentShowBankAccount}
                    disabled={isSaving}
                    className="scale-75 origin-right"
                  />
                </div>
                {currentShowBankAccount && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 space-y-3">
                    {/* Searchable Account Selector using Combobox style */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Linked Bank Account</Label>
                      <Combobox
                        items={(accounts || [])
                          .filter(a => a.type === 'bank')
                          .map(acc => ({
                            value: acc.id,
                            label: acc.name,
                            description: acc.account_number || undefined,
                            icon: acc.image_url ? (
                              <img src={acc.image_url} className="w-4 h-4 rounded-none object-contain bg-white" />
                            ) : undefined
                          }))
                        }
                        value={currentLinkedBankId || undefined}
                        onValueChange={(val) => {
                          setCurrentLinkedBankId(val || null)
                          if (val) {
                            const acc = (accounts || []).find(a => a.id === val)
                            if (acc) {
                              const info = [acc.name, acc.account_number, acc.receiver_name].filter(Boolean).join(' ')
                              setCurrentBankInfo(info)
                            }
                          }
                        }}
                        placeholder="Search & select bank..."
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Manual Info Section */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100/50">
                      <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Manual Bank Info</Label>
                      <Input
                        value={currentBankInfo}
                        onChange={(e) => setCurrentBankInfo(e.target.value)}
                        placeholder="Bank Name - Account Number - Receiver"
                        className="h-8 text-xs bg-white/50 border-slate-200 focus:bg-white transition-colors"
                      />
                      <p className="text-[9px] text-slate-400 italic">This text is sent to Google Sheets when sync.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className={cn("flex flex-col p-2 rounded-lg border border-slate-100 bg-slate-50/50 transition-all", currentShowQrImage && "border-indigo-200 bg-indigo-50/30 col-span-2")}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <QrCode className={cn("h-3.5 w-3.5", currentShowQrImage ? "text-indigo-500" : "text-slate-500")} />
                    <span className={cn("text-xs font-medium", currentShowQrImage ? "text-indigo-900" : "text-slate-700")}>QR Image</span>
                  </div>
                  <Switch
                    checked={currentShowQrImage}
                    onCheckedChange={setCurrentShowQrImage}
                    disabled={isSaving}
                    className="scale-75 origin-right"
                  />
                </div>
                {/* QR Image URL Input if enabled */}
                {currentShowQrImage && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                    <div className="relative">
                      <Link2 className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                      <Input
                        value={currentSheetImg}
                        onChange={(e) => setCurrentSheetImg(e.target.value)}
                        placeholder="QR Code Image URL"
                        className="h-7 pl-8 text-xs font-mono bg-white/50"
                      />
                    </div>
                    {currentSheetImg && isValidLink(currentSheetImg) && (
                      <div className="mt-2 text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                        <Link2 className="h-3 w-3" /> Valid Link
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Actions */}
            <div className="pt-2 flex flex-col gap-2">
              {hasUnsavedChanges && (
                <Button
                  size="sm"
                  variant="default"
                  className="w-full h-8 bg-slate-900 hover:bg-slate-800"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={!hasUnsavedChanges ? "default" : "secondary"}
                  className={cn("flex-1 h-8", hasUnsavedChanges && "opacity-50")}
                  onClick={handleManageCycle}
                  disabled={isManaging || !hasValidScriptLink || isSaving}
                >
                  <RefreshCcw className={cn("h-3.5 w-3.5 mr-2", isManaging && "animate-spin")} />
                  {isManaging ? 'Syncing...' : 'Sync Sheet Now'}
                </Button>

                {currentSheetUrl && isValidLink(currentSheetUrl) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5"
                    onClick={() => window.open(currentSheetUrl, '_blank', 'noopener,noreferrer')}
                    title="Open Sheet"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
