 ⨯ ./src/app/globals.css
Error evaluating Node.js code
Error: Cannot find module '@jridgewell/gen-mapping'
Require stack:
- C:\Users\nam.thanhnguyen\Github\money-flow-3\node_modules\@jridgewell\remapping\dist\remapping.umd.js
- C:\Users\nam.thanhnguyen\Github\money-flow-3\node_modules\@tailwindcss\node\dist\index.js
- C:\Users\nam.thanhnguyen\Github\money-flow-3\node_modules\@tailwindcss\postcss\dist\index.js
- C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\build\chunks\[root-of-the-server]__51225daf._.js
- C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\build\chunks\[turbopack]_runtime.js
- C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\build\postcss.js
    [at Module._resolveFilename (node:internal/modules/cjs/loader:1207:15)]
    [at Module._load (node:internal/modules/cjs/loader:1038:27)]
    [at Module.require (node:internal/modules/cjs/loader:1289:19)]
    [at require (node:internal/modules/helpers:182:18)]
    [at C:\Users\nam.thanhnguyen\Github\money-flow-3\node_modules\@jridgewell\remapping\dist\remapping.umd.js:3:21]
    [at Object.<anonymous> (C:\Users\nam.thanhnguyen\Github\money-flow-3\node_modules\@jridgewell\remapping\dist\remapping.umd.js:17:3)]
    [at Module._compile (node:internal/modules/cjs/loader:1521:14)]
    [at Module._extensions..js (node:internal/modules/cjs/loader:1623:10)]
    [at Module.load (node:internal/modules/cjs/loader:1266:32)]
    [at Module._load (node:internal/modules/cjs/loader:1091:12)]

Import trace:
  Client Component Browser:
    ./src/app/globals.css [Client Component Browser]
    ./src/app/layout.tsx [Server Component]



./node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.mjs:1:1
Module not found: Can't resolve '@floating-ui/dom'
> 1 | import { computePosition, arrow as arrow$2, autoPlacement as autoPlacement$1, flip as flip$1, hide as hide$1, inline as inline$1, limitShift as limitShift$1, offset as offset$1, shift as shift$1, size as size$1 } from '@floating-ui/dom';
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  2 | export { autoUpdate, computePosition, detectOverflow, getOverflowAncestors, platform } from '@floating-ui/dom';
  3 | import * as React from 'react';
  4 | import { useLayoutEffect } from 'react';



Import traces:
  Client Component Browser:
    ./node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.mjs [Client Component Browser]
    ./node_modules/@radix-ui/react-popper/dist/index.mjs [Client Component Browser]
    ./node_modules/@radix-ui/react-tooltip/dist/index.mjs [Client Component Browser]
    ./src/components/ui/custom-tooltip.tsx [Client Component Browser]
    ./src/components/ui/custom-tooltip.tsx [Server Component]
    ./src/app/layout.tsx [Server Component]

  Client Component SSR:
    ./node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.mjs [Client Component SSR]
    ./node_modules/@radix-ui/react-popper/dist/index.mjs [Client Component SSR]
    ./node_modules/@radix-ui/react-tooltip/dist/index.mjs [Client Component SSR]
    ./src/components/ui/custom-tooltip.tsx [Client Component SSR]
    ./src/components/ui/custom-tooltip.tsx [Server Component]
    ./src/app/layout.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found



./node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.mjs:2:1
Module not found: Can't resolve '@floating-ui/dom'
  1 | import { computePosition, arrow as arrow$2, autoPlacement as autoPlacement$1, flip as flip$1, hide as hide$1, inline as inline$1, limitShift as limitShift$1, offset as offset$1, shift as shift$1, size as size$1 } from '@floating-ui/dom';
> 2 | export { autoUpdate, computePosition, detectOverflow, getOverflowAncestors, platform } from '@floating-ui/dom';
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  3 | import * as React from 'react';
  4 | import { useLayoutEffect } from 'react';
  5 | import * as ReactDOM from 'react-dom';



Import traces:
  Client Component Browser:
    ./node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.mjs [Client Component Browser]
    ./node_modules/@radix-ui/react-popper/dist/index.mjs [Client Component Browser]
    ./node_modules/@radix-ui/react-tooltip/dist/index.mjs [Client Component Browser]
    ./src/components/ui/custom-tooltip.tsx [Client Component Browser]
    ./src/components/ui/custom-tooltip.tsx [Server Component]
    ./src/app/layout.tsx [Server Component]

  Client Component SSR:
    ./node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.mjs [Client Component SSR]
    ./node_modules/@radix-ui/react-popper/dist/index.mjs [Client Component SSR]
    ./node_modules/@radix-ui/react-tooltip/dist/index.mjs [Client Component SSR]
    ./src/components/ui/custom-tooltip.tsx [Client Component SSR]
    ./src/components/ui/custom-tooltip.tsx [Server Component]
    ./src/app/layout.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found


 ○ Compiling /_error ...
 GET /people 500 in 40s (compile: 37.7s, proxy.ts: 1834ms, render: 516ms)