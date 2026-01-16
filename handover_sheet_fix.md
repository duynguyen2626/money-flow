# Handover: Sheet Sync Logic Fix (Round 10 - The "Grey Row" Fix)

## Issue Analysis
-   **Bug 1: Grey Rows**: Các dòng dữ liệu mới insert bị background xám.
    -   *Nguyên nhân*: `insertRows` copy định dạng từ Header (Row 1). Hàm reset background (`applyBordersAndSort`) không chạy do logic check `ID` bị sai hoặc return sớm.
-   **Bug 2: Summary Table lệch**: Bảng Summary bị đẩy xuống Row 9+ thay vì ở đầu.
    -   *Nguyên nhân*: `setupSummaryTable` được gọi QUÁ SỚM (trong `setupNewSheet`), sau đó lệnh `insertRows` chèn dòng vào làm bảng này bị đẩy xuống dưới. Hàm vẽ lại (bước cuối) lại không chạy do Bug 1.

## Fix Applied (`integrations/google-sheets/people-sync/Code.js`)
1.  **Delayed Summary Setup**:
    -   Đã **XÓA** dòng gọi `setupSummaryTable` trong hàm khởi tạo `setupNewSheet`.
    -   Chỉ gọi hàm này DUY NHẤT 1 LẦN ở bước cuối cùng (`applyBordersAndSort`).
2.  **Always Run Styling**:
    -   Sửa hàm `applyBordersAndSort`: Bỏ `if (lastAutoRow < 2) return`.
    -   Chia làm 2 phần:
        -   Phần 1: Format Data (chỉ chạy nếu có data). -> **Force White Background**.
        -   Phần 2: Format Summary (LUÔN LUÔN CHẠY). -> **Clear L:N & Redraw L2:N6**.

## Verification Steps
1.  Chạy lệnh update:
    ```bash
    npm run sheet:people
    ```
2.  Vào Web App -> **Sync lại**.
3.  Kết quả mong đợi:
    -   Bảng dữ liệu: Nền trắng, chữ đen (kể cả dòng mới insert).
    -   Bảng Summary: Luôn nằm cố định ở góc trên bên phải (L2:N6), không bị trôi, không bị duplicate.
    -   Bank Info: Nằm đúng chỗ.
