# Implementation Progress - Session 3

## ✅ COMPLETED (50%)

### 1. **ConfirmDialog Component** ✅
- Created reusable `ConfirmDialog.tsx` component
- Replaces native `window.confirm()` with styled dialog
- Supports custom title, description, confirm/cancel text
- Variant support (default/destructive)
- **File:** `src/components/common/ConfirmDialog.tsx`

### 2. **Duplicate Check Dialog** ✅
- Replaced native confirm in `add-item-dialog.tsx`
- Shows custom ConfirmDialog when duplicate detected
- Displays duplicate item details (name, STK, amount)
- User can confirm or cancel
- **File:** `src/components/batch/add-item-dialog.tsx`

### 3. **Bank Name Auto-Disable** ✅
- Bank name input is disabled when bank code is selected
- Gray background when disabled
- Auto-filled from bank_mappings
- **File:** `src/components/batch/add-item-dialog.tsx`

### 4. **Database Migration** ✅
- Fixed `bank_mappings` table schema
- Added missing columns: bank_code, bank_name, short_name
- Inserted Vietnamese banks data
- **File:** `supabase/migrations/20251127230900_fix_bank_mappings_columns.sql`

---

## ⏳ REMAINING (50%)

### 5. **Bank Code Search (Combobox)** ❌
**Status:** Not started
**What's needed:**
- Replace `<Select>` with searchable Combobox
- Add search input that filters banks
- Auto-focus on search when dropdown opens
- Filter by bank_code OR bank_name

**Implementation:**
```tsx
// Need to install/use Combobox from shadcn/ui
import { Combobox } from '@/components/ui/combobox'

// Add search state
const [searchTerm, setSearchTerm] = useState('')

// Filter banks
const filteredBanks = bankMappings.filter(b => 
    b.bank_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.bank_name.toLowerCase().includes(searchTerm.toLowerCase())
)

// Render Combobox instead of Select
<Combobox
    value={bankCode}
    onChange={(value) => form.setValue('bank_code', value)}
    searchValue={searchTerm}
    onSearchChange={setSearchTerm}
    options={filteredBanks.map(b => ({
        value: b.bank_code,
        label: `${b.bank_code} - ${b.short_name}`
    }))}
/>
```

**File to modify:** `src/components/batch/add-item-dialog.tsx`
**Estimate:** 30 minutes

---

### 6. **Auto Clone Day Field** ❌
**Status:** Not started
**What's needed:**
- Find or create batch create dialog
- Add checkbox "Is Template"
- When checked, show "Auto Clone Day" number input (1-31)
- Save to `batches.auto_clone_day` and `batches.is_template`

**Implementation:**
```tsx
const [isTemplate, setIsTemplate] = useState(false)
const [autoCloneDay, setAutoCloneDay] = useState<number | null>(null)

// In form:
<FormField name="is_template">
    <Checkbox checked={isTemplate} onChange={setIsTemplate} />
    <FormLabel>Template (auto-clone monthly)</FormLabel>
</FormField>

{isTemplate && (
    <FormField name="auto_clone_day">
        <FormLabel>Auto Clone Day (1-31)</FormLabel>
        <Input 
            type="number" 
            min={1} 
            max={31} 
            value={autoCloneDay || ''} 
            onChange={(e) => setAutoCloneDay(Number(e.target.value))}
        />
    </FormField>
)}
```

**File to find/create:** `src/components/batch/batch-create-dialog.tsx` or similar
**Estimate:** 45 minutes

---

### 7. **Import Tab Restructure** ❌
**Status:** Not started
**What's needed:**
- Move import functionality from batch detail page to `/batch/import`
- Create new route `/batch/import/page.tsx`
- UI: Upload file + Select batch + Batch tag input
- After import, redirect to `/batch`

**Implementation:**
```tsx
// Create: src/app/(dashboard)/batch/import/page.tsx
'use client'

export default function BatchImportPage() {
    const [file, setFile] = useState<File | null>(null)
    const [batchId, setBatchId] = useState('')
    const [batchTag, setBatchTag] = useState('')

    const handleImport = async () => {
        const text = await file?.text()
        const result = await importBatchItemsFromExcel(batchId, text, batchTag)
        toast.success(`Imported ${result.success} items`)
        router.push('/batch')
    }

    return (
        <div className="p-6">
            <h1>Import Batch Items</h1>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
            <Input placeholder="Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
            <Input placeholder="Batch Tag" value={batchTag} onChange={(e) => setBatchTag(e.target.value)} />
            <Button onClick={handleImport}>Import</Button>
        </div>
    )
}
```

**Files to create:** `src/app/(dashboard)/batch/import/page.tsx`
**Estimate:** 1 hour

---

### 8. **Update items-table.tsx with ConfirmDialog** ❌
**Status:** Not started
**What's needed:**
- Replace `confirm()` in delete handler
- Replace `confirm()` in void handler
- Use ConfirmDialog component

**Implementation:**
```tsx
const [showConfirm, setShowConfirm] = useState(false)
const [confirmAction, setConfirmAction] = useState<() => void>(() => {})
const [confirmMessage, setConfirmMessage] = useState('')

async function handleDelete(id: string) {
    setConfirmMessage('Are you sure you want to delete this item?')
    setConfirmAction(() => async () => {
        await deleteBatchItemAction(id, batchId)
    })
    setShowConfirm(true)
}

// At end of component:
<ConfirmDialog
    open={showConfirm}
    onOpenChange={setShowConfirm}
    title="Confirm"
    description={confirmMessage}
    onConfirm={confirmAction}
/>
```

**File to modify:** `src/components/batch/items-table.tsx`
**Estimate:** 30 minutes

---

## 📊 SUMMARY

### Completed: 4/8 tasks (50%)
- ✅ ConfirmDialog component
- ✅ Duplicate check dialog
- ✅ Bank name auto-disable
- ✅ Database migration

### Remaining: 4/8 tasks (50%)
- ❌ Bank code search (Combobox)
- ❌ Auto clone day field
- ❌ Import tab restructure
- ❌ items-table ConfirmDialog

### Total Estimated Time Remaining: ~2.5 hours

---

## 🚀 NEXT STEPS

1. **Immediate:** Implement Bank Code Search (Combobox) - 30 min
2. **Then:** Update items-table with ConfirmDialog - 30 min
3. **Then:** Add Auto Clone Day field - 45 min
4. **Finally:** Import Tab Restructure - 1 hour

---

## 📝 NOTES

- All database changes are complete and working
- ConfirmDialog is reusable for all future confirm dialogs
- Bank name auto-disable is working correctly
- Need to check if Combobox component exists in shadcn/ui setup
