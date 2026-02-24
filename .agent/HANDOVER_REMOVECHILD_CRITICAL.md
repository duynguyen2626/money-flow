# CRITICAL: removeChild DOM Error — Research & Fix Plan

**Created:** 2026-02-24
**Priority:** P0 — Blocks page loading across multiple routes
**Symptom:** `Cannot read properties of null (reading 'removeChild')` during `commitDeletionEffectsOnFiber`
**Stack:** Next.js 16.0.10, React 19, Turbopack, Supabase

---

## Error Signature

```
TypeError: Cannot read properties of null (reading 'removeChild')
  at commitDeletionEffectsOnFiber (react-dom)
  at recursivelyTraverseDeletionEffects (react-dom)
  at commitMutationEffectsOnFiber (react-dom)
```

**When it occurs:** Page navigation via left sidebar, month switching in batch page, any `router.push()` or `startTransition()` route change. Loading spinner renders, then React crashes during Fiber commit phase.

---

## Root Cause Analysis

This is a **DOM ownership conflict**: React's Fiber reconciler tries to `removeChild()` on a node that was already removed or moved by non-React code. In React 19's concurrent mode, this is fatal (not recoverable).

### 5 Contributing Factors (ordered by severity)

### 1. `use-app-favicon.ts` — Direct DOM mutation on every route change

**File:** `src/hooks/use-app-favicon.ts:112-120`

```tsx
// Called on EVERY pathname change via useEffect dependency
const existingIcons = document.querySelectorAll('link[rel="icon"], ...')
existingIcons.forEach(icon => {
    if (icon.parentNode) icon.parentNode.removeChild(icon) // LINE 115
})
document.head.appendChild(link)       // LINE 119
document.head.appendChild(appleLink)  // LINE 120
```

**Why it breaks:** Next.js metadata system also manages `<link rel="icon">` in `<head>`. When this hook runs during a route transition, it removes nodes that React's Fiber tree still references. On next reconciliation, React tries to `removeChild` on the same node — it's already gone.

**Called from:** `src/components/moneyflow/app-layout-v2.tsx:30` — runs on every single page load.

**FIX:**
- Option A: Remove the hook entirely — rely on Next.js `generateMetadata()` per page (already used in `batch/mbb/page.tsx:9-17`)
- Option B: Use React 19's `<link>` component in the head instead of direct DOM manipulation
- Option C: At minimum, guard with `requestAnimationFrame` to defer after React commit

---

### 2. Portal container lookup via `document.getElementById` (sidebar + transition overlay)

**File:** `src/components/navigation/sidebar-nav-v2.tsx:172-173`
```tsx
useEffect(() => {
    setPortalContainer(document.getElementById('portal-root') || document.body)
}, [])
```

**File:** `src/components/navigation/page-transition-overlay.tsx:55-56`
```tsx
useEffect(() => {
    setPortalContainer(document.getElementById('transition-root') || document.body)
}, [])
```

**Why it breaks:** During HMR or concurrent React renders, the `<div id="portal-root">` defined in `layout.tsx:55` may be recreated. The portal holds a stale reference to the OLD div. React tries to unmount children from a div that's no longer in the DOM tree.

**Root containers defined in:** `src/app/layout.tsx:55-56`
```tsx
<div id="portal-root" suppressHydrationWarning />
<div id="transition-root" suppressHydrationWarning />
```

**FIX:**
- Use React `useRef` + callback ref pattern instead of `getElementById`
- Or use `createPortal(content, document.body)` directly (simpler, always valid)
- Or use Radix Portal which handles this correctly

---

### 3. `suppressHydrationWarning` masking real mismatches

**File:** `src/app/layout.tsx:46-47`
```tsx
<html lang="en" suppressHydrationWarning className="h-full w-full overflow-hidden">
<body className={...} suppressHydrationWarning>
```

