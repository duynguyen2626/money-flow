 ⨯ ./src/components/moneyflow/add-transaction-dialog.tsx:4:1
Module not found: Can't resolve '@/components/ui/button'
  2 |
  3 | import { useState } from 'react'
> 4 | import { Button } from '@/components/ui/button'
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  5 | import {
  6 |   Dialog,
  7 |   DialogContent,

Import map: aliased to relative './src/components/ui/button' inside of [project]/


Import trace:
  Server Component:
    ./src/components/moneyflow/add-transaction-dialog.tsx
    ./src/app/page.tsx

https://nextjs.org/docs/messages/module-not-found



./src/components/moneyflow/transaction-form.tsx:6:1
Module not found: Can't resolve '@/components/ui/button'
  4 | import { useForm } from 'react-hook-form'
  5 | import { z } from 'zod'
> 6 | import { Button } from '@/components/ui/button'
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  7 | import {
  8 |   Form,
  9 |   FormControl,

Import map: aliased to relative './src/components/ui/button' inside of [project]/


Import traces:
  Client Component Browser:
    ./src/components/moneyflow/transaction-form.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

  Client Component SSR:
    ./src/components/moneyflow/transaction-form.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found



./src/components/moneyflow/transaction-form.tsx:24:1
Module not found: Can't resolve '@/components/ui/calendar'
  22 | import { CalendarIcon } from 'lucide-react'
  23 | import { format } from 'date-fns'
> 24 | import { Calendar } from '@/components/ui/calendar'
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  25 | import {
  26 |   Select,
  27 |   SelectContent,

Import map: aliased to relative './src/components/ui/calendar' inside of [project]/


Import traces:
  Client Component Browser:
    ./src/components/moneyflow/transaction-form.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

  Client Component SSR:
    ./src/components/moneyflow/transaction-form.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found



./src/components/moneyflow/add-transaction-dialog.tsx:5:1
Module not found: Can't resolve '@/components/ui/dialog'
   3 | import { useState } from 'react'
   4 | import { Button } from '@/components/ui/button'
>  5 | import {
     | ^^^^^^^^
>  6 |   Dialog,
     | ^^^^^^^^^
>  7 |   DialogContent,
     | ^^^^^^^^^
>  8 |   DialogHeader,
     | ^^^^^^^^^
>  9 |   DialogTitle,
     | ^^^^^^^^^
> 10 |   DialogTrigger,
     | ^^^^^^^^^
> 11 | } from '@/components/ui/dialog'
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  12 | import { TransactionForm } from './transaction-form'
  13 | import { useRouter } from 'next/navigation'
  14 | import { Account, Category } from '@/types/moneyflow.types'

Import map: aliased to relative './src/components/ui/dialog' inside of [project]/


Import trace:
  Server Component:
    ./src/components/moneyflow/add-transaction-dialog.tsx
    ./src/app/page.tsx

https://nextjs.org/docs/messages/module-not-found



./src/components/moneyflow/transaction-form.tsx:7:1
Module not found: Can't resolve '@/components/ui/form'
   5 | import { z } from 'zod'
   6 | import { Button } from '@/components/ui/button'
>  7 | import {
     | ^^^^^^^^
>  8 |   Form,
     | ^^^^^^^
>  9 |   FormControl,
     | ^^^^^^^
> 10 |   FormField,
     | ^^^^^^^
> 11 |   FormItem,
     | ^^^^^^^
> 12 |   FormLabel,
     | ^^^^^^^
> 13 |   FormMessage,
     | ^^^^^^^
> 14 | } from '@/components/ui/form'
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  15 | import { Input } from '@/components/ui/input'
  16 | import {
  17 |   Popover,

Import map: aliased to relative './src/components/ui/form' inside of [project]/


Import traces:
  Client Component Browser:
    ./src/components/moneyflow/transaction-form.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

  Client Component SSR:
    ./src/components/moneyflow/transaction-form.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found



./src/components/moneyflow/transaction-form.tsx:15:1
Module not found: Can't resolve '@/components/ui/input'
  13 |   FormMessage,
  14 | } from '@/components/ui/form'
> 15 | import { Input } from '@/components/ui/input'
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  16 | import {
  17 |   Popover,
  18 |   PopoverContent,

Import map: aliased to relative './src/components/ui/input' inside of [project]/


Import traces:
  Client Component Browser:
    ./src/components/moneyflow/transaction-form.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

  Client Component SSR:
    ./src/components/moneyflow/transaction-form.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found



./src/components/moneyflow/transaction-form.tsx:16:1
Module not found: Can't resolve '@/components/ui/popover'
  14 | } from '@/components/ui/form'
  15 | import { Input } from '@/components/ui/input'
> 16 | import {
     | ^^^^^^^^
> 17 |   Popover,
     | ^^^^^^^^^^
> 18 |   PopoverContent,
     | ^^^^^^^^^^
> 19 |   PopoverTrigger,
     | ^^^^^^^^^^
> 20 | } from '@/components/ui/popover'
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  21 | import { cn } from '@/lib/utils'
  22 | import { CalendarIcon } from 'lucide-react'
  23 | import { format } from 'date-fns'

Import map: aliased to relative './src/components/ui/popover' inside of [project]/


Import traces:
  Client Component Browser:
    ./src/components/moneyflow/transaction-form.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

  Client Component SSR:
    ./src/components/moneyflow/transaction-form.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found



./src/components/moneyflow/transaction-form.tsx:25:1
Module not found: Can't resolve '@/components/ui/select'
  23 | import { format } from 'date-fns'
  24 | import { Calendar } from '@/components/ui/calendar'
> 25 | import {
     | ^^^^^^^^
> 26 |   Select,
     | ^^^^^^^^^
> 27 |   SelectContent,
     | ^^^^^^^^^
> 28 |   SelectItem,
     | ^^^^^^^^^
> 29 |   SelectTrigger,
     | ^^^^^^^^^
> 30 |   SelectValue,
     | ^^^^^^^^^
> 31 | } from '@/components/ui/select'
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  32 | import { createTransaction } from '@/services/transaction.service'
  33 | import { Account, Category } from '@/types/moneyflow.types'
  34 | import { useMemo } from 'react'

Import map: aliased to relative './src/components/ui/select' inside of [project]/


Import traces:
  Client Component Browser:
    ./src/components/moneyflow/transaction-form.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

  Client Component SSR:
    ./src/components/moneyflow/transaction-form.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found



./src/components/moneyflow/transaction-form.tsx:35:1
Module not found: Can't resolve '@/components/ui/use-toast'
  33 | import { Account, Category } from '@/types/moneyflow.types'
  34 | import { useMemo } from 'react'
> 35 | import { useToast } from '@/components/ui/use-toast'
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  36 |
  37 | const formSchema = z.object({
  38 |   occurred_at: z.date(),

Import map: aliased to relative './src/components/ui/use-toast' inside of [project]/


Import traces:
  Client Component Browser:
    ./src/components/moneyflow/transaction-form.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

  Client Component SSR:
    ./src/components/moneyflow/transaction-form.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found



./src/components/moneyflow/transaction-form.tsx:21:1
Module not found: Can't resolve '@/lib/utils'
  19 |   PopoverTrigger,
  20 | } from '@/components/ui/popover'
> 21 | import { cn } from '@/lib/utils'
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  22 | import { CalendarIcon } from 'lucide-react'
  23 | import { format } from 'date-fns'
  24 | import { Calendar } from '@/components/ui/calendar'

Import map: aliased to relative './src/lib/utils' inside of [project]/


Import traces:
  Client Component Browser:
    ./src/components/moneyflow/transaction-form.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component Browser]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

  Client Component SSR:
    ./src/components/moneyflow/transaction-form.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Client Component SSR]
    ./src/components/moneyflow/add-transaction-dialog.tsx [Server Component]
    ./src/app/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found


 GET / 500 in 4.0s (compile: 3.8s, render: 178ms)