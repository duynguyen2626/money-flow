# Phase 11 Agent Prompts

## PROMPT A: Repository Context & Phase 11 Preparation

```plaintext
TASK: Repository Analysis & Phase 11 Preparation

You are taking over Phase 11 of the Money Flow 3 project. Your primary goal is to:
1. Understand the codebase architecture and current state
2. Prepare comprehensive analysis of the account add/edit UI
3. Create a development branch and get ready for Phase 11 fixes

STEP 1: Repository Context & Rules
=====================================
Read and understand these files IN THIS ORDER:
1. /README.md - Project overview, phase status, key notes
2. /.cursorrules - Coding standards, contribution points, essential patterns
3. /.agent/README.md - Transaction Slide V2 architecture and patterns
4. /copilot-instructions.md - Stack overview, services, data layer patterns
5. /.agent/CASHBACK_GUIDE_VI.md - Cashback engine 3-tier policy logic

After reading, answer these questions IN YOUR MIND:
- What is the Next.js version and why does it matter?
- What is RSC (React Server Components) and where is it used?
- What are the 3 key service files for transactions, accounts, and cashback?
- What is the "single source of truth" for financial data?
- How does the cashback policy resolution work (3 tiers)?

STEP 2: Analyze Current Account Management UI
==============================================
Read these files COMPLETELY:
- src/components/accounts/v2/AccountSlideV2.tsx (entire file)
- src/components/moneyflow/edit-account-dialog.tsx (lines 1-100, 175-290, 320-360)
- src/components/accounts/v2/CategorySlideV2.tsx (entire file)
- src/app/accounts/[id]/page.tsx (focus on data loading and state management)

Questions to answer:
1. What is AccountSlideV2? What does it render?
2. What is edit-account-dialog? When is it used? What is its purpose?
3. What is CategorySlideV2? How does it integrate with AccountSlideV2?
4. What is the callback pattern (activeCategoryCallback) and why is it used?
5. How does data flow from database → page component → AccountSlideV2 → edit-account-dialog?

STEP 3: Research Current Problem Statement
==========================================
Read this file carefully:
- /.agent/HANDOVER_PHASE_11.md

After reading, understand:
1. What have previous sessions accomplished?
2. What is the CRITICAL UNRESOLVED ISSUE with cashback rules?
3. Why do fields (Categories, Rate %, Max Reward) overlap?
4. What CSS attempts were made and why did they fail?
5. What specific tests should you run to diagnose the problem?

STEP 4: Analyze Component Architecture
======================================
For AccountSlideV2:
- What is the overall layout structure?
- How many main sections does it have?
- What is the data flow for account creation vs. editing?
- Where does the cashback policy configuration live?
- How is the form validation handled?

For edit-account-dialog:
- What is the purpose of the "Cashback Levels" section?
- How are category rules displayed and edited?
- What is CategoryMultiSelect component?
- Why might the scrollable container (max-h-[500px]) cause layout issues?

For CategorySlideV2:
- When is this component rendered?
- What data does it receive and what does it return?
- How does onSuccess callback integrate with parent?
- Why was it changed from modal dialog to slide panel?

STEP 5: Understanding Services & Data Model
===========================================
Read these sections:
- src/services/account.service.ts (focus on account balance calculations)
- src/services/category.service.ts (if exists, focus on CRUD operations)
- src/types/moneyflow.types.ts (search for Account, CashbackLevel, CashbackCategoryRule types)
- src/lib/cashback.ts or similar (understand cashback policy structure)

Key questions:
1. What fields does the Account type have?
2. What is CashbackLevel and what does it contain?
3. What is CashbackCategoryRule?
4. How is the cashback_config stored in the database?
5. What validation rules exist for account creation/editing?

STEP 6: Setup Development Environment
====================================
Execute these commands:

```bash
# 1. Create new branch for Phase 11 work
git checkout -b phase-11/fix-cashback-rules-overlap

# 2. Verify branch created successfully
git branch -v

