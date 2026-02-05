# MF3 Phase 15 Research & Planning

## 1. Navigation Architecture (Objective 3)

### Current State
- **File**: `src/components/moneyflow/app-layout.tsx`
- **Structure**: Static `navItems` array in Sidebar (Desktop) and Sheet (Mobile).
- **UX**: All items are at the same level. No prioritization or grouping.
- **Legacy Request**: "Recent" section (Phase 13) - not yet implemented in `AppLayout`.

### Proposed Architecture for Phase 15
- **Grouping**: Categorize nav items into:
  - **Core**: Dashboard, Transactions, Accounts.
  - **Relationships**: People, Shops, Services.
  - **Processing**: Batches, Installments, Refunds.
  - **Setup**: Categories, Settings.
- **Recent Section**:
  - Dynamically track and display top 3-5 most visited Account/Person detail pages.
  - Persist in `localStorage` or `transaction_history` (via DB).
- **Mobile UX**: 
  - Consider a Bottom Tab Bar for top-level pages (Dashboard, Transactions, Accounts, People).
  - Move secondary items to a "More" menu or Sidebar.

---

## 2. Chatbot Documentation (Objective 4)

### Component: `QuickAddChat`
- **File**: `src/components/ai/quick-add-chat.tsx`
- **Architecture**: Wizard-style state machine (`WizardStep`).
- **Key States**: `draft` (accumulated data), `messages` (chat history).

### Smart Parsing Logic
1. **Amount Parsing**: `parseAmount` handles common Vietnamese suffixes (`k`, `tr`, `m`, `b`) and mixed formats (e.g., `2tr5`).
2. **Intent Detection**: `intentFromInput` maps keywords to `expense`, `income`, `transfer`, `lend`, `repay`.
3. **Fuzzy Matching**: `findAccountCandidates` and `findByName` use normalized string comparison to resolve entities.
4. **Context Detection**: `useEffect` (line 714) detects `personId` from the URL to pre-fill the chatbot when opened on a detail page.

### Features to Enhance in Phase 15
- **Advanced LLM Integration**: Replace or augment hardcoded keyword matching with real Gemini API calls.
- **Voice Input**: Add Web Speech API support for "hands-free" transaction adding.
- **Template Improvements**: Allow users to save current successful chat drafts as reusable templates.
- **Natural Language Query**: Allow "How much did I spend at Shopee this month?" instead of just "Add transaction".

---

## 3. Decision Summary

| Feature | Decision | Priority |
| :--- | :--- | :--- |
| **Navigation** | Group items + Add "Recent" sidebar section | High |
| **Mobile Nav** | Implement Bottom Tab Bar for PWA-like feel | Medium |
| **Chatbot** | Document existing logic + Prep for LLM upgrade | High |
| **Category Filter** | Keep as Quick-Filter in Header (Implemented in Phase 14) | Done |
| **People UI** | Use Card Grid + V2 Detail View (Implemented in Phase 14) | Done |
