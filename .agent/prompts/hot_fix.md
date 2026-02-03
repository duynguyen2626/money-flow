Hot Fix: Reverse MCC Display & Fix Transaction Flow UI

Yêu cầu thực hiện một hot fix để giải quyết các vấn đề sau:

1. Revert MCC/Category Badges Display

Agent trước đó đã hiểu nhầm và implement việc hiển thị MCC code category badge vào cột "Account Name" trên trang /txn (Transactions) thay vì trang /accounts (Accounts).

Hành động yêu cầu:

Reverse Changes: Đảo ngược (revert) các thay đổi đã thực hiện để hiển thị MCC/Category badges trong cột "Account Name" trên trang /transactions. Trang transactions không nên có các badges này ở cột Account Name.

Implement Correctly: Thực hiện việc hiển thị MCC code category badges vào đúng vị trí: cột "Account Name" trên trang /accounts. Badge nên xuất hiện bên cạnh tên tài khoản khi có thông tin MCC phù hợp.

2. Double Check & Fix UI Cột Flow (/txn page)

Kiểm tra và sửa các lỗi UI liên quan đến cột "Flow" trên trang /transactions. Vui lòng tham khảo logic hiển thị flow trong src/app/accounts/[id]/details/page.tsx hoặc src/app/people/[id]/details/page.tsx để đảm bảo tính nhất quán.

Các Scenarios cần fix:

Scenario 1: Single Flow

Lỗi: Các pills flow đôi khi không đủ rộng, dẫn đến hiển thị text bị cắt hoặc xuất hiện "Unknown".

Yêu cầu: Nếu chỉ có một flow duy nhất (single flow), pills flow nên hiển thị full width để đảm bảo nội dung được hiển thị đầy đủ và tránh xuất hiện "Unknown".

Scenario 2: Non-Credit Bank Accounts

Lỗi: Các tài khoản ngân hàng không phải là loại tín dụng (không có chu kỳ - cycle) vẫn đang hiển thị badges cycle.

Yêu cầu: Không hiển thị badges cycle cho các tài khoản ngân hàng không phải là credit type. Việc hiển thị badge cycle khi không có cycle gây nhầm lẫn và click vào không điều hướng đến trang details hợp lệ.

Scenario 3: Target Flow là People

Lỗi: Khi target flow là một người (people), hình ảnh (avatar) bị mất và thứ tự hiển thị không đúng.

Yêu cầu: Sửa lại align và thứ tự hiển thị cho đúng: [debt tag] [people name] [img]. Đảm bảo hình ảnh (avatar) của người đó được hiển thị.

Scenario 4: Entity có 2 Flows

Lỗi: Đang hiển thị category badge đối với các entity có 2 flows, gây lẫn lộn UI.

Yêu cầu: KHÔNG hiển thị category badge đối với các entity có từ 2 flows trở lên. Chỉ hiển thị category badge khi có single flow và category đó hợp lệ (như trong Scenario 1).

Scenario 5: Lỗi Badges không mong muốn

Lỗi: Một số flow không liên quan đến people nhưng lại xuất hiện các badges debt như 2026-01, Food & Drink, [2026-02].

Yêu cầu: Điều tra và loại bỏ các badges debt này khỏi các flow không phải là people hoặc không có logic liên quan đến debt/cycle.

Lưu ý:

Thực hiện các thay đổi một cách cẩn thận để không ảnh hưởng đến các tính năng khác.

Đảm bảo UI/UX nhất quán với các trang chi tiết (accounts/people details).

Kiểm tra kỹ lưỡng các trường hợp trên sau khi fix.