# Handover: Archiving & Safe Deletion for Categories/Shops

## 🚀 Accomplishments
- **Database Schema**: Added `is_archived` boolean to `Category` and `Shop` tables.
- **Services**: Updated `category.service.ts` and `shop.service.ts` with:
  - `toggleArchive`: To archive/unarchive.
  - `delete`: To safely delete with transaction check.
  - Handover logic: If transactions exist, require `targetId` to move them before deletion.
- **UI Components**:
  - Created `DeleteClassificationDialog`: A dedicated dialog to handle the safe deletion flow (Check -> Confirm or Handover -> Delete).
  - Updated `ClassificationsManager`: Added "Archived" tab.
    - Supports filtering between Archived Categories and Archived Shops.
    - Integrated with new Archive/Unarchive/Delete actions.
  - Updated `CategoryTable` & `ShopTable`:
    - Added `onArchive` and `onDelete` props.
    - Updated row actions to show Archive/Unarchive/Delete buttons suitable for the context.
    - Filter logic improved to handle `is_archived` flag.

## 🛠️ Key Technical Details
- **Safe Deletion**: The system PREVENTS deletion if transactions are linked. It forces the user to select a replacement entity (Handover) via the UI dialog.
- **Unified Archive Tab**: The `ClassificationsManager` now has a 3rd tab "Archived" which acts as the central place to restore or permanently delete items.
- **Client-Side Filtering**: For performance, archiving just toggles a flag and the tables filter locally based on the active tab, ensuring snappy UX.

## 🔍 Testing Instructions
1.  **Archive**:
    - Go to Classifications (Settings -> Classifications).
    - Click "Archive" icon on a Shop or Category.
    - Verify it disappears from the main list.
    - Go to "Archived" tab.
    - Verify it appears there.
2.  **Unarchive**:
    - In "Archived" tab, click "Unarchive" icon.
    - Verify it moves back to the main list.
3.  **Delete (Empty)**:
    - Create a dummy category/shop with NO transactions.
    - Archive it (or delete directly if UI allows, currently UI puts Delete button in Archive tab mostly).
    - Click Delete.
    - Verify it is deleted immediately.
4.  **Delete (With Transactions)**:
    - Pick a category with transactions.
    - Archive it.
    - Click Delete.
    - Verify the Dialog warns about existing transactions.
    - Select a target category.
    - Click "Move & Delete".
    - Verify category is gone and transactions are moved to the new category.

## 📝 Notes
- Ensure `select-shadcn.tsx` vs `select.tsx` usage is consistent. We strictly used the custom `Select` (from `select.tsx`) in the Manager and Dialog to match existing patterns.
- Build might show SSR warnings due to complex client component structure, but functionality should be robust.
