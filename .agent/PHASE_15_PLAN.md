# Phase 15 Implementation Plan - AI Intelligence & Ecosystem

## Executive Summary
Phase 15 focuses on transforming the **Bot/AI** functionality from a wizard-style keyword parser into a truly intelligent financial assistant using LLMs (Gemini/Groq). We will also introduce an AI Management dashboard, "Rolly-style" sassy personas, and expand the bot's reach to external chat platforms like Telegram and Slack.

---

## 🎯 Objectives

### 1. AI Infrastructure & Management (High Priority)
- **AI Management UI**: A new dashboard to manage API keys, select models (Gemini/Groq), and monitor quota/health.
- **Environment Configuration**: Robust setup for `GEMINI_API_KEY` and other platform tokens.
- **Persona Engine**: Implement "Rolly-style" personas (e.g., Strict, Funny, Advisor) to make interactions engaging.

### 2. Smart Parsing & External Ecosystem (High Priority)
- **LLM Migration**: Replace regex-based `intentFromInput` with Gemini 2.0 Flash for structured transaction extraction.
- **Telegram/Slack Integration**: Implement Webhook handlers to allow recording transactions directly from chat apps.
- **Rolly-style UI**: Nguân cấp `QuickAddChat` with "Mean/Advisor" feedback and preview cards before saving.

### 3. Navigation & UX Polish (Medium Priority)
- **Command Palette (Cmd+K)**: Implement a global search and action palette.
- **Mobile Bottom Nav**: Streamline navigation for mobile PWA feel.

---

## 🛠️ Implementation Steps

### S1: AI Foundation & Management
- **S1.1: AI Management UI**: Create `/settings/ai` page for configuring providers and personas.
- **S1.2: Server-side Orchestrator**: Build a unified server action to call LLMs using environment-stored keys.
- **S1.3: Rolly Persona Setup**: Implement system prompts to give the bot a personality.

### S2: External Chat Integration
- **S2.1: Telegram Webhook Handler**: Create `/api/ai/telegram` endpoint.
- **S2.2: User Linking**: Implement a mechanism to link a Telegram account to a Money Flow user.
- **S2.3: Slack App Support**: Create `/api/ai/slack` endpoint and event subscriptions.

### S3: UI/UX Refinement
- **S3.1: Global Chat Access**: Ensure `QuickAddChat` is accessible from all pages.
- **S3.2: Preview Cards**: Show a data summary card within the chat before finalizing a transaction.

---

## 📂 Files to Create/Modify
- `src/app/settings/ai/page.tsx` (New)
- `src/actions/ai-actions.ts` (Refactor to use LLM)
- `src/app/api/ai/telegram/route.ts` (New)
- `src/app/api/ai/slack/route.ts` (New)
- `src/components/moneyflow/app-layout.tsx` (Add AI Management to Sidebar)

---

## ✅ Success Criteria
- [ ] AI Manager UI allows switching between Gemini and Groq.
- [ ] 95% accuracy in parsing Vietnamese transaction strings via Gemini 2.0 Flash.
- [ ] Successfully recorded a transaction via Telegram.
- [ ] Bot provides "Rolly-style" feedback (e.g., "Stop wasting money!") based on settings.

---

**Plan Version**: 1.1 (Updated 2026-02-05)  
**Target Completion**: 2026-02-20

