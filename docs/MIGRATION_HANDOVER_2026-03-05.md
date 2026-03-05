# PocketBase Migration Handover (2026-03-05)

## 1) Mục tiêu và phạm vi
- Hợp nhất toàn bộ work-in-progress về PocketBase migration + Google Sheets sync vào **1 branch duy nhất**: `feat/pocketbase-migration`.
- Tách và xử lý bug sheet sync riêng (đã merge ngược lại branch migrate).
- Ưu tiên ổn định runtime cho luồng:
  - Accounts details / Cashback performance (PocketBase service layer)
  - People sheet sync (`#nosync`, UI refresh, sheet formatting)

---

## 2) Quá trình đã thực hiện

### 2.1 Cashback / Accounts migration (PocketBase)
- Tạo service layer PocketBase:
  - `src/services/pocketbase/server.ts`
  - `src/services/pocketbase/account-details.service.ts`
  - `src/services/pocketbase/cashback-performance.service.ts`
- Rewire các điểm chính sang PocketBase:
  - `src/app/accounts/[id]/page.tsx`
  - `src/app/cashback/page.tsx`
  - `src/actions/cashback.actions.ts`
  - `src/app/api/cashback/stats/route.ts`
- Dọn trace Supabase ở account detail client:
  - `src/components/accounts/v2/AccountDetailViewV2.tsx` (bỏ realtime channel, dùng polling nhẹ)
- **[2026-03-05 Session 2]** Tiếp tục Phase B - cutover các luồng còn Supabase:
  - `src/app/accounts/page.tsx`: getAccounts/getCategories/getPeople/getShops → PocketBase equivalents
  - `src/actions/cashback.actions.ts`: fetchMonthlyCashbackDetails - thay getMonthlyCashbackTransactions (Supabase) bằng direct PocketBase query; xóa import thừa (getCashbackProgress, parseCycleTag, getPocketBaseAccountSpendingStatsSnapshot)
  - push-sheet.mjs preflight account check: **đã được implement sẵn** (lines 165-179), không cần thêm

### 2.2 Migration data model accounts (split cashback fields)
- Cập nhật mapper trong `scripts/pocketbase/migrate.mjs` để tách từ `cashback_config` sang cột riêng:
  - `cb_type`, `cb_base_rate`, `cb_max_budget`, `cb_is_unlimited`, `cb_rules_json`, `cb_min_spend`, `cb_cycle_type`
- Re-migrate phase accounts đã chạy thành công:
  - xóa + tạo lại 93 records accounts.

### 2.3 Google Sheets sync fixes (đã merge vào branch migrate)
- Server-side filter thống nhất `#nosync/#deprecated`:
  - `src/services/sheet.service.ts`
  - Fix root cause: `syncAllTransactions` trước đó chưa filter.
- UI refresh sau sync:
  - `src/components/people/v2/people-directory-v2.tsx`
  - `src/components/people/sheet-sync-controls.tsx`
- Apps Script people-sync:
  - `integrations/google-sheets/people-sync/Code.js`
  - Thêm guard `shouldExcludeFromSheet(...)`
  - Chuyển conditional format cho `Type=Out/In` chỉ còn cột **B** (không tô full A:J/K)
  - Bump script header/version note lên `7.9`.

---

## 3) Trạng thái hiện tại (Progress)

### Completed
- [x] Hợp nhất sheet-sync work vào migration branch.
- [x] Lọc `#nosync` nhất quán cho single/cycle/all sync.
- [x] Fix highlight đỏ chỉ cột Type (B) trên people sheet.
- [x] Cập nhật docs handover migration.
- [x] **[Session 2]** `push-sheet.mjs` preflight account check — đã có sẵn (không cần code thêm).
- [x] **[Session 2]** `/accounts/page.tsx` → PocketBase (getAccounts/getCategories/getPeople/getShops).
- [x] **[Session 2]** `cashback.actions.ts` → xóa Supabase dependency cho `fetchMonthlyCashbackDetails`; tất cả 4 exported functions đều dùng PocketBase.
- [x] **[Session 2]** Build pass sau thay đổi (`pnpm build` clean).

### In Progress / Partial
- [~] PocketBase migration chưa hoàn tất toàn bộ hệ thống — `people-actions.ts` vẫn dùng Supabase (people/debt/transaction services).
- [~] Smoke test authenticated E2E trên app route private chưa fully automated (chủ yếu manual/smoke route).

### Pending
- [ ] Hoàn thiện PocketBase-first cho `people-actions.ts` (createPerson, updatePerson, getPeoplePageData đang dùng Supabase services). **Lưu ý:** luồng sheet sync (syncAllTransactions) là OK vì đó là sheet call, không phải DB.
- [ ] Tổng hợp test matrix regression đầy đủ trước production deploy.
- [ ] Verify smoke routes sau khi merge PR vào `feat/pocketbase-migration`.

---

## 4) Issues hiện tại (People + migration dở dang)

