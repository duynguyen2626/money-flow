# Step 2: Ready to Start Work

> **When to use**: After the agent has read the onboarding and handover docs (Step 1), and you're ready to begin coding.

---

## 📋 Prompt Template

Copy the text below, replace `{PHASE_NUMBER}` with the current phase, and paste it to start the work.

---

```
Great! Now let's start Phase {PHASE_NUMBER} work.

STEP 1: Read the implementation plan:
- File: `.agent/PHASE_{PHASE_NUMBER}_PLAN.md`
- This file contains detailed investigation steps, potential solutions, and verification plans.

STEP 2: Create a new branch:
- Branch name: `fix/phase-{PHASE_NUMBER}-[brief-description]`
- Example: `fix/phase-12-critical-bugs`

STEP 3: Start with the first objective (S1):
- Follow the investigation steps in the plan
- Add logging/debugging as needed
- Test thoroughly before moving to the next objective

STEP 4: Commit frequently:
- Use descriptive commit messages
- Follow the format: `<type>: <description>`
- Types: fix, feat, chore, docs, refactor

Please confirm you're ready to start and let me know when you've created the branch.
```

---

## 📝 Example for Phase 12

```
Great! Now let's start Phase 12 work.

STEP 1: Read `.agent/PHASE_12_PLAN.md` for the detailed implementation plan.

STEP 2: Create a new branch: `fix/phase-12-critical-bugs`

STEP 3: Start with S1 (Category Badges):
- Investigate if category badges are implemented or missing
- Check data fetching logic
- Check rendering logic in unified-transaction-table.tsx

STEP 4: Commit frequently with descriptive messages.

Please confirm you're ready to start and let me know when you've created the branch.
```

---

## ✅ What Happens Next

The agent will:
1. Read the implementation plan (`PHASE_X_PLAN.md`)
2. Create a new branch
3. Start working on the first objective (S1)
4. Commit frequently

**Monitor** the agent's progress and provide feedback as needed.

---

**Last Updated**: 2026-02-01  
**Previous Step**: [step1.md](./step1.md)
