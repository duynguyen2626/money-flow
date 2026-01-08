## Error Type
Console Error

## Error Message
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.

  ...
    <SegmentViewNode type="page" pagePath="/money-flo...">
      <SegmentTrieNode>
      <PeopleDetailPage>
        <TagFilterProvider>
          <div className="flex flex-...">
            <div>
            <div className="flex-1 min...">
              <PersonDetailTabs accounts={[...]} categories={[...]} people={[...]} shops={[...]} personId="eccde148-a..." ...>
                <div className="flex flex-...">
                  <div>
                  <div className="px-4 pb-8 ...">
                    <div className="flex flex-...">
                      <div className="flex flex-...">
                        <div>
                        <div className="flex flex-...">
                          <SmartFilterBar>
                          <div>
                          <div className="flex items...">
                            <AddTransactionDialog accounts={[...]} categories={[...]} people={[...]} shops={[...]} ...>
>                             <button
>                               type="button"
>                               className="inline-flex items-center justify-center rounded-md p-0 bg-transparent text-..."
>                               onMouseDown={undefined}
>                               onClick={function onClick}
>                               aria-label="Add Transaction"
>                             >
                                <_c variant="outline" size="sm" className="h-9 text-r...">
>                                 <button
>                                   className="inline-flex items-center justify-center whitespace-nowrap text-sm font-..."
>                                   ref={null}
>                                 >
                            ...
                          ...
                      ...
          ...
    ...



    at button (<anonymous>:null:null)
    at _c (src/components/ui/button.tsx:46:7)
    at PersonDetailTabs (src/components/people/person-detail-tabs.tsx:243:45)
    at PeopleDetailPage (src\app\people\[id]\page.tsx:182:11)

## Code Frame
  44 |     const Comp = asChild ? Slot : "button"
  45 |     return (
> 46 |       <Comp
     |       ^
  47 |         className={cn(buttonVariants({ variant, size, className }))}
  48 |         ref={ref}
  49 |         {...props}

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
<button> cannot contain a nested <button>.
See this log for the ancestor stack trace.


    at button (<anonymous>:null:null)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:386:7)
    at PersonDetailTabs (src/components/people/person-detail-tabs.tsx:235:37)
    at PeopleDetailPage (src\app\people\[id]\page.tsx:182:11)

## Code Frame
  384 |   return (
  385 |     <>
> 386 |       <Comp
      |       ^
  387 |         type={asChild ? undefined : "button"}
  388 |         className={buttonClassName || defaultClassName}
  389 |         onMouseDown={onOpen}

Next.js version: 16.0.10 (Turbopack)
