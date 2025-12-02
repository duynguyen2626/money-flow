'use client'

import { useEffect, useState } from 'react'
import { BotConfig, runBotManual } from '@/services/bot-config.service'
import { previewSubscriptionRun } from '@/services/subscription.service'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, AlertTriangle, Bot as BotIcon } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/account-utils'

type PreviewItem = {
  id: string
  name: string | null
  cost: number
  members: { name: string; slots: number }[]
  next_billing_date?: string | null
  billing_label?: string
}

type PreviewResult = {
  success: boolean
  count: number
  totalAmount: number
  items: PreviewItem[]
  warnings: string[]
  message?: string
}

type Props = {
  bot: BotConfig
  open: boolean
  onOpenChange: (open: boolean) => void
  onRan: (updated: Partial<BotConfig>) => void
}

export function RunBotDialog({ bot, open, onOpenChange, onRan }: Props) {
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSubscriptionBot = bot.key === 'subscription_bot'

  useEffect(() => {
    if (!open) return
    if (!isSubscriptionBot) {
      setPreview(null)
      return
    }
    const fetchPreview = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await previewSubscriptionRun({ force: true })
        setPreview(result as PreviewResult)
      } catch (e: any) {
        setError('Failed to fetch preview')
        setPreview(null)
      } finally {
        setLoading(false)
      }
    }
    fetchPreview()
  }, [open, isSubscriptionBot])

  const handleRun = async () => {
    setRunning(true)
    try {
      const res = await runBotManual(bot.key, { force: true })
      if (res?.success) {
        const runAt = new Date().toISOString()
        onRan({ last_run_at: runAt })
        toast.success(`Bot completed. Processed: ${res.count ?? 0}`)
        onOpenChange(false)
      } else {
        toast.error(res?.message ?? 'Bot run failed')
      }
    } catch (e) {
      toast.error('Error running bot')
    } finally {
      setRunning(false)
    }
  }

  const renderBody = () => {
    if (!isSubscriptionBot) {
      return (
        <div className="text-sm text-slate-600">
          <p>This bot does not support preview. Run it now?</p>
        </div>
      )
    }

    if (loading) {
      return (
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking pending tasks...
        </div>
      )
    }

    if (error) {
      return <p className="text-sm text-red-600">{error}</p>
    }

    if (!preview || !preview.success) {
      return <p className="text-sm text-slate-600">No preview available.</p>
    }

    if (preview.count === 0) {
      return (
        <div className="flex items-center gap-2 text-emerald-700 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          All services are up to date.
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Found {preview.count} services due. Total {formatCurrency(preview.totalAmount)}
          </p>
          {preview.warnings?.length > 0 && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Warnings
              </div>
              <ul className="mt-1 list-disc list-inside space-y-1">
                {preview.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {preview.items.map(item => (
            <div key={item.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    Members:{' '}
                    {item.members.length
                      ? item.members
                        .map(m => (m.slots && m.slots > 1 ? `${m.name} (x${m.slots})` : m.name))
                        .join(', ')
                      : 'N/A'}
                  </p>
                  {(item.billing_label || item.next_billing_date) && (
                    <p className="text-[11px] text-slate-500">
                      Billing: {item.billing_label ?? item.next_billing_date}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.cost)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const showConfirm = !loading && (!isSubscriptionBot || (preview?.count ?? 0) > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BotIcon className="h-4 w-4" />
            Run {bot.name || bot.key.replace('_', ' ')}
          </DialogTitle>
        </DialogHeader>

        {renderBody()}

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running || loading}>
            Close
          </Button>
          {showConfirm && (
            <Button onClick={handleRun} disabled={running} className="bg-blue-600 hover:bg-blue-700">
              {running && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm & Run
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
