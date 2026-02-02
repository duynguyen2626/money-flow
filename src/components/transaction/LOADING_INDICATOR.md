# Loading Indicator System

## Overview
Global loading indicator với spinning animation hiển thị khi thực hiện các thao tác transaction.

## Features

### 1. **Global Loading State**
- `isGlobalLoading`: Boolean state trong `UnifiedTransactionsPage`
- `loadingMessage`: Dynamic message hiển thị theo thao tác

### 2. **UI Design**
```tsx
<div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999]">
  <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 rounded-full shadow-xl">
    <Spinner /> {/* White border spinner */}
    <span className="text-white font-semibold">{loadingMessage}</span>
  </div>
</div>
```

**Key Properties:**
- **Fixed position** - Luôn hiển thị dù scroll
- **High z-index (9999)** - Nổi trên mọi element
- **Gradient blue background** - Nổi bật, professional
- **Spinning animation** - Cho biết đang xử lý

### 3. **Supported Operations**

| Operation | Message | Trigger |
|-----------|---------|---------|
| **Add** | "Creating transaction..." | Submit new transaction form |
| **Edit** | "Updating transaction..." | Submit edit form |
| **Duplicate** | "Duplicating transaction..." | Submit duplicate form |
| **Void** | "Voiding transaction..." | Confirm void dialog |
| **Delete** | "Deleting transaction..." | Confirm delete dialog |

### 4. **Implementation Flow**

**Add/Edit/Duplicate:**
```tsx
handleSlideSubmissionStart() {
  setIsSlideOpen(false)  // Close slide immediately
  setLoadingMessage(...)  // Set appropriate message
  setIsGlobalLoading(true)  // Show loading
}

// Server action executes...

handleSlideSubmissionEnd() {
  setIsGlobalLoading(false)  // Hide loading
  router.refresh()  // Refresh data
}
```

**Void:**
```tsx
confirmVoid() {
  setLoadingMessage('Voiding transaction...')
  setIsGlobalLoading(true)
  // Execute void action
  // Finally: setIsGlobalLoading(false)
}
```

**Delete:**
```tsx
handleSingleDeleteConfirm() {
  setLoadingMessage('Deleting transaction...')
  setIsGlobalLoading(true)
  // Execute delete action
  // Finally: setIsGlobalLoading(false)
}
```

## Props Chain

```
UnifiedTransactionsPage
  ├── isGlobalLoading (state)
  ├── loadingMessage (state)
  └── passes to ↓

UnifiedTransactionTable
  ├── setIsGlobalLoading (prop)
  ├── setLoadingMessage (prop)
  └── calls when: delete

TransactionSlideV2
  ├── onSubmissionStart (callback)
  └── onSubmissionEnd (callback)
```

## UX Benefits

### Before (Issue)
❌ Local dev: Shows "Rendering..." (Next.js dev indicator)
❌ Production: Nothing shows - user confused
❌ No feedback khi void/delete
❌ User không biết BE đang xử lý

### After (Fixed)
✅ Consistent indicator trên cả local & production
✅ Fixed position - luôn visible khi scroll
✅ Dynamic message - rõ ràng đang làm gì
✅ Spinning animation - visual feedback
✅ Professional blue gradient - matches brand
✅ Covers all operations: add, edit, duplicate, void, delete

## Browser Compatibility
- Fixed positioning: ✅ All modern browsers
- CSS animations: ✅ All modern browsers
- z-index: ✅ Works everywhere
- Backdrop blur: ⚠️ Not used (for performance)

## Performance
- No backdrop blur để tránh lag
- Simple CSS animation (no JS animation loop)
- State updates batched by React
- Minimal re-renders (only when loading state changes)

## Future Enhancements
- [ ] Add progress bar for batch operations
- [ ] Toast notification after completion
- [ ] Error state with red color
- [ ] Success animation before hiding
- [ ] Keyboard shortcut to cancel (ESC)
