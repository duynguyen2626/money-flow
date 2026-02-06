# Handover: Phase 14.1 - AI Proactive Reminders 🔔

## 📌 Tổng quan
Phase 14.1 tập trung vào việc chủ động nhắc nhở người dùng về các khoản nợ thẻ tín dụng sắp đến hạn qua hai kênh: Chatbot AI trong ứng dụng và Telegram thông báo bên ngoài.

## ⚙️ Các thành phần đã triển khai

### 1. Logic Nhắc Nhở (`src/actions/ai-reminder-actions.ts`)
- Tự động tính toán ngày đến hạn từ `cashback_config`.
- Phân loại độ khẩn cấp:
    - **Critical (Hôm nay)**: Tự động popup Chatbot trong App.
    - **High (Ngày mai)**: Hiện Badge và hiệu ứng Pulse trên nút Chatbot.
    - **Medium (Trong 5 ngày)**: Hiện tin nhắn trong lịch sử chat.

### 2. Chatbot AI (`src/components/ai/quick-add-chat-v2.tsx`)
- Tích hợp Badge thông báo (màu đỏ, có số lượng).
- Hiệu ứng Pulse (nhịp đập) khi có nhắc nhở chưa đọc.
- Tự động injecting tin nhắn hệ thống vào luồng chat.

### 3. Telegram Edge Function (`supabase/functions/daily-reminders/`)
- Chạy ngầm trên Supabase Cloud.
- Tự động quét DB và gửi tin nhắn tổng hợp qua Telegram mỗi sáng.
- **Secrets cần thiết**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

### 4. Sửa lỗi Bug (`src/lib/cashback.ts`)
- Fix lỗi không đọc được `dueDate` từ định dạng `cashback_config_v2` (MF5.3).

## 🚀 Cách bảo trì & Vận hành

### Xem Logs Edge Function
Truy cập: `https://supabase.com/dashboard/project/puzvrlojtgneihgvevcx/functions/daily-reminders/invocations`

### Deploy lại khi sửa code
```bash
supabase functions deploy daily-reminders
```

### Cập nhật Bot Token/ID
```bash
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...
```

### Hẹn giờ chạy (Cron)
Đã được thiết lập chạy lúc 8:00 AM hàng ngày (Giờ VN - tương đương 1:00 AM UTC). 
Câu lệnh SQL cấu hình nằm trong mục **Cron** của Supabase Dashboard.

---
**Status**: COMPLETED ✅
**Date**: 2026-02-06
**Branch**: `phase-14.1-ai-reminders`
