# **TASK: FIX CREDIT CARD LOGIC & TABLE UI OVERFLOW**

Status: PENDING

Created: 2025-11-29

Priority: CRITICAL (Financial Logic Error)

## **1\. Context**

User báo cáo logic tính toán số dư khả dụng (Available) của thẻ tín dụng bị sai nghiêm trọng và giao diện bảng (Table) bị vỡ layout trên màn hình nhỏ/trung bình.

## **2\. Issues & Solutions**

### **A. Critical Logic Error: Credit Card Balance**

* **Hiện trạng (Bug):**  
  * Limit: 150,000,000  
  * Current Balance (Debt): \~29,000,000  
  * **Displayed Available:** \~179,000,000 (Sai: Đang lấy Limit \+ Debt).  
* **Yêu cầu sửa (Fix):**  
  * Công thức đúng cho Available (Khả dụng):  
    * Available \= Credit Limit \- |Current Debt| (Lấy hạn mức trừ đi dư nợ thực tế).  
  * Logic hiển thị Current Balance:  
    * Cần review lại xem Database lưu số âm hay dương. Nếu lưu âm (Double Entry chuẩn), công thức là Limit \+ CurrentBalance.  
  * **Debug Info:**  
    * Tại component AccountCard hoặc AccountDetails, hiển thị thêm (có thể ẩn trong Tooltip hoặc chế độ debug):  
      * Total In (Tổng tiền vào/Trả nợ).  
      * Total Out (Tổng chi tiêu).  
      * Initial Balance.

### **B. UI Issue: Table Overflow**

* **Hiện trạng:** Bảng dữ liệu (UnifiedTransactionTable hoặc bảng Accounts) bị dãn quá rộng, làm vỡ layout trang, thanh scroll ngang của trình duyệt nằm tuốt dưới đáy trang web (khó thao tác).  
* **Yêu cầu sửa:**  
  * Wrap Table trong một container có overflow-x-auto.  
  * Đảm bảo thanh scroll ngang của Table nằm ngay dưới Table (không phải scroll của cả Body).  
  * Cố định (Freeze/Sticky) cột quan trọng (ví dụ: cột Actions hoặc cột Name) nếu cần thiết, hoặc chỉ cần đảm bảo scroll mượt mà.

## **3\. Implementation Plan**

1. **Update src/components/moneyflow/account-card.tsx:**  
   * Sửa function calculateAvailableBalance.  
   * Thêm hiển thị Total In / Total Out vào phần Details (hoặc hover tooltip) để User kiểm tra lại data.  
2. **Update src/components/moneyflow/unified-transaction-table.tsx (hoặc account-table.tsx):**  
   * Thêm class w-full overflow-x-auto cho wrapper div.  
   * Kiểm tra whitespace-nowrap trên các cell, nếu gây dãn quá mức thì cho phép wrap text (whitespace-normal) hoặc truncate (truncate).

## **4\. Acceptance Criteria**

* \[ \] Thẻ 150tr, tiêu 29tr \-\> Phải hiện Available là \~121tr.  
* \[ \] Bảng không làm vỡ layout ngang của trang web.  
*   
* 