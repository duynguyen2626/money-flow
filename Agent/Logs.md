1/2 ## Error Type
Console Error

## Error Message
Error fetching monthly debt lines: {}


    at getPeople (src\services\people.service.ts:207:15)
    at Function.all (<anonymous>:1:21)
    at PeoplePage (src\app\people\page.tsx:12:64)
    at PeoplePage (<anonymous>:null:null)

## Code Frame
  205 |
  206 |     if (monthlyLinesError) {
> 207 |       console.error('Error fetching monthly debt lines:', monthlyLinesError)
      |               ^
  208 |     } else {
  209 |       ;(monthlyLines as any[] | null)?.forEach(line => {
  210 |         const accountId = line.account_id

Next.js version: 16.0.3 (Turbopack)

2/2 ## Error Type
Console Error

## Error Message
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <InnerScrollAndFocusHandler segmentPath={[...]} focusAndScrollRef={{apply:false, ...}}>
      <ErrorBoundary errorComponent={undefined} errorStyles={undefined} errorScripts={undefined}>
        <LoadingBoundary name="people/" loading={null}>
          <HTTPAccessFallbackBoundary notFound={undefined} forbidden={undefined} unauthorized={undefined}>
            <RedirectBoundary>
              <RedirectErrorBoundary router={{...}}>
                <InnerLayoutRouter url="/people" tree={[...]} params={{}} cacheNode={{lazyData:null, ...}} ...>
                  <SegmentViewNode type="page" pagePath="/money-flo...">
                    <SegmentTrieNode>
                    <PeoplePage>
                      <div className="space-y-6">
                        <section className="bg-white s...">
                          <div>
                          <PeopleGrid people={[...]} subscriptions={[...]} shops={[...]} accounts={[...]} ...>
                            <div className="space-y-3 ...">
                              <div>
                              <div className="relative m...">
                                <Search>
                                <input
                                  type="text"
                                  placeholder="Search people..."
                                  value=""
                                  onChange={function onChange}
                                  className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 pl-10 text..."
-                                 pwa2-uuid="EDITOR/input-7C1-F0E-70C75-C72"
-                                 pwa-fake-editor=""
                                >
                            ...
                  ...
                ...
      ...


Next.js version: 16.0.3 (Turbopack)