# 3. Pull latest from remote to ensure you have current state
git pull origin main

# 4. Start development server
pnpm dev

# 5. Once dev server is ready, open browser to http://localhost:3000
# 6. Navigate to an account detail page (e.g., Vcb Signature account)
# 7. Click "Edit" to open AccountSlideV2
# 8. Scroll to "Cashback Levels" section
# 9. Click "+ Add Rule" to see the problematic layout
```

STEP 7: Visual Inspection & DevTools Analysis
===========================================
Once dev server is running and AccountSlideV2 is open:

1. In browser DevTools (F12):
   - Go to Elements tab
   - Find the "Category Rules" section
   - Inspect the CategoryMultiSelect dropdown component
   - Check its computed width (should be 100%, not auto)
   - Inspect the grid container (should show grid-cols-1 on mobile, grid-cols-2 on sm+)
   - Look for `overflow: hidden` or `overflow: auto` on parent containers
   - Note any inline styles that override Tailwind classes

2. Check mobile responsive behavior:
   - Resize browser to 375px width
   - Verify grid breaks to single column
   - Note if dropdown still overflows
   - Resize to 768px and check if 2-column layout appears

3. Take screenshots:
   - 375px view (mobile) - note any overlap
   - 768px view (tablet) - note any overlap
   - 1024px view (desktop) - note any overlap

STEP 8: Document Findings
========================
Before proceeding to Prompt B, create a file:
- .agent/PHASE_11_ANALYSIS.md

In this file, document:
1. Current architecture summary (500 words max)
2. Problem diagnosis (what you found in DevTools)
3. Root cause hypothesis
4. Screenshots or descriptions of the issue at different breakpoints
5. List of files that need modification
6. Proposed solution approach (do not implement yet)

STEP 9: Prepare for Next Steps
==============================
Once your analysis is complete, you are ready for PROMPT B which will guide you on:
- Whether to rewrite the entire account slide UI or do targeted CSS fixes
- How to implement the solution
- How to test and validate the fix

DO NOT proceed to implementation until you have completed steps 1-8 and
created the PHASE_11_ANALYSIS.md file. This analysis phase is critical
to understanding the problem deeply before attempting fixes.

IMPORTANT REMINDERS:
- You are on branch: phase-11/fix-cashback-rules-overlap
- All changes should follow .cursorrules standards
- Use read_file tool to inspect code, not terminal commands
- Document everything in analysis file for future reference
- Test at multiple viewport sizes (mobile, tablet, desktop)
- Do not modify any files until instructed by PROMPT B

END OF PROMPT A
```

---

## PROMPT B: Handover Review & Implementation Strategy

