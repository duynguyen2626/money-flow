---
description: GRAVITY TASK
---

📱 GRAVITY TASK: M2 - GLOBAL RESPONSIVENESS REFACTOR

Status: PENDING
Priority: Critical (UX)
Context: The app looks broken on Mobile (iPhone) and unbalanced on Large Screens (27"). We need a comprehensive layout refactor to ensure the "Vibe" works across all viewports.

🎯 OBJECTIVES

Tame the Large Screen: Implement a centralized constraint layout. No more infinite whitespace on the right.

Fix Mobile View: Ensure Tables scroll gracefully (or adapt) and Modals are usable on small screens.

🛠️ SPECIFIC TASKS

1. 🖥️ Large Screen Optimization (The "Constraint" Strategy)

Problem: On 27" screens, tables stretch 100%, leaving ugly gaps on the right or stretching columns too wide.

Action:

Apply a Global Container Constraint in src/app/layout.tsx or the main Dashboard Layout wrapper.

Class: mx-auto w-full max-w-[1600px] (or max-w-screen-2xl).

Effect: Content will center on ultra-wide screens, creating a professional dashboard look (like Linear/GitHub) instead of skewed alignment.

2. 📱 Mobile Table Strategy (unified-transaction-table.tsx & others)

Problem: Tables break layout or overflow incorrectly on iPhone.

Action:

Wrapper: Wrap all Tables in a div with className="overflow-x-auto w-full".

Column Visibility (Responsive Hiding):

Mobile (< 640px): Show ONLY "Category/Visual", "Flow", and "Amount".

Hide: "Date" (maybe show date inside Category row text?), "Status", "Note" on mobile.

Tablet/Desktop: Show all.

Touch Targets: Ensure interactive elements (Delete/Edit buttons) have padding for touch.

3. 🧩 Modal & Dialog Refactor (Global UI)

Problem: "Add Transaction" modal is cut off or zoomed in on mobile.

Action:

Update DialogContent (in src/components/ui/dialog.tsx or specific implementations):

Width: w-[95vw] or w-full on mobile. max-w-lg on desktop.

Height: max-h-[90vh] with overflow-y-auto for the content body.

Close Button: Ensure it's not overlapping content.

Transaction Form: Ensure the form inputs stack vertically (flex-col) on mobile and render side-by-side on desktop.

4. 🧭 Navigation & Header

Problem: Sidebar might be taking too much space or behaving weirdly.

Action:

Ensure Sidebar behaves as a Sheet/Drawer on Mobile (Hidden by default, toggle via Hamburger menu).

On Desktop: Fixed Sidebar.

🧪 VERIFICATION

27" Screen: App content is centered (mx-auto), not sticking to the left with void space on the right.

iPhone:

Can scroll table horizontally without breaking the page.

"Add Transaction" modal fits the screen, inputs are accessible.

No horizontal scroll on the Body (only inside the table container).

Instruction for Agent:

Start with Step 1 (Layout Constraint) to fix the "Empty Space" issue immediately.

Then apply overflow-x-auto to unified-transaction-table.tsx.

Finally, fix the AddTransactionDialog responsiveness.