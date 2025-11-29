# **TASK: FIX ACCOUNT LOGIC, UI BUGS & UNIFY DATA**

Status: PENDING

Created: 2025-11-29

Priority: CRITICAL

## **1\. Context**

User báo cáo hàng loạt vấn đề về UI/UX và Logic trên trang Accounts, đặc biệt là cách hiển thị Thẻ tín dụng (Parent/Child) và lỗi giao diện bảng.

## **2\. Issues & Solutions**

### **A. UI/UX Bugs**

1. **Missing Quick Action (+):**  
   * **Lỗi:** Thẻ tín dụng thiếu nút "Quick Add Transaction" (+) trên Card giống như thẻ ngân hàng.  
   * **Fix:** Thêm nút (+) vào AccountCard cho loại credit\_card.  
2. **Modal Not Closing:**  
   * **Lỗi:** Khi tạo tài khoản xong, modal "Success/Done" không tự đóng.  
   * **Fix:** Kiểm tra state open của Dialog sau khi submit thành công.  
3. **Page Overflow (Scroll Ngang):**  
   * **Lỗi:** Trang details bị thanh cuộn ngang của trình duyệt chiếm dụng, phải kéo cả trang mới xem được hết bảng.  
   * **Fix:**  
     * Layout chính của page phải fixed width hoặc max-w-screen.  
     * Table phải nằm trong container overflow-x-auto.  
     * Thanh scroll ngang phải nằm ngay dưới Table (inside container) chứ không phải scroll của window.

### **B. Logic & Data Display (CRITICAL)**

1. **Credit Card Metrics:**  
   * **Hiện tại:** Hiển thị Available gây rối (179tr??). Tooltip hiển thị Raw Balance khó hiểu.  
   * **Yêu cầu mới:**  
     * **Con số chính (Big Number):** Hiển thị **Current Balance** (Dư nợ hiện tại). Nếu Database lưu dương \-\> Hiển thị số âm (màu đỏ/cam) để thể hiện là nợ.  
     * **Con số phụ:** Hiển thị "Limit: ..." và "Available: ..." (Available \= Limit \- Balance) nhỏ hơn ở dưới.  
2. **Parent \- Child Relationship:**  
   * **Child Card (Vd: Vcb Signature 2):**  
     * Phát hiện qua parent\_account\_id hoặc cashback\_config.sharedLimitParentId.  
     * **Badge:** Hiển thị "Linked / Thẻ Phụ" \+ Tên thẻ Parent.  
     * **Limit:** Hiển thị Limit của Parent (badge "Shared Limit").  
     * **Balance:** Hiển thị Balance riêng của thẻ con (nếu có) và dòng tham chiếu Balance tổng của Parent.  
     * **Tuyệt đối không** hiển thị Available ảo (vì dùng chung hạn mức).  
   * **Parent Card (Vd: Vcb Signature):**  
     * **Badge:** "Main / Thẻ Chính".  
     * Hiển thị danh sách thẻ con đang link vào (nếu UI cho phép).

### **C. Code Refactor: Unify Image Field**

* **Vấn đề:** Code đang lẫn lộn giữa img\_url và logo\_url.  
* **Giải pháp:** Thống nhất dùng **logo\_url** trên toàn bộ hệ thống (Database & Code).

## **3\. Implementation Plan**

### **Step 1: Database Standardization**

* Chạy Migration để đổi tên cột img\_url \-\> logo\_url (hoặc merge data).  
* Refactor code TypeScript: Replace all img\_url \-\> logo\_url.

### **Step 2: Fix UI Components**

* **account-card.tsx:**  
  * Thêm nút (+).  
  * Viết lại logic hiển thị Balance cho Credit Card (Show Debt as Main).  
  * Thêm logic check sharedLimitParentId để render giao diện Parent/Child.  
* **create-account-dialog.tsx:** Fix lỗi đóng modal.  
* **unified-transaction-table.tsx:** Bọc div với overflow-x-auto và max-w-full.

### **Step 3: Verify Logic**

* Check thẻ Child (Balance 0\) \-\> Phải hiện đúng Link với Parent (Limit 150tr).  
* Check thẻ Parent \-\> Phải hiện đúng Balance nợ (\~29tr).  
*   
* 