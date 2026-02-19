'use client'

import React, { useEffect, useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, RefreshCcw, ExternalLink, Settings2, Save, Link2, FileJson, Landmark, QrCode, X, History, Calculator, ChevronUp, RotateCcw, RefreshCw } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Account } from '@/types/moneyflow.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DebtCycle {
  tag: string
  remains: number
}

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
  // New props for Multi-purpose Dropdown
  allCycles?: DebtCycle[]
  availableYears?: string[]
  selectedYear?: string | null
  onCycleChange?: (tag: string) => void
  onYearChange?: (year: string | null) => void
  currentCycleTag?: string
  isSettled?: boolean
  activeCycleRemains?: number
  isPending?: boolean
  setIsGlobalLoading?: (loading: boolean) => void
  setLoadingMessage?: (msg: string | null) => void
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

function getMonthDisplayName(tag: string) {
  if (!tag.includes('-')) return tag
  const [year, month] = tag.split('-')
  return `${month}/${year}`
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
  allCycles = [],
  availableYears = [],
  selectedYear = null,
  onCycleChange,
  onYearChange,
  currentCycleTag,
  isSettled = false,
  activeCycleRemains = 0,
  isPending = false,
  setIsGlobalLoading,
  setLoadingMessage,
}: ManageSheetButtonProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history')
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

  // AUTO-FILL Bank Info if missing
  useEffect(() => {
    if (!currentBankInfo && currentLinkedBankId && accounts.length > 0) {
      const acc = accounts.find(a => a.id === currentLinkedBankId)
      if (acc) {
        const info = [acc.name, acc.account_number, acc.receiver_name].filter(Boolean).join(' ')
        if (info) setCurrentBankInfo(info)
      }
    }
  }, [currentLinkedBankId, accounts, currentBankInfo])

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

    setShowPopover(false)
    startSaveTransition(async () => {
      const toastId = toast.loading('Saving settings...', {
        description: 'Updating person profile details',
      })
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
        toast.success('Settings saved. Syncing sheet...')
        router.refresh()

        // Trigger sync automatically
        handleManageCycle()
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

    setShowPopover(false)
    if (setIsGlobalLoading) setIsGlobalLoading(true)
    if (setLoadingMessage) setLoadingMessage(sheetUrl ? 'Syncing to Google Sheets...' : 'Creating Google Sheet...')

    startManageTransition(async () => {
      const toastId = toast.loading(sheetUrl ? 'Syncing sheet...' : 'Creating sheet...', {
        description: `Processing cycle ${cycleTag}`,
      })
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
          // Success! Store stats but don't auto-open modal
          setSyncStats({
            syncedCount: data.syncedCount,
            manualPreserved: data.manualPreserved,
            totalRows: data.totalRows,
            sheetUrl: nextUrl
          })

          toast.success(data.status === 'created' ? 'Sheet created & synced' : 'Sheet synced successfully', {
            id: toastId,
            description: `Synced ${data.syncedCount} transactions.`,
            action: {
              label: 'View Report',
              onClick: () => setShowReport(true)
            },
          })
        } else {
          toast.error('Failed to sync sheet.', { id: toastId })
        }

        router.refresh()
      } catch (error) {
        toast.dismiss(toastId)
        toast.error('Manage sheet failed.')
      } finally {
        if (setIsGlobalLoading) setIsGlobalLoading(false)
        if (setLoadingMessage) setLoadingMessage(null)
      }
    })
  }
  const isAggregate = !cycleTag || cycleTag.toLowerCase().includes('all')

  return (
    <div className={cn(
      splitMode
        ? 'flex items-center w-[280px] min-w-[280px] h-9 rounded-lg border border-slate-200 hover:border-slate-300 overflow-hidden transition-all bg-white shadow-sm'
        : 'inline-flex items-center gap-2',
      className
    )}>
      <SyncReportDialog
        open={showReport}
        onOpenChange={setShowReport}
        stats={syncStats}
        cycleTag={cycleTag}
      />

      <Popover open={showPopover} onOpenChange={setShowPopover}>
        {splitMode ? (
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center h-full w-full">
              {/* 1. External Sheet Link Icon */}
              {!isAggregate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-none w-10 px-0 hover:bg-slate-50 h-full text-emerald-600 shrink-0 border-r border-slate-200"
                      disabled={!currentSheetUrl || !isValidLink(currentSheetUrl)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentSheetUrl) window.open(currentSheetUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <FileSpreadsheet className="h-4.5 w-4.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="z-[100]">
                    <p>Open Sheet in New Tab</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* 2. Quick Sync Icon Button */}
              {!isAggregate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-none w-10 px-0 hover:bg-slate-100 h-full text-slate-500 shrink-0 border-r border-slate-100"
                      disabled={isDisabled || !hasValidScriptLink || isSaving}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManageCycle();
                      }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <RefreshCcw className={cn("h-4 w-4", (isManaging || isSaving || isPending) && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center" className="z-[100]">
                    <p>Quick Sync to Sheet</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* 3. History Trigger (Middle Info Part) */}
              <div className="flex-1 h-full border-r border-slate-200">
                <Tooltip>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "rounded-none px-2.5 hover:bg-slate-50 h-full w-full flex items-center justify-between border-none overflow-hidden",
                          buttonClassName
                        )}
                        disabled={isDisabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (allCycles.length > 0) {
                            setActiveTab('history')
                            setShowPopover(true)
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (allCycles.length > 0) {
                            setActiveTab('history')
                            setShowPopover(true)
                          }
                        }}
                      >
                        <span className="font-bold text-slate-800 tabular-nums truncate text-[11px]">{cycleTag || 'History'}</span>

                        {allCycles.length > 0 && (
                          <div className="flex items-center gap-1.5 ml-auto border-l border-slate-100 pl-2 shrink-0">
                            {selectedYear === null ? (
                              <span className="text-amber-700 font-bold text-[10px] uppercase">All</span>
                            ) : isSettled ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <span className="font-bold text-rose-600 text-[10px]">
                                {numberFormatter.format(activeCycleRemains)}
                              </span>
                            )}
                            <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                          </div>
                        )}
                      </Button>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <TooltipContent side="bottom" align="center" className="z-[100]">
                    <p>View Cycle History</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* 4. Settings Trigger Icon (Now on the Right) */}
              {!isAggregate && (
                <Tooltip>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-none w-10 px-0 hover:bg-slate-50 h-full text-slate-500 shrink-0 flex items-center justify-center border-none"
                        disabled={isDisabled}
                        onClick={(e) => {
                          handleTriggerClick(e)
                          setActiveTab('settings')
                        }}
                      >
                        <Settings2 className="h-4.5 w-4.5" />
                      </Button>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <TooltipContent side="bottom" align="end" className="z-[100]">
                    <p>Sheet Configurations</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
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

        <PopoverContent className="w-[380px] p-0 overflow-hidden rounded-xl border-slate-200 shadow-xl" align="end" sideOffset={8}>
          <div className="p-2.5 bg-slate-50 border-b border-slate-100">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as any)}
              className="w-full"
            >
              <TabsList className="bg-slate-200/50 h-9 p-1 rounded-lg">
                <TabsTrigger value="history" className="rounded-md flex-1 text-[11px] font-bold h-7 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                  <History className="h-3.5 w-3.5 mr-2" />
                  Debt History
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-md flex-1 text-[11px] font-bold h-7 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                  <Settings2 className="h-3.5 w-3.5 mr-2" />
                  Configurations
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-0">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as any)}
              className="w-full"
            >
              <TabsContent value="history" className="mt-0">
                <div className="p-1 max-h-[400px] overflow-y-auto">
                  <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sync Controller</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      onClick={handleManageCycle}
                      disabled={isManaging || !hasValidScriptLink || isSaving}
                    >
                      <RefreshCcw className={cn("h-3 w-3 mr-1.5", isManaging && "animate-spin")} />
                      {isManaging ? 'Syncing...' : 'Sync Current Cycle'}
                    </Button>
                  </div>

                  <div className="px-2 pb-2">
                    {/* All History Option */}
                    <button
                      onClick={() => {
                        if (onYearChange && onCycleChange) {
                          if (selectedYear) {
                            onCycleChange('all')
                          } else {
                            onYearChange(null)
                            onCycleChange('all')
                          }
                        }
                        setShowPopover(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-xs mb-1",
                        (selectedYear === null || cycleTag === 'all') ? "bg-amber-50 text-amber-700" : "hover:bg-slate-50"
                      )}
                    >
                      <span className={cn("font-bold flex items-center gap-2", (selectedYear === null || cycleTag === 'all') ? "text-amber-900" : "text-slate-600")}>
                        <RotateCcw className="w-3 h-3" />
                        {selectedYear ? `All ${selectedYear}` : 'All History'}
                      </span>
                    </button>

                    {currentCycleTag && cycleTag !== currentCycleTag && (
                      <button
                        onClick={() => {
                          onCycleChange?.(currentCycleTag)
                          setShowPopover(false)
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-xs mb-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      >
                        <span className="font-bold flex items-center gap-2">
                          <RotateCcw className="w-3 h-3" />
                          Back to Current ({getMonthDisplayName(currentCycleTag)})
                        </span>
                      </button>
                    )}

                    {availableYears.map(year => (
                      <div key={year} className="mt-2 mb-1">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-500 bg-slate-100/50 rounded-sm mb-1">{year}</div>
                        {allCycles
                          .filter(c => c.tag.startsWith(year))
                          .map(cycle => {
                            const cycleSettled = Math.abs(cycle.remains) < 100
                            return (
                              <button
                                key={cycle.tag}
                                onClick={() => {
                                  onCycleChange?.(cycle.tag)
                                  setShowPopover(false)
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-xs mb-0.5",
                                  cycleTag === cycle.tag ? "bg-slate-100" : "hover:bg-slate-50"
                                )}
                              >
                                <span className={cn("font-bold", cycleTag === cycle.tag ? "text-slate-900" : "text-slate-600")}>
                                  {getMonthDisplayName(cycle.tag)}
                                </span>
                                <div className="flex items-center gap-2 min-w-[96px] justify-end">
                                  {!cycleSettled ? (
                                    <span className="font-bold text-rose-600">
                                      {numberFormatter.format(cycle.remains)}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wide">Settled</span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-0">

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

                  {/* 2. Bank & Sync Configuration */}
                  <div className="space-y-4">
                    {/* always visible Linked Bank for Quick Repay */}
                    <div className="flex flex-col p-3 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Landmark className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">Default Bank Account</span>
                          <span className="text-[10px] text-slate-500 font-medium tracking-tight">Auto-filled for repayment transactions</span>
                        </div>
                      </div>

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
                        placeholder="Link a bank account..."
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Sync Controls Grid */}
                    <div className="grid grid-cols-1 gap-3">
                      {/* Sync Bank Toggle */}
                      <div className={cn(
                        "flex flex-col p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 transition-all",
                        currentShowBankAccount && "border-emerald-200 bg-emerald-50/30"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileJson className={cn("h-3.5 w-3.5", currentShowBankAccount ? "text-emerald-500" : "text-slate-500")} />
                            <div className="flex flex-col">
                              <span className={cn("text-[11px] font-bold", currentShowBankAccount ? "text-emerald-900" : "text-slate-700")}>Sync Bank Info to Sheet</span>
                              {currentShowBankAccount && <span className="text-[9px] text-emerald-600 font-medium">Auto-populates bank details on sheet</span>}
                            </div>
                          </div>
                          <Switch
                            checked={currentShowBankAccount}
                            onCheckedChange={setCurrentShowBankAccount}
                            disabled={isSaving}
                            className="scale-75 origin-right"
                          />
                        </div>

                        {currentShowBankAccount && (
                          <div className="mt-2 pt-2 border-t border-emerald-100 animate-in fade-in slide-in-from-top-1 space-y-2">
                            <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Manual Override / Bank Text</Label>
                            <Input
                              value={currentBankInfo}
                              onChange={(e) => setCurrentBankInfo(e.target.value)}
                              placeholder="Bank Name - Account Number - Receiver"
                              className="h-8 text-xs bg-white/50 border-emerald-200/50 focus:bg-white transition-colors"
                            />
                          </div>
                        )}
                      </div>

                      {/* QR Sync Toggle */}
                      <div className={cn(
                        "flex flex-col p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 transition-all",
                        currentShowQrImage && "border-indigo-200 bg-indigo-50/30"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <QrCode className={cn("h-3.5 w-3.5", currentShowQrImage ? "text-indigo-500" : "text-slate-500")} />
                            <div className="flex flex-col">
                              <span className={cn("text-[11px] font-bold", currentShowQrImage ? "text-indigo-900" : "text-slate-700")}>Show QR Code on Sheet</span>
                            </div>
                          </div>
                          <Switch
                            checked={currentShowQrImage}
                            onCheckedChange={setCurrentShowQrImage}
                            disabled={isSaving}
                            className="scale-75 origin-right"
                          />
                        </div>

                        {currentShowQrImage && (
                          <div className="mt-2 pt-2 border-t border-indigo-100 animate-in fade-in slide-in-from-top-1 px-1">
                            <div className="relative">
                              <Link2 className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
                              <Input
                                value={currentSheetImg}
                                onChange={(e) => setCurrentSheetImg(e.target.value)}
                                placeholder="Public Image URL (Direct link)"
                                className="h-7 pl-7 text-[10px] font-mono bg-white/50 border-indigo-200/50"
                              />
                            </div>
                          </div>
                        )}
                      </div>
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
              </TabsContent>
            </Tabs>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
