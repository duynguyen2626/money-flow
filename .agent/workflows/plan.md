Implementation Plan - Split Bill v2 (Manager Mode)
Status: Phase 1 complete (Split Bill MVP)

Progress Update (Phase 1)
- Transaction Form: split bill toggle, participants, auto split, paid-before, repay-specific behavior. [Done]
- People Split Bill tab: manager list, row detail, quick repay entry. [Done]
- Capture: copy table and copy QR with preview modal. [Done]
- Data: base transaction + child split rows with metadata linking. [Done]

Phase 2 Plan - Chatbot (New Chat Start)
- Add a "Start Chat" entry point to open a new chat session.
- Create a chat session record and route to a new chat page.
- Provide a minimal prompt builder and stub backend (no AI automation yet).
- Wire chat context to split-bill data (read-only) for future suggestions.
