---
description: Current Story Sprint Tasks
---

.agent/workflows/task.md (Story Sprint — Milestone 1: Abcde…)

Tên story: Milestone 1 (Abcde…) — Re-Sync Integrity + People/Accounts UI Fixes

Goal

Fix các lỗi integrity (Accounts balance re-sync) và các lỗi UI/logic ở People pages.

Ship theo PR flow với branch naming story.

Scope (chia nhỏ để dễ merge)

Vì M1 dài, tách thành M1.1 / M1.2 / M1.3 như sau:

Story M1.1 — Re-Sync Accounts Balance (PRIO #1)

Problem: Edit account balance sau khi có lịch sử giao dịch không trigger tính lại → sai số (ví dụ MSB Online đáng lẽ 27,080,282 nhưng hiển thị 30,000,000).

Requirements

Đổi nút/label “Fix Data Integrity” thành “Re-Sync”.

Re-Sync phải recompute lại balance cho mọi account dựa trên lịch sử transactions/transaction_lines (theo cách repo đang tính).

Nếu code hiện tại chưa auto-recompute khi update account → thêm logic.

Must be idempotent; chạy nhiều lần ra cùng kết quả.

Verify / Test

Case mẫu: MSB Online missing limit ban đầu 0 → sau edit nhập balance 30tr → Re-Sync phải đưa về đúng 27,080,282.

Unit/Script test (nếu có harness), hoặc manual: mở account detail trước/sau Re-Sync.

Build + typecheck pass.

Story M1.2 — People Cards: Remains vs Repaid (PRIO #2)

Problem: People cards đang show DEC 25 (Remains): <amount> nhưng thực tế đó là Total nợ của kỳ chứ không phải remains.

Requirements

Tách thành 2 hàng/badges:

Remains (nợ còn lại)

Repaid (tổng repay)

Nếu đã trả hết: Remains row hiển thị Paid + icon check.

Nếu được: 2 badge khác màu (nhẹ nhàng, theo shadcn).

Verify

Person có kỳ đã trả hết → Paid hiển thị đúng.

Tổng remains + repaid khớp với dữ liệu tính toán.

Story M1.3 — People Detail / Unified Transactions Table polish (PRIO #3)

Problems & Requirements A) Date badge colors

Type Out = đỏ, In = xanh.

Xóa spacing dư do Type badge cũ.

B) Notes column image logic

Out transactions: shop image trước notes (giữ).

Repay transactions không có shop → lấy image của account nhận tiền (ví dụ VPBank) để hiển thị.

C) Rename + fix “Accounts ➜ People” column

Repay example: “Tuan Trả 50k vào VPBank” phải show chiều to Account (không show [TO] Tuan).

Đổi tên header cột cho mượt, không dùng “➜” nữa.

Gợi ý tên: “Parties”, hoặc “From / To”, hoặc “Accounts & People” (Agent chọn 1 phương án đẹp).

D) Badges sizing + header naming

Header không dùng dấu “/”.

Badges Type/Category đồng size (height/padding/font), không lệch vì text dài/ngắn.

E) Refund/Installment icons layering

Nếu icon còn tồn tại: phải nằm “sau” avatar/image, không che UI.

Verify

Repay row hiển thị đúng “to account”.

Badge colors & spacing đúng.

Không regress refund/installment UI.

Out of Scope

Không đổi schema DB.

Không làm redesign toàn trang.

Acceptance Criteria (Milestone-level)

M1.1: Re-Sync recompute account balances đúng và idempotent.

M1.2: People cards hiển thị Remains/Repaid đúng; Paid state đúng.

M1.3: People detail table đúng color, đúng image logic, đúng column semantics, badge đồng nhất.

CI/build/typecheck pass.

Branch / PR Rules

Branch: story-{MILESTONE_ID}-{SCOPE_SLUG}

PR title: Story {MILESTONE_ID}: {TITLE}