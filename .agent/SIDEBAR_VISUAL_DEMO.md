# Enhanced Sidebar - Visual Demo & Component Showcase

## 🎨 Visual Layout Mockup

```
┌─────────────────────────────────────────────┐
│ Desktop (w-64 when expanded, w-16 collapsed) │
├─────────────────────────────────────────────┤
│                                             │
│  [×] Dashboard                              │  ← Page title (top)
│      Icon-based minimal when collapsed      │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🔍 Search menu...                    [×]   │  ← NEW: Search with clear btn
│                                             │  (hides when collapsed)
│ [◀ Collapse]                                │  ← Collapse button
│                                             │
├─────────────────────────────────────────────┤
│ RECENT                                      │  ← NEW: Fixed recent section
│ ├─ 💎 Credit Card Pro                  [cc] │     (never jumps)
│ ├─ 👤 John Doe                        [pp] │  
│                                             │  Color badge shows type
├─────────────────────────────────────────────┤
│ NAVIGATION MENU                             │
│ ├─ 🎯 Dashboard                             │  ← Each icon has color
│ ├─ 🏦 Accounts            [▼]               │  ← Expandable sections
│ │  ├─ Credit Card 1                        │     (if expanded)
│ │  └─ Cash Wallet 2                        │
│ ├─ ↔️ Transactions                         │
│ ├─ ⏳ Installments                         │
│ ├─ 🏷️ Categories                          │
│ ├─ 👥 People               [▼]             │  ← Expandable
│ │  ├─ Sarah                                │
│ │  └─ Mike                                 │
│ ├─ 💰 Cashback                             │
│ ├─ 📦 Batches                              │
│ ├─ ☁️ Services                             │
│ └─ ⚙️ Settings                             │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ [👤 U] User                                 │  ← Footer (bottom)
│         Admin                               │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎭 Component States & Interactions

### 1️⃣ Collapsed State

```
┌──────┐
│ [☰]  │  ← Menu icon with tooltip
│      │
│ [📊] │  ← Dashboard
│ [🏦] │  ← Accounts: blue icon
│ [↔️] │  ← Transactions: green icon
│ [⏳] │  ← Installments: amber icon
│ [🏷️] │  ← Categories: purple icon
│ [👥] │  ← People: indigo icon
│ [💰] │  ← Cashback: green icon
│ [📦] │  ← Batches: red icon
│      │
│ [👤] │  ← User footer
└──────┘

Sidebar width: w-16
Shows: Icons only + Tooltips on hover
Recent section: Hidden (would be confusing)
```

### 2️⃣ Expanded State - Normal

```
┌──────────────────────────────┐
│ Dashboard                    │ ← Page title
├──────────────────────────────┤
│                              │
│ 🔍 Search menu...        [×] │ ← SEARCH: Filters items
│                              │
│ [◀ Collapse]                 │ ← Collapse button
│                              │
├──────────────────────────────┤
│ RECENT                       │ ← Recent section header
│  💳 Credit Card Pro    [cc]  │ ← Account + type badge
│  👤 John Doe           [pp]  │ ← Person + type badge
│                              │
├──────────────────────────────┤
│ MENU                         │
│ 📊 Dashboard                 │ ← Menu item
│ 🏦 Accounts          [▼]     │ ← Expandable item
│ ↔️ Transactions              │
│ ⏳ Installments              │
│ 🏷️ Categories               │
│ 👥 People             [▼]    │
│ 💰 Cashback                  │
│ 📦 Batches                   │
│ ☁️ Services                  │
│ ⚙️ Settings                  │
│                              │
├──────────────────────────────┤
│ [👤] User                    │ ← Footer
│       Admin                  │
└──────────────────────────────┘

Sidebar width: w-64
Shows: Text + Icons
Recent section: Visible with badges
```

### 3️⃣ Search Active State

```
┌──────────────────────────────┐
│ Dashboard                    │
├──────────────────────────────┤
│                              │
│ 🔍 Search "tran"        [×]  │ ← User typing...
│                              │
│ [◀ Collapse]                 │
│                              │
├──────────────────────────────┤
│ RECENT                       │
│  (hidden during search)      │
│                              │
├──────────────────────────────┤
│ Results:                     │
│ 🟨 Transactions  (matched)   │ ← Yellow highlight
│ 🟨 Installments  (matched)   │ ← Both title + desc match
│ 🟨 Transfers     (matched)   │
│                              │
│ (3 of 13 items shown)       │
│                              │
└──────────────────────────────┘

