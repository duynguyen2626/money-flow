# **Master Plan: Nâng cấp Hệ sinh thái Rei-Warden (GCP Free Tier)**

Tài liệu này cung cấp lộ trình chi tiết để AI Agent thực hiện cài đặt Memos, di chuyển ứng dụng Money Flow từ Supabase sang Pocketbase và tối ưu hóa hệ thống Backup.

## **1\. Tình trạng Hệ thống Hiện tại**

* **Hạ tầng:** Google Cloud VM (e2-micro) tại vùng US (Always Free).  
* **Kết nối:** Cloudflare Tunnel bảo mật cao cho reiwarden.io.vn.  
* **Ứng dụng đã chạy:** \- **Vaultwarden:** Quản lý mật khẩu (Cổng 8080).  
  * **Backup Manager:** Đã cấu hình Dropbox ổn định (Cổng 3001).  
* **Dữ liệu:** Lưu trữ tại /vw-data và /root/rei-warden-manager/config.

## **2\. Mục tiêu Giai đoạn tiếp theo**

1. **Self-host Memos:** Cài đặt ứng dụng ghi chú nhanh cá nhân.  
2. **Migrate Money Flow:** Chuyển Database/Auth từ Supabase sang Pocketbase để tối ưu tốc độ tính toán (Cashback/Balance) và 0đ chi phí.  
3. **Hợp nhất Backup:** Đảm bảo một lệnh Run Backup sẽ nén toàn bộ dữ liệu của Vaultwarden \+ Memos \+ Pocketbase đẩy lên Dropbox.

## **3\. Danh mục Công việc dành cho Agent**

### **Giai đoạn A: Mở rộng Hạ tầng Docker**

* Cập nhật docker-compose.yml để thêm 2 service mới:  
  * **Memos:** Cổng 5230, lưu dữ liệu tại /root/memos-data.  
  * **Pocketbase:** Cổng 8090, lưu dữ liệu tại /root/money-flow-pb-data.  
* Cấu hình Network: Đảm bảo tất cả các App nằm chung warden-net để giao tiếp nội bộ.

### **Giai đoạn B: Logic Backend cho Money Flow (Pocketbase Hooks)**

* **Yêu cầu:** Agent cần viết các Server-side Hooks bằng JavaScript để xử lý nghiệp vụ tài chính ngay khi dữ liệu được ghi vào DB:  
  * OnBeforeCreate: Tự động tính toán số tiền Cashback dựa trên Category.  
  * OnAfterCreate: Cập nhật số dư (Balance) vào bảng Wallet tương ứng.  
* **Realtime:** Kích hoạt tính năng Subscription của Pocketbase để Client nhận thông báo số dư mới tức thì.

### **Giai đoạn C: Cấu hình Cloudflare Tunnel (Subdomains)**

* Hướng dẫn người dùng tạo thêm các Public Hostname trên Cloudflare Zero Trust:  
  * notes.reiwarden.io.vn \-\> http://localhost:5230  
  * api-db.reiwarden.io.vn \-\> http://localhost:8090

### **Giai đoạn D: Nâng cấp App Backup (Unified Backup)**

* Sửa mã nguồn Backend của Backup Manager:  
  * Thay đổi lệnh tar để nén đồng thời 3 thư mục: /vw-data, /memos-data, và /pb-data.  
  * Đảm bảo tên file backup có chứa timestamp và được đẩy lên đúng thư mục /backups trên Dropbox.

## **4\. Nguyên tắc Triển khai (Bắt buộc)**

1. **Chi phí 0đ:** Không sử dụng bất kỳ dịch vụ trả phí nào của GCP (Snapshot, Cloud Functions, v.v.).  
2. **Persistence:** Tất cả cài đặt quan trọng phải nằm trong file settings.json tại /app/config.  
3. **Security:** \- SIGNUPS\_ALLOWED=false cho Vaultwarden.  
   * Pocketbase Admin phải có mật khẩu phức tạp.  
   * Sử dụng JWT\_SECRET mạnh cho các API nội bộ.

## **5\. Hướng dẫn Agent Thực hiện nhanh**

* Hãy cung cấp các khối lệnh cat \<\<EOF để người dùng có thể dán trực tiếp vào SSH nhằm cập nhật docker-compose.yml và các file cấu hình backend.  
* Nếu có thay đổi về Frontend (UI mới), hãy hướng dẫn quy trình npm build bên trong Docker để không làm treo máy ảo (do RAM yếu).