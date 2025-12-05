## Error Type
Build Error

## Error Message
Ecmascript file had an error

## Build Output
./money-flow-3/src/lib/supabase/server.ts:2:1
Ecmascript file had an error
  1 | import { createServerClient, type CookieOptions } from '@supabase/ssr'
> 2 | import { cookies } from 'next/headers'
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  3 | import { Database } from '@/types/database.types'
  4 |
  5 | export function createClient() {

You're importing a component that needs "next/headers". That only works in a Server Component which is not supported in the pages/ directory. Read more: https://nextjs.org/docs/app/building-your-application/rendering/server-components

Import traces:
  Server Component:
    ./money-flow-3/src/lib/supabase/server.ts
    ./money-flow-3/src/services/bank.service.ts
    ./money-flow-3/src/app/batch/[id]/page.tsx

  Client Component Browser:
    ./money-flow-3/src/lib/supabase/server.ts [Client Component Browser]
    ./money-flow-3/src/services/batch.service.ts [Client Component Browser]
    ./money-flow-3/src/components/batch/link-sheet-dialog.tsx [Client Component Browser]
    ./money-flow-3/src/components/batch/batch-detail.tsx [Client Component Browser]
    ./money-flow-3/src/components/batch/batch-detail.tsx [Server Component]
    ./money-flow-3/src/app/batch/[id]/page.tsx [Server Component]

  Client Component SSR:
    ./money-flow-3/src/lib/supabase/server.ts [Client Component SSR]
    ./money-flow-3/src/services/batch.service.ts [Client Component SSR]
    ./money-flow-3/src/components/batch/link-sheet-dialog.tsx [Client Component SSR]
    ./money-flow-3/src/components/batch/batch-detail.tsx [Client Component SSR]
    ./money-flow-3/src/components/batch/batch-detail.tsx [Server Component]
    ./money-flow-3/src/app/batch/[id]/page.tsx [Server Component]

Next.js version: 16.0.7 (Turbopack)
