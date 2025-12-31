'use client'

import { useEffect, useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, RefreshCcw, Edit2, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ManageCycleSheetResponse } from '@/types/sheet.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isYYYYMM } from '@/lib/month-tag'
import { updatePersonAction } from '@/actions/people-actions'

type ManageSheetButtonProps = {
  personId: string
  cycleTag: string
  initialSheetUrl?: string | null
  scriptLink?: string | null
  googleSheetUrl?: string | null
  sheetFullImg?: string | null
  showBankAccount?: boolean
  showQrImage?: boolean
  className?: string
  buttonClassName?: string
  size?: 'sm' | 'md'
  iconOnly?: boolean
  showViewLink?: boolean
  linkedLabel?: string
  unlinkedLabel?: string
  disabled?: boolean
  openAfterSuccess?: boolean
  connectHref?: string
  showCycleAction?: boolean
}

function isValidLink(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed)
}

function truncateUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url
  return url.slice(0, maxLength - 3) + '...'
}

export function ManageSheetButton({
  personId,
  cycleTag,
  initialSheetUrl = null,
  scriptLink = null,
  googleSheetUrl = null,
  sheetFullImg = null,
  showBankAccount = false,
  showQrImage = false,
  className,
  buttonClassName,
  size = 'sm',
  iconOnly = false,
  showViewLink = false,
  linkedLabel = 'Manage Sheet',
  unlinkedLabel = 'Manage Sheet',
  disabled,
  openAfterSuccess = false,
  connectHref,
  showCycleAction = true,
}: ManageSheetButtonProps) {
  const [sheetUrl, setSheetUrl] = useState<string | null>(initialSheetUrl ?? null)
  const [isManaging, startManageTransition] = useTransition()
  const [isSaving, startSaveTransition] = useTransition()
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [showSyncMessage, setShowSyncMessage] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'script' | 'test'>('script')

  // Script tab state
  const [currentScriptLink, setCurrentScriptLink] = useState(scriptLink ?? '')
  const [currentSheetUrl, setCurrentSheetUrl] = useState(googleSheetUrl ?? '')
  const [currentSheetImg, setCurrentSheetImg] = useState(sheetFullImg ?? '')
  const [currentShowBankAccount, setCurrentShowBankAccount] = useState(showBankAccount)
  const [currentShowQrImage, setCurrentShowQrImage] = useState(showQrImage)
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [isEditingSheetUrl, setIsEditingSheetUrl] = useState(false)
  const [isEditingQrImage, setIsEditingQrImage] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setSheetUrl(initialSheetUrl ?? null)
  }, [initialSheetUrl])

  useEffect(() => {
    if (!showManageDialog) return
    setCurrentScriptLink(scriptLink ?? '')
    setCurrentSheetUrl(googleSheetUrl ?? '')
    setCurrentSheetImg(sheetFullImg ?? '')
    setCurrentShowBankAccount(showBankAccount)
    setCurrentShowQrImage(showQrImage)
    setIsEditingScript(false)
    setIsEditingSheetUrl(false)
    setIsEditingQrImage(false)
    setActiveTab('script')
  }, [scriptLink, googleSheetUrl, sheetFullImg, showBankAccount, showQrImage, showManageDialog])

  useEffect(() => {
    if (!showSyncMessage) return
    const timeoutId = window.setTimeout(() => setShowSyncMessage(false), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [showSyncMessage])

  const label = sheetUrl ? linkedLabel : unlinkedLabel
  const icon = sheetUrl ? RefreshCcw : FileSpreadsheet
  const Icon = icon
  const isDisabled = disabled || !personId || isManaging || isSaving
  const hasValidCycle = isYYYYMM(cycleTag)
  const hasValidScriptLink = isValidLink(currentScriptLink)
  const resolvedConnectHref = connectHref ?? (personId ? `/people/${personId}?tab=sheet` : '/people')

  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const handleSaveSettings = () => {
    if (!personId) {
      toast.error('Missing person profile.')
      return
    }

    startSaveTransition(async () => {
      const toastId = toast.loading('Saving sheet settings...')
      try {
        const ok = await updatePersonAction(personId, {
          sheet_link: currentScriptLink.trim() || null,
          google_sheet_url: currentSheetUrl.trim() || null,
          sheet_full_img: currentSheetImg.trim() || null,
          sheet_show_bank_account: currentShowBankAccount,
          sheet_show_qr_image: currentShowQrImage,
        })
        if (!ok) {
          toast.dismiss(toastId)
          toast.error('Unable to save sheet settings.')
          return
        }
        toast.dismiss(toastId)
        toast.success('Sheet settings saved.')
        setIsEditingScript(false)
        setIsEditingSheetUrl(false)
        setIsEditingQrImage(false)
        router.refresh()
      } catch (error) {
        toast.dismiss(toastId)
        toast.error('Saving sheet settings failed.')
      }
    })
  }

  const handlePasteScriptLink = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) {
        toast.error('Clipboard is empty.')
        return
      }
      setCurrentScriptLink(text.trim())
      setIsEditingScript(true)
      toast.success('Script link pasted.')
    } catch (error) {
      toast.error('Unable to read clipboard.')
    }
  }

  const handlePasteSheetUrl = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) {
        toast.error('Clipboard is empty.')
        return
      }
      setCurrentSheetUrl(text.trim())
      setIsEditingSheetUrl(true)
      toast.success('Sheet link pasted.')
    } catch (error) {
      toast.error('Unable to read clipboard.')
    }
  }

  const handlePasteQrImage = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) {
        toast.error('Clipboard is empty.')
        return
      }
      setCurrentSheetImg(text.trim())
      setIsEditingQrImage(true)
      toast.success('Image URL pasted.')
    } catch (error) {
      toast.error('Unable to read clipboard.')
    }
  }

  const handleManageCycle = () => {
    if (!hasValidCycle) {
      console.log('[ManageSheet] invalid cycle tag', { personId, cycleTag })
      toast.error('Cycle tag must be YYYY-MM.')
      return
    }
    if (!hasValidScriptLink) {
      console.log('[ManageSheet] missing script link', { personId })
      toast.error('Add a valid Script Link before syncing.')
      return
    }

    startManageTransition(async () => {
      const toastId = toast.loading(sheetUrl ? 'Syncing sheet...' : 'Creating sheet...')
      try {
        console.log('[ManageSheet] request', { personId, cycleTag })
        const res = await fetch('/api/sheets/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId, cycleTag }),
        })

        const data = (await res.json()) as ManageCycleSheetResponse
        console.log('[ManageSheet] response', { status: res.status, data })
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
        setShowManageDialog(false)
        setSyncMessage(data.status === 'created' ? 'Sheet created & synced.' : 'Sheet synced.')
        setShowSyncMessage(true)
        if (searchParams.get('tab') === 'history') {
          const params = new URLSearchParams(searchParams.toString())
          params.set('tab', 'details')
          router.replace(`${pathname}?${params.toString()}`)
        }
        router.refresh()
        if (openAfterSuccess && nextUrl) {
          window.open(nextUrl, '_blank', 'noopener,noreferrer')
        }
      } catch (error) {
        toast.dismiss(toastId)
        toast.error('Manage sheet failed.')
      }
    })
  }

  const hasUnsavedChanges =
    currentScriptLink !== (scriptLink ?? '') ||
    currentSheetUrl !== (googleSheetUrl ?? '') ||
    currentSheetImg !== (sheetFullImg ?? '') ||
    currentShowBankAccount !== showBankAccount ||
    currentShowQrImage !== showQrImage

  return (
    <TooltipProvider>
      <div className={cn('inline-flex items-center gap-2', className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size={size}
              className={cn(buttonClassName)}
              disabled={isDisabled}
              onClick={handleTriggerClick}
            >
              <Icon className={cn('h-4 w-4', !iconOnly && 'mr-2')} />
              {!iconOnly && label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-4" align="start">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Manage sheet</h4>
                <p className="text-xs text-muted-foreground">
                  Update sheet settings and sync the cycle {cycleTag}.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowManageDialog(true)}
                >
                  Open sheet settings
                </Button>
                {sheetUrl && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(sheetUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open sheet</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {showCycleAction && (
                <>
                  <div className="border-t pt-4">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Cycle Sheet
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">{cycleTag}</p>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={handleManageCycle}
                      disabled={!hasValidScriptLink || isManaging}
                    >
                      {isManaging ? 'Syncing...' : 'Sync cycle sheet'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {showSyncMessage && (
          <span className="text-sm text-green-600 font-medium animate-in fade-in">
            {syncMessage}
          </span>
        )}
      </div>

      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage sheet</DialogTitle>
            <DialogDescription>
              Update sheet settings and sync the cycle {cycleTag}.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'script' | 'test')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="script">Sheet Script</TabsTrigger>
              <TabsTrigger value="test">Test Connection</TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="space-y-6 mt-6">
              {/* Script Link */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Sheet Script</Label>
                <p className="text-xs text-muted-foreground">
                  Google Apps Script deployment URL
                </p>
                {isEditingScript || !currentScriptLink ? (
                  <div className="flex gap-2">
                    <Input
                      value={currentScriptLink}
                      onChange={(e) => setCurrentScriptLink(e.target.value)}
                      placeholder="https://script.google.com/macros/s/..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePasteScriptLink}
                    >
                      Paste link
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm flex-1 truncate cursor-help">
                          {truncateUrl(currentScriptLink)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md break-all">
                        {currentScriptLink}
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingScript(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Sheet Link */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Sheet Link</Label>
                <p className="text-xs text-muted-foreground">
                  Google Spreadsheet URL
                </p>
                {isEditingSheetUrl || !currentSheetUrl ? (
                  <div className="flex gap-2">
                    <Input
                      value={currentSheetUrl}
                      onChange={(e) => setCurrentSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePasteSheetUrl}
                    >
                      Paste link
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm flex-1 truncate cursor-help">
                          {truncateUrl(currentSheetUrl)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md break-all">
                        {currentSheetUrl}
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingSheetUrl(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t pt-6 space-y-4">
                <h4 className="text-sm font-semibold">Sync Options</h4>

                {/* Bank Account Toggle */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="show-bank-account" className="text-sm font-medium">
                      Show bank account in sheet
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Displays account info at L6:N6 (merged cells)
                    </p>
                  </div>
                  <Switch
                    id="show-bank-account"
                    checked={currentShowBankAccount}
                    onCheckedChange={setCurrentShowBankAccount}
                  />
                </div>

                {/* QR Image Toggle */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="show-qr-image" className="text-sm font-medium">
                        Send QR image to sheet
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Inserts image at cell L6
                      </p>
                    </div>
                    <Switch
                      id="show-qr-image"
                      checked={currentShowQrImage}
                      onCheckedChange={setCurrentShowQrImage}
                    />
                  </div>

                  {currentShowQrImage && (
                    <div className="ml-0 space-y-2">
                      <Label className="text-xs font-semibold text-slate-600">QR / Image Link</Label>
                      {isEditingQrImage || !currentSheetImg ? (
                        <div className="flex gap-2">
                          <Input
                            value={currentSheetImg}
                            onChange={(e) => setCurrentSheetImg(e.target.value)}
                            placeholder="https://... (Image URL)"
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePasteQrImage}
                          >
                            Paste link
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm flex-1 truncate cursor-help">
                                  {truncateUrl(currentSheetImg)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md break-all">
                                {currentSheetImg}
                              </TooltipContent>
                            </Tooltip>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditingQrImage(true)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {currentSheetImg && isValidLink(currentSheetImg) && (
                            <div className="flex items-center gap-2">
                              <div className="relative h-24 w-24 rounded-md border border-slate-200 overflow-hidden bg-slate-50">
                                <img
                                  src={currentSheetImg}
                                  alt="QR Preview"
                                  className="h-full w-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">Preview</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="default"
                  onClick={handleSaveSettings}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="flex-1"
                >
                  {isSaving ? 'Saving...' : 'Save settings'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowManageDialog(false)}
                >
                  Close
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Cycle Sheet</Label>
                  <p className="text-xs text-muted-foreground mb-3">{cycleTag}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleManageCycle}
                      disabled={!hasValidScriptLink || isManaging}
                      className="flex-1"
                    >
                      {isManaging ? 'Syncing...' : 'Sync cycle sheet'}
                    </Button>
                    {sheetUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(sheetUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Open sheet
                      </Button>
                    )}
                  </div>
                </div>

                {sheetUrl && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs font-medium text-green-800">
                      ✓ Sheet connected
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-green-700 mt-1 truncate cursor-help">
                          {truncateUrl(sheetUrl, 60)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md break-all">
                        {sheetUrl}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
