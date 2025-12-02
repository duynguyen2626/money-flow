'use client'

import { useMemo, useState } from 'react'
import { BotConfig, toggleBot } from '@/services/bot-config.service'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Play, Settings, Bot as BotIcon, Clock3, ShieldCheck } from 'lucide-react'
import { Category } from '@/types/moneyflow.types'
import { BotConfigDialog } from './bot-config-dialog'
import { RunBotDialog } from './run-bot-dialog'
import { formatCurrency } from '@/lib/account-utils'

const BOT_META: Record<string, { title: string; description: string }> = {
  subscription_bot: {
    title: 'Subscription Bot',
    description: 'Tao giao dich chia tien dich vu dinh ky voi bot config.',
  },
  batch_clone_bot: {
    title: 'Batch Clone Bot',
    description: 'Tu dong clone CKL template theo lich.',
  },
}

const humanizeKey = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

const getBotTitle = (bot: BotConfig) => BOT_META[bot.key]?.title ?? bot.name ?? humanizeKey(bot.key)
const getBotDescription = (bot: BotConfig) => BOT_META[bot.key]?.description ?? 'Automation task'

type Props = { initialBots: BotConfig[]; categories: Category[] }

export function BotList({ initialBots, categories }: Props) {
  const [bots, setBots] = useState(initialBots.filter(b => b.key !== 'auto_renew'))
  const [configBot, setConfigBot] = useState<BotConfig | null>(null)
  const [runBot, setRunBot] = useState<BotConfig | null>(null)

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach(c => map.set(c.id, c.name))
    return map
  }, [categories])

  const handleToggle = async (key: string, current: boolean) => {
    const newStatus = !current
    setBots(prev => prev.map(b => (b.key === key ? { ...b, is_enabled: newStatus } : b)))
    try {
      await toggleBot(key, newStatus)
      toast.success(`Bot ${newStatus ? 'enabled' : 'disabled'}`)
    } catch (e) {
      setBots(prev => prev.map(b => (b.key === key ? { ...b, is_enabled: current } : b)))
      toast.error('Failed to toggle bot')
    }
  }

  const handleConfigSaved = (key: string, config: any) => {
    setBots(prev => prev.map(b => (b.key === key ? { ...b, config } : b)))
  }

  const handleRunComplete = (key: string, partial: Partial<BotConfig>) => {
    setBots(prev => prev.map(b => (b.key === key ? { ...b, ...partial } : b)))
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {bots.map(bot => {
        const cfg = (bot.config as any) || {}
        const categoryName = cfg.default_category_id ? categoryMap.get(cfg.default_category_id) : null
        return (
          <div
            key={bot.key}
            className="rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <BotIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{getBotTitle(bot)}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        bot.is_enabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {bot.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{getBotDescription(bot)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      Day {cfg.run_day ?? 1}
                    </span>
                    {categoryName && (
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {categoryName}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          bot.last_run_at ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      Last run:{' '}
                      {bot.last_run_at ? new Date(bot.last_run_at).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
              <Switch
                checked={bot.is_enabled ?? false}
                onCheckedChange={() => handleToggle(bot.key, bot.is_enabled ?? false)}
              />
            </div>

            <div className="px-4 py-3 space-y-2 text-xs text-slate-500">
              {bot.key === 'subscription_bot' && (
                <p>Owner lines will book to: {categoryName ?? 'Not set'}</p>
              )}
              {cfg.total_preview_amount && (
                <p>Last preview total: {formatCurrency(cfg.total_preview_amount)}</p>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setConfigBot(bot)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Config
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => setRunBot(bot)}
              >
                <Play className="h-4 w-4 mr-2" />
                Run Now
              </Button>
            </div>
          </div>
        )
      })}

      {configBot && (
        <BotConfigDialog
          bot={configBot}
          categories={categories}
          open={!!configBot}
          onOpenChange={open => !open && setConfigBot(null)}
          onSaved={cfg => handleConfigSaved(configBot.key, cfg)}
        />
      )}

      {runBot && (
        <RunBotDialog
          bot={runBot}
          open={!!runBot}
          onOpenChange={open => !open && setRunBot(null)}
          onRan={partial => handleRunComplete(runBot.key, partial)}
        />
      )}
    </div>
  )
}
