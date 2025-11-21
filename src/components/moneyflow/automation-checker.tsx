'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Loader2, Zap } from 'lucide-react'

import { runSubscriptionBotAction } from '@/actions/subscription-actions'
import { Button } from '@/components/ui/button'

type BotToast = {
  title: string
  detail?: string
}

export function AutomationChecker() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready'>('checking')
  const [toast, setToast] = useState<BotToast | null>(null)
  const isMounted = useRef(true)

  const runCheck = useCallback(async () => {
    if (!isMounted.current) return
    setStatus('checking')

    try {
      const result = await runSubscriptionBotAction()
      if (!isMounted.current || !result) return

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
      if (isMounted.current) {
        setStatus('ready')
      }
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    runCheck()

    return () => {
      isMounted.current = false
    }
  }, [runCheck])

  return (
    <>
      <Button variant="ghost" size="icon" onClick={runCheck} title="Quét dịch vụ định kỳ">
        {status === 'checking' ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Zap className="text-yellow-500" />
        )}
      </Button>

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