### People / Sheet sync
1. **Push script timeout/permission confusion** — ✅ **ĐÃ CÓ** preflight check trong `push-sheet.mjs` (lines 165-179). Kiểm tra email từ Google token, fail sớm nếu mismatch.

2. **Google Sheet script deployment drift**
   - Nếu update `integrations/google-sheets/people-sync/Code.js` mà chưa push đúng script ID thì web behavior không đổi.

3. **UI state consistency**
   - Đã thêm `router.refresh()` sau sync, nhưng vẫn cần verify thêm với data lớn và concurrent edits.

### PocketBase migration
1. **Mixed backend state (còn lại sau Session 2)**
   - `/accounts`, `/accounts/[id]`, `/cashback`, `cashback.actions.ts`, `/api/cashback/stats` — **100% PocketBase** ✅
   - `people-actions.ts` vẫn dùng Supabase services (createPerson, updatePerson, getPeoplePageData, ensureDebtAccount, rolloverDebtAction).
   - `account-actions.ts` cần audit riêng.
   - Các luồng transaction/batch/debt/service vẫn Supabase (ngoài scope migration này).

2. **Data parity validation**
   - Sau re-migrate accounts, cần checklist đối soát field-level (đặc biệt cashback fields split).

3. **Realtime replacement strategy**
   - Realtime Supabase đã được tháo ở account details; hiện dùng polling.
   - Cần đánh giá lại long-term (WebSocket/PocketBase realtime/poll interval).

---

## 5) Kế hoạch chuẩn bị cho Agent tiếp theo

### Phase A - Stabilize tools ✅ DONE
- `push-sheet.mjs` preflight check đã implement sẵn; mismatch account → exit(1).

### Phase B - Migration consistency (một phần DONE)
- ✅ `/accounts/page.tsx` cutover
- ✅ `cashback.actions.ts` - `fetchMonthlyCashbackDetails` cutover
- 🔲 `people-actions.ts` — vẫn còn Supabase:
  - `createPersonAction`, `updatePersonAction` → gọi `createPerson`, `updatePerson` từ `people.service`
  - `getPeoplePageData` → gọi nhiều Supabase services (getPersonDetails, getDebtByTags, getAccounts, ...)
  - `rolloverDebtAction` → có đoạn `createClient()` trực tiếp để update `linked_transaction_id`
  - **Lưu ý:** syncAllTransactions là sheet call, không phải DB call — OK giữ nguyên.
- 🔲 `account-actions.ts` — cần audit lại.

### Phase C - Verification
- Smoke test chuẩn theo checklist:
  - People sync all/current cycle
  - `#nosync` exclusion
  - Type coloring cột B
  - Accounts list + details / Cashback pages
- Chạy lint/build trước khi merge PR.
- **PR cần tạo** từ `agent/pb-migration-20260305-accounts-cashback-pb` → `feat/pocketbase-migration`.

---

## 6) Ghi chú vận hành
- Branch làm việc chính: `feat/pocketbase-migration`
- Không cần giữ branch sheet-sync riêng nữa.
- Agent tiếp theo **không code trực tiếp trên** `feat/pocketbase-migration`; bắt buộc tạo branch mới từ base này trước khi làm việc.
- Mẫu branch đề xuất: `agent/pb-migration-<yyyymmdd>-<task>` (ví dụ: `agent/pb-migration-20260305-clasp-preflight`).
- Luồng git chuẩn cho Agent sau:
  1) `git checkout feat/pocketbase-migration`
  2) `git pull --rebase origin feat/pocketbase-migration`
  3) `git checkout -b agent/pb-migration-<yyyymmdd>-<task>`
  4) thực hiện thay đổi + commit nhỏ theo phase
  5) push branch mới và mở PR về `feat/pocketbase-migration`
- Nếu gặp timeout tooling, ưu tiên:
  1) lưu docs/handover,
  2) commit state hiện tại,
  3) chuyển bước còn lại cho agent sau bằng checklist rõ ràng.

---

## 7) Chuẩn SSH auth nhiều account (khuyến nghị)

Mục tiêu: không bị mất auth khi push và không bị lẫn account giữa `personal` và `work`.

### 7.1 Mẫu `~/.ssh/config`
```ssh
Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal
  IdentitiesOnly yes

Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work
  IdentitiesOnly yes
```

### 7.2 Map repo này về account personal (`namnt..`)
```bash
git remote set-url origin git@github-personal:rei6868/money-flow-3.git
```

### 7.3 Kiểm tra key hoạt động
```bash
ssh -T git@github-personal
```

Kỳ vọng: GitHub trả về thông báo authenticated với đúng account personal.

### 7.4 Lưu ý passphrase
- `passphrase` là mật khẩu bảo vệ private key khi tạo bằng `ssh-keygen`.
- Không nhập `github-personal` vào passphrase prompt.
- Có thể để trống (tiện) hoặc đặt passphrase (an toàn hơn).
