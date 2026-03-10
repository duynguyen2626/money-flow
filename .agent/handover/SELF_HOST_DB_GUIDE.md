# Self-Host Database Setup Guide: Supabase → PostgreSQL 17

Dựa trên tài liệu hệ sinh thái **Rei-Warden** của bạn, đây là hướng dẫn chi tiết để tự host PostgreSQL 17 trên VM (GCP/Oracle), bỏ qua Memos, và tích hợp Backup lên Dropbox.

---

## 🛠️ Step 1: Truy cập Server & Quyền Root

Mở Terminal trên máy tính của bạn và thực hiện:

1. **SSH vào server:**
   ```bash
   # Thay 'key.pem' bằng file private key của bạn và 'vm-ip' bằng IP server
   ssh -i key.pem ubuntu@<vm-ip>
   ```

2. **Chuyển sang quyền Root:**
   ```bash
   sudo -i
   ```

---

## 🐘 Step 2: Cài đặt PostgreSQL 17

PostgreSQL 17 là bản mới nhất, tối ưu cho các tính toán tài chính.

1. **Thêm Repository chính thức của PostgreSQL:**
   ```bash
   apt update && apt install wget gnupg2 lsb-release -y
   sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
   wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
   apt update
   ```

2. **Cài đặt Postgres 17:**
   ```bash
   apt install postgresql-17 postgresql-contrib -y
   ```

3. **Kiểm tra trạng thái:**
   ```bash
   systemctl status postgresql
   # Bấm 'q' để thoát status view
   ```

---

## 🔑 Step 3: Tạo Database & User

1. **Mở PostgreSQL prompt:**
   ```bash
   sudo -u postgres psql
   ```

2. **Tạo Database và User (Thay `<password>` bằng mật khẩu của bạn):**
   ```sql
   CREATE DATABASE money_flow_3;
   CREATE USER rei_admin WITH PASSWORD '<password>';
   GRANT ALL PRIVILEGES ON DATABASE money_flow_3 TO rei_admin;
   -- Postgres 15+ cần quyền này trên schema public
   \c money_flow_3
   GRANT ALL ON SCHEMA public TO rei_admin;
   \q
   ```

---

## 🔄 Step 4: Di chuyển dữ liệu từ Supabase

Thực hiện lệnh này tại **máy local** của bạn (nơi có file SQL dump hoặc có thể kết nối Supabase):

1. **Dump dữ liệu từ Supabase:**
   ```bash
   # Lấy connection string từ file .env cũ của bạn
   # Ví dụ: postgresql://postgres.puzvrlojtgneihgvevcx:...@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
   pg_dump --dbname="<SUPABASE_URL>" > money_flow_backup.sql
   ```

2. **Upload lên Server:**
   ```bash
   scp -i key.pem money_flow_backup.sql ubuntu@<vm-ip>:/tmp/
   ```

3. **Restore vào Database mới (trên Server qua SSH):**
   ```bash
   sudo -u postgres psql money_flow_3 < /tmp/money_flow_backup.sql
   ```

---

## ☁️ Step 5: Cấu hình Cloudflare Tunnel (Subdomain)

Để Next.js local hoặc trên Cloud kết nối được DB mà không cần mở port Public (Security):

1. **Sử dụng `cloudflared` (đã có sẵn trong doc của bạn):**
   ```bash
   # Dashboard Cloudflare Zero Trust -> Networks -> Tunnels
   # Tạo Public Hostname mới:
   # Subdomain: db.reiwarden.io.vn
   # Service: tcp://localhost:5432
   ```

---

## 📦 Step 6: Backup lên Dropbox tự động

Dựa vào bạn đã có **Backup Manager** cổng 3001, ta sẽ tạo một cron job định kỳ dump DB vào folder mà Manager đang theo dõi (ví dụ `/backups`).

1. **Tạo Script Backup:**
   ```bash
   cat <<EOF > /usr/local/bin/backup-moneyflow.sh
   #!/bin/bash
   # Đường dẫn folder backup (phải trùng với folder Dropbox/BackupManager đang watch)
   BACKUP_PATH="/root/backups/db"
   mkdir -p \$BACKUP_PATH
   FILENAME="\$BACKUP_PATH/moneyflow_3_\$(date +%Y%m%d_%H%M%S).sql.gz"

   # Thực hiện dump và nén
   sudo -u postgres pg_dump money_flow_3 | gzip > \$FILENAME

   # Xóa backup cũ hơn 30 ngày
   find \$BACKUP_PATH -type f -mtime +30 -delete
   EOF

   chmod +x /usr/local/bin/backup-moneyflow.sh
   ```

2. **Đặt lịch Cron (Chạy lúc 2h sáng mỗi ngày):**
   ```bash
   (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-moneyflow.sh") | crontab -
   ```

---

## 🚀 Step 7: Cập nhật App (Next.js)

Thay đổi file `.env.local` để trỏ vào DB mới:

```env
# Kết nối qua Cloudflare Tunnel
DATABASE_URL="postgresql://rei_admin:<password>@db.reiwarden.io.vn:5432/money_flow_3?sslmode=disable"
```

---

**LƯU Ý QUAN TRỌNG:**
- Sau khi migrate, hãy chạy lệnh sau trên DB mới để đảm bảo các Functions của Cashback hoạt động:
  ```bash
  for file in supabase/migrations/*.sql; do psql -h localhost -U rei_admin -d money_flow_3 -f "$file"; done
  ```
