# MODAL REDESIGN: Edit Account Dialog - 2 Column Layout

## 🎯 Vấn đề ban đầu

- ❌ Category Rules bị **chen chúc**, 4 fields trong 1 row quá chật
- ❌ Modal dọc (portrait) không đủ không gian cho Cashback Config phức tạp
- ❌ Checkbox thay vì Toggle Switch
- ❌ Account Type là dropdown thay vì Tabs
- ❌ Không responsive tốt với mobile

---

## ✅ Giải pháp: Redesign toàn bộ Modal

### 1. **Layout 2 Cột Ngang (Horizontal)**

**Modal Size:**
- `max-w-5xl` (rộng hơn nhiều so với `max-w-lg` cũ)
- Hình chữ nhật nằm ngang
- `max-height: 90vh` với scroll inside modal

**Grid Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Edit Account                        [X]  │
├─────────────────────────────────────────────────────────────┤
│  Account Type Tabs (8 tabs in 1 row)                       │
├──────────────────────────────┬──────────────────────────────┤
│  LEFT COLUMN                 │  RIGHT COLUMN                │
│  ─────────────               │  ─────────────               │
│  Basic Information           │  Cashback Configuration      │
│  • Name                      │  • Rate (%)                  │
│  • Logo URL                  │  • Max amount                │
│  • Credit Limit              │  • Min spend                 │
│  • Parent Account            │  • Cycle type                │
│  • Secured Toggle            │  • Statement day             │
│                              │                              │
├──────────────────────────────┴──────────────────────────────┤
│  Advanced Tiers (Full Width)                                │
│  • Tier 1, Tier 2, ...                                      │
│  • Category Rules (improved spacing)                        │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. **Account Type → Tabs (Top)**

**Trước:**
```tsx
<select value={accountType} onChange={...}>
  <option value="bank">Bank account</option>
  <option value="cash">Cash</option>
  ...
</select>
```

**Sau:**
```tsx
<Tabs value={accountType} onValueChange={...}>
  <TabsList className="grid grid-cols-4 lg:grid-cols-8">
    <TabsTrigger value="bank">Bank account</TabsTrigger>
    <TabsTrigger value="cash">Cash</TabsTrigger>
    <TabsTrigger value="credit_card">Credit card</TabsTrigger>
    ...
  </TabsList>
</Tabs>
```

**Responsive:**
- Desktop: 8 tabs in 1 row
- Mobile: 4 tabs per row (2 rows)

---

### 3. **Checkbox → Toggle Switch**

**Trước:**
```tsx
<input type="checkbox" checked={isSecured} onChange={...} />
```

**Sau:**
```tsx
<Switch checked={isSecured} onCheckedChange={...} />
```

**Áp dụng cho:**
- ✅ Secured (collateral) toggle

---

### 4. **Category Rules - Improved Spacing**

**Cấu trúc mới:**
```
┌─────────────────────────────────────────────────────────┐
│  Category Rules                          + Add Rule     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │  CATEGORY                                         │  │
│  │  [Education] [Medical]                            │  │
│  │  [+ Add Category ▼]                               │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  RATE (%)          │  MAX REWARD (VND)            │  │
│  │  [15]              │  [200,000]                   │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  MCC CODES                                    [X] │  │
│  │  [8211, 8220]                                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Thay đổi:**
- ✅ **3 rows thay vì 1 row**: Category → Rate & Max Reward → MCC & Delete
- ✅ **Labels rõ ràng**: Mỗi field có label riêng
- ✅ **Spacing thoải mái**: Không bị chen chúc
- ✅ **Delete button**: Nằm ở cuối row 3, dễ click

---

### 5. **Responsive Mobile**

**Desktop (lg+):**
```css
grid-cols-2  /* 2 columns */
grid-cols-8  /* 8 tabs */
```

**Mobile:**
```css
grid-cols-1  /* 1 column (stacked) */
grid-cols-4  /* 4 tabs per row */
```

**Scroll:**
- Modal có `overflow-y: auto`
- `max-height: 90vh`
- Scroll inside modal, không scroll toàn trang

---

## 📊 So sánh Before/After

### Before (Old Layout)
```
┌──────────────────────────┐
│  Edit account       [X]  │
├──────────────────────────┤
│  Name: [________]        │
│  Type: [Dropdown ▼]      │
│  ...                     │
│  Cashback config         │
│  Rate: [__]              │
│  Max: [__]               │
│  ...                     │
│  Category Rules          │
│  [Cat][Rate][Max][MCC][X]│  ← Chật!
└──────────────────────────┘
```

### After (New Layout)
```
┌──────────────────────────────────────────────────────────┐
│  Edit Account                                       [X]  │
├──────────────────────────────────────────────────────────┤
│  [Bank] [Cash] [Credit] [Wallet] [Debt] [Savings] ...   │
├───────────────────────────┬──────────────────────────────┤
│  Basic Information        │  Cashback Configuration     │
│  • Name                   │  • Rate (%)                 │
│  • Logo URL               │  • Max amount               │
│  • Credit Limit           │  • Min spend                │
│  • Parent Account         │  • Cycle type               │
│  • [Secured] Toggle       │  • Statement day            │
├───────────────────────────┴──────────────────────────────┤
│  Advanced Tiers                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Category: [Education] [Medical]                   │  │
│  │  Rate: [15%]        Max Reward: [200,000]          │  │
│  │  MCC: [8211, 8220]                            [X]  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 🎨 Key Improvements

### 1. **Wider Modal**
- `max-w-lg` (512px) → `max-w-5xl` (1024px)
- Gấp đôi không gian

### 2. **Better Organization**
- Left: Basic info
- Right: Cashback config
- Bottom: Advanced tiers (full width)

### 3. **Modern UI Components**
- ✅ Tabs instead of dropdown
- ✅ Switch instead of checkbox
- ✅ Better spacing and padding
- ✅ Rounded corners and shadows

### 4. **Category Rules Spacing**
- 3 rows instead of 1 cramped row
- Each field has clear label
- Delete button easy to click
- No horizontal scrolling

### 5. **Responsive**
- Desktop: 2 columns
- Mobile: 1 column (stacked)
- Scroll inside modal
- Touch-friendly

---

## ✅ Build Status

- ✅ **TypeScript**: No errors
- ✅ **Build**: Passed successfully
- ✅ **UI**: Wider modal, 2-column layout, improved spacing

---

## 🧪 Testing Checklist

- [ ] Open Edit Account Dialog
- [ ] Verify Account Type shows as **Tabs** at top
- [ ] Verify **2-column layout** on desktop
- [ ] Verify **1-column stacked** on mobile
- [ ] Click "Add Tier" → "Add Rule"
- [ ] Verify Category Rules has **3 rows** with good spacing
- [ ] Verify **Toggle Switch** for "Secured"
- [ ] Verify modal **scrolls inside** (not full page scroll)
- [ ] Test on mobile: should be touch-friendly

---

**Redesign Date**: 2025-11-30
**Status**: ✅ Complete & Tested
