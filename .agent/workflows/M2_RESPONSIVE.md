📱 GRAVITY TASK: M2 - GLOBAL RESPONSIVENESS & VISUAL REFACTOR

Status: REFINING
Priority: Critical (UX & Tech Debt)
Context: User feedback indicates "Layout Breakage" on iPhone (Filters unusable, Modal weird, Missing columns) and "Ugly Whitespace" + "Scrolling Header" on Desktop.

🎯 OBJECTIVES

Database: Unify logo_url -> image_url (Standardization).

Mobile First: Make Filters, Modals, and Tables truly usable on touch devices.

Visuals: Increase Icon sizes and ensure Sticky Headers on Desktop.

🛠️ SPECIFIC TASKS

0. 🗄️ DATABASE & CODE REFACTOR (Pre-requisite)

Goal: One name to rule them all: image_url.

Migration: Rename logo_url to image_url in accounts and shops.

Refactor: Find/Replace in code to ensure frontend uses image_url consistently.

1. 🖼️ VISUAL SIZING & LOGIC

Refactor UnifiedTransactionTable Cells:

Category Column (The Hero):

Logic: transaction.metadata.image_url > shop.image_url > category.image_url > category.icon.

Size: w-9 h-9 (Standard). Square.

Note Column (Shop Icon):

Requirement: Increase Shop Icon size to MATCH Category size (w-9 h-9).

Flow Column (Bank/Person):

Requirement: Increase Image/Badge size significantly. Use h-10 or h-12. It should span the height of the row comfortably.

Sticky Header:

Apply sticky top-0 z-20 to the <thead> or the table header container so it freezes while scrolling transactions.

2. 📱 MOBILE OPTIMIZATION (The "iPhone" Fix)

A. Smart Column Visibility

Current Issue: Only Flow & Cate visible. Missing Amount/Date.

New Mobile Layout (< 640px):

Col 1: Category + Date: Show Category Name (Bold) and Date (Gray, Small) stacked in ONE cell.

Col 2: Amount: Show Amount (Bold, Color-coded). Essential.

Col 3: Flow: Compact visual (Bank Logo -> Person).

Hide: Distinct Date column, Status, Note (unless expanding row).

B. Filter Bar Redesign

Problem: Filters clutter the screen and are unusable on mobile.

Solution:

Desktop: Show full Filter Bar.

Mobile: Show a single "Filter & Search" button.

Action: Clicking it opens a Sheet (Drawer) containing all filter options (Search, Date Range, Type, Account).

C. Add/Edit Transaction Modal

Problem: Layout "kỳ cục", fields squeezed.

Solution:

Container: w-[100vw] h-[100dvh] on mobile (Full Screen).

Layout: flex-col with generous spacing (gap-4).

Inputs: Full width (w-full).

Navigation: Add a proper "Close" / "Save" header bar for mobile modal.

3. 🖥️ DESKTOP CONSTRAINT

Problem: Excessive whitespace on 27" screens.

Action:

Apply max-w-[1920px] (2K friendly) or max-w-[1600px].

Center: mx-auto.

Background: Ensure the background outside the constraint is neutral (not jarring white).

🧪 VERIFICATION

Code: logo_url is gone.

Desktop: Header sticks. Layout centered.

Mobile:

Table shows: [Icon+Cate+Date] | [Amount] | [Flow].

Filter bar is collapsed into a Drawer.

Modal is full-screen and vertically stacked.

Icons are BIG and clear.

Instruction for Agent:

Step 0 (DB) First.

Step 1 (Visuals + Sticky): Fix the sizes and sticky header.

Step 2 (Mobile): Implement the Filter Drawer and Table Columns.