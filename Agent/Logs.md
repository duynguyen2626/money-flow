1/3 
## Error Type
Console Error

## Error Message
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.

  ...
    <InnerLayoutRouter url="/people/90..." tree={[...]} params={{id:"900000..."}} cacheNode={{lazyData:null, ...}} ...>
      <SegmentViewNode type="page" pagePath="/money-flo...">
        <SegmentTrieNode>
        <PeopleDetailPage>
          <TagFilterProvider>
            <div className="space-y-6">
              <section className="bg-white s...">
                <div>
                <div className="mt-6 space...">
                  <SheetSyncControls>
                  <DebtCycleTabs allCycles={[...]} accounts={[...]} categories={[...]} people={[...]} shops={[...]} ...>
                    <div className="space-y-4">
                      <div>
                      <div className="grid grid-...">
                        <div className="flex flex-...">
                          <div>
                          <div className="grid grid-...">
                            <AddTransactionDialog accounts={[...]} categories={[...]} people={[...]} shops={[...]} ...>
>                             <button
>                               type="button"
>                               className="inline-flex items-center justify-center rounded-md p-0 bg-transparent text-..."
>                               onMouseDown={undefined}
>                               onClick={function onClick}
>                               aria-label="Add Transaction"
>                             >
>                               <button
>                                 className="flex flex-col items-center justify-center gap-1 w-full p-2 rounded bg-red..."
>                               >
                            ...
                ...
      ...



    at button (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/debt-cycle-tabs.tsx:120:41)
    at Array.map (<anonymous>:null:null)
    at DebtCycleTabs (src/components/moneyflow/debt-cycle-tabs.tsx:78:38)
    at PeopleDetailPage (src\app\people\[id]\page.tsx:99:13)

## Code Frame
  118 |                                     defaultTag={cycle.tag === 'UNTAGGED' ? undefined : cycle.tag}
  119 |                                     triggerContent={
> 120 |                                         <button className="flex flex-col items-center justify-center gap-1 w-full p-2 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
      |                                         ^
  121 |                                             <Plus className="h-4 w-4" />
  122 |                                             <span className="text-xs font-medium">Debt</span>
  123 |                                         </button>

Next.js version: 16.0.3 (Turbopack)
2/3
## Error Type
Console Error

## Error Message
<button> cannot contain a nested <button>.
See this log for the ancestor stack trace.


    at button (<anonymous>:null:null)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:63:7)
    at <unknown> (src/components/moneyflow/debt-cycle-tabs.tsx:111:33)
    at Array.map (<anonymous>:null:null)
    at DebtCycleTabs (src/components/moneyflow/debt-cycle-tabs.tsx:78:38)
    at PeopleDetailPage (src\app\people\[id]\page.tsx:99:13)

## Code Frame
  61 |   return (
  62 |     <>
> 63 |       <button
     |       ^
  64 |         type="button"
  65 |         className={buttonClassName || defaultClassName}
  66 |         onMouseDown={onOpen}

Next.js version: 16.0.3 (Turbopack)
3/3
## Error Type
Recoverable Error

## Error Message
Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch


    at button (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/debt-cycle-tabs.tsx:120:41)
    at Array.map (<anonymous>:null:null)
    at DebtCycleTabs (src/components/moneyflow/debt-cycle-tabs.tsx:78:38)
    at PeopleDetailPage (src\app\people\[id]\page.tsx:99:13)

## Code Frame
  118 |                                     defaultTag={cycle.tag === 'UNTAGGED' ? undefined : cycle.tag}
  119 |                                     triggerContent={
> 120 |                                         <button className="flex flex-col items-center justify-center gap-1 w-full p-2 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
      |                                         ^
  121 |                                             <Plus className="h-4 w-4" />
  122 |                                             <span className="text-xs font-medium">Debt</span>
  123 |                                         </button>

Next.js version: 16.0.3 (Turbopack)