```plaintext
TASK: Handover Review, Solution Design & Implementation Plan

PREREQUISITE: You must have completed PROMPT A and created PHASE_11_ANALYSIS.md file.
If you haven't, STOP and go back to PROMPT A now.

STEP 1: Read Handover File Completely
====================================
Read this file multiple times:
- /.agent/HANDOVER_PHASE_11.md

As you read, take notes on:
1. What was accomplished in sessions 1-7? Why are they marked COMPLETED?
2. What was attempted in sessions 8-15? Why is it marked PARTIAL?
3. What specific CSS changes were tried (grid-cols-2 → grid-cols-1 sm:grid-cols-2, mb-4)?
4. Why did those CSS changes NOT fix the problem?
5. What is the suspected root cause (CategoryMultiSelect lacks width constraint)?
6. What 10 tests are listed in the testing checklist?

STEP 2: Compare Analysis with Handover
====================================
Now look at your PHASE_11_ANALYSIS.md file. Compare:
1. Did your DevTools findings match the suspected root cause?
2. Did you discover any NEW issues not mentioned in handover?
3. Are your screenshots consistent with previous descriptions?
4. Is your root cause hypothesis aligned with handover?

If there are differences, add them to your analysis file:
"DEVIATIONS FROM HANDOVER: [list differences]"

STEP 3: Strategic Decision - Rewrite vs. Fix
==========================================
The handover does NOT recommend rewriting the entire UI.
However, YOU must decide: Should we rewrite AccountSlideV2 & edit-account-dialog or do targeted CSS fixes?

Consider these factors:

PROS of TARGETED CSS FIX:
- Minimal risk of breaking existing functionality
- Faster to implement and test
- All session 1-7 fixes (waiver, tooltip, etc.) remain intact
- Better for code review and Git history

CONS of TARGETED CSS FIX:
- May not fully solve the layout problem
- Might just be patching symptoms, not root cause
- Future developers may face same issue again

PROS of FULL REWRITE:
- Clean slate, can design better architecture
- Can implement proper component composition
- Can use modern React patterns (Context API for callbacks instead of refs)
- Future-proof against similar issues

CONS of FULL REWRITE:
- High risk if not carefully planned
- Takes more time to design, implement, test
- Could break existing features (waiver, tooltip, category integration)
- Difficult to review and validate in isolation

RECOMMENDATION FROM PREVIOUS AGENT:
"Do targeted CSS fixes first. Only rewrite if targeted fixes fail after 3+ attempts."

Your decision:
[] Option A: Targeted CSS Fix (recommended)
[] Option B: Partial Rewrite of edit-account-dialog component
[] Option C: Full UI Rewrite of AccountSlideV2 + edit-account-dialog + CategorySlideV2

If you choose Option B or C, create detailed design doc before proceeding.

STEP 4: Root Cause Analysis
==========================
Based on your PHASE_11_ANALYSIS.md findings, identify:

1. PRIMARY ROOT CAUSE:
   - Is it CategoryMultiSelect not respecting width constraints?
   - Is it the scrollable container (max-h-[500px]) causing flex/grid collapse?
   - Is it missing overflow: hidden on parent containers?
   - Is it Tailwind responsive breakpoints not working?
   - Something else entirely?

2. SECONDARY ISSUES (if any):
   - Are there spacing issues (margins/padding) that contribute?
   - Are there z-index or stacking context issues?
   - Are there responsive behavior issues at certain breakpoints?

3. EVIDENCE:
   - What did DevTools show?
   - What specific CSS properties are problematic?
   - Which component(s) are responsible?

Write this analysis into a new file:
- /.agent/ROOT_CAUSE_DIAGNOSIS.md

This file should be 200-300 words and guide the implementation.

STEP 5: Implementation Plan (Do NOT implement yet, just plan)
========================================================
Create a detailed plan document:
- /.agent/IMPLEMENTATION_PLAN_PHASE_11.md

This document should include:

1. SOLUTION APPROACH:
   - Which option did you choose? (A, B, or C from STEP 3)
   - Why did you choose it?
   - What is the high-level approach?

2. FILES TO MODIFY:
   - List each file that needs changes
   - Specify which sections need modification
   - Estimate complexity (low/medium/high)

3. STEP-BY-STEP IMPLEMENTATION:
   - Break down the work into 5-10 specific, actionable steps
   - Each step should be 1-2 sentences
   - Include where to add code, what to remove, what to change

4. TESTING STRATEGY:
   - How will you verify the fix works?
   - What viewport sizes must you test?
   - What user interactions must you verify?
   - How will you prevent regression?

5. ROLLBACK PLAN:
   - If the fix fails, how will you revert?
   - What Git commands will you use?
   - How will you preserve analysis files for review?

6. SUCCESS CRITERIA:
   - Categories field displays on its own row
   - Rate (%) and Max Reward display on next row in 2 columns
   - No horizontal scrolling in Category Rules section
   - Mobile (375px): fields stack vertically
   - Tablet (768px): Rate & Max Reward appear side-by-side
   - Desktop (1024px+): proper 2-column layout
   - All tests from handover checklist pass

STEP 6: Code Architecture Review
==============================
Before you implement, answer these questions about the code:

Q1: Why is CategoryMultiSelect in edit-account-dialog.tsx instead of a separate component?
A: [your answer]

Q2: What does CustomDropdown component do? (Search for it in codebase)
A: [your answer]

Q3: How does activeCategoryCallback work? Why use a ref instead of state?
A: [your answer]

Q4: Why is the scrollable container needed? Can't we just show all rules at once?
A: [your answer]

Q5: What is the relationship between LevelItem and CashbackLevelsList?
A: [your answer]

Write these Q&As to: /.agent/ARCHITECTURE_QUESTIONS.md

STEP 7: Design Decision Documentation
===================================
Create a file explaining your design choices:
- /.agent/DESIGN_DECISIONS_PHASE_11.md

This should cover:
1. Why you chose Option A/B/C
2. Why CSS fix is better than rewrite (or vice versa)
3. Which files you'll modify and why
4. What tradeoffs you're making
5. Future-proofing considerations

STEP 8: Peer Review Preparation
==============================
Even though there's no formal peer review, prepare materials as if there were:
- Create /.agent/PHASE_11_PR_SUMMARY.md that includes:
  - Problem statement
  - Solution summary
  - Files changed
  - Testing evidence
  - Screenshots before/after

STEP 9: Ready for Implementation
==============================
Once you have created:
1. /.agent/PHASE_11_ANALYSIS.md
2. /.agent/ROOT_CAUSE_DIAGNOSIS.md
3. /.agent/IMPLEMENTATION_PLAN_PHASE_11.md
4. /.agent/ARCHITECTURE_QUESTIONS.md
5. /.agent/DESIGN_DECISIONS_PHASE_11.md
6. /.agent/PHASE_11_PR_SUMMARY.md

You are ready to proceed. At that point:
1. Commit all analysis files
2. Push to branch
3. Request next steps (which will be the actual implementation)

STEP 10: Key Decisions to Make NOW
================================
Before requesting next steps, DECIDE:

[] Rewrite approach: YES / NO
[] CSS-first strategy: YES / NO
[] Will you modify CategoryMultiSelect: YES / NO
[] Will you refactor activeCategoryCallback: YES / NO
[] Will you change scrollable container approach: YES / NO

For each decision, write 2-3 sentences explaining WHY.

IMPORTANT REMINDERS:
- You are on branch: phase-11/fix-cashback-rules-overlap
- Follow all .cursorrules standards
- Do NOT modify code yet - only planning
- All analysis files must be detailed and specific
- Include evidence from DevTools (screenshots, computed CSS)
- Document tradeoffs and design rationale
- Prepare for implementation review

NEXT STEPS AFTER THIS PROMPT:
1. Complete all 10 steps
2. Create all 6 analysis/planning files
3. Commit and push: git add -A && git commit -m "Phase 11: Analysis & Planning"
4. Wait for instruction on actual implementation
5. Implementation will follow similar 10-step process

DO NOT SKIP PLANNING. Good planning = fast, safe implementation.

END OF PROMPT B
```

---

## Usage Instructions

**For Next Agent**: 

1. **First**: Work through **PROMPT A** completely. This prepares your context.
   - Read repository files
   - Analyze current code
   - Run DevTools inspection
   - Create PHASE_11_ANALYSIS.md file
   - Create development branch
   
2. **Then**: Work through **PROMPT B** completely. This prepares your solution.
   - Review handover file
   - Make strategic decisions (rewrite vs. fix)
   - Create root cause diagnosis
   - Create implementation plan
   - Create all documentation files
   - Get approval before coding

3. **Finally**: Implement based on your documented plan from PROMPT B

**Estimated Time**:
- PROMPT A (analysis phase): 2-3 hours
- PROMPT B (planning phase): 1-2 hours  
- Implementation (actual coding): 1-3 hours
- Testing & validation: 1-2 hours

**Total**: ~5-10 hours for complete Phase 11

**Success Metric**: Category Rules fields display without overlap at all viewport sizes (mobile 375px, tablet 768px, desktop 1024px+)
