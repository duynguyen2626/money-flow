# Handover: Pending Items UI & Accounts Page Enhancements

## 🛑 Current Status (Stopped)
We implemented the "Void" functionality for pending items, but there are lingering UI/UX issues that need to be resolved in the next session.

### Completed:
- Added "Void" (delete) button to pending items Modal.
- Backend API for voiding items (`/api/batch/void-item`) is working (items are deleted).
- Toast notifications appear on success.
- "No Pending" button in the header now has a Loading Spinner state.
- Forced dynamic fetching for pending item APIs to avoid caching.

### ⚠️ Known Issues (To Fix):
1.  **Loading State Missing in Table**: When clicking "Void", the toast appears, but the specific row in the table **does not show a loading indicator** (spinner) while waiting for the backend. It just waits and then disappears or requires a refresh.
2.  **Real-time Update Failure**: The "No Pending" button in the header **does not automatically update** its count/status after a Void action. The user currently has to manually refresh (F5) to see the "No Pending" state (green check).
    - **Root Cause Investigation Needed**: Ensure the communication between the Modal (child) and the Header (parent) triggers a re-fetch effectively. The current `CustomEvent` or state lift might not be triggering the `summary` update in `AccountDetailHeaderV2` correctly.

## 📝 Next Steps Plan

### 1. Fix Pending UI (Priority)
- **Research**: Why does the table row not show the loading state immediately?
- **Research**: Why does the header not update immediately? (Check `fetchPendingData` trigger in `AccountDetailViewV2`).
- **Goal**: Ensure 2-way sync:
    - Creating/Confirming -> Show loading indicator in table.
    - Voiding -> Button updates immediately to "No Pending" without F5.

### 2. Accounts Page Enhancements (New Scope)
- **Ownership Column**: Add a column to distinguish between "Personal" (Me) and "Relative/Family" cards.
- **Separate Limits**: Display total credit limits separated by owner.
- **Summary Section**: Add a summary section at the top of the Accounts page:
    - Total Debt per person.
    - Total Limit per person.
    - Usage % per person.
    - Split totals by Secured vs. Unsecured items.

## 🧪 Testing
- Verify "Void" shows a spinner on the exact row being deleted.
- Verify "No Pending" appearing instantly after the last item is voided.
- Check the new Summary Section on the Accounts page for accuracy.
