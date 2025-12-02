'use client'

import { useEffect, useMemo, useState } from 'react'
import { BotConfig, updateBotConfig } from '@/services/bot-config.service'
import { Category } from '@/types/moneyflow.types'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Props = {
  bot: BotConfig
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (nextConfig: any) => void
}

export function BotConfigDialog({ bot, categories, open, onOpenChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories])

  const [runDay, setRunDay] = useState<string>('1')
  const [categoryId, setCategoryId] = useState<string>('')
  const [autoCreate, setAutoCreate] = useState<boolean>(false)
  const [runTime, setRunTime] = useState<string>('08:00')

  useEffect(() => {
    if (!open) return
    const cfg = (bot.config as any) || {}
    setRunDay(String(cfg.run_day ?? '1'))
    setCategoryId(cfg.default_category_id ?? '')
    setAutoCreate(Boolean(cfg.auto_create))
    setRunTime(cfg.run_time ?? '08:00')
  }, [bot, open])

  const isSubscriptionBot = bot.key === 'subscription_bot'
  const isBatchClone = bot.key === 'batch_clone_bot'

  const handleSave = async () => {
    setSaving(true)
    try {
      const parsedRunDay = parseInt(runDay, 10)
      const safeRunDay = Number.isFinite(parsedRunDay) ? Math.min(Math.max(parsedRunDay, 1), 31) : 1

      const nextConfig: any = { run_day: safeRunDay, auto_create: autoCreate }

      if (isSubscriptionBot) {
        nextConfig.default_category_id = categoryId || null
      }

      if (isBatchClone) {
        nextConfig.run_time = runTime || '08:00'
      }

      await updateBotConfig(bot.key, nextConfig)
      onSaved(nextConfig)
      toast.success('Bot config updated')
      onOpenChange(false)
    } catch (e) {
      toast.error('Failed to update config')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure {bot.name || bot.key.replace('_', ' ')}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right">Run Day</Label>
            <div className="col-span-3">
              <Input
                type="number"
                min={1}
                max={31}
                value={runDay}
                onChange={e => setRunDay(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 mt-1">Day of month to trigger automation.</p>
            </div>
          </div>

          {isSubscriptionBot && (
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right">Category</Label>
              <div className="col-span-3">
                <Select
                  items={expenseCategories.map(c => ({ value: c.id, label: c.name }))}
                  value={categoryId}
                  onValueChange={val => setCategoryId(val || '')}
                  placeholder="Select expense category"
                />
                <p className="text-[11px] text-slate-500 mt-1">Used for the owner (expense) line.</p>
              </div>
            </div>
          )}

          {isBatchClone && (
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right">Run Time</Label>
              <div className="col-span-3">
                <Input type="time" value={runTime} onChange={e => setRunTime(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-semibold">Auto Create</p>
              <p className="text-xs text-slate-500">Allow bot to auto-create without manual run.</p>
            </div>
            <Switch checked={autoCreate} onCheckedChange={setAutoCreate} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
