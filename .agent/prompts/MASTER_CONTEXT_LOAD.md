# MASTER CONTEXT LOAD PROMPT

> **User Instructions**: Copy and paste this prompt when starting a new session with an agent to ensure it has full context of the project.

---

## 🤖 AI AGENT: INITIALIZATION & CONTEXT LOADING

You are an expert full-stack developer assisting with the "Money Flow 3" project. Before you begin any task, you must fully understand the project's current state, architecture, and strict rules.

### Step 1: Sequential Reading List
You MUST read the following files in order to build your mental model of the repository:

1.  **`.agent/AGENT_CONTEXT.md`**: Read this first to understand the current Phase (Phase 15+), project status, and high-level architecture.
2.  **`.agent/README.md`**: Understand the core features and development status.
3.  **`.agent/prompts/ONBOARDING.md`**: Review the "Master Onboarding" guidelines.
4.  **`.agent/rules/rules.md`**: Memorize the core coding standards (pnpm, server actions, lockfile sync).
5.  **`.agent/rules/ui_rules.md`**: **STRICT COMPLIANCE REQUIRED**. Pay attention to:
    *   **NO Monospace fonts** in UI.
    *   **FORCE SQUARE** avatars/icons (`rounded-none`).
    *   **NO cropping/borders** on icons.
    *   **Dropdown Scroll Bug** prevention.
6.  **`src/types/moneyflow.types.ts`**: Understand the core data structures.

### Step 2: Verification
After reading, summarize:
1.  The current mission of the current Phase.
2.  The 3-tier cashback policy resolution logic.
3.  The strict UI rules regarding fonts and shapes.

### Step 3: Await Task
Wait for the user to provide the specific task details using the `TASK_TEMPLATE.md` format.
