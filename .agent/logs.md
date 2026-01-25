## Error Type
Console Error

## Error Message
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.

  ...
    <Popover open={false} onOpenChange={function bound dispatchSetState}>
      <Popper __scopePopper={{Popper:[...]}}>
        <PopperProvider scope={{Popper:[...]}} anchor={null} onAnchorChange={function bound dispatchSetState}>
          <PopoverProvider scope={undefined} contentId="radix-_r_v_" triggerRef={{current:null}} open={false} ...>
            <PopoverTrigger asChild={true}>
              <PopperAnchor asChild={true} __scopePopper={{Popper:[...]}}>
                <Primitive.div asChild={true} ref={function}>
                  <Primitive.div.Slot ref={function}>
                    <Primitive.div.SlotClone ref={function}>
                      <Primitive.button type="button" aria-haspopup="dialog" aria-expanded={false} ...>
                        <Primitive.button.Slot type="button" aria-haspopup="dialog" aria-expanded={false} ...>
                          <Primitive.button.SlotClone type="button" aria-haspopup="dialog" aria-expanded={false} ...>
                            <_c variant="outline" size="sm" className="h-9 w-[140..." ...>
>                             <button
>                               className="inline-flex items-center whitespace-nowrap text-sm ring-offset-background t..."
>                               ref={function}
>                               onMouseEnter={function handleMouseEnter}
>                               onMouseLeave={function handleMouseLeave}
>                               type="button"
>                               aria-haspopup="dialog"
>                               aria-expanded={false}
>                               aria-controls="radix-_r_v_"
>                               data-state="closed"
>                               onClick={function handleEvent}
>                             >
                                <div>
                                <div className="flex items...">
>                                 <button
>                                   onClick={function onClick}
>                                   className="hover:bg-current hover:bg-opacity-10 rounded p-0.5 transition-colors"
>                                 >
                                  ...
            ...



    at button (<anonymous>:null:null)
    at QuickFilterDropdown (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/transactions-v2/header/QuickFilterDropdown.tsx:92:15)
    at DesktopFilters (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/transactions-v2/header/TransactionHeader.tsx:126:7)
    at TransactionHeader (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/transactions-v2/header/TransactionHeader.tsx:215:9)
    at TransactionsPageV2 (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/transactions-v2/TransactionsPageV2.tsx:337:7)
    at TransactionsV2Page (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/transactions-v2/page.tsx:25:5)

## Code Frame
  90 |           <div className="flex items-center gap-0.5 shrink-0">
  91 |             {value && (
> 92 |               <button
     |               ^
  93 |                 onClick={(e) => {
  94 |                   e.stopPropagation()
  95 |                   onValueChange(undefined)

Next.js version: 16.0.10 (Turbopack)

## Error Type
Console Error

## Error Message
<button> cannot contain a nested <button>.
See this log for the ancestor stack trace.


    at button (<anonymous>:null:null)
    at _c (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/ui/button.tsx:46:7)
    at QuickFilterDropdown (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/transactions-v2/header/QuickFilterDropdown.tsx:66:9)
    at QuickFilterDropdown (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/transactions-v2/header/QuickFilterDropdown.tsx:65:7)
    at DesktopFilters (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/transactions-v2/header/TransactionHeader.tsx:126:7)
    at TransactionHeader (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/transactions-v2/header/TransactionHeader.tsx:215:9)
    at TransactionsPageV2 (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/components/transactions-v2/TransactionsPageV2.tsx:337:7)
    at TransactionsV2Page (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/transactions-v2/page.tsx:25:5)

## Code Frame
  44 |     const Comp = asChild ? Slot : "button"
  45 |     return (
> 46 |       <Comp
     |       ^
  47 |         className={cn(buttonVariants({ variant, size, className }))}
  48 |         ref={ref}
  49 |         {...props}

Next.js version: 16.0.10 (Turbopack)
