Bạn đang ở trong repo Rei Warden (frontend + backend) dùng Supabase làm nguồn chính, PocketBase làm read replica.

1) Đọc kỹ file docs/MIGRATION_HANDOVER_2026-03-06.md và toàn bộ code dưới src/services/pocketbase/* để nắm bối cảnh.

2) Giả định rằng:
   - Supabase hiện vẫn là nguồn dữ liệu CHUẨN.
   - Database PocketBase trên VPS đã CORRUPT hoàn toàn và đang được reset sạch.
   - Nhiệm vụ của bạn là dựng lại schema + data PocketBase bằng cách đọc dữ liệu từ Supabase và ghi sang PocketBase qua HTTP API.

3) Thực hiện các việc sau trên một branch mới:

   a. Tạo branch:
      git checkout main
      git pull origin main
      git checkout -b agent/pb-migration-$(date +%Y%m%d)-rebuild

   b. Đọc docs/MIGRATION_HANDOVER_2026-03-06.md, đặc biệt:
      - Phần mapping Collection ↔ Supabase tables
      - Phần quy tắc ID: toPocketBaseId(supabaseUUID)
      - Quy tắc log: [DB:PB] và [DB:SB]
      - Quy tắc "Supabase là source of truth, PB chỉ là read replica"

   c. Viết một script Node/TS (ví dụ trong scripts/pb-sync/):
      - Kết nối Supabase (dùng env hiện có trong project).
      - Kết nối PocketBase qua REST API (base URL, admin token đọc từ env).
      - Với từng entity (accounts, categories, people, shops, transactions, ...):
          * Đọc toàn bộ data từ Supabase.
          * Ánh xạ field sang schema PocketBase hiện tại.
          * Ghi sang PocketBase theo batch (tối ưu perPage, rate limit).
          * Ghi log [DB:PB] rõ ràng khi sync.
      - Script phải có khả năng:
          * Full sync lần đầu (truncate collection PB trước khi fill).
          * Incremental sync (dựa vào updated_at hoặc equivalent) nếu sau này cần.

   d. Đảm bảo KHÔNG thay đổi bất kỳ write path nào của Supabase đang phục vụ production:
      - Không xoá / sửa các hàm write Supabase hiện có.
      - Mọi write sang PocketBase là fire-and-forget: void fn().catch(err => console.error(...))

   e. Sau khi script viết xong:
      - Thêm hướng dẫn chi tiết vào docs/MIGRATION_HANDOVER_2026-03-06.md hoặc docs/PB_SYNC.md:
          * Cách đặt env (PB URL, PB admin token, Supabase keys).
          * Cách chạy full sync và incremental sync.
          * Cách verify: log, các trang /, /transactions, /accounts phải đọc từ PB ổn định.

4) Fix P0 bug “getPocketBaseShops 400” như trong handover:
   - Đọc src/services/pocketbase/account-details.service.ts → hàm getPocketBaseShops.
   - Thử bỏ sort/filters, dùng listAllRecords('shops', {}).
   - Nếu vẫn 400: kiểm tra PocketBase collection “shops” trong Admin UI (API rules, indexes).
   - Log lại đầy đủ [DB:PB] khi call API để debug.

5) Sau khi xong:
   - Chạy lại toàn bộ luồng đọc:
       / → accounts.list, categories.list, people.list, shops.list qua PB.
       /transactions → transactions.unified.list qua PB.
       /accounts → accounts.list qua PB.
   - Đảm bảo fallback Supabase vẫn hoạt động nếu PB tạm thời lỗi.

Tuân thủ nghiêm túc các quy tắc:
- Supabase là nguồn dữ liệu duy nhất, KHÔNG migrate write business logic sang PB.
- PB chỉ dùng để offload read + cache.
- Không chạm vào phần hạ tầng Docker/VPS, Cloudflare, Vaultwarden.

Khi kết thúc, trả về:
- Danh sách file đã sửa / thêm.
- Cách chạy script sync PB.
- Các edge case đã xử lý (pagination, deleted records, conflict).
