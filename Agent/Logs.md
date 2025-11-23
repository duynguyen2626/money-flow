Console Error

A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:
- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

See more info here: https://nextjs.org/docs/messages/react-hydration-error


  ...
    <SegmentViewNode type="page" pagePath="/Library/M...">
      <SegmentTrieNode>
      <AccountsPage>
        <section className="space-y-4">
          <header>
          ...
            <div className="flex flex-...">
              <div>
              <div className="flex items...">
                <div>
                <CreateAccountDialog collateralAccounts={[...]}>
                  <Dialog open={false} onOpenChange={function onOpenChange}>
                    <DialogProvider scope={undefined} triggerRef={{current:null}} contentRef={{current:null}} ...>
                      <DialogTrigger asChild={true}>
                        <Primitive.button type="button" aria-haspopup="dialog" aria-expanded={false} ...>
                          <Primitive.button.Slot type="button" aria-haspopup="dialog" aria-expanded={false} ...>
                            <Primitive.button.SlotClone type="button" aria-haspopup="dialog" aria-expanded={false} ...>
                              <_c type="button" aria-haspopup="dialog" aria-expanded={false} ...>
                                <button
                                  className="inline-flex items-center justify-center rounded-md text-sm font-semibold ..."
                                  type="button"
                                  aria-haspopup="dialog"
                                  aria-expanded={false}
+                                 aria-controls="radix-_R_aclritqlb_"
-                                 aria-controls="radix-_R_19klritqlb_"
                                  data-state="closed"
                                  onClick={function handleEvent}
                                  ref={function}
                                >
+                                 Add New Account
                      ...
../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/ui/button.tsx (36:7) @ _c


  34 |     const Comp = asChild ? Slot : 'button'
  35 |     return (
> 36 |       <Comp
     |       ^
  37 |         className={cn(
  38 |           'inline-flex items-center justify-center rounded-md text-sm font-semibold transition',
  39 |           variants[variant],
Call Stack
25

Show 19 ignore-listed frame(s)
button
<anonymous>
_c
../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/ui/button.tsx (36:7)
CreateAccountDialog
../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/create-account-dialog.tsx (145:9)
CreateAccountDialog
../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/create-account-dialog.tsx (144:7)
AccountList
../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-list.tsx (144:11)
AccountsPage
../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/accounts/page.tsx (57:7)│ > fix cho phép Rate (%) nhập  được thập phân, ví dụ 0.5 (hiểu là 0.5%)      