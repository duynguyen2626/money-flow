'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ArrowDownLeft, ChevronDown, ChevronUp, Copy, DollarSign, Trash2, Edit } from 'lucide-react'
import html2canvas from 'html2canvas'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { updateTransactionMetadata, deleteSplitBillAction } from '@/actions/transaction-actions'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { EditSplitBillDialog, EditSplitBillParticipant } from './edit-split-bill-dialog'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'

export type SplitBillParticipant = {
  personId: string
  name: string
  amount: number
  note?: string
  cashbackFixed?: number
  cashbackPercent?: number
}

export type SplitBillGroup = {
  id: string
  prefix: 'SplitBill' | 'SplitRepay'
  groupName: string
  title: string
  occurredAt: string
  participants: SplitBillParticipant[]
  baseTransactionId?: string | null
  baseNote?: string | null
  qrImageUrl?: string | null
}

interface SplitBillRowProps {
  bill: SplitBillGroup
  accounts: Account[]
  categories: Category[]
  shops: Shop[]
  people: Person[]
  ownerPersonId?: string | null
}

export function SplitBillRow({
  bill,
  accounts,
  categories,
  shops,
  people,
  ownerPersonId,
}: SplitBillRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSavingQr, setIsSavingQr] = useState(false)
  const [capturePreviewUrl, setCapturePreviewUrl] = useState<string | null>(null)
  const [qrInput, setQrInput] = useState(bill.qrImageUrl ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const detailRef = useRef<HTMLDivElement>(null)
  const qrPreviewRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    setQrInput(bill.qrImageUrl ?? '')
  }, [bill.qrImageUrl])

  const numberFormatter = new Intl.NumberFormat('en-US')
  const totalAmount = bill.participants.reduce((sum, row) => sum + row.amount, 0)
  const perPerson = bill.participants.length > 0 ? totalAmount / bill.participants.length : 0
  const label = bill.prefix === 'SplitRepay' ? 'Split Repayment' : 'Split Bill'
  const noteToShow = bill.baseNote || bill.title
  const unsupportedColorRegex = /(lab\(|oklab\(|oklch\(|lch\(|color-mix\(|color\()/i
  const dialogBaseProps = { accounts, categories, people, shops }

  const handleCapture = async (mode: 'table' | 'qr') => {
    if (!detailRef.current) return
    if (mode === 'qr' && !qrInput.trim()) {
      toast.error('QR image URL is empty.')
      return
    }
    setIsCapturing(true)
    const ensureQrReady = async () => {
      if (!qrInput || !qrPreviewRef.current) return false
      const img = qrPreviewRef.current
      if (img.complete && img.naturalWidth > 0) return true
      await new Promise<void>((resolve) => {
        const handleLoad = () => {
          cleanup()
          resolve()
        }
        const handleError = () => {
          cleanup()
          resolve()
        }
        const cleanup = () => {
          img.removeEventListener('load', handleLoad)
          img.removeEventListener('error', handleError)
        }
        img.addEventListener('load', handleLoad)
        img.addEventListener('error', handleError)
      })
      return img.complete && img.naturalWidth > 0
    }
    const ensureCaptureImagesReady = async (root: HTMLElement) => {
      const images = Array.from(root.querySelectorAll('img'))
      if (images.length === 0) return true
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve()
                return
              }
              const handleLoad = () => {
                cleanup()
                resolve()
              }
              const handleError = () => {
                cleanup()
                resolve()
              }
              const cleanup = () => {
                img.removeEventListener('load', handleLoad)
                img.removeEventListener('error', handleError)
              }
              img.addEventListener('load', handleLoad)
              img.addEventListener('error', handleError)
            }),
        ),
      )
      return images.every((img) => img.complete && img.naturalWidth > 0)
    }
    const hasQrForCapture = mode === 'qr' ? await ensureQrReady() : false
    if (mode === 'qr' && !hasQrForCapture) {
      toast.error('QR image could not be loaded.')
      setIsCapturing(false)
      return
    }
    const overrideStyles: Array<{ node: HTMLElement; style: string | null }> = []
    const captureInlineStyles: Array<{ node: HTMLElement; style: string | null }> = []
    const applyFallbackColor = (value: string | null, fallback: string) => {
      if (!value) return null
      const lower = value.toLowerCase()
      if (unsupportedColorRegex.test(lower)) {
        return fallback
      }
      return null
    }
    const applyFallbackShadow = (value: string | null) => {
      if (!value) return null
      const lower = value.toLowerCase()
      if (unsupportedColorRegex.test(lower)) {
        return 'none'
      }
      return null
    }
    const applyFallbackStyles = (
      nodes: HTMLElement[],
      view: Window,
      trackChanges: boolean,
    ) => {
      nodes.forEach((node) => {
        const computed = view.getComputedStyle(node)
        const nextColor = applyFallbackColor(computed.color, '#0f172a')
        const nextBackground = applyFallbackColor(computed.backgroundColor, '#ffffff')
        const nextBorder = applyFallbackColor(computed.borderColor, '#e2e8f0')
        const nextOutline = applyFallbackColor(computed.outlineColor, '#e2e8f0')
        const nextDecoration = applyFallbackColor(
          computed.textDecorationColor,
          '#0f172a',
        )
        const nextFill = applyFallbackColor((computed as any).fill ?? null, '#0f172a')
        const nextStroke = applyFallbackColor((computed as any).stroke ?? null, '#0f172a')
        const nextShadow = applyFallbackShadow(computed.boxShadow)
        const nextTextShadow = applyFallbackShadow(computed.textShadow)

        if (
          nextColor ||
          nextBackground ||
          nextBorder ||
          nextOutline ||
          nextDecoration ||
          nextFill ||
          nextStroke ||
          nextShadow ||
          nextTextShadow
        ) {
          if (trackChanges) {
            overrideStyles.push({ node, style: node.getAttribute('style') })
          }
          if (nextColor) node.style.color = nextColor
          if (nextBackground) node.style.backgroundColor = nextBackground
          if (nextBorder) node.style.borderColor = nextBorder
          if (nextOutline) node.style.outlineColor = nextOutline
          if (nextDecoration) node.style.textDecorationColor = nextDecoration
          if (nextFill) node.style.fill = nextFill
          if (nextStroke) node.style.stroke = nextStroke
          if (nextShadow) node.style.boxShadow = nextShadow
          if (nextTextShadow) node.style.textShadow = nextTextShadow
        }
      })
    }
    try {
      const captureSelector = mode === 'qr' ? '[data-capture-qr]' : '[data-capture-table]'
      const captureTarget = detailRef.current.querySelector<HTMLElement>(captureSelector)
      if (!captureTarget) {
        toast.error('Capture layout is not ready.')
        setIsCapturing(false)
        return
      }
      const captureContainer = captureTarget.closest(
        '[data-capture-only]',
      ) as HTMLElement | null
      const trackInlineStyle = (node: HTMLElement | null) => {
        if (!node) return
        captureInlineStyles.push({ node, style: node.getAttribute('style') })
      }
      trackInlineStyle(captureContainer)
      trackInlineStyle(captureTarget)
      if (captureContainer) {
        captureContainer.style.display = 'block'
        captureContainer.style.position = 'fixed'
        captureContainer.style.left = '-10000px'
        captureContainer.style.top = '0'
        captureContainer.style.opacity = '1'
        captureContainer.style.pointerEvents = 'none'
        captureContainer.style.margin = '0'
      }
      captureTarget.style.display = mode === 'qr' ? 'inline-flex' : 'inline-block'
      if (mode === 'qr') {
        await ensureCaptureImagesReady(captureTarget)
      }

      const baseNodes: HTMLElement[] = [
        captureTarget,
        ...Array.from(captureTarget.querySelectorAll<HTMLElement>('*')),
      ]
      const globalNodes = [document.documentElement, document.body].filter(
        (node): node is HTMLElement => Boolean(node),
      )
      applyFallbackStyles([...globalNodes, ...baseNodes], window, true)

      const canvas = await html2canvas(captureTarget, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        onclone: (doc: Document) => {
          const view = doc.defaultView
          if (!view) return
          const cloneTarget = doc.querySelector(captureSelector) as HTMLElement | null
          if (!cloneTarget) return
          const cloneContainer = cloneTarget.closest(
            '[data-capture-only]',
          ) as HTMLElement | null
          if (cloneContainer) {
            cloneContainer.style.display = 'block'
            cloneContainer.style.position = 'fixed'
            cloneContainer.style.left = '-10000px'
            cloneContainer.style.top = '0'
            cloneContainer.style.opacity = '1'
            cloneContainer.style.pointerEvents = 'none'
            cloneContainer.style.margin = '0'
          }
          cloneTarget.style.display =
            mode === 'qr' ? 'inline-flex' : 'inline-block'
          const cloneNodes: HTMLElement[] = [
            cloneTarget,
            ...Array.from(cloneTarget.querySelectorAll<HTMLElement>('*')),
          ]
          const cloneGlobals = [doc.documentElement, doc.body].filter(
            (node): node is HTMLElement => Boolean(node),
          )
          applyFallbackStyles([...cloneGlobals, ...cloneNodes], view, false)
        },
      } as any)
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to capture image')
          return
        }
        setCapturePreviewUrl(canvas.toDataURL('image/png'))
        const item = new ClipboardItem({ 'image/png': blob })
        navigator.clipboard
          .write([item])
          .then(() => {
            toast.success('Copied split bill to clipboard!')
          })
          .catch((err) => {
            console.error(err)
            toast.error('Failed to copy to clipboard')
          })
      })
    } catch (err) {
      console.error(err)
      toast.error('Error capturing split bill')
    } finally {
      overrideStyles.forEach(({ node, style }) => {
        if (style === null) {
          node.removeAttribute('style')
        } else {
          node.setAttribute('style', style)
        }
      })
      captureInlineStyles.forEach(({ node, style }) => {
        if (style === null) {
          node.removeAttribute('style')
        } else {
          node.setAttribute('style', style)
        }
      })
      setIsCapturing(false)
    }
  }

  const handleSaveQr = async () => {
    if (!bill.baseTransactionId) {
      toast.error('Missing base transaction for this split bill.')
      return
    }
    setIsSavingQr(true)
    const trimmed = qrInput.trim()
    const ok = await updateTransactionMetadata(bill.baseTransactionId, {
      split_qr_image_url: trimmed || null,
    })
    if (ok) {
      toast.success('Saved QR image URL.')
    } else {
      toast.error('Failed to save QR image URL.')
    }
    setIsSavingQr(false)
  }

  const handleCopyCombined = async () => {
    if (!qrInput || !qrInput.trim()) {
      toast.error('QR image URL is required')
      return
    }

    setIsCapturing(true)

    try {
      // 1. Fetch QR image as blob to bypass CORS
      const imageUrl = qrInput.trim()
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      // 2. Load QR image
      const qrImage = new Image()
      qrImage.src = objectUrl

      await new Promise((resolve, reject) => {
        qrImage.onload = resolve
        qrImage.onerror = () => reject(new Error('Failed to load QR image'))
      })
      URL.revokeObjectURL(objectUrl)

      // 3. Setup Canvas dimensions (High DPI)
      const scaleFactor = 2 // 2x resolution for sharpness

      const tableWidth = 500 // Even wider
      const padding = 60 // More breathing room
      const lineHeight = 44 // Taller lines

      // Calculate table height
      const headerHeight = 220 - lineHeight
      const rowsHeight = bill.participants.length * lineHeight
      const contentHeight = headerHeight + rowsHeight + padding * 2

      // Image dimensions logic
      const targetQrWidth = 400
      const imgScale = targetQrWidth / qrImage.width
      const imgW = qrImage.width * imgScale
      const imgH = qrImage.height * imgScale

      const logicalTotalWidth = tableWidth + padding + imgW + padding
      const logicalTotalHeight = Math.max(contentHeight, imgH + padding * 2)

      const canvas = document.createElement('canvas')
      canvas.width = logicalTotalWidth * scaleFactor
      canvas.height = logicalTotalHeight * scaleFactor
      const ctx = canvas.getContext('2d')!

      ctx.scale(scaleFactor, scaleFactor)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, logicalTotalWidth, logicalTotalHeight)

      const tableY = logicalTotalHeight > contentHeight
        ? (logicalTotalHeight - contentHeight) / 2
        : 0

      let y = Math.max(0, tableY) + padding + 15

      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 36px sans-serif' // Giant Title
      ctx.fillText('Bill Details', padding, y)

      y += 60

      // Metadata
      const drawRow = (label: string, value: string, isTotal = false) => {
        const labelWidth = 120
        ctx.fillStyle = '#64748b'
        ctx.font = isTotal ? 'bold 24px sans-serif' : '20px sans-serif' // Very legible
        ctx.fillText(label, padding, y)

        ctx.fillStyle = isTotal ? '#0f172a' : '#334155'
        ctx.font = isTotal ? 'bold 24px sans-serif' : '22px sans-serif'
        ctx.fillText(value, padding + labelWidth, y)
        y += lineHeight
      }

      const formattedDate = format(new Date(bill.occurredAt), 'dd MMM yyyy')
      drawRow('Date:', formattedDate)
      drawRow('Note:', noteToShow)

      y += 20
      drawRow('Total:', numberFormatter.format(totalAmount), true)

      y += 20
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(tableWidth, y)
      ctx.stroke()
      y += 50

      ctx.font = 'bold 22px sans-serif'
      ctx.fillStyle = '#334155'
      ctx.fillText('Participants', padding, y)
      y += 40

      bill.participants.forEach(p => {
        ctx.font = '22px sans-serif'
        ctx.fillStyle = '#334155'
        const personName = p.name
        ctx.fillText(personName, padding, y)

        const amt = numberFormatter.format(p.amount)
        const amtWidth = ctx.measureText(amt).width
        ctx.fillText(amt, tableWidth - amtWidth, y)

        y += lineHeight
      })

      // 5. Draw Image (Right side, vertically centered)
      const imgX = tableWidth + padding
      const imgY = (logicalTotalHeight - imgH) / 2
      ctx.drawImage(qrImage, imgX, imgY, imgW, imgH)

      // 6. Copy to clipboard
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to create image')
          setIsCapturing(false)
          return
        }

        navigator.clipboard
          .write([new ClipboardItem({ 'image/png': blob })])
          .then(() => {
            toast.success('Copied! 📋')
            setIsCapturing(false)
          })
          .catch((err) => {
            console.error('Clipboard error:', err)
            // Fallback for some browsers?
            toast.error('Failed to copy to clipboard')
            setIsCapturing(false)
          })
      }, 'image/png')
    } catch (error) {
      console.error('Copy Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to copy: ${errorMessage}`)
      setIsCapturing(false)
    }
  }

  const handleDeleteSplitBill = async () => {
    setIsDeleting(true)

    try {
      if (bill.baseTransactionId) {
        // New split bills with base transaction
        const result = await deleteSplitBillAction(bill.baseTransactionId)
        setIsDeleting(false)

        if (result.success) {
          toast.success(`Deleted split bill: ${result.deletedCount} transactions removed`)
          setShowDeleteConfirm(false)
          window.location.reload()
        } else {
          toast.error(result.error || 'Failed to delete split bill')
        }
      } else {
        // Legacy split bills without base transaction
        // Delete all child transactions by finding them through participant IDs
        const supabase = (await import('@/lib/supabase/client')).createClient()

        // Get all transaction IDs from participants
        const participantIds = bill.participants.map(p => p.personId)

        // Find all transactions for these participants with matching note pattern
        const { data: transactions } = await supabase
          .from('transactions')
          .select('id')
          .in('person_id', participantIds)
          .ilike('note', `%${bill.title}%`)

        if (!transactions || transactions.length === 0) {
          toast.error('No transactions found to delete')
          setIsDeleting(false)
          return
        }

        const transactionIds = transactions.map((t: any) => t.id)

        // Delete cashback entries first
        await supabase
          .from('cashback_entries')
          .delete()
          .in('transaction_id', transactionIds)

        // Delete transactions
        const { error } = await supabase
          .from('transactions')
          .delete()
          .in('id', transactionIds)

        setIsDeleting(false)

        if (error) {
          toast.error(`Failed to delete: ${error.message}`)
        } else {
          toast.success(`Deleted ${transactionIds.length} transactions`)
          setShowDeleteConfirm(false)
          window.location.reload()
        }
      }
    } catch (error) {
      setIsDeleting(false)
      toast.error('An error occurred while deleting')
      console.error(error)
    }
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md">
      <div
        className="p-3 flex items-center justify-between cursor-pointer bg-slate-50/50 hover:bg-slate-100/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-full',
              bill.prefix === 'SplitRepay'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-rose-100 text-rose-600'
            )}
          >
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 line-clamp-1">{bill.title}</p>
            <p className="text-xs text-slate-500">
              {label} - {bill.groupName} - {format(new Date(bill.occurredAt), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900 normal-nums">
              {numberFormatter.format(totalAmount)}
            </p>
            <p className="text-[10px] text-slate-500">
              <span className="normal-nums">{numberFormatter.format(perPerson)}</span> / person
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Split details</span>
            <div className="flex items-center gap-2">
              {/* Edit button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEditDialog(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Edit className="h-3 w-3" />
                Edit
              </button>
              {/* Delete button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteConfirm(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>

          <div
            ref={detailRef}
            data-splitbill-capture="true"
            className="w-full max-w-4xl mx-auto"
          >
            <div
              data-capture-hide
              className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
            >
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-800 text-sm">{bill.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {format(new Date(bill.occurredAt), 'dd MMM yyyy')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleCapture('table')
                      }}
                      disabled={isCapturing}
                      className="inline-flex h-7 items-center rounded-md border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {isCapturing ? 'Capturing...' : 'Copy Table'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleCopyCombined()
                      }}
                      disabled={isCapturing || !qrInput}
                      className="inline-flex h-7 items-center rounded-md border border-purple-200 bg-purple-50 px-2.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-60"
                      title="Copy table + cropped QR"
                    >
                      📋 {isCapturing ? 'Processing...' : 'Copy Combined'}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">{label} - {bill.groupName}</p>
                  <p className="text-xs text-slate-500">
                    Note: <span className="font-semibold text-slate-700">{noteToShow}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Total: <span className="font-semibold text-slate-900 normal-nums">{numberFormatter.format(totalAmount)}</span>
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {bill.participants.map((participant) => {
                    const isOwner = ownerPersonId && participant.personId === ownerPersonId
                    const showQuickRepay = bill.prefix === 'SplitBill' && !isOwner
                    return (
                      <div key={participant.personId} className="py-2 text-sm">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 truncate">{participant.name}</p>
                            {participant.note && (
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">Detail: {participant.note}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold normal-nums text-slate-700">
                              {numberFormatter.format(participant.amount)}
                            </span>
                            {showQuickRepay && (
                              <AddTransactionDialog
                                {...dialogBaseProps}
                                defaultType="repayment"
                                defaultPersonId={participant.personId}
                                defaultAmount={participant.amount}
                                cloneInitialValues={{ split_bill: true }}
                                buttonClassName="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                triggerContent={
                                  <span className="inline-flex items-center gap-1">
                                    <ArrowDownLeft className="h-3.5 w-3.5" />
                                    Repay
                                  </span>
                                }
                              />
                            )}
                          </div>
                        </div>
                        {(() => {
                          const percent = participant.cashbackPercent ?? 0
                          const fixed = participant.cashbackFixed ?? 0
                          const cashbackAmount = participant.amount * percent + fixed
                          if (cashbackAmount <= 0) return null
                          const percentLabel = percent > 0 ? ` (${(percent * 100).toFixed(2)}%)` : ''
                          return (
                            <p className="text-[11px] text-emerald-600 mt-1 normal-nums">
                              Cashback: {numberFormatter.format(cashbackAmount)}{percentLabel}
                            </p>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500">QR image URL</label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleCapture('qr')
                    }}
                    disabled={isCapturing}
                    className="inline-flex h-7 items-center rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {isCapturing ? 'Capturing...' : 'Copy QR'}
                  </button>
                </div>
                <div className="space-y-1">
                  <input
                    type="url"
                    value={qrInput}
                    onChange={(event) => setQrInput(event.target.value)}
                    placeholder="Paste QR image URL..."
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {bill.baseTransactionId
                      ? 'Shown in split bill details.'
                      : 'Base transaction missing for this split bill.'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveQr}
                    disabled={isSavingQr || !bill.baseTransactionId}
                    className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                  >
                    {isSavingQr ? 'Saving...' : 'Save QR'}
                  </button>
                </div>
                {qrInput ? (
                  <div className="rounded-md border border-slate-200 bg-white p-2 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={qrPreviewRef}
                      crossOrigin="anonymous"
                      src={qrInput}
                      alt="QR code"
                      className="max-h-48 w-auto max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Paste an image URL to preview the QR code here.
                  </p>
                )}
              </div>
            </div>

            <div data-capture-only className="hidden">
              <div
                data-capture-table
                className="inline-block rounded-md border border-slate-200 bg-white"
              >
                <table className="w-auto text-sm border-collapse">
                  <colgroup>
                    <col className="min-w-[140px]" />
                    <col className="w-[120px]" />
                  </colgroup>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="text-[11px] text-slate-600">
                      <td className="px-2 py-1 text-slate-500">Note</td>
                      <td className="px-2 py-1 text-right font-semibold text-slate-800 border-l border-slate-200">
                        {noteToShow}
                      </td>
                    </tr>
                    <tr className="text-[11px] text-slate-600 border-b border-slate-200">
                      <td className="px-2 py-1 text-slate-500">Total</td>
                      <td className="px-2 py-1 text-right font-semibold normal-nums text-slate-800 border-l border-slate-200">
                        {numberFormatter.format(totalAmount)}
                      </td>
                    </tr>
                    {bill.participants.map((participant) => (
                      <tr key={participant.personId}>
                        <td className="px-2 py-1 font-semibold text-slate-800">
                          {participant.name}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold normal-nums text-slate-800 border-l border-slate-200 whitespace-nowrap">
                          {numberFormatter.format(participant.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                data-capture-qr
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2"
              >
                {qrInput && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    crossOrigin="anonymous"
                    src={qrInput}
                    alt="QR code"
                    className="block h-auto w-auto max-h-[320px] max-w-[420px] object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {capturePreviewUrl && (
        <div className="fixed bottom-6 right-6 z-50 w-[260px] rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">Captured preview</span>
            <button
              type="button"
              onClick={() => setCapturePreviewUrl(null)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close preview"
            >
              &#x2715;
            </button>
          </div>
          <div className="p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturePreviewUrl} alt="Captured preview" className="w-full rounded-md border border-slate-200" />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Delete Split Bill?</h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-700">
                This will permanently delete:
              </p>
              <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc">
                <li>1 base transaction</li>
                <li>{bill.participants.length} child transactions</li>
              </ul>
              <p className="text-sm font-semibold text-slate-900">
                Total: {bill.participants.length + 1} transactions
              </p>
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-xs text-red-800 font-semibold">
                  ⚠️ This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSplitBill}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Split Bill Dialog */}
      <EditSplitBillDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        baseTransactionId={bill.baseTransactionId ?? null}
        initialData={{
          title: bill.title,
          note: bill.baseNote || bill.title,
          qrImageUrl: bill.qrImageUrl ?? null,
          participants: bill.participants.map(p => ({
            personId: p.personId,
            name: p.name,
            amount: Math.abs(p.amount),
            transactionId: undefined, // Will be fetched by service
          })),
          baseAmount: bill.participants.reduce((sum, p) => sum + Math.abs(p.amount), 0),
        }}
        allPeople={people}
      />
    </div>
  )
}
