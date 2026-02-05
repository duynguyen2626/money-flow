# Phase 15 Implementation Plan - AI Intelligence & Voice

## Executive Summary
Phase 15 focuses on transforming the **Bot/AI** functionality from a wizard-style keyword parser into a truly intelligent financial assistant using LLMs (Gemini/OpenAI). We will also introduce voice input and optimize performance for the core table components.

---

## 🎯 Objectives

### 1. Smart Chatbot Upgrade (High Priority)
- **Migrate Logic**: Move from `intentFromInput` (regex) to LLM-based intent extraction.
- **LLM Integration**: Implement a server action to call Gemini API for parsing natural language transactions.
- **Contextual Awareness**: Chatbot should know if you're on a specific Account or Person page and prefer them as entities.
- **Natural Language Query**: Allow users to ask questions like "How much did I spend at Shopee this month?" or "Check my debt with Nam".

### 2. Voice-to-Transaction (Medium Priority)
- **Web Speech API**: Add a microphone button to the Chatbot to capture voice commands.
- **Vietnamese Support**: Ensure voice recognition and LLM parsing handle Vietnamese financial nuances correctly (e.g., "tr" for triệu, "k" for nghìn).

### 3. Navigation Polish (Secondary)
- **Bottom Tab Bar (Mobile)**: Implement a streamlined navigation for mobile users focusing on "Dashboard", "Transactions", "Accounts", and "People".
- **Search Palette (Cmd+K)**: Implement a global command palette for fast jumping between entities/pages.

### 4. Performance & Data Reliability
- **Virtual Scrolling**: Investigate virtualized list for `UnifiedTransactionTable` if transaction counts exceed 2000.
- **Batch Consistency**: Ensure Excel imports handle duplicates across years more robustly.

---

## 🛠️ Implementation Steps

### S1: LLM Transaction Parser
- **File**: `src/actions/ai-actions.ts`
- **Logic**: 
    1. Send user string to Gemini.
    2. Prompt Gemini to return a structured JSON (Type, Amount, Entity, Category, Note).
    3. Validate JSON against existing `accounts`, `people`, and `categories`.
    4. Auto-fill the `QuickAddChat` form.

### S2: Voice Command Interface
- **Component**: `src/components/ai/voice-trigger.tsx`
- **Features**: Visual feedback for recording, auto-submit after silence.

### S3: Command Palette
- **Library**: `cmdk` (Radix UI)
- **Scopes**: Search `Accounts`, `People`, `Menus`, `Transactions (by ID/Note)`.

---

## 📂 Files to Create/Modify
- `src/actions/ai-actions.ts` (New)
- `src/components/ai/quick-add-chat.tsx` (Refactor)
- `src/components/navigation/command-palette.tsx` (New)
- `src/components/navigation/mobile-nav.tsx` (New)

---

## ✅ Success Criteria
- [ ] 95% accuracy in parsing random Vietnamese transaction strings via AI.
- [ ] Voice input works on Chrome/Safari.
- [ ] App navigation feels faster on mobile via Bottom Nav.
- [ ] Command palette opens via Cmd+K and returns relevant results.

---

**Plan Version**: 1.0  
**Target Completion**: 2026-02-15
