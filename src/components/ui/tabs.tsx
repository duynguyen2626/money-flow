import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ')

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'w-full rounded-full border border-slate-200 bg-slate-100 p-1',
        className
      )}
      {...props}
    />
  )
)
TabsList.displayName = 'TabsList'

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex flex-1 items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition',
      'border border-transparent bg-slate-100 text-slate-500 shadow-sm shadow-transparent',
      'data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-2 focus-visible:outline-none', className)}
    {...props}
  />
))
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, TabsTrigger, TabsContent }
