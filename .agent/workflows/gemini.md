---
description: Money Flow 3 - Milestone 1 Context
---

B. .agent/workflows/gemini.md (Context — MUST READ)

Mục đích: context dự án để Agent không “đi lạc”, nhắc các khái niệm domain và chuẩn UI hiện tại.

Cập nhật cần thêm theo tình hình mới nhất:

Stack: Next.js 15 App Router + TS + Tailwind/shadcn + Supabase.

Conventions UI table: avatars square, Actions menu, row click disabled.

Accounts: credit card rules, cashback model (nếu còn dùng), nhưng story hiện tại tập trung integrity + UI people/accounts.

New issue context:

Browser tab icon (favicon) đang deploy vẫn hiện cloud cũ.

Accounts balance: khi account thiếu limit ban đầu = 0, sau edit balance bị lệch vì không resync theo lịch sử giao dịch.

People pages: Remains vs Total per cycle đang nhầm; unify transactions table column mapping/badges bị lệch.