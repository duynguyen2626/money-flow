# **TASK: PHASE 45 \- REBUILD CASHBACK DETAILS PAGE (PROFIT TRACKING)**

Status: COMPLETED

Phase: 45

Priority: HIGH (Core Feature)

## **0\. Git & Workflow**

* **Branch Name:** feature/phase-45-cashback-details  
* **PR Message:** feat(phase-45): rebuild cashback details page with profit columns

## **1\. Objective**

Xây dựng lại trang /cashback/\[id\] thay thế cho màn hình "Under Construction". Trang này phải sử dụng giao diện Table chuẩn mực, đồng bộ với /transactions, nhưng có thêm các cột tính toán lợi nhuận Cashback chuyên sâu.

## **2\. Requirements**

### **A. Page Layout & Navigation**

* **Navigation:** Đảm bảo click vào Card ở trang /cashback sẽ navigate sang /cashback/\[id\].  
* **Layout Structure:**  
  * **Header:** Tên kỳ Cashback, Tổng tiền hoàn dự kiến, Progress Bar (nếu có Cap).  
  * **Body:** Table hiển thị danh sách giao dịch thuộc kỳ này.  
  * **Style:** Sử dụng layout chuẩn: Container \> Header \> Filter \> Table Wrapper (Overflow-x-auto).

### **B. Special Table Columns (The "Cashback Table")**

Thay vì dùng UnifiedTransactionTable mặc định (vốn chỉ hiện Note/Amount), cần tạo một biến thể hoặc cấu hình cột đặc biệt cho trang này để hiển thị 3 chỉ số quan trọng:

1. **Initial Back (Hoàn từ Ngân hàng):**  
   * **Value (Main):** Số tiền nhận được (Ví dụ: 10.000).  
   * **Sub-text (Gray/Small):** Công thức (Ví dụ: 1.000.000 \* 1%).  
   * *Logic:* Lấy Transaction Amount \* Bank Config Rate (từ cashback\_config của Account).  
2. **People Back (Hoàn cho người nhờ):**  
   * **Value (Main):** Số tiền phải trả lại (Ví dụ: 8.000).  
   * **Sub-text:** Tỉ lệ (Ví dụ: 0.8% hoặc User Rate).  
   * *Logic:* Lấy từ field cashback\_share\_percent hoặc logic People Transaction liên quan.  
3. **Profit (Lợi nhuận thực):**  
   * **Value (Main):** Initial Back \- People Back (Ví dụ: 2.000).  
   * **Sub-text:** Chênh lệch lãi suất (Ví dụ: 1% \- 0.8%).  
   * *Highlight:* Màu Xanh (Dương) hoặc Đỏ (Âm/Lỗ).

### **C. Data Logic**

* Fetch transactions dựa trên cashback\_cycle\_tag hoặc month tương ứng với ID của kỳ Cashback.  
* Cần join với bảng accounts để lấy cashback\_config (tỷ lệ hoàn tiền của ngân hàng).

## **3\. Implementation Steps**

1. **Create Component:** src/components/cashback/cashback-transaction-table.tsx  
   * Clone cấu trúc table chuẩn.  
   * Custom phần columns để render được cell có 2 dòng (Value \+ Subtext).  
2. **Update Page:** src/app/cashback/\[id\]/page.tsx  
   * Load data transaction.  
   * Tính toán các chỉ số Initial, People, Profit cho từng row trước khi pass vào table.  
3. **Verify:**  
   * Giao diện gọn gàng, scroll ngang ok.  
   * Công thức hiển thị đúng.  
*   
* 