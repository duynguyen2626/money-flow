import * as React from 'react'

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number
  max?: number
  indicatorClassName?: string
}

const classNames = (...classes: Array<string | undefined | null | false>) =>
  classes.filter(Boolean).join(' ')

export function Progress({ value = 0, max = 100, className, indicatorClassName, ...props }: ProgressProps) {
  const normalized =
    typeof value === 'number' && typeof max === 'number' && max > 0
      ? Math.min(100, Math.max(0, (value / max) * 100))
      : 0

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={classNames('h-3 w-full rounded-full bg-slate-200', className)}
      {...props}
    >
      <div
        className={classNames("h-full rounded-full bg-emerald-500 transition-all", indicatorClassName)}
        style={{ width: `${normalized}%` }}
      />
    </div>
  )
}
