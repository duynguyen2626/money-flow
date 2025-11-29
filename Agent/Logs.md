1/2
## Error Type
Console Error

## Error Message
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.

  ...
    <Tooltip delayDuration={200}>
      <Popper __scopePopper={{Popper:[...]}}>
        <PopperProvider scope={{Popper:[...]}} anchor={null} onAnchorChange={function bound dispatchSetState}>
          <TooltipProvider scope={undefined} contentId="radix-_r_3_" open={false} stateAttribute="closed" trigger={null} ...>
            <TooltipTrigger asChild={true}>
              <PopperAnchor asChild={true} __scopePopper={{Popper:[...]}}>
                <Primitive.div asChild={true} ref={function}>
                  <Primitive.div.Slot ref={function}>
                    <Primitive.div.SlotClone ref={function}>
                      <Primitive.button aria-describedby={undefined} data-state="closed" asChild={true} ref={function} ...>
                        <Primitive.button.Slot aria-describedby={undefined} data-state="closed" ...>
                          <Primitive.button.SlotClone aria-describedby={undefined} data-state="closed" ...>
                            <AddTransactionDialog accounts={[...]} categories={[...]} people={[...]} shops={[...]} ...>
>                             <button
>                               type="button"
>                               className="inline-flex items-center justify-center rounded-md p-0 bg-transparent text-..."
>                               onMouseDown={function stopCardNavigation}
>                               onClick={function onClick}
>                               aria-label="Add Transaction"
>                             >
                                <_c size="icon" variant="ghost" className="h-8 w-8 ro...">
>                                 <button
>                                   className="inline-flex items-center justify-center text-sm font-semibold transitio..."
>                                   ref={null}
>                                 >
            ...



    at button (<anonymous>:null:null)
    at _c (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/ui/button.tsx:36:7)
    at AccountCard (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-card.tsx:243:21)
    at <unknown> (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-list.tsx:205:19)
    at Array.map (<anonymous>:null:null)
    at <unknown> (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-list.tsx:204:35)
    at Array.map (<anonymous>:null:null)
    at AccountList (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-list.tsx:192:20)
    at AccountsPage (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/accounts/page.tsx:59:7)

## Code Frame
  34 |     const Comp = asChild ? Slot : 'button'
  35 |     return (
> 36 |       <Comp
     |       ^
  37 |         className={cn(
  38 |           'inline-flex items-center justify-center rounded-md text-sm font-semibold transition',
  39 |           variants[variant],

Next.js version: 16.0.3 (Turbopack)

2/2
## Error Type
Console Error

## Error Message
<button> cannot contain a nested <button>.
See this log for the ancestor stack trace.


    at button (<anonymous>:null:null)
    at AddTransactionDialog (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/add-transaction-dialog.tsx:63:7)
    at AccountCard (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-card.tsx:238:17)
    at CustomTooltip (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/ui/custom-tooltip.tsx:48:9)
    at ActionButton (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-card.tsx:106:5)
    at AccountCard (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-card.tsx:237:15)
    at <unknown> (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-list.tsx:205:19)
    at Array.map (<anonymous>:null:null)
    at <unknown> (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-list.tsx:204:35)
    at Array.map (<anonymous>:null:null)
    at AccountList (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/moneyflow/account-list.tsx:192:20)
    at AccountsPage (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/accounts/page.tsx:59:7)

## Code Frame
  61 |   return (
  62 |     <>
> 63 |       <button
     |       ^
  64 |         type="button"
  65 |         className={buttonClassName || defaultClassName}
  66 |         onMouseDown={onOpen}

Next.js version: 16.0.3 (Turbopack)
