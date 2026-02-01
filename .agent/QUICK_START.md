# 🚀 Quick Start Guide - New Chat Session

> **Purpose**: Step-by-step guide for starting a new chat session with an AI agent for Money Flow 3 development.

---

## 📋 Flow for Starting New Chat

### Step 1: Copy Prompt A (Initial Context)
Open **`.agent/prompts/step1.md`** and copy the prompt template.

**Replace**: `{PHASE_NUMBER}` with current phase (e.g., 12, 13, 14)

**What it does**:
- Agent reads `onboarding.md` (project overview, rules, key concepts)
- Agent reads `HANDOVER_PHASE_X.md` (what was done, what needs to be done)
- Agent provides a summary of understanding

**File**: [.agent/prompts/step1.md](./.agent/prompts/step1.md)


---

### Step 2: Wait for Agent to Read and Summarize
The agent will:
1. Read `onboarding.md` (project overview, rules, key concepts)
2. Read `HANDOVER_PHASE_X.md` (what was done, what needs to be done)
3. Provide a summary of understanding

**Review** the agent's summary to ensure it understood correctly.

---

### Step 3: Copy Prompt B (Ready to Start)
After the agent confirms understanding, open **`.agent/prompts/step2.md`** and copy the prompt template.

**Replace**: `{PHASE_NUMBER}` with current phase

**What it does**:
- Agent reads `PHASE_X_PLAN.md` (detailed implementation plan)
- Agent creates a new branch
- Agent starts working on the first objective (S1)
- Agent commits frequently

**File**: [.agent/prompts/step2.md](./.agent/prompts/step2.md)


---

### Step 4: Agent Starts Work
The agent will:
1. Read the implementation plan (`PHASE_X_PLAN.md`)
2. Create a new branch
3. Start working on the first objective (S1)
4. Commit frequently

**Monitor** the agent's progress and provide feedback as needed.

---

### Step 5: Review and Merge
After the agent completes the work:
1. Review the code changes
2. Test manually
3. Review the PR
4. Merge to main

---

## 🗂️ File Structure Reference

```
.agent/
├── prompts/
│   ├── onboarding.md          # Master onboarding (read first)
│   └── start_prompts.md       # Dynamic templates (copy from here)
├── HANDOVER_PHASE_12.md       # What was done, what to do
├── PHASE_12_PLAN.md           # Detailed plan for Phase 12
└── rules/
    ├── rules.md               # Coding standards
    └── ui_rules.md            # UI standards
```

---

## ✅ Checklist for New Chat

Before starting:
- [ ] Ensure `HANDOVER_PHASE_X.md` exists
- [ ] Ensure `PHASE_X_PLAN.md` exists
- [ ] Know the current phase number
- [ ] Have `start_prompts.md` open for copy-paste

During chat:
- [ ] Paste Prompt A (replace `{PHASE_NUMBER}`)
- [ ] Wait for agent to summarize
- [ ] Paste Prompt B (replace `{PHASE_NUMBER}`)
- [ ] Monitor agent's progress

After work:
- [ ] Review code changes
- [ ] Test manually
- [ ] Review PR
- [ ] Merge to main

---

## 🎯 Example: Starting Phase 13

**Scenario**: Phase 12 is complete, starting Phase 13.

**Step 1**: Create handover and plan
- Create `.agent/HANDOVER_PHASE_13.md` (summarize Phase 12, outline Phase 13)
- Create `.agent/PHASE_13_PLAN.md` (detailed plan for Phase 13)

**Step 2**: Open new chat, paste Prompt A
```
Hi! I'm starting a new chat session for Money Flow 3 development.

STEP 1: Please read `.agent/prompts/onboarding.md` to understand the project context.

STEP 2: After reading onboarding.md, please read `.agent/HANDOVER_PHASE_13.md` for the current phase handover.

STEP 3: Summarize your understanding...
```

**Step 3**: After agent summarizes, paste Prompt B
```
Great! Now let's start Phase 13 work.

STEP 1: Read `.agent/PHASE_13_PLAN.md` for the detailed implementation plan.

STEP 2: Create a new branch: `fix/phase-13-[description]`

STEP 3: Start with the first objective...
```

**Step 4**: Agent creates branch and starts coding.

---

## 🔄 Quick Reference

| Step | Action | File to Use |
|------|--------|-------------|
| 1 | Copy Prompt A | [.agent/prompts/step1.md](./.agent/prompts/step1.md) |
| 2 | Replace `{PHASE_NUMBER}` | Current phase (12, 13, etc.) |
| 3 | Paste into new chat | - |
| 4 | Wait for summary | - |
| 5 | Copy Prompt B | [.agent/prompts/step2.md](./.agent/prompts/step2.md) |
| 6 | Replace `{PHASE_NUMBER}` | Current phase |
| 7 | Paste into chat | - |
| 8 | Monitor progress | - |


---

**Last Updated**: 2026-02-01  
**Version**: 1.0  
**Maintained By**: Money Flow 3 Team
