1/2
## Error Type
Console Error

## Error Message
In HTML, <a> cannot be a descendant of <a>.
This will cause a hydration error.

  ...
    <BatchList batches={[...]}>
      <Tabs defaultValue="processing" className="w-full">
        <TabsProvider scope={undefined} baseId="radix-_r_4_" value="processing" ...>
          <Primitive.div dir="ltr" data-orientation="horizontal" className="w-full" ref={null}>
            <div dir="ltr" data-orientation="horizontal" className="w-full" ref={null}>
              <_c>
              <_c4 value="processing" className="mt-4">
                <TabsContent ref={null} className="mt-2 focus..." value="processing">
                  <Presence present={true}>
                    <Primitive.div data-state="active" data-orientation="horizontal" role="tabpanel" ...>
                      <div data-state="active" data-orientation="horizontal" role="tabpanel" ...>
                        <BatchGrid items={[...]}>
                          <div className="grid gap-4...">
                            <LinkComponent href="/batch/84e...">
>                             <a
>                               ref={function}
>                               onClick={function onClick}
>                               onMouseEnter={function onMouseEnter}
>                               onTouchStart={function onTouchStart}
>                               href="/batch/84e91be5-62ee-49b9-aa8f-cfef5c09de25"
>                             >
                                ...
                                  <_c8>
                                    <div ref={null} className="p-6 pt-0">
                                      <div>
                                      <div className="mt-3 pt-3 ..." onClick={function onClick}>
                                        <ExternalLink>
>                                       <a
>                                         href="https://script.google.com/macros/s/AKfycbyT7X18rO1rwso4xjwUCPE-w83Ew1P..."
>                                         target="_blank"
>                                         rel="noopener noreferrer"
>                                         className="hover:underline truncate max-w-[200px]"
>                                         title="https://script.google.com/macros/s/AKfycbyT7X18rO1rwso4xjwUCPE-w83Ew1..."
>                                       >
              ...



    at a (<anonymous>:null:null)
    at <unknown> (src/components/batch/batch-list.tsx:68:37)
    at Array.map (<anonymous>:null:null)
    at BatchGrid (src/components/batch/batch-list.tsx:35:20)
    at BatchList (src/components/batch/batch-list.tsx:94:21)
    at BatchPage (src\app\batch\page.tsx:16:13)

## Code Frame
  66 |                                 <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-blue-600" onClick={(e) => e.stopPropagation()}>
  67 |                                     <ExternalLink className="h-3 w-3 flex-shrink-0" />
> 68 |                                     <a
     |                                     ^
  69 |                                         href={batch.sheet_link}
  70 |                                         target="_blank"
  71 |                                         rel="noopener noreferrer"

Next.js version: 16.0.3 (Turbopack)

2/2
## Error Type
Console Error

## Error Message
<a> cannot contain a nested <a>.
See this log for the ancestor stack trace.


    at a (<anonymous>:null:null)
    at <unknown> (src/components/batch/batch-list.tsx:36:17)
    at Array.map (<anonymous>:null:null)
    at BatchGrid (src/components/batch/batch-list.tsx:35:20)
    at BatchList (src/components/batch/batch-list.tsx:94:21)
    at BatchPage (src\app\batch\page.tsx:16:13)

## Code Frame
  34 |         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  35 |             {items.map((batch) => (
> 36 |                 <Link key={batch.id} href={`/batch/${batch.id}`}>
     |                 ^
  37 |                     <Card className="hover:bg-accent transition-colors cursor-pointer group relative">
  38 |                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
  39 |                             <CardTitle className="text-base font-medium truncate pr-8">

Next.js version: 16.0.3 (Turbopack)
