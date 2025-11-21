'use client'

import { Zap } from 'lucide-react'
import { useEffect, useState, useCallback, useRef } from 'react'

import { runSubscriptionBotAction } from '@/actions/subscription-actions'

type BotToast = {
  title: string
  detail?: string
}

export function AutomationChecker() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready'>('checking')
  const [toast, setToast] = useState<BotToast | null>(null)
  const mounted = useRef(true)

  const runBot = useCallback(async (manual = false) => {
    if (manual) {
      setStatus('checking')
    }
    try {
      const result = await runSubscriptionBotAction()
      if (!mounted.current) return
      if (result && result.processedCount > 0) {
        const names = (result.names ?? []).join(', ')
        setToast({
          title: `Bot tao ${result.processedCount} giao dich`,
          detail: names ? `Da xu ly: ${names}` : undefined,
        })
      } else if (manual) {
        setToast({
          title: `Bot da quet xong`,
          detail: 'Khong co gi moi',
        })
      }
    } catch (error) {
      console.error('Automation checker failed:', error)
      if (manual && mounted.current) {
        setToast({
          title: `Bot quet that bai`,
          detail: 'Hay kiem tra console log',
        })
      }
    } finally {
      if (mounted.current) {
        setStatus('ready')
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    runBot()
    return () => {
      mounted.current = false
    }
  }, [runBot])

  return (
    <>
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
        <span className="text-blue-600">Lazy Bot</span>
        {status === 'checking' ? (
          <span className="text-[11px] font-semibold text-slate-600">Dang quet...</span>
        ) : (
          <button
            type="button"
            className="text-slate-500 hover:text-blue-600 transition-colors"
            onClick={() => runBot(true)}
            title="Force run"
          >
            <Zap size={14} />
          </button>
        )}
      </div>

      {toast && (
        <div className="fixed right-4 top-4 z-50 w-full max-w-sm rounded-lg border border-blue-100 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.detail && <p className="text-xs text-slate-500">{toast.detail}</p>}
            </div>
            <button
              type="button"
              className="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
              onClick={() => setToast(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}
