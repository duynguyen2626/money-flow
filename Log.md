09:59:57.775 Running build in Washington, D.C., USA (East) – iad1
09:59:57.776 Build machine configuration: 2 cores, 8 GB
09:59:57.907 Cloning github.com/rei6868/money-flow-3 (Branch: sprint-3/service-bot-and-ui-redesign, Commit: dbd01bd)
09:59:58.440 Cloning completed: 533.000ms
09:59:59.104 Restored build cache from previous deployment (FgFPVwt9sYtddUajp5e92KHcAK5A)
09:59:59.915 Running "vercel build"
10:00:00.337 Vercel CLI 50.1.3
10:00:00.691 Installing dependencies...
10:00:02.284 
10:00:02.285 up to date in 1s
10:00:02.285 
10:00:02.285 154 packages are looking for funding
10:00:02.286   run `npm fund` for details
10:00:02.315 Detected Next.js version: 16.0.10
10:00:02.320 Running "npm run build"
10:00:02.432 
10:00:02.433 > money-flow-3@0.1.0 build
10:00:02.433 > next build
10:00:02.433 
10:00:03.472    ▲ Next.js 16.0.10 (Turbopack)
10:00:03.473 
10:00:03.504  ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
10:00:03.547    Creating an optimized production build ...
10:00:37.985 
10:00:37.986 > Build error occurred
10:00:37.991 Error: Turbopack build failed with 2 errors:
10:00:37.991 ./src/app/services/page.tsx:4:1
10:00:37.991 Module not found: Can't resolve '@/components/services/service-compact-card'
10:00:37.991 [0m [90m 2 |[39m [36mimport[39m { getPeople } [36mfrom[39m [32m'@/services/people.service'[39m
10:00:37.991  [90m 3 |[39m [36mimport[39m { [33mServiceTable[39m } [36mfrom[39m [32m'@/components/services/service-table'[39m
10:00:37.991 [31m[1m>[22m[39m[90m 4 |[39m [36mimport[39m { [33mServiceCompactCard[39m } [36mfrom[39m [32m'@/components/services/service-compact-card'[39m
10:00:37.992  [90m   |[39m [31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m
10:00:37.992  [90m 5 |[39m [36mimport[39m { [33mServicesFAB[39m } [36mfrom[39m [32m'@/components/services/services-fab'[39m
10:00:37.992  [90m 6 |[39m [36mimport[39m { [33mBot[39m } [36mfrom[39m [32m'lucide-react'[39m
10:00:37.992  [90m 7 |[39m[0m
10:00:37.992 
10:00:37.993 Import map: aliased to relative './src/components/services/service-compact-card' inside of [project]/
10:00:37.993 
10:00:37.993 
10:00:37.993 https://nextjs.org/docs/messages/module-not-found
10:00:37.993 
10:00:37.993 
10:00:37.993 ./src/app/services/page.tsx:3:1
10:00:37.993 Module not found: Can't resolve '@/components/services/service-table'
10:00:37.993 [0m [90m 1 |[39m [36mimport[39m { getServices } [36mfrom[39m [32m'@/services/service-manager'[39m
10:00:37.993  [90m 2 |[39m [36mimport[39m { getPeople } [36mfrom[39m [32m'@/services/people.service'[39m
10:00:37.993 [31m[1m>[22m[39m[90m 3 |[39m [36mimport[39m { [33mServiceTable[39m } [36mfrom[39m [32m'@/components/services/service-table'[39m
10:00:37.994  [90m   |[39m [31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m
10:00:37.994  [90m 4 |[39m [36mimport[39m { [33mServiceCompactCard[39m } [36mfrom[39m [32m'@/components/services/service-compact-card'[39m
10:00:37.994  [90m 5 |[39m [36mimport[39m { [33mServicesFAB[39m } [36mfrom[39m [32m'@/components/services/services-fab'[39m
10:00:37.994  [90m 6 |[39m [36mimport[39m { [33mBot[39m } [36mfrom[39m [32m'lucide-react'[39m[0m
10:00:37.994 
10:00:37.994 Import map: aliased to relative './src/components/services/service-table' inside of [project]/
10:00:37.994 
10:00:37.994 
10:00:37.994 https://nextjs.org/docs/messages/module-not-found
10:00:37.994 
10:00:37.994 
10:00:37.995     at <unknown> (./src/app/services/page.tsx:4:1)
10:00:37.995     at <unknown> (https://nextjs.org/docs/messages/module-not-found)
10:00:37.995     at <unknown> (./src/app/services/page.tsx:3:1)
10:00:37.995     at <unknown> (https://nextjs.org/docs/messages/module-not-found)
10:00:38.113 Error: Command "npm run build" exited with 1