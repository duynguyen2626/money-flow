# Handover: Batch Phase Dynamic Refactor + Project Understanding

**Created:** 2026-02-24
**Branch:** `fix/p0-removechild-navigation`
**Status:** Ready for Migration — removeChild error FIXED, ready to run batch_phases migration

---

## Project Understanding Prompt

> Use this prompt when starting a new agent session to quickly onboard before coding.

```
Read the following files in order to understand the Money Flow 3 project:

1. .agent/AGENT_CONTEXT.md — Full project overview, stack, architecture, conventions
2. .agent/HANDOVER_REMOVECHILD_CRITICAL.md — P0 DOM bug blocking navigation
3. .agent/HANDOVER_BATCH_PHASE_DYNAMIC.md — This file (current work status)
4. .github/copilot-instructions.md — Coding conventions and UI design rules

Then read the key source files:
5. src/app/layout.tsx — Root layout with portal containers + suppressHydrationWarning
6. src/components/moneyflow/app-layout-v2.tsx — App shell with sidebar + isMounted pattern
7. src/components/navigation/sidebar-nav-v2.tsx — Left nav with portal flyouts
8. src/components/batch/batch-page-client-v2.tsx — Batch page wrapper with useTransition
9. src/components/batch/BatchMasterChecklist.tsx — Main checklist (current refactor target)
10. src/actions/batch-checklist.actions.ts — Server action fetching checklist + phases data
11. src/actions/batch-phases.actions.ts — CRUD for batch_phases table
12. src/actions/batch-speed.actions.ts — Sync/fund/confirm batch items

After reading, you should understand:
- The app is a Vietnamese personal finance tracker with batch payment management
- Next.js 16 App Router + React 19 + Supabase + Tailwind 4 + Shadcn UI
- The batch page has a checklist view grouped by dynamic phases (before/after cutoff day)
- There is a P0 removeChild bug that must be fixed before UI work continues
```

---

## What Was Being Built: Dynamic N-Phase System

### Goal
Replace the hardcoded 2-phase system (before/after day 15) with a configurable N-phase system where users can create any number of phases per bank type, each with a custom cutoff day and before/after period type.

### Database
**Table:** `batch_phases` (already created in Supabase via SQL Editor)

```sql
CREATE TABLE batch_phases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_type TEXT NOT NULL CHECK (bank_type IN ('MBB', 'VIB')),
    label TEXT NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('before', 'after')),
    cutoff_day INT NOT NULL CHECK (cutoff_day >= 1 AND cutoff_day <= 31),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

Seeded with 4 default phases: MBB Before 15, MBB After 15, VIB Before 15, VIB After 15.

**NOT done:** `ALTER TABLE batch_master_items ADD COLUMN phase_id` — the table doesn't have this column yet. Code uses fallback matching via `cutoff_period` -> `phase.period_type`.

### Completed Steps (1-5)

| Step | Description | Status |
|------|-------------|--------|
| 1 | `batch_phases` table + server actions (CRUD) | Done |
| 2 | `getChecklistDataAction` fetches phases alongside master items/batches | Done |
| 3 | `BatchMasterChecklist` uses `effectivePhases` pattern (DB phases or synthetic fallback) | Done |
| 4 | Phase tabs/accordion in checklist UI, PhaseSummaryStrip | Done |
| 5 | Due date per phase in ChecklistItemRow + "Wrong phase" mismatch badge | Done |
| 5B | PhaseSetupPanel — inline collapsible panel with Select dropdown + DayOfMonthPicker | Done |

### Key Code Patterns

**`effectivePhases` fallback** (`BatchMasterChecklist.tsx:83-86`):
```tsx
const effectivePhases = phases.length > 0 ? phases : [
    { id: 'before', bank_type: bankType, label: 'Phase 1: Before', period_type: 'before', cutoff_day: 15, sort_order: 0, is_active: true },
    { id: 'after', bank_type: bankType, label: 'Phase 2: After', period_type: 'after', cutoff_day: 15, sort_order: 1, is_active: true }
]
```

**Phase matching in `refreshChecklist()`** — Master items without `phase_id` get matched by `cutoff_period` -> `phase.period_type`:
```tsx
if (!phaseId) {
    const matchedPhase = activePhases.find(p => p.period_type === master.cutoff_period && p.bank_type === bankType)
    if (matchedPhase) phaseId = matchedPhase.id
}
```

**Isolated `batch_phases` query** (`batch-checklist.actions.ts:43-60`) — wrapped in its own try/catch so it never blocks the main data load.

**Focus handler guard** (`BatchMasterChecklist.tsx:50-67`) — uses `loadedOnce` ref to prevent stale closure + race condition during initial load.

### Fixes Applied During This Session

1. **Removed `router.refresh()` from `handleFastRefresh`** — was causing Maximum call stack size exceeded
2. **Added `effectivePhases` fallback** — blank page when `phases = []`
3. **Isolated `batch_phases` query** in server action with inner try/catch
4. **Fixed focus handler** — replaced stale closure with inline `.then()` + `loadedOnce` guard
5. **Added try/catch to `handleFastRefresh`**
6. **Fixed `package.json`** dev script — removed invalid `--no-turbopack` flag

### What's Next (when removeChild is fixed)

1. **Test Phase Setup UI** — Open batch page, click "Phases" button, create/delete phases
2. **Test phase assignment** — After creating phases, sync master items and verify they distribute correctly
3. **Add `phase_id` column to `batch_master_items`** — Currently using `cutoff_period` fallback matching
4. **Add `phase_id` column to `batches`** — For direct phase-batch linking
5. **Settings page integration** — The batch settings page should show phase management too
6. **Phase-aware batch sync** — `bulkInitializeFromMasterAction` already accepts `phaseId` param

---

## Files Modified (uncommitted)

```
src/actions/batch-checklist.actions.ts    — Isolated batch_phases query + try/catch
src/actions/batch-speed.actions.ts        — phaseId param in bulkInitialize + batch insert
src/actions/batch-phases.actions.ts       — NEW: CRUD server actions for batch_phases
src/components/batch/BatchMasterChecklist.tsx — Dynamic phases, effectivePhases, PhaseSetupPanel
src/components/batch/BatchMasterItemSlide.tsx — (modified in previous sessions)
src/components/batch/BatchMasterManager.tsx   — (modified in previous sessions)
src/components/batch/batch-page-client-v2.tsx — Year/month Combobox selectors, sync button
src/components/batch/batch-settings-page.tsx  — (modified in previous sessions)
src/services/batch-master.service.ts       — Added phase_id to BatchMasterItem type
supabase/migrations/20260223_create_batch_phases.sql — Migration (user ran manually)
package.json                               — Fixed dev script
```

---

## Known Issues

1. **P0: `removeChild` DOM error** — See `HANDOVER_REMOVECHILD_CRITICAL.md`. Blocks testing of all UI changes. Must fix first.
2. **`batch_master_items` missing `phase_id` column** — Code handles this via fallback but should be added for proper phase assignment.
3. **`batches` table missing `phase_id` column** — `bulkInitializeFromMasterAction` tries to insert `phase_id: null`, which works since null is accepted.
4. **`--no-turbopack` was invalid** — Fixed in package.json. Dev server now runs with default bundler (Turbopack is actually the default in Next.js 16).
