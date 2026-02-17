# Prompt: Initial Project Immersion

> **Purpose**: Use this prompt when starting a new major task or when a new agent joins. It ensures the agent reads all critical documentation before writing code.

---

## 📋 Prompt Template

Copy and paste the text below:

```markdown
Hi! I'm starting a development session for Money Flow 3. To ensure we are aligned on rules, architecture, and standards, please read the following files in order:

## 1. Project Overview & Rules
- `README.md`: High-level overview and tech stack.
- `.agent/prompts/onboarding.md`: Master onboarding guide (Key concepts, types, structure).
- `.agent/rules/rules.md`: Core coding standards (Type safety, Server Actions, RSC).
- `.agent/rules/ui_rules.md`: STRICT UI/UX standards (Square avatars, no mono fonts, table layout).

## 2. Recent Context & Handover
- `.agent/glossary.md`: Abbreviations and common terms.
- Read the latest HANDOVER file (e.g., `.agent/HANDOVER_PHASE_75.md` or similar).

## 3. Database Schema
- `database/latest_schema.sql`: Read the current SQL schema to understand table relationships.

---

## 🚀 Requirement for your response:
1. Confirm you have read all the above files.
2. Summarize the **Single Source of Truth** principle for this project.
3. List 3 **STRICT UI rules** regarding images and typography that you must follow.
4. Briefly describe the current **Phase** we are in based on the handover file.

Wait for my instruction before starting any code changes.
```