When search active:
- Recent section disappears
- Only matching items shown
- Yellow highlight on matches
- "No items matching" if no results
```

### 4️⃣ Accounts Expanded

```
┌──────────────────────────────┐
│                              │
│ RECENT                       │
│  💳 Credit Card Pro          │
│  👤 John Doe                 │
│                              │
├──────────────────────────────┤
│ MENU                         │
│ 📊 Dashboard                 │
│ 🏦 Accounts          [▼]     │ ← Clicked to expand
│ │  💳 Visa Debit      ╭─→ ← Sub-items show below
│ │  💳 Amex Credit     │     ← Indented style
│ │  💰 Cash Wallet     │     ← Visual nesting line
│ │                     │
│ ↔️ Transactions ──────────────
│ ⏳ Installments
│ ...
│
Shows:
- Chevron rotated 180° (pointing up)
- Sub-items with indent line
- Smooth expand animation
- Can click items to navigate
```

### 5️⃣ People Expanded

```
┌──────────────────────────────┐
│ 👥 People             [▼]    │ ← Expanded section
│ │  👤 Sarah Smith             │ ← Recent people items
│ │  👤 Mike Johnson            │ ← Max 2 people shown
│ │  👤 Lisa Chen               │ ← From recent transactions
│                              │
│ (Indented, color coded)      │
└──────────────────────────────┘
```

### 6️⃣ Active Item Highlight

```
Selected item example:
┌──────────────────────────────┐
│ MENU                         │
│ 📊 Dashboard                 │
│ 🏦 Accounts                  │
│ ↔️🟦 Transactions  ← ACTIVE  │ ← Blue highlight
│ ⏳ Installments              │ ← Icon color enhanced
│                              │
(background color changes to indicate active)
(text color also changes)
└──────────────────────────────┘
```

---

## 🎨 Color Legend

```
┌─ Item ──────────────────┬──────────┬──────────┐
│ Blue Items              │ Account  │ Landmark │
├─────────────────────────┼──────────┼──────────┤
│ Dashboard               │ 🔵 Blue  │ Layout   │
│ Accounts                │ 🔵 Blue  │ Landmark │
│ Services                │ 🔵 Blue  │ Cloud    │
├─────────────────────────┼──────────┼──────────┤
│ Green Items (Money)     │ 💚 Green │ Balance  │
│ Transactions            │ 💚 Green │ ArrowRLT │
│ Cashback                │ 💚 Green │ Banknote │
├─────────────────────────┼──────────┼──────────┤
│ Purple Items (Config)   │ 💜 Purple│ Smart    │
│ Categories              │ 💜 Purple│ Tags     │
│ AI Management           │ 💜 Purple│ Sparkles │
├─────────────────────────┼──────────┼──────────┤
│ Amber Items (Wait)      │ 🟠 Amber │ Special  │
│ Installments            │ 🟠 Amber │ Hourglass│
│ Refunds                 │ 🟠 Amber │ Undo2    │
├─────────────────────────┼──────────┼──────────┤
│ Red Items (Alert)       │ ❤️ Red   │ Database │
│ Batches                 │ ❤️ Red   │ Database │
├─────────────────────────┼──────────┼──────────┤
│ Orange Items (Shop)     │ 🟠 Orange│ Shop     │
│ Shops                   │ 🟠 Orange│ ShopBag  │
├─────────────────────────┼──────────┼──────────┤
│ Indigo Items (People)   │ 💜 Indigo│ Users    │
│ People                  │ 💜 Indigo│ Users    │
└─────────────────────────┴──────────┴──────────┘
```

---

## 💫 Interaction Flows

### Flow 1: Search for Transaction

```
User: "I want to find transactions"

1. User sees sidebar
2. Focuses on → Search box (top)
3. Types → "trans"
4. System:
   - Filters navbar items
   - Hides Recent section
   - Shows matching: Transactions, Installments, Transfers
   - Highlights in yellow: bg-yellow-50
5. User clicks → "Transactions"
6. Navigates to /transactions page
7. System:
   - Clears search
   - Recent section reappears
   - Highlights "Transactions" as active
```

### Flow 2: Expand & Select Recent Item

```
User: "Go to my Credit Card"

1. User sees Recent section
2. Sees: "💳 Credit Card Pro [cc]"
3. Clicks → Recent item directly
4. Navigates to /accounts/[id]
5. Recent section stays put (NO JUMPING!)
6. Item highlights as active
```

### Flow 3: Expand Accounts

```
User: "Which accounts do I have?"

1. User sees "🏦 Accounts [▼]"
2. Clicks → Chevron button
3. Animation:
   - Chevron rotates 180°
   - Sub-section expands
   - Duration: 300ms
4. Shows:
   - 💳 Visa Debit
   - 💳 Amex Credit
   - 💰 Cash Wallet
5. User clicks → "Amex Credit"
6. Navigates to /accounts/[id]
7. Accounts section stays expanded
8. Amex item highlights
```

### Flow 4: Collapse Sidebar

```
User: "I need more screen space"

1. Clicks → "Collapse" button
2. Animation: sidebar shrinks from w-64 to w-16
3. Shows:
   - Icons only (no text)
   - Tooltips on hover
   - Recent section hidden
   - Menu items still accessible
