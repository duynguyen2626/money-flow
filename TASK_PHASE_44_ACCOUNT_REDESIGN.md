# **TASK: PHASE 51 \- DASHBOARD & CRITICAL BUG FIXES**

Status: PENDING

Phase: 51

Priority: URGENT (Blocker)

## **0\. Git & Workflow**

* **Branch:** feature/phase-51-dashboard-fix  
* **Commit:** fix(ui): dropdown create-new and dashboard auth

## **1\. Critical Bug Fixes (MUST FIX FIRST)**

### **A. Dropdown "Create New" Missing (Issue \#1)**

* **Problem:** Nút "Create New" bị ẩn hoặc không tồn tại trong các dropdown (Shop/Category/Account).  
* **Requirement:** User yêu cầu layout tùy biến:  
  1. **\[+ Create New\] Button:** Nằm trên cùng, cố định (Sticky Top).  
  2. **\[Search Input\]:** Ô tìm kiếm.  
  3. **\[List Items\]:** Danh sách hiển thị bên dưới.  
* **Action:** Refactor src/components/ui/combobox.tsx (hoặc component dropdown đang dùng). Đưa logic render nút "Add New" ra khỏi CommandEmpty ẩn, đặt nó thành một phần tử UI rõ ràng ở đầu danh sách.

### **B. Refund Note Pollution (Issue \#2)**

* **Problem:** Khi Refund/Void, cột Note bị tự động điền thêm tên Shop (VD: "Starbucks Cà phê...").  
* **Requirement:** Note của giao dịch Refund chỉ được chứa Note gốc. **TUYỆT ĐỐI KHÔNG** nối chuỗi Shop Name.  
* **Action:** Kiểm tra TransactionForm (useEffect mode refund).  
  * **Sai:** form.setValue('note', ${original.shop\_name} ${original.note})  
  * **Đúng:** form.setValue('note', original.note) (hoặc Refund: ${original.note}).

### **C. Dashboard "Not Authenticated" Crash (Issue \#3)**

* **Problem:** Hàm getDashboardStats ném lỗi Not authenticated làm sập trang chủ.  
* **Cause:** Việc gọi supabase.auth.getUser() trong Server Component (page.tsx) có thể bị lỗi nếu Cookie chưa được truyền đúng hoặc Token hết hạn.  
* **Action:**  
  * Trong src/app/page.tsx: Thêm redirect('/login') nếu không lấy được user, thay vì để crash.  
  * Trong src/services/dashboard.service.ts: Xử lý lỗi getUser nhẹ nhàng hơn (trả về null hoặc default data thay vì throw Error nếu không cần thiết).

## **2\. Feature: The Ultimate Dashboard**

* **Mục tiêu:** Hiển thị tổng quan tài chính (Sau khi đã fix crash).  
* **Components:**  
  * **KPI Cards:** Net Worth, Monthly Spend (Exclude Transfers), Debt.  
  * **Charts:** Spending Breakdown (Donut), Monthly Trend (Bar).

## **3\. Implementation Plan**

1. **Fix Dashboard Auth:** Sửa src/app/page.tsx và dashboard.service.ts để trang chủ load được.  
2. **Refactor Dropdown:** Viết lại Combobox theo layout User yêu cầu.  
3. **Fix Refund Note:** Xóa code nối chuỗi Shop Name.  
4. **Verify:** Test tạo mới Shop từ dropdown, Test Refund xem Note, Test reload trang chủ.  
*   
* 