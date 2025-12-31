'use client'

import { useEffect, useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, RefreshCcw, Edit2, ExternalLink, Settings, Save } from 'lucide-react'
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
  /* Removed inline message state in favor of toast */
  const [activeTab, setActiveTab] = useState<'script' | 'test'>('script')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // State managed in both Popover (Quick Settings) and Dialog (Full Settings)
  const [currentScriptLink, setCurrentScriptLink] = useState(scriptLink ?? '')
  const [currentSheetUrl, setCurrentSheetUrl] = useState(googleSheetUrl ?? '')
  const [currentSheetImg, setCurrentSheetImg] = useState(sheetFullImg ?? '')
  const [currentShowBankAccount, setCurrentShowBankAccount] = useState(showBankAccount)
  const [currentShowQrImage, setCurrentShowQrImage] = useState(showQrImage)

  // Edit states for Dialog inputs
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [isEditingSheetUrl, setIsEditingSheetUrl] = useState(false)
  const [isEditingQrImage, setIsEditingQrImage] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setSheetUrl(initialSheetUrl ?? null)
  }, [initialSheetUrl])

  // Reset state when props change or when Popover/Dialog opens
  useEffect(() => {
    if (!isPopoverOpen && !showManageDialog) return
    setCurrentScriptLink(scriptLink ?? '')
    setCurrentSheetUrl(googleSheetUrl ?? '')
    setCurrentSheetImg(sheetFullImg ?? '')
    setCurrentShowBankAccount(showBankAccount)
    setCurrentShowQrImage(showQrImage)
    setIsEditingScript(false)
    setIsEditingSheetUrl(false)
    setIsEditingQrImage(false)
  }, [scriptLink, googleSheetUrl, sheetFullImg, showBankAccount, showQrImage, isPopoverOpen, showManageDialog])



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
          sheet_show_qr_image: currentShowQrImage,
        })
        if (!ok) {
          toast.dismiss(toastId)
          toast.error('Unable to save settings.')
          return
        }
        toast.dismiss(toastId)
        toast.success('Settings saved.')
        setIsEditingScript(false)
        setIsEditingSheetUrl(false)
        setIsEditingQrImage(false)
        router.refresh()
      } catch (error) {
        toast.dismiss(toastId)
        toast.error('Saving settings failed.')
      }
    })
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
        if (data.status === 'created' || data.status === 'synced') { // Assuming data.status indicates success
          toast.success(data.status === 'created' ? 'Sheet created & synced.' : 'Sheet synced.')
        } else {
          console.error("Sync failed:", (data as any).message) // Assuming data might have a message for non-error failures
          toast.error("Failed to sync sheet: " + ((data as any).message || "Unknown error"))
        }
        setIsPopoverOpen(false) // Close popover on success
        setShowManageDialog(false)
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

  return (
    <TooltipProvider>
      <div className={cn('inline-flex items-center gap-2', className)}>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
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
          <PopoverContent className="w-[420px] p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Manage sheet</h4>
                  <p className="text-xs text-muted-foreground">{cycleTag}</p>
                </div>
                <div className="flex gap-1">
                  {sheetUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(sheetUrl, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open sheet</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setIsPopoverOpen(false)
                          setShowManageDialog(true)
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Full settings</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Quick Settings Section */}
              <div className="bg-slate-50 rounded-md p-3 space-y-4 border">
                {/* Bank Account Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={`quick-bank-${personId}`} className="text-sm font-medium">Show bank account</Label>
                    <p className="text-[10px] text-muted-foreground">L6:N6 merged</p>
                  </div>
                  <Switch
                    id={`quick-bank-${personId}`}
                    checked={currentShowBankAccount}
                    onCheckedChange={setCurrentShowBankAccount}
                    disabled={isSaving}
                  />
                </div>

                {/* QR Image Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={`quick-qr-${personId}`} className="text-sm font-medium">Send QR image</Label>
                      <p className="text-[10px] text-muted-foreground">L6</p>
                    </div>
                    <Switch
                      id={`quick-qr-${personId}`}
                      checked={currentShowQrImage}
                      onCheckedChange={setCurrentShowQrImage}
                      disabled={isSaving}
                    />
                  </div>

                  {currentShowQrImage && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                      <div className="flex gap-2">
                        <Input
                          value={currentSheetImg}
                          onChange={(e) => setCurrentSheetImg(e.target.value)}
                          placeholder="Image URL"
                          className="h-8 text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={handlePasteQrImage}
                          title="Paste image link"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {currentSheetImg && isValidLink(currentSheetImg) && (
                        <div className="mt-2 relative h-32 w-full rounded-md border border-slate-200 overflow-hidden bg-white flex items-center justify-center">
                          <img
                            src={currentSheetImg}
                            alt="QR Preview"
                            className="h-full w-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant={hasUnsavedChanges ? "default" : "secondary"}
                  size="sm"
                  className="w-full"
                  onClick={handleSaveSettings}
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  {isSaving ? 'Saving...' : 'Save settings'}
                </Button>

                {showCycleAction && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleManageCycle}
                    disabled={!hasValidScriptLink || isManaging}
                  >
                    {isManaging ? 'Syncing...' : 'Sync cycle sheet'}
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

      </div>

      {/* Full Settings Dialog (Hidden by default, used for advanced link editing) */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sheet Settings</DialogTitle>
            <DialogDescription>
              Configure script and sheet links.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'script' | 'test')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="script">Configuration</TabsTrigger>
              <TabsTrigger value="test">Test Connection</TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="space-y-6 mt-6">
              {/* Script Link */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Sheet Script</Label>
                <div className="flex gap-2">
                  <Input
                    value={currentScriptLink}
                    onChange={(e) => setCurrentScriptLink(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Sheet Link */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Sheet Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={currentSheetUrl}
                    onChange={(e) => setCurrentSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="default"
                  onClick={() => {
                    handleSaveSettings();
                    setShowManageDialog(false);
                  }}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="flex-1"
                >
                  Save & Close
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
              {/* Reuse existing test UI logic here if needed, or keep simple */}
              <div className="p-4 border rounded-md bg-slate-50 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Use the "Sync cycle sheet" button in the quick menu to test the connection.
                </p>
                <Button variant="outline" onClick={handleManageCycle} disabled={isManaging}>
                  {isManaging ? 'Testing...' : 'Test Sync Now'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
