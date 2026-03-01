Proposal: Di chuyển Money Flow từ Supabase sang Self-hosted Pocketbase

Tài liệu này đóng vai trò là Agenda và Technical Specification dành cho AI Agent để thực hiện việc chuyển đổi hạ tầng backend của ứng dụng "Money Flow".

1. Bối cảnh Hệ thống (Current Infrastructure)

Máy chủ: Google Cloud Platform (GCP) VM Instance - Dòng e2-micro (Nằm trong gói Always Free Tier).

Hệ điều hành: Linux (Ubuntu/Debian) chạy Docker & Docker Compose.

Tên miền & Kết nối: Đã có reiwarden.io.vn kết nối qua Cloudflare Tunnel (Ẩn IP, bảo mật cao).

Dịch vụ đang chạy: Vaultwarden, Backup Manager App.

2. Mục tiêu Di chuyển (Migration Goals)

Loại bỏ Supabase: Chuyển toàn bộ Database, Auth và Realtime sang Pocketbase để kiểm soát dữ liệu 100%.

Tối ưu Chi phí: Đảm bảo hệ thống vận hành với mức phí 0đ (Zero Cost) mãi mãi trên tài nguyên sẵn có của GCP.

Nâng cao Hiệu suất: Tận dụng "Always-on" của VM để thực hiện các tính toán Cashback và số dư tức thì (Realtime) mà không bị lỗi "Cold Start" như Supabase Edge Functions.

3. Kiến trúc Đề xuất (Proposed Architecture)

Backend: Pocketbase (chạy dưới dạng Docker container).

Database: SQLite (được Pocketbase quản lý), tối ưu cho các giao dịch tài chính cá nhân.

Realtime: Sử dụng Server-Sent Events (SSE) mặc định của Pocketbase.

Logic Backend (Cashback/Balance): Viết trực tiếp bằng JavaScript/TypeScript Hooks trong Pocketbase (PB_Hooks).

4. Danh sách Công việc (Migration Agenda)

Giai đoạn 1: Chuẩn bị Môi trường

Cập nhật docker-compose.yml để thêm service pocketbase.

Mount volume /pb_data ra thư mục /root/money-flow-pb-data trên VM để đảm bảo tính bền vững dữ liệu.

Cấu hình Cloudflare Tunnel trỏ subdomain api-db.reiwarden.io.vn về port 8090.

Giai đoạn 2: Thiết kế Schema & Logic

Tạo các Collection: users, transactions, categories, wallets.

Viết Server-side Hooks: * OnBeforeCreate (transactions): Tự động tính toán số tiền cashback dựa trên loại chi tiêu.

OnAfterCreate/Update (transactions): Tự động cộng/trừ số dư (Balance) trong collection wallets.

Đảm bảo tính nhất quán dữ liệu (Transaction Isolation).

Giai đoạn 3: Migration Dữ liệu (nếu có)

Export dữ liệu từ Supabase (PostgreSQL) sang CSV hoặc JSON.

Import vào Pocketbase thông qua API hoặc script Node.js.

Giai đoạn 4: Tích hợp Hệ thống Backup

Cập nhật ứng dụng Backup Manager để theo dõi thêm thư mục /pb_data.

Nén và đẩy bản sao lưu Database lên Dropbox/Google Drive hàng ngày.

5. Yêu cầu dành cho Agent

Nghiên cứu cấu trúc docker-compose.yml hiện tại của người dùng.

Cung cấp mã nguồn cho các PB_Hooks xử lý logic tài chính (Cashback, Balance).

Hướng dẫn cập nhật Frontend (React/Vue/Flutter) để chuyển đổi từ Supabase SDK sang Pocketbase SDK.

Kiểm tra tài nguyên RAM/CPU trên VM để đảm bảo không bị quá tải khi chạy song song nhiều app.

Ghi chú: Ưu tiên hàng đầu là giữ cho hệ thống hoạt động ổn định và không phát sinh bất kỳ chi phí nào ngoài gói Free Tier của Google Cloud.