4. Click any item → navigates
5. Tooltip shows: "Transactions" (on hover)
6. State saved to localStorage
7. On page reload → stays collapsed
```

---

## ⌨️ Keyboard Navigation

```
Tab Navigation Path:
┌─────────────────────────────┐
│ [1] Search input             │ ← Focus here first
│                              │
│ [2] Collapse button          │ ← Tab to next
│                              │
│ [3] Dashboard link           │ ← Then nav items
│ [4] Accounts link            │
│ [5] AccountsDropdown chevron │ ← Chevron (if visible)
│ [6] Transactions link        │
│ ... more items ...           │
│                              │
│ [N] User footer area         │ ← Last
└─────────────────────────────┘

Enter key:
- Search: Starts filtering
- Link: Navigates
- Chevron: Toggles expand

Escape key:
- Clears search
- Closes menu (mobile)
```

---

## 📱 Mobile Layout

```
┌─────────────────┐
│ ☰ Dashboard     │ ← Top bar
├─────────────────┤
│                 │
│  Main content   │  (full width)
│                 │
│                 │
└─────────────────┘

When hamburger (☰) clicked:
┌─────────────────┐
│ ☰ Dashboard     │
├─────────────────┤
│ Dashboard       │ ← Drawer from left
│ Accounts        │
│ Transactions    │
│ ...             │
│ Settings        │
│                 │
│ [👤] User       │
└─────────────────┘

Sidebar is now a full-width drawer
All features still work:
✓ Search
✓ Recent section
✓ Expandable sections
✓ Color icons
```

---

## 📊 Component Interaction Diagram

```
┌──────────────────────────────────────────────────┐
│                   AppLayoutV2                    │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │            Sidebar Container              │ │
│  │                                            │ │
│  │  ┌──────────────────────────────────────┐ │ │
│  │  │     SidebarNavV2                    │ │ │
│  │  │ (Main orchestrator)                 │ │ │
│  │  │                                      │ │ │
│  │  │  ┌─ SidebarSearch                 ┐ │ │ │
│  │  │  │  (Search input + filtering)    │ │ │ │
│  │  │  └────────────────────────────────┘ │ │ │
│  │  │                                      │ │ │
│  │  │  ┌─ UnifiedRecentSidebar         ┐ │ │ │
│  │  │  │  (Recent accounts + people)   │ │ │ │
│  │  │  │  - Loads 2 accounts           │ │ │ │
│  │  │  │  - Loads 2 people            │ │ │ │
│  │  │  │  - Combines display           │ │ │ │
│  │  │  └────────────────────────────────┘ │ │ │
│  │  │                                      │ │ │
│  │  │  ┌─ coloredNavItems Loop         ┐ │ │ │
│  │  │  │  - Filters by search          │ │ │ │
│  │  │  │  - Renders NavIcon            │ │ │ │
│  │  │  │  - Handles expandables        │ │ │ │
│  │  │  │  (Accounts/People)            │ │ │ │
│  │  │  └────────────────────────────────┘ │ │ │
│  │  │                                      │ │ │
│  │  └──────────────────────────────────────┘ │ │
│  │                                            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│        LocalStorage (sidebar-collapsed-v2)      │
│                                                  │
└──────────────────────────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────┐
│            Main Content Area                    │
│  (children passed through, full page renders)  │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Quick Reference: What Each Component Does

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **SidebarSearch** | Search/filter | Real-time filtering, yellow highlight |
| **UnifiedRecentSidebar** | Recent items | 2 accounts + 2 people, no jumping |
| **NavIcon** | Icon rendering | Colored icons with consistent styling |
| **nav-icon-system** | Color definitions | 7 colors, 13 preconfigured items |
| **SidebarNavV2** | Main sidebar | Orchestrates all components |
| **AppLayoutV2** | Full layout | Uses SidebarNavV2, adds main content area |

---

## 🧪 Testing Each Component in Isolation

### Test SidebarSearch
```typescript
<SidebarSearch 
  onSearchChange={(q) => console.log(q)}
  placeholder="Search..."
  isCollapsed={false}
/>
```

### Test UnifiedRecentSidebar
```typescript
<UnifiedRecentSidebar 
  isCollapsed={false}
  searchQuery=""
/>
```

### Test NavIcon
```typescript
<NavIcon icon={LayoutDashboard} color="blue" size="md" />
<NavIcon icon={Users} color="indigo" size="lg" showBg={true} />
```

### Test SidebarNavV2
```typescript
const [collapsed, setCollapsed] = useState(false)
<SidebarNavV2 
  isCollapsed={collapsed}
  onCollapseChange={setCollapsed}
/>
```

### Test AppLayoutV2 (Full Integration)
```typescript
<AppLayoutV2>
  <p>Your page content here</p>
</AppLayoutV2>
```

---

**Created**: February 20, 2026  
**Status**: Complete Visual Reference  
**Version**: 1.0
