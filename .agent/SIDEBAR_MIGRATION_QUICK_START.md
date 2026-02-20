# Quick Migration Guide - Enhanced Sidebar (v2)

## 🚀 Three Ways to Deploy

### **METHOD A: Full Stack Replacement (RECOMMENDED)**

Best for: Complete redesign, fresh start

```typescript
// Find your root layout file (usually src/app/layout.tsx)

// STEP 1: Update import
-import { AppLayout } from '@/components/moneyflow/app-layout'
+import { AppLayoutV2 } from '@/components/moneyflow/app-layout-v2'

// STEP 2: Use in layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        -<AppLayout>{children}</AppLayout>
        +<AppLayoutV2>{children}</AppLayoutV2>
      </body>
    </html>
  )
}

// STEP 3: Test navigation
// - Test sidebar collapse
// - Click recent items
// - Search functionality
// - Mobile menu
```

**Pros**: Clean, no confusion, all features work  
**Cons**: Bigger change, requires testing  
**Time**: 10 minutes to implement, 30 minutes to test

---

### **METHOD B: Gradual Component Replacement**

Best for: Conservative approach, keep some old code

```typescript
// In your existing app-layout.tsx

// STEP 1: Add new imports
import { SidebarSearch } from '@/components/navigation/sidebar-search'
import { UnifiedRecentSidebar } from '@/components/navigation/unified-recent-sidebar'
import { SidebarNavV2 } from '@/components/navigation/sidebar-nav-v2'

// STEP 2: Add state for search
const [searchQuery, setSearchQuery] = useState('')

// STEP 3: Replace old search + recent + nav with new components
<aside className="...your sidebar styles...">
  {/* New components */}
  <SidebarSearch onSearchChange={setSearchQuery} />
  <UnifiedRecentSidebar isCollapsed={sidebarCollapsed} searchQuery={searchQuery} />
  <SidebarNavV2 isCollapsed={sidebarCollapsed} onCollapseChange={toggleSidebar} />
  
  {/* Keep old footer if you like */}
  {/* ...footer code... */}
</aside>

// STEP 4: Remove old navigation code
// - Delete renderNavItem function
// - Delete recentItems/otherItems logic
```

**Pros**: Keep existing code you trust  
**Cons**: More code to modify, potential conflicts  
**Time**: 20 minutes to implement, 30 minutes to test

---

### **METHOD C: Parallel Operation (SAFE TEST)**

Best for: Testing before committing

```typescript
// Create an environment variable to switch between versions
// .env.local
NEXT_PUBLIC_USE_NEW_SIDEBAR=true

// In layout.tsx
import { AppLayout } from '@/components/moneyflow/app-layout'
import { AppLayoutV2 } from '@/components/moneyflow/app-layout-v2'

const LayoutComponent = process.env.NEXT_PUBLIC_USE_NEW_SIDEBAR 
  ? AppLayoutV2 
  : AppLayout

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <LayoutComponent>{children}</LayoutComponent>
      </body>
    </html>
  )
}

// STEP 1: Run with NEXT_PUBLIC_USE_NEW_SIDEBAR=false (old layout)
// STEP 2: Test everything works
// STEP 3: Change to true (new layout)
// STEP 4: Test everything again
// STEP 5: If OK, change to permanent use of AppLayoutV2
```

**Pros**: Zero risk, can flip back instantly  
**Cons**: Temporary code, needs cleanup  
**Time**: 15 minutes to implement, 45 minutes to test thoroughly

---

## 📋 Pre-Migration Checklist

```
☑️ Run pnpm install (in case dependencies changed)
☑️ Backup current app-layout.tsx (git should handle this)
☑️ Read SIDEBAR_REDESIGN_V2.md (features overview)
☑️ Choose migration method above
☑️ Have test cases ready:
  ☑️ Open pages from sidebar
  ☑️ Click recent items
  ☑️ Try search
  ☑️ Collapse/expand sidebar
  ☑️ Test on mobile (if possible)
  ☑️ Test expand Accounts/People sections
```

---

## 🧪 Testing After Migration

