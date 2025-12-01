PROJECT: MONEY FLOW 3.0

PHASE: 51.5 - SERVICE LOGIC FIXES & BOT MATH CORRECTION

WORKFLOW:

Branch: fix/phase-51-5-service-bot

Safety: Run npm run build.

OBJECTIVE:

Fix Service UI: Ensure "Total Members" and "Preview" update immediately upon editing/saving. Fix "Update" button state.

Fix Bot Math: Calculate debt share based on SLOTS, not just Member Count.

I. BACKEND: FIX BOT MATH (src/services/subscription.service.ts)

Target: checkAndProcessSubscriptions

Correct Logic (Weighted Split):

Calculate Total Slots:

MemberSlots = Sum of slots from subscription_members.

MySlots = 1 (Default assumption: Owner uses 1 slot).

Refinement: Or assume Price is the total bill, and we split by MemberSlots + 1.

Decision: TotalDivisor = MemberSlots + 1.

Calculate Unit Cost:

UnitCost = SubscriptionPrice / TotalDivisor.

Create Debt Transactions:

Loop through Members.

DebtAmount = UnitCost * member.slots.

Note Generation:

Base: subscription.name (or Template).

Suffix: If member.slots > 1 -> Add " (x{member.slots} slots)" or similar.

Create Line: One line per person with the calculated DebtAmount.

II. UI: FIX SERVICE EDIT PAGE (src/components/services/service-edit-page-content.tsx)

1. Fix Reactivity (Stale Data)

Problem: "Total Members" or "Cost" doesn't update after Save.

Fix:

Ensure updateSubscription returns the updated object (including relations count).

Update the local state (service object) with the response.

Call router.refresh() to ensure Server Components (like Sidebar counts) update.

2. Fix "Update" Button State

Logic: Disable button if !form.formState.isDirty OR isSaving.

Trigger: Ensure changing the "Member List" (Checkboxes/Slots) marks the form as dirty.

3. Fix Template Preview

Logic: Add a useEffect watching note_template, price, and members.

Render: Real-time string replacement (e.g., "Youtube 12-2025 (166k/5)") shown in a gray box below the input.

III. EXECUTION STEPS

Backend: Rewrite Bot Math to include Slot multiplier.

Frontend: Fix State Update logic in ServiceEditPageContent.

Frontend: Implement Live Preview for Note Template.

Verify: Run manual bot check.