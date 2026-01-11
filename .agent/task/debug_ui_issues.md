# Debug Note: UI Update "Stickiness" in People Details V2

## Context
The user reported that despite multiple fixes, the UI "goes in circles" and doesn't seem to change (or changes incorrectly), even after we verified port 3000 usage and cleared cache.

## Observations
1. **Changes ARE Reflecting**:
   - We added a "Paid" button to `member-detail-view.tsx`.
   - The user's screenshot (`uploaded_image_0_1768090992074.png`) **SHOWS** this "Paid: 4" button.
   - The timeline section **IS** wrapped in a border in the screenshot.
   - Therefore, the code deployment *is* working. Next.js is serving the updated code.

## Potential Reasons for User Frustration ("Going in Circles")
1. **Design Mismatch**: The implementation in `member-detail-view.tsx` (inline code) might differ significantly from the design system components (`DebtTimeline`, `StatsToolbar`) that the user *expects* to be used.
   - `member-detail-view.tsx` has hardcoded/inline logic for the timeline and stats.
   - We modified this inline code directly.
   - A proper refactor might involve *replacing* this inline code with the actual `DebtTimeline` and `StatsToolbar` components, rather than patching the inline code.

2. **Styling Specifics**:
   - The "Grouped Timeline" border might look different from a Figma design we haven't seen.
   - The "Paid" button style (CheckCircle icon, purple text) matches our code, but maybe the interaction (modal overlay) is buggy or not what was intended (e.g., should be a full page or a different kind of modal).

3. **"Unchanged" Perception**:
   - If the user expects the *structure* of the code to be cleaned up (using components) but sees we are just patching the inline rendering, they might feel we aren't "fixing" the root cause (tech debt).

## Technical Debt / Next Steps for Investigation
1. **Component Usage**:
   - Check why `src/components/people/v2/DebtTimeline.tsx` exists but isn't used in `member-detail-view.tsx`.
   - **Goal**: Replace inline timeline rendering in `member-detail-view.tsx` with `<DebtTimeline />`.
   
2. **Stats Toolbar**:
   - Similarly, replace inline stats buttons with `<StatsToolbar />`.

3. **Verify Modal**:
   - Ensure `PaidTransactionsModal` (ported from V1) is fully compatible with V2 data structures.

## Environment Anomalies
- **Port Conflict**: We hit a case where `npm run dev` switched to 3001 because 3000 was blocked. This caused me to verify 3000 while the browser (if open on 3000) was showing an old cached version or a ghost process. We killed the process on 3000, so this *should* be resolved, but worth double-checking.

## Summary
The code changes **are** live (proven by screenshot). The issue is likely qualitative (design/refactoring expectation) rather than functional (code not deploying). The next agent should focus on **refactoring inline code into reusable components** to strictly align V2 with the intended architecture.
