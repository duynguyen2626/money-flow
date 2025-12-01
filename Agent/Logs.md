1/3
## Error Type
Console Error

## Error Message
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.

  ...
    <LoadingBoundary name="/" loading={null}>
      <HTTPAccessFallbackBoundary notFound={<SegmentViewNode>} forbidden={undefined} unauthorized={undefined}>
        <HTTPAccessFallbackErrorBoundary pathname="/" notFound={<SegmentViewNode>} forbidden={undefined} ...>
          <RedirectBoundary>
            <RedirectErrorBoundary router={{...}}>
              <InnerLayoutRouter url="/" tree={[...]} params={{}} cacheNode={{lazyData:null, ...}} segmentPath={[...]} ...>
                <SegmentViewNode type="page" pagePath="/money-flo...">
                  <SegmentTrieNode>
                  <Home>
                    <div className="max-w-7xl ...">
                      <div>
                      <div>
                      <div className="grid grid-...">
                        <div>
                        <div className="lg:col-spa...">
                          <div className="mb-2 flex ...">
                            <h2>
                            <div className="flex items...">
                              <AddTransactionDialog accounts={[...]} categories={[...]} people={[...]} shops={[...]} ...>
>                               <button
>                                 type="button"
>                                 className="inline-flex items-center justify-center rounded-md p-0 bg-transparent tex..."
>                                 onMouseDown={undefined}
>                                 onClick={function onClick}
>                                 aria-label="Add Transaction"
>                               >
>                                 <button
>                                   className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 hov..."
>                                 >
                              ...
                          ...
                      ...
                ...
              ...



    at button (<anonymous>:null:null)
    at Home (src\app\page.tsx:144:19)

## Code Frame
  142 |                 defaultType="expense"
  143 |                 triggerContent={
> 144 |                   <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-medium">
      |                   ^
  145 |                     <Plus className="h-3 w-3" />
  146 |                     Exp
  147 |                   </button>

Next.js version: 16.0.3 (Turbopack)

2/3 ## Error Type
Console Error

## Error Message
<button> cannot contain a nested <button>.
See this log for the ancestor stack trace.


    at button (<anonymous>:null:null)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:63:7)
    at Home (src\app\page.tsx:137:15)

## Code Frame
  61 |   return (
  62 |     <>
> 63 |       <button
     |       ^
  64 |         type="button"
  65 |         className={buttonClassName || defaultClassName}
  66 |         onMouseDown={onOpen}

Next.js version: 16.0.3 (Turbopack)

3/3 ## Error Type
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
    at Home (src\app\page.tsx:144:19)

## Code Frame
  142 |                 defaultType="expense"
  143 |                 triggerContent={
> 144 |                   <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-medium">
      |                   ^
  145 |                     <Plus className="h-3 w-3" />
  146 |                     Exp
  147 |                   </button>

Next.js version: 16.0.3 (Turbopack)
