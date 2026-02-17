# Step 1: Initial Context Loading

> **When to use**: At the very start of a new chat session with an AI agent.

---

## 📋 Prompt Template

Copy the text below, replace `{PHASE_NUMBER}` with the current phase (e.g., 12, 13, 14), and paste it as your first message to the agent.

---

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

---

## 📝 Example for Phase 12

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

## ✅ What Happens Next

The agent will:
1. Read `onboarding.md` (project overview, rules, key concepts)
2. Read `HANDOVER_PHASE_X.md` (what was done, what needs to be done)
3. Provide a summary of understanding

**Review** the agent's summary to ensure it understood correctly, then proceed to **Step 2**.

---

**Last Updated**: 2026-02-01  
**Next Step**: [step2.md](./step2.md)