### Desktop Testing
```
1. Navigate to each main menu item:
   ✓ Dashboard
   ✓ Accounts
   ✓ Transactions
   ✓ Categories
   ✓ People
   ✓ Cashback
   etc.

2. Test Recent Section:
   ✓ Shows ~2 accounts + 2 people
   ✓ Clicking doesn't cause jumping
   ✓ Recent items update when you visit them

3. Test Sidebar Features:
   ✓ Click collapse button
   ✓ Icons + tooltips appear
   ✓ Click expand button
   ✓ Full text appears again

4. Test Search:
   ✓ Type in search box
   ✓ Menu items filter
   ✓ Yellow highlighting appears
   ✓ Click clear (X) button
   ✓ Search clears

5. Test Expandable Sections:
   ✓ Click chevron next to "Accounts"
   ✓ Recent accounts appear below
   ✓ Click account item → navigates
   ✓ Same for "People"
```

### Mobile Testing
```
1. Open on phone/tablet
2. Click menu button (☰)
3. Drawer opens from left
4. All navigation items visible
5. Recent section visible
6. Search works
7. Can navigate to pages
8. Close drawer
9. Menu button has correct appearance
```

### Console Check
```bash
# Open DevTools → Console
# Should see:
✓ No errors
✓ No warnings
✓ No 404s for images/icons
✓ No localStorage errors
```

---

## 🔧 Common Issues & Fixes

### Issue: Search box not appearing
**Fix**: Check `isCollapsed` prop, search hides when sidebar collapsed

### Issue: Recent items showing old data
**Fix**: LocalStorage might have stale data
```typescript
// Clear and refresh:
localStorage.clear()
location.reload()
```

### Issue: Icons have wrong colors
**Fix**: Check nav-icon-system.tsx color definitions
```typescript
// Verify the color prop is passed correctly:
<NavIcon icon={Landmark} color="blue" />
```

### Issue: Nested items not showing
**Fix**: Make sure ChevronDown icon is visible
- Check CSS `duration-300` animation runs
- Verify `max-h` values are correct

### Issue: Mobile menu not working
**Fix**: Ensure Sheet component from shadcn/ui is installed
```bash
npx shadcn-ui@latest add sheet
```

---

## 📊 Before & After Comparison

| Feature | OLD | NEW |
|---------|-----|-----|
| Recent jumping | ❌ Yes, annoying | ✅ Fixed, no jumping |
| Fixed menu | ❌ Auto-hides items | ✅ Always visible |
| Colors | ⚪ All same | 🌈 Unique per item |
| Search | ❌ None | ✅ With highlighting |
| Nesting | ⚠️ Confusing | ✅ Clear hierarchy |
| Mobile | ⚠️ Basic | ✅ Full featured |
| Code | 📖 Complex | 📄 Clean, modular |

---

## 💾 LocalStorage Keys

New components use these localStorage keys:

```javascript
// Sidebar collapse state
localStorage.getItem('sidebar-collapsed-v2')  // boolean

// Old keys (still in use by AppLayout):
localStorage.getItem('sidebar-collapsed')      // old version
localStorage.getItem('recent-nav-hrefs')       // tracking
```

**Cleanup tip**: If switching from old to new, can safely delete old keys:
```javascript
localStorage.removeItem('sidebar-collapsed')
localStorage.removeItem('recent-nav-hrefs')
// New version uses 'sidebar-collapsed-v2'
```

---

## 🎯 Next Steps

1. **Choose migration method** (A, B, or C above)
2. **Make the changes** (15-30 minutes)
3. **Run tests** (check console, test navigation)
4. **Commit with message**:
   ```
   feat: Replace sidebar with enhanced v2 navigation
   - Added colored icons
   - Fixed recent items jumping
   - Implemented search functionality  
   - Improved nested item display
   ```
5. **Deploy** to staging first, then production
6. **Monitor** for users reporting issues
7. **Document** any custom changes you made

---

## 📞 Need Help?

See: `.agent/SIDEBAR_REDESIGN_V2.md` for full documentation

Questions about:
- Colors? → Check `colorMap` in `nav-icon-system.tsx`
- Search? → Check `SidebarSearch` component
- Recent items? → Check `UnifiedRecentSidebar` component  
- Layout structure? → Check `AppLayoutV2`

---

**Version**: 1.0.0  
**Created**: Feb 20, 2026  
**Status**: Ready to Deploy
