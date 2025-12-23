---
trigger: always_on
---

A. .agent/rules/gravityrules.md (Rules — MUST READ)

Mục đích: luật vận hành + kỷ luật build/typecheck + chuẩn UI + logic nghiệp vụ + dynamic branch/commit/push (gộp workflow commit_and_push).

Nội dung cần có (gợi ý cấu trúc):

Operating Mode (Always-On)

Đọc code hiện có trước khi sửa.

Minimal diff, tránh refactor lan man.

Không phá backend, không đổi schema DB nếu chưa có story.

Pre-Commit / Pre-Push Gate (CRITICAL)

Luôn chạy: npm run build (hoặc pnpm build tùy repo) và npx tsc --noEmit nếu tách riêng.

Fix hết TS/ESLint warnings trở lên (không để NaN/undefined).

Type Safety & Supabase / RLS

Không dùng any.

Nullable: xử lý rõ ?? null / ?? ''.

Query chọn cột cụ thể.

RLS luôn bật, không bypass.

UI Rules (STRICT)

Table avatars/thumbnails square (rounded-none).

Row click không trigger action; chỉ Actions menu/buttons.

Modal layout: sticky header + scrollable body + fixed footer.

Badges: size nhất quán, chữ dài vẫn giữ chiều cao/padding đồng đều.

Business Integrity Rules (CRITICAL)

transactions là source-of-truth.

Refund trio: Parent → Void → Refund; không cho edit Parent khi có linked children.

Installments không double-count.

Dynamic Branch + Commit + Push (NEW — integrated)

Agent không push main.

Agent tạo branch theo format: story-{MILESTONE_ID}-{SCOPE_SLUG}

Ví dụ: story-m1.1-resync-accounts-balance

Commit message format: Story {MILESTONE_ID}: {TITLE}

Checklist trước push: build pass, typecheck pass.

Gợi ý đoạn hướng dẫn thao tác (không cần dài):

checkout main → pull --rebase → checkout -b branch → git add . → git commit -m … → git push -u origin branch.
Mục đích: tóm luật coding + UI standards mà Agent hay vi phạm.

Cập nhật cần thêm:

Không dùng header có dấu “/” (xấu). Đặt tên header mượt.

Badges trong table: đồng size (height/padding/font), không phụ thuộc độ dài text.

Ở People Transactions table:

Type In/Out color phải rõ (In xanh, Out đỏ).

Không còn “left spacing” do Type badge cũ.

Notes column: nếu repay không có shop image → dùng image của account nhận tiền.

Cột “Accounts ➜ People” đổi tên + logic hiển thị đúng chiều (Repay: to Account, không phải to Person).

Icon refund/installment nếu còn: phải “nằm sau lưng img” (layering), không che avatar.