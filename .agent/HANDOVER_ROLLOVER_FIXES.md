# Handover: Rollover UI Refinement & Google Sheets Sync Fix

## Context
This update focused on enhancing the debt rollover experience, fixing persistent "ghost" rows in Google Sheets, and providing better visual feedback for background operations via a browser tab spinner.

## Major Changes

### 1. Rollover UI/UX Overhaul
- **Selective Cycles**: Added "From Cycle" and "To Cycle" selection in the `RolloverDebtDialog`. Users can now target specific cycles accurately.
- **Date Picking**: Users can now select the `occurredAt` date for rollover transactions rather than defaulting to the current date.
- **Immediate Response**: The modal closes instantly upon confirmation, with a global loading spinner taking over to show background progress managed by the parent.
- **Rounding Logic**: Consistently applies `Math.round()` to ensure debt remains are handled as integers in both UI and server actions.

### 2. Google Sheets "Ghost Rows" (Zombie) Detection
- **Version 7.8**: Upgraded People Sync Apps Script (`Code.js`) to v7.8.
- **Zombie Detection**: Added logic to detect rows that have `ShopSource` (column K) data but no system ID (column A). These **"Zombie System Rows"** (likely left over from failed syncs or older script versions) are now identified and purged/updated during the next sync rather than being treated as permanent manual rows.
- **Row Shifting**: Confirmed that `insertRowAfter` is used for new system rows to correctly push manual entries down.

### 3. Browser Tab Spinner Enhancement
- **Dynamic Favicon**: Created `useLoadingFavicon` hook. The browser tab icon now transforms into an animated spinner during:
    - Transaction Saving/Editing/Cloning.
    - Google Sheet Synchronization.
    - Debt Rollover execution.
- **Combined State**: Linked the hook to the combined state of `isPending`, `isSubmitting`, and `isGlobalLoading` for a unified feedback loop across the `MemberDetailView`.

### 4. Branding & Iconography
- **Premium App Icon**: Replaced default Vercel branding with a custom `icon.svg` featuring a 3D-effect golden money bag and financial flow paths on a dark slate background.
- **Enhanced Metadata**: Updated OpenGraph and icon metadata in `layout.tsx` for better "Money Flow 3.0" branding on dashboards and social previews.

## Files Modified
- `src/hooks/use-loading-favicon.ts`: New hook for tab spinner.
- `src/components/people/rollover-debt-dialog.tsx`: Enhanced rollover logic and UI.
- `src/components/people/v2/MemberDetailView.tsx`: Integrated spinner hook and global state.
- `src/components/people/v2/TransactionControlBar.tsx`: Prop drilling for global loading controllers.
- `src/components/people/manage-sheet-button.tsx`: Added global loading to sync action.
- `integrations/google-sheets/people-sync/Code.js`: Script update to v7.8 with zombie row detection.
- `src/app/layout.tsx`: Branding/Metadata update for Vercel and browser dashboards.
- `public/icon.svg`: New premium icon asset.

## Verification Required
- [ ] Rollover dialog allows selecting any valid year/month cycle from the history.
- [ ] Browser tab spinner activates during sync and deactivates when done.
- [ ] Vercel dashboard should correctly show the Money Flow icon after deployment (may require a re-crawl).
- [ ] Google Sheets should no longer perpetually preserve deleted system rows that lack IDs.