**Why it breaks:** Browser extensions (React DevTools, password managers, ad blockers) inject `<script>`, `<style>`, or `<div>` into `<body>`. With `suppressHydrationWarning`, React silently adopts the server HTML including extension-injected nodes. When those nodes get removed by the extension, React's Fiber tree still has references to them → `removeChild` fails.

**FIX:**
- Keep `suppressHydrationWarning` on `<html>` (needed for theme)
- Remove it from `<body>` — let hydration warnings surface so they can be fixed
- Add Error Boundary around `{children}` to catch and recover

---

### 4. `isMounted` pattern creating hydration mismatch window

**Files:**
- `src/components/moneyflow/app-layout-v2.tsx:26,66-67`
- `src/components/ui/custom-tooltip.tsx:47,58`
- `src/components/ui/select.tsx:39,46`

```tsx
const [isMounted, setIsMounted] = useState(false)
useEffect(() => { setIsMounted(true) }, [])
if (!isMounted) return <div suppressHydrationWarning />
```

**Why it breaks:** Server renders `<div>` placeholder. Client immediately renders full component tree. React detects mismatch, strips the server tree, re-renders. During strip, children of the placeholder are already gone → `removeChild(null)`.

**FIX:**
- Use `React.lazy()` + `Suspense` instead of isMounted pattern
- Or use `next/dynamic` with `{ ssr: false }` for truly client-only components
- These approaches are supported by React 19's reconciler

---

### 5. `useTransition` + `router.push` during active Radix portals

**File:** `src/components/batch/batch-page-client-v2.tsx:131-138`
```tsx
startTransition(() => {
    router.push(`/batch/${bankType.toLowerCase()}?month=${month}&period=${currentPeriod}`)
})
```

**Why it breaks:** During the transition, React keeps the old tree visible while preparing the new tree. If Radix UI portals (Tooltip, Popover, Dialog) are open, they have DOM nodes outside the main tree. When the old tree is committed for deletion, React tries to remove portal children that may have already been cleaned up by Radix's own lifecycle.

**FIX:**
- Close all portals before navigation: `setTooltipOpen(false)` before `startTransition`
- Or wrap page content in an Error Boundary that catches and re-renders on `removeChild` errors
- Long-term: Audit all Radix Portal usage, ensure they're unmounted before route transitions

---

## Recommended Fix Priority

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 1 | Remove/replace `use-app-favicon.ts` DOM manipulation | Highest — every route change | Small |
| 2 | Replace `getElementById` portal lookups with refs | High — sidebar + overlay | Medium |
| 3 | Add Error Boundary around `{children}` in layout | Safety net for all cases | Small |
| 4 | Replace `isMounted` with `next/dynamic` | Medium — multiple components | Medium |
| 5 | Close portals before `startTransition` navigation | Medium — batch page specific | Small |

---

## How to Reproduce

1. Open app, navigate to `/batch/mbb`
2. Click any sidebar nav item (e.g., Transactions, People)
3. While loading spinner shows, the `removeChild` error fires
4. Page may or may not render after error
5. Sometimes requires multiple rapid navigations to trigger

---

## Files to Modify

```
src/hooks/use-app-favicon.ts              — Remove direct DOM mutation
src/components/navigation/sidebar-nav-v2.tsx:172-173 — Fix portal lookup
src/components/navigation/page-transition-overlay.tsx:55-56 — Fix portal lookup
src/app/layout.tsx:47                      — Remove body suppressHydrationWarning
src/components/moneyflow/app-layout-v2.tsx:26-67 — Replace isMounted pattern
src/components/ui/custom-tooltip.tsx:47-58 — Replace isMounted pattern
src/components/batch/batch-page-client-v2.tsx:131-138 — Guard transitions
```

## Test After Fix

- Navigate between all sidebar pages rapidly (click 5 pages in 3 seconds)
- Open batch page → switch months rapidly
- Open tooltips → navigate away while tooltip is visible
- Refresh page, verify no console errors
- Check all pages load: `/batch/mbb`, `/transactions`, `/people`, `/cashback`
