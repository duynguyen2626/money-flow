## Error Type
Build Error

## Error Message
Module not found: Can't resolve '@dnd-kit/core'

## Build Output
./money-flow-3/src/components/moneyflow/column-customizer.tsx:4:1
Module not found: Can't resolve '@dnd-kit/core'
   2 |
   3 | import React, { useState } from "react";
>  4 | import {
     | ^^^^^^^^
>  5 |     DndContext,
     | ^^^^^^^^^^^^^^^
>  6 |     closestCenter,
     | ^^^^^^^^^^^^^^^
>  7 |     KeyboardSensor,
     | ^^^^^^^^^^^^^^^
>  8 |     PointerSensor,
     | ^^^^^^^^^^^^^^^
>  9 |     useSensor,
     | ^^^^^^^^^^^^^^^
> 10 |     useSensors,
     | ^^^^^^^^^^^^^^^
> 11 |     DragEndEvent,
     | ^^^^^^^^^^^^^^^
> 12 | } from "@dnd-kit/core";
     | ^^^^^^^^^^^^^^^^^^^^^^^^
  13 | import {
  14 |     arrayMove,
  15 |     SortableContext,

Import traces:
  Client Component Browser:
    ./money-flow-3/src/components/moneyflow/column-customizer.tsx [Client Component Browser]
    ./money-flow-3/src/components/moneyflow/unified-transaction-table.tsx [Client Component Browser]
    ./money-flow-3/src/components/transactions/UnifiedTransactionsPage.tsx [Client Component Browser]
    ./money-flow-3/src/components/transactions/UnifiedTransactionsPage.tsx [Server Component]
    ./money-flow-3/src/app/transactions/page.tsx [Server Component]

  Client Component SSR:
    ./money-flow-3/src/components/moneyflow/column-customizer.tsx [Client Component SSR]
    ./money-flow-3/src/components/moneyflow/unified-transaction-table.tsx [Client Component SSR]
    ./money-flow-3/src/components/transactions/UnifiedTransactionsPage.tsx [Client Component SSR]
    ./money-flow-3/src/components/transactions/UnifiedTransactionsPage.tsx [Server Component]
    ./money-flow-3/src/app/transactions/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found

Next.js version: 16.0.10 (Turbopack)
