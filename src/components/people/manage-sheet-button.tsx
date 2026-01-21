'use client'

import { useEffect, useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, RefreshCcw, ExternalLink, Settings2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ManageCycleSheetResponse } from '@/types/sheet.types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isYYYYMM } from '@/lib/month-tag'
import { updatePersonAction } from '@/actions/people-actions'
import { SyncReportDialog } from './sync-report-dialog'

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
  showQrImage?: boolean
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
  showQrImage = false,
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
  const [showDialog, setShowDialog] = useState(false)

  // Sync Report State
  const [showReport, setShowReport] = useState(false)
  const [syncStats, setSyncStats] = useState<any>(null)

  // State for all settings
  const [currentScriptLink, setCurrentScriptLink] = useState(scriptLink ?? '')
  const [currentSheetUrl, setCurrentSheetUrl] = useState(googleSheetUrl ?? '')
  const [currentSheetImg, setCurrentSheetImg] = useState(sheetFullImg ?? '')
  const [currentShowBankAccount, setCurrentShowBankAccount] = useState(showBankAccount)
  const [currentShowQrImage, setCurrentShowQrImage] = useState(showQrImage)

  const router = useRouter()

  useEffect(() => {
    setSheetUrl(initialSheetUrl ?? null)
  }, [initialSheetUrl])

  // Reset state when dialog opens
  useEffect(() => {
    if (!showDialog) return
    setCurrentScriptLink(scriptLink ?? '')
    setCurrentSheetUrl(googleSheetUrl ?? '')
    setCurrentSheetImg(sheetFullImg ?? '')
    setCurrentShowBankAccount(showBankAccount)
    setCurrentShowQrImage(showQrImage)
  }, [scriptLink, googleSheetUrl, sheetFullImg, showBankAccount, showQrImage, showDialog])

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
          setShowDialog(false) // Close settings dialog
          setShowReport(true) // Open report dialog

          if (data.status === 'created') {
            toast.success('Sheet created & synced.')
          }
        } else {
          toast.error('Failed to sync sheet.')
        }

        router.refresh()
        // Removed auto-open since we now show the report dialog which has an Open button
        // if (openAfterSuccess && nextUrl) {
        //   window.open(nextUrl, '_blank', 'noopener,noreferrer')
        // }
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size={size === 'md' ? 'default' : size}
                className="rounded-none px-2 hover:bg-slate-100 h-8 text-slate-500"
                disabled={isDisabled}
                onClick={handleTriggerClick}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </>
        ) : (
          <DialogTrigger asChild>
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
          </DialogTrigger>
        )}

        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Sheet Settings
            </DialogTitle>
            <DialogDescription>
              Configure Google Apps Script and sheet settings for {cycleTag}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Script Link */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Google Apps Script URL</Label>
              <Input
                value={currentScriptLink}
                onChange={(e) => setCurrentScriptLink(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx-9meyYDFzAk6Qth3hINqeOhQkATgRAp4mGsmiS0K6yUs0Orvh3DUDuwP7uNvrr4OT/exec"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Deploy your Google Apps Script as a web app and paste the URL here
              </p>
            </div>

            {/* Sheet URL + Bank Account Toggle */}
            <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Google Sheet URL</Label>
                <Input
                  value={currentSheetUrl}
                  onChange={(e) => setCurrentSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1ABCxyz123..."
                  className="font-mono text-xs bg-white"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex-1">
                  <Label htmlFor={`bank-${personId}`} className="text-sm font-medium cursor-pointer">
                    Show Bank Account
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Display bank info in sheet (L6:N6 merged)
                  </p>
                </div>
                <Switch
                  id={`bank-${personId}`}
                  checked={currentShowBankAccount}
                  onCheckedChange={setCurrentShowBankAccount}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* QR Image + Toggle */}
            <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor={`qr-${personId}`} className="text-sm font-semibold cursor-pointer">
                    Send QR Image
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Include QR code in sheet (L6)
                  </p>
                </div>
                <Switch
                  id={`qr-${personId}`}
                  checked={currentShowQrImage}
                  onCheckedChange={setCurrentShowQrImage}
                  disabled={isSaving}
                />
              </div>

              {currentShowQrImage && (
                <div className="space-y-2 pt-3 border-t animate-in fade-in slide-in-from-top-1">
                  <Label className="text-sm font-medium">QR Code Image URL</Label>
                  <Input
                    value={currentSheetImg}
                    onChange={(e) => setCurrentSheetImg(e.target.value)}
                    placeholder="https://example.com/qr-code.png"
                    className="font-mono text-xs bg-white"
                  />
                  {currentSheetImg && isValidLink(currentSheetImg) && (
                    <div className="mt-3 relative h-32 w-32 rounded-md border border-slate-200 overflow-hidden bg-white flex items-center justify-center">
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

            {/* Sync Section */}
            {showCycleAction && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Sync Cycle Sheet</p>
                    <p className="text-xs text-muted-foreground">Create or update sheet for {cycleTag}</p>
                  </div>
                  {sheetUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(sheetUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  )}
                </div>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleManageCycle}
                  disabled={!hasValidScriptLink || isManaging}
                >
                  <RefreshCcw className={cn('h-4 w-4 mr-2', isManaging && 'animate-spin')} />
                  {isManaging ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant={hasUnsavedChanges ? "default" : "secondary"}
                onClick={() => {
                  handleSaveSettings()
                  setShowDialog(false)
                }}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save & Close'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
