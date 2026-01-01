---
description: Canvas Sprint 2.1
---

Sprint 2.1: Fix Layout & GAS Logic

Context: Feedback from Sprint 2 testing indicates persistent UI layout issues in /people, filtering logic errors in /batch modals, and a critical ReferenceError in the Google Apps Script backend.

Role: Full-stack Engineer (Frontend UI + Google Apps Script).

Target Files:

UI (People): src/components/people/person-card.tsx.

UI (Batch): src/components/batch/add-item-dialog.tsx (Logic for filtering accounts).

Backend (GAS): google-scripts/Code.js (Fix bankType error).

0. Workflow

Step 1: Branch Strategy

ACTION: Continue on current branch or check out:

git checkout sprint-2/people-batch-enhancements


Step 2: Validation

Frontend: npm run build.

GAS: Review code logic (cannot run locally, rely on static analysis).

Task Breakdown & Engineering Prompt

A. 🎨 People Card Layout Fix (Strict)

Issue: The "Subscription" (Youtube, iCloud) and "Script Connected" sections are still causing layout breakages or appearing inside scrollable areas where they shouldn't.

Fix:

No Scroll: The Person Card content must fit naturally. Remove any internal overflow-y-auto that traps these small badges.

Icon-Only Mode: Force the Subscription indicators to be Icon Only (e.g., just the Youtube/Cloud SVG), removing the text labels to save width/height.

Wrap & Flex: Ensure the container uses flex-wrap so items flow correctly without pushing boundaries.

B. 🔍 Batch Modal Filtering Logic

1. Modal "Bank Name" Filter (Context Awareness):

Issue: When adding an item to an MBB Batch, the "Bank Name" dropdown/filter is showing VIB data (or mixing banks).

Fix: In add-item-dialog.tsx, ensure the form is aware of the current Batch's context (e.g., batchId or bankId).

Logic: If the modal is opened from an MBB Batch, strictly filter or pre-select options relevant to MBB only (if the field represents the Source). Note: If it represents the destination bank for a transfer, all banks should be allowed, but clarify the user's report regarding "lọc của cả vib". Assumption: User implies the Source Account selection or Mapping suggestions are leaking data. Inspect the accounts or mappings query hook.

2. Target Internal Account Filtering:

Issue: The "Target Account" dropdown includes irrelevant account types (e.g., Debt, System, or placeholder types).

Fix: Filter the accounts list in the dropdown.

Rule: account.type MUST be one of ['Asset', 'Liability', 'Cash', 'Wallet', 'Bank'] (or equivalent valid types). Exclude Debt, Unknown, or other non-transferable types.

C. 🔥 CRITICAL: Fix Google Apps Script (bankType Error)

Issue: API logs show: ReferenceError: bankType is not defined at doPost (Code:32:32).

Analysis: The doPost function in google-scripts/Code.js is trying to access a variable named bankType that hasn't been declared or extracted from the request payload.

Fix:

Read google-scripts/Code.js.

Locate doPost(e).

Define bankType: It is likely meant to be extracted from the JSON payload:

var data = JSON.parse(e.postData.contents);
var bankType = data.bankType || data.type; // Check payload structure


Correction: Ensure bankType is defined before it is used in logic switches.

Execution Plan:

GAS Fix: Open google-scripts/Code.js and fix the ReferenceError first. This is a blocker.

UI (People): Modify person-card.tsx to be icon-only and remove scrollbars.

UI (Batch): Update add-item-dialog.tsx to filter Target Accounts and restrict Bank Name context.