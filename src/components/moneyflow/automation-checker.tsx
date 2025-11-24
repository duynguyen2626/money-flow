'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Zap } from 'lucide-react'

import { runSubscriptionBotAction } from '@/actions/subscription-actions'

type BotToast = {
  title: string
  detail?: string
}

export function AutomationChecker() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<BotToast | null>(null)

  const checkAndProcessSubscriptions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await runSubscriptionBotAction()
      if (!result) return
      if (result.processedCount > 0) {
        const names = (result.names ?? []).join(', ')
        setToast({
          title: `${result.processedCount} transactions created by bot`,
          detail: names ? `Processed: ${names}` : undefined,
        })
      }
    } catch (error) {
      console.error('Automation checker failed:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAndProcessSubscriptions()
  }, [checkAndProcessSubscriptions])

  const runCheck = () => {
    checkAndProcessSubscriptions()
  }

  return (
    <>
      <button
        type="button"
        onClick={runCheck}
        title="Scan recurring services"
        className="rounded-full p-2 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Zap className="h-5 w-5 text-yellow-500" />
        )}
      </button>

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
