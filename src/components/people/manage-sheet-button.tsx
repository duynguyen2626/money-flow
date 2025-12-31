'use client'

import { useEffect, useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ManageCycleSheetResponse } from '@/types/sheet.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { isYYYYMM } from '@/lib/month-tag'
import { updatePersonAction } from '@/actions/people-actions'

type ManageSheetButtonProps = {
  personId: string
  cycleTag: string
  initialSheetUrl?: string | null
  scriptLink?: string | null
  googleSheetUrl?: string | null
  sheetFullImg?: string | null
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

export function ManageSheetButton({
  personId,
  cycleTag,
  initialSheetUrl = null,
  scriptLink = null,
  googleSheetUrl = null,
  sheetFullImg = null,
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
  const [currentScriptLink, setCurrentScriptLink] = useState(scriptLink ?? '')
  const [currentSheetUrl, setCurrentSheetUrl] = useState(googleSheetUrl ?? '')
  const [currentSheetImg, setCurrentSheetImg] = useState(sheetFullImg ?? '')
  const [isEditing, setIsEditing] = useState(false)
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
    setIsEditing(false)
  }, [scriptLink, googleSheetUrl, sheetFullImg, showManageDialog])

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

  const handleSaveLinks = () => {
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
        })
        if (!ok) {
          toast.dismiss(toastId)
          toast.error('Unable to save sheet settings.')
          return
        }
        toast.dismiss(toastId)
        toast.success('Sheet settings saved.')
        setIsEditing(false)
        router.refresh()
      } catch (error) {
        toast.dismiss(toastId)
        toast.error('Saving sheet settings failed.')
      }
    })
  }

  const handlePasteScriptLink = async () => {
    try {
      setCurrentScriptLink('')
      const text = await navigator.clipboard.readText()
      if (!text) {
        toast.error('Clipboard is empty.')
        return
      }
      setCurrentScriptLink(text.trim())
      setIsEditing(true)
      toast.success('Script link pasted.')
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
        console.log('[ManageSheet] request failed', error)
        toast.error('Manage sheet request failed.')
      }
    })
  }

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <Popover open={showManageDialog} onOpenChange={setShowManageDialog}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={handleTriggerClick}
              disabled={isDisabled}
              className={cn(
                'inline-flex min-w-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md border font-semibold transition',
                size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
                iconOnly && 'h-9 w-9 px-0',
                isDisabled
                  ? 'border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700',
                buttonClassName
              )}
              aria-label={iconOnly ? label : undefined}
            >
              <Icon className={cn('h-4 w-4', isManaging && 'animate-spin')} />
              {!iconOnly && <span className="truncate">{label}</span>}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="w-[340px] p-0 sm:w-[420px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="space-y-1 text-left">
                <p className="text-sm font-semibold text-slate-900">Manage sheet</p>
                <p className="text-xs text-slate-500">
                  {showCycleAction
                    ? `Update sheet settings and sync the cycle ${cycleTag}.`
                    : 'Update sheet settings for this person.'}
                </p>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4 text-sm text-slate-600">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sheet script</p>
                  <div className="mt-2 flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <input
                              type="url"
                              value={currentScriptLink}
                              onChange={(event) => {
                                setCurrentScriptLink(event.target.value)
                                setIsEditing(true)
                              }}
                              placeholder="https://script.google.com/macros/s/..."
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </TooltipTrigger>
                        {currentScriptLink && (
                          <TooltipContent side="bottom" className="max-w-md break-all">
                            <p className="text-xs">{currentScriptLink}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <button
                      type="button"
                      onClick={handlePasteScriptLink}
                      className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white"
                    >
                      Paste link
                    </button>
                  </div>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sheet link</p>
                <input
                  type="url"
                  value={currentSheetUrl}
                  onChange={(event) => {
                    setCurrentSheetUrl(event.target.value)
                    setIsEditing(true)
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">QR / Image Link</p>
                <input
                  type="url"
                  value={currentSheetImg}
                  onChange={(event) => {
                    setCurrentSheetImg(event.target.value)
                    setIsEditing(true)
                  }}
                  placeholder="https://... (Image URL)"
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {isValidLink(currentSheetImg) && (
                  <div className="mt-2">
                    <img
                      src={currentSheetImg}
                      alt="QR Preview"
                      className="h-24 w-24 rounded-md border border-slate-200 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveLinks}
                  disabled={!isEditing || isSaving}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSaving ? 'Saving...' : 'Save settings'}
                </button>
                {isValidLink(currentSheetUrl) && (
                  <a
                    href={currentSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white"
                  >
                    Open sheet
                  </a>
                )}
              </div>
            </div>

            {showCycleAction && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cycle sheet</p>
                    <p className="text-sm font-semibold text-slate-900">{cycleTag}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleManageCycle}
                    disabled={!hasValidCycle || !hasValidScriptLink || isManaging}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isManaging
                      ? 'Working...'
                      : sheetUrl
                        ? 'Sync cycle sheet'
                        : 'Create cycle sheet'}
                  </button>
                </div>
                {sheetUrl && (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Open cycle sheet
                  </a>
                )}
                {!hasValidScriptLink && (
                  <p className="text-xs text-slate-500">
                    Add a Script Link before creating or syncing this cycle.
                  </p>
                )}
              </div>
            )}

            {/* Test & Diagnostics Section */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Test & Diagnostics</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Create a test sheet to verify formatting/scripts.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasValidScriptLink) {
                      toast.error('Add a valid Script Link first.')
                      return
                    }
                    startManageTransition(async () => {
                      const toastId = toast.loading('Creating test sheet...')
                      try {
                        const res = await fetch('/api/sheets/manage', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ personId, action: 'test_create' }),
                        })
                        const data = await res.json()
                        if (!res.ok || data?.error) {
                          toast.dismiss(toastId)
                          toast.error(data?.error || 'Test failed')
                          return
                        }
                        toast.dismiss(toastId)
                        toast.success('Test sheet created!')
                        if (data.sheetUrl) {
                          window.open(data.sheetUrl, '_blank')
                        }
                      } catch (err) {
                        toast.dismiss(toastId)
                        toast.error('Test request failed')
                      }
                    })
                  }}
                  disabled={!hasValidScriptLink || isManaging}
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Test Create
                </button>
              </div>
            </div>


            <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowManageDialog(false)
                  router.push(resolvedConnectHref)
                }}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Open sheet settings
              </button>
              <button
                type="button"
                onClick={() => setShowManageDialog(false)}
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {showViewLink && sheetUrl && (
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'text-xs font-semibold text-blue-600 hover:text-blue-700',
              size === 'md' && 'text-sm'
            )}
          >
            View Sheet
          </a>
        )}
      </div >

      <Dialog open={showSyncMessage} onOpenChange={setShowSyncMessage}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="space-y-1">
            <DialogTitle>Sheet updated</DialogTitle>
            <DialogDescription>{syncMessage}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
