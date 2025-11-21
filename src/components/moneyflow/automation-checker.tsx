'use client'

import { useEffect, useState } from 'react'

import { runSubscriptionBotAction } from '@/actions/subscription-actions'

type BotToast = {
  title: string
  detail?: string
}

export function AutomationChecker() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready'>('checking')
  const [toast, setToast] = useState<BotToast | null>(null)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const result = await runSubscriptionBotAction()
        if (!mounted || !result) return
        if (result.processedCount > 0) {
          const names = (result.names ?? []).join(', ')
          setToast({
            title: `Bot tao ${result.processedCount} giao dich`,
            detail: names ? `Da xu ly: ${names}` : undefined,
          })
        }
      } catch (error) {
        console.error('Automation checker failed:', error)
      } finally {
        if (mounted) {
          setStatus('ready')
        }
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
        <span className="text-blue-600">Lazy Bot</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {status === 'checking' ? 'Dang quet...' : 'San sang'}
        </span>
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
