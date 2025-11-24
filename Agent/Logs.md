11:26:45.470 Running build in Washington, D.C., USA (East) – iad1
11:26:45.470 Build machine configuration: 2 cores, 8 GB
11:26:45.594 Cloning github.com/rei6868/money-flow-3 (Branch: phase-17-and-17.5-shops-module-ui-english-translation-logic-refinement, Commit: 067524b)
11:26:45.868 Cloning completed: 273.000ms
11:26:47.479 Restored build cache from previous deployment (29THsnwdDpbQDqqhyNReKudEX9nM)
11:26:48.143 Running "vercel build"
11:26:48.546 Vercel CLI 48.10.5
11:26:48.874 Installing dependencies...
11:26:50.088 
11:26:50.089 up to date in 1s
11:26:50.090 
11:26:50.090 148 packages are looking for funding
11:26:50.090   run `npm fund` for details
11:26:50.120 Detected Next.js version: 16.0.3
11:26:50.124 Running "npm run build"
11:26:50.231 
11:26:50.232 > money-flow-3@0.1.0 build
11:26:50.232 > next build
11:26:50.232 
11:26:51.301    ▲ Next.js 16.0.3 (Turbopack)
11:26:51.301 
11:26:51.367    Creating an optimized production build ...
11:27:05.504  ✓ Compiled successfully in 13.6s
11:27:05.509    Running TypeScript ...
11:27:14.849 Failed to compile.
11:27:14.850 
11:27:14.850 ./money-flow-3/src/app/people/[id]/page.tsx:77:26
11:27:14.850 Type error: Property 'shops' is missing in type '{ allCycles: DebtByTagAggregatedResult[]; debtAccount: { id: string; name: string; current_balance: number; owner_id: string | null; avatar_url: string | null; sheet_link: string | null; }; ... 4 more ...; isExpanded: true; }' but required in type '{ allCycles: DebtByTagAggregatedResult[]; debtAccount: DebtAccount; accounts: Account[]; categories: Category[]; people: Person[]; ... 4 more ...; onSettleSuccess?: (() => void | Promise<...>) | undefined; }'.
11:27:14.850 
11:27:14.850 [0m [90m 75 |[39m                             [33m<[39m[33mh2[39m className[33m=[39m[32m"text-lg font-semibold"[39m[33m>[39m[33mKy[39m no ([33mDebt[39m [33mCycles[39m)[33m<[39m[33m/[39m[33mh2[39m[33m>[39m
11:27:14.850  [90m 76 |[39m                         [33m<[39m[33m/[39m[33mdiv[39m[33m>[39m
11:27:14.850 [31m[1m>[22m[39m[90m 77 |[39m                         [33m<[39m[33mDebtCycleFilter[39m
11:27:14.850  [90m    |[39m                          [31m[1m^[22m[39m
11:27:14.850  [90m 78 |[39m                             allCycles[33m=[39m{debtCycles}
11:27:14.850  [90m 79 |[39m                             debtAccount[33m=[39m{person}
11:27:14.850  [90m 80 |[39m                             accounts[33m=[39m{accounts}[0m
11:27:14.886 Next.js build worker exited with code: 1 and signal: null
11:27:14.920 Error: Command "npm run build" exited with 1