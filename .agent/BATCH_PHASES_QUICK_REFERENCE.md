# Quick Reference: Batch Phases System

## User Flow (End-to-End)

### Creating a Phase
```
/batch/mbb page → Masters button → Manage Phases (toggle)
→ Fill form (Name, Type=Before|After, Cutoff Day)
→ Click Add → Toast success + auto-select new phase
```

### Deleting a Phase
```
/batch/mbb page → Masters button → Manage Phases
→ Click X on phase badge → AlertDialog appears
→ Confirm → Spinner on button → Phase disappears
(No page reload - pure optimistic update)
```

### Phase Usage in Master List
```
Master items grouped by phase (Before 15, After 15, etc.)
Each phase tab shows:
- Items count
- Progress bar (confirmed/total)
- Funding status
- Step 1-3 flow within phase
```

## Technical Reference

### Phase Data Model
```typescript
type BatchPhase = {
  id: string                           // UUID
  bank_type: 'MBB' | 'VIB'            // Which card
  label: string                        // Display name (e.g., "Before 15")
  period_type: 'before' | 'after'     // Cutoff type
  cutoff_day: number                  // Day of month (1-31)
  sort_order: number                  // Display order
  is_active: boolean                  // Soft-delete flag
  created_at: string                  // ISO timestamp
  updated_at: string                  // ISO timestamp
}
```

### Server Actions (src/actions/batch-phases.actions.ts)

#### `listBatchPhasesAction(bankType)`
```typescript
// Get active phases for checklist display
const result = await listBatchPhasesAction('MBB')
// → { success: true, data: BatchPhase[] }
```

#### `listAllBatchPhasesAction(bankType)`
```typescript
// Get all active phases for management UI
const result = await listAllBatchPhasesAction('MBB')
// → { success: true, data: BatchPhase[] }
```

#### `createBatchPhaseAction(params)`
```typescript
const result = await createBatchPhaseAction({
  bankType: 'MBB',
  label: 'Before 15',
  periodType: 'before',
  cutoffDay: 15,
  sortOrder: 0  // optional, auto-assigned
})
// → { success: true, data: BatchPhase }
```

#### `deleteBatchPhaseAction(id, options?)`
```typescript
// Standard delete (with page revalidate)
const result = await deleteBatchPhaseAction(phaseId)

// Optimistic delete (no page reload)
const result = await deleteBatchPhaseAction(phaseId, { revalidate: false })
// → { success: true, data: Phase }
```

#### `updateBatchPhaseAction(id, updates)`
```typescript
const result = await updateBatchPhaseAction(phaseId, {
  label: 'New Label',
  cutoffDay: 20,
  // other fields optional
})
// → { success: true, data: BatchPhase }
```

### UI Components

#### BatchMasterSlide Component Location
```
/batch/mbb → Masters button → Opens SheetContent
→ Shows BatchMasterSlide component
```

#### State Management
```typescript
const [phases, setPhases] = useState<any[]>([])
const [showPhaseSetup, setShowPhaseSetup] = useState(false)  // Toggle panel
const [deletingId, setDeletingId] = useState<string | null>(null)  // Delete spinner
const [deleteConfirm, setDeleteConfirm] = useState<{...}>  // AlertDialog state
```

#### Delete Flow Code Pattern
```typescript
function handleDeleteClick(id: string, label: string, itemCount: number) {
  if (itemCount > 0) {
    toast.error(`Can't delete phase with items`)
    return
  }
  setDeleteConfirm({ id, label, itemCount })  // Open dialog
}

async function confirmDelete() {
  if (!deleteConfirm) return
  
  setDeletingId(deleteConfirm.id)
  setDeleteConfirm(null)  // Close dialog
  
  // Call server action WITHOUT revalidate
  const result = await deleteBatchPhaseAction(deleteConfirm.id, { 
    revalidate: false  // 🔑 No full page reload
  })
  
  if (result.success) {
    toast.success(`Deleted "${deleteConfirm.label}"`)
    await loadPhases()  // Refresh just the list
  }
  
  setDeletingId(null)  // Clear spinner
}
```

## Common Tasks

### "Add phase filtering by bank type"
1. Phases already filtered by `bankType` in `listAllBatchPhasesAction`
2. No changes needed - already scoped to MBB/VIB

### "Allow editing phase cutoff_day"
1. Add form field in "Manage Phases" section
2. Call `updateBatchPhaseAction` instead of create
3. Refresh via `loadPhases()`

### "Show phase count on Masters button"
1. In batch-page-client-v2.tsx, load phases on mount
2. Add badge to Masters button with phase count
3. Update when phases change

### "Reorder phases with drag-drop"
1. Implement DnD context (use @dnd-kit)
2. Call `reorderBatchPhasesAction(orderedIds)` on drop
3. Server updates `sort_order` for each phase

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Deleted phase still visible | Phase hard-deleted instead of soft | Check `is_active = false` in DB |
| Full page reload on delete | `revalidate: true` was used | Use `{ revalidate: false }` in slide-out |
| Phase form values reset | Component re-rendering | Check `useEffect` dependencies |
| AlertDialog not showing | `deleteConfirm` state not set | Verify `handleDeleteClick()` called |
| Phases don't load on open | `useEffect` dependency wrong | Check `[open, bankType]` deps |

## Performance Notes

- Phase list loads when slide-out opens (lazy load)
- No polling - manual refresh via `loadPhases()`
- Soft-delete (flag-based) is O(1) vs hard-delete
- Only active phases in queries (improves query speed)

## Database Query Examples

### Get all active phases for bank
```sql
SELECT * FROM batch_phases 
WHERE bank_type = 'MBB' AND is_active = true 
ORDER BY sort_order ASC
```

### Soft-delete phase
```sql
UPDATE batch_phases 
SET is_active = false, updated_at = now() 
WHERE id = '...'
```

### Hard-delete disabled to preserve history
```sql
-- Not recommended - use soft-delete instead
-- DELETE FROM batch_phases WHERE id = '...'
```

