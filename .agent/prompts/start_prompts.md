# 🤖 Agent Start Prompts - Money Flow 3

> **Purpose**: Dynamic prompt templates for starting new chat sessions. Copy-paste and update the phase number/file names as needed.

---

## 📋 Prompt A: Initial Context Loading

**When to use**: At the very start of a new chat session with a new agent.

**Instructions**: Copy the prompt below, replace `{PHASE_NUMBER}` with the current phase (e.g., 12, 13, 14), and paste it as your first message to the agent.

---

### Prompt Template A

```
Hi! I'm starting a new chat session for Money Flow 3 development.

STEP 1: Please read the following file to understand the project context:
- File: `.agent/prompts/onboarding.md`
- This file contains the project overview, tech stack, key concepts, and essential reading list.

STEP 2: After reading onboarding.md, please read the handover document for the current phase:
- File: `.agent/HANDOVER_PHASE_{PHASE_NUMBER}.md`
- This file contains what was completed in the previous phase and what needs to be done in this phase.

STEP 3: Summarize your understanding:
- What is the current phase number?
- What are the main objectives for this phase?
- What files/components will you likely need to work on?

Please confirm you've read both files and provide your summary.
```

**Example for Phase 12**:
```
Hi! I'm starting a new chat session for Money Flow 3 development.

STEP 1: Please read `.agent/prompts/onboarding.md` to understand the project context.

STEP 2: After reading onboarding.md, please read `.agent/HANDOVER_PHASE_12.md` for the current phase handover.

STEP 3: Summarize your understanding:
- What is the current phase number?
- What are the main objectives for this phase?
- What files/components will you likely need to work on?

Please confirm you've read both files and provide your summary.
```

---

## 🚀 Prompt B: Ready to Start Work

**When to use**: After the agent has read the onboarding and handover docs, and you're ready to begin coding.

**Instructions**: Copy the prompt below, replace `{PHASE_NUMBER}` with the current phase, and paste it to start the work.

---

### Prompt Template B

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

**Example for Phase 12**:
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

## 📝 Usage Guide

### For Each New Chat Session

1. **Copy Prompt A** → Replace `{PHASE_NUMBER}` → Send to agent
2. Wait for agent to read and summarize
3. **Copy Prompt B** → Replace `{PHASE_NUMBER}` → Send to agent
4. Agent creates branch and starts work

### Updating for New Phases

When moving to a new phase (e.g., Phase 12 → Phase 13):

1. Ensure `.agent/HANDOVER_PHASE_13.md` exists
2. Ensure `.agent/PHASE_13_PLAN.md` exists
3. Update `{PHASE_NUMBER}` in prompts from `12` to `13`
4. No other changes needed!

---

## 🎯 Benefits of This Approach

- ✅ **Consistent onboarding**: Every agent gets the same context
- ✅ **Dynamic**: Just update phase number, no need to rewrite prompts
- ✅ **Structured**: Clear steps for agent to follow
- ✅ **Efficient**: Copy-paste ready, minimal editing

---

## 📂 File Structure

```
.agent/
├── prompts/
│   ├── onboarding.md          # Master onboarding (rarely changes)
│   └── start_prompts.md       # This file (dynamic templates)
├── HANDOVER_PHASE_12.md       # Phase-specific handover
├── PHASE_12_PLAN.md           # Phase-specific plan
├── HANDOVER_PHASE_13.md       # Next phase handover
└── PHASE_13_PLAN.md           # Next phase plan
```

---

## 🔄 Workflow Diagram

```
New Chat Session
      ↓
[Prompt A] → Agent reads onboarding.md + HANDOVER_PHASE_X.md
      ↓
Agent summarizes understanding
      ↓
[Prompt B] → Agent reads PHASE_X_PLAN.md + creates branch
      ↓
Agent starts work on S1, S2, etc.
      ↓
Agent commits + pushes + creates PR
      ↓
Phase complete!
```

---

**Last Updated**: 2026-02-01  
**Version**: 1.0  
**Maintained By**: Money Flow 3 Team
