// MoneyFlow 3 - Google Apps Script (Batch Management)
// VERSION: 1.1 (DIAGNOSTIC + ROBUSTNESS)
// Task: Fix MBB sync discrepancy, improve sheet selection, and return diagnostic info.

function doPost(e) {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        if (!ss) {
            // If not container-bound, this might fail. Let's return error early if so.
            throw new Error("Target Spreadsheet not found (getActiveSpreadsheet returned null).");
        }

        var data;
        try {
            data = JSON.parse(e.postData.contents);
        } catch (jsonErr) {
            throw new Error("Failed to parse JSON payload: " + jsonErr.toString());
        }

        // Detect bank_type from payload (default to VIB for backward compatibility)
        var bankType = data.bank_type || 'VIB';

        // 1. CHỌN ĐÚNG TÊN SHEET
        // Allow dynamic sheet name from payload, fallback to defaults
        var defaultSheetName = bankType === 'MBB' ? "eMB_BulkPayment" : "Danh sách chuyển tiền";
        var sheetName = data.sheet_name || defaultSheetName;

        var sheet = ss.getSheetByName(sheetName);

        // Robust Fallback: 
        // 1. If user provided name or default exists, use it.
        // 2. Otherwise, pick the first sheet instead of creating.
        if (!sheet) {
            var sheets = ss.getSheets();
            if (sheets && sheets.length > 0) {
                sheet = sheets[0];
            } else {
                throw new Error("No sheets found in current spreadsheet.");
            }
        }

        // 2. SETUP HEADER DỰA TRÊN BANK_TYPE (Chỉ set nếu dòng 4 trống hoặc chưa có STT)
        // Check if range is valid
        var a4Range = sheet.getRange("A4");
        var a4Value = a4Range ? a4Range.getValue() : null;

        if (!a4Value || a4Value.toString().indexOf("STT") === -1) {
            if (bankType === 'MBB') {
                // MBB Format: STT | Account | Name | Bank Name(Code) | Amount | Detail
                sheet.getRange("A4:F4").setValues([[
                    "STT",
                    "Số tài khoản nhận",
                    "Tên người nhận",
                    "Tên ngân hàng nhận",
                    "Số tiền chuyển",
                    "Nội dung giao dịch"
                ]]);
            } else {
                // VIB Format: STT | Name | Account | Amount | Detail | Bank Name
                sheet.getRange("A4:F4").setValues([[
                    "STT",
                    "Tên người nhận",
                    "Số tài khoản nhận",
                    "Số tiền chuyển",
                    "Nội dung giao dịch",
                    "Tên ngân hàng nhận"
                ]]);
            }
            sheet.getRange("A4:F4").setFontWeight("bold").setBackground("#f3f3f3");
        }

        // 3. XÓA DỮ LIỆU CŨ (Từ dòng 5 trở xuống)
        var lastRow = sheet.getLastRow();
        if (lastRow >= 5) {
            sheet.getRange(5, 1, lastRow - 4, 6).clearContent();
        }

        // 4. MAP DỮ LIỆU THEO BANK_TYPE
        var items = data.items;
        if (items && items.length > 0) {
            var rows = [];
            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                if (bankType === 'MBB') {
                    // MBB: STT | Account | Name | Bank Name(Code) | Amount | Detail
                    rows.push([
                        i + 1,                  // A: STT
                        "'" + (item.bank_number || ""), // B: Số TK (Thêm ' để giữ số 0)
                        (item.receiver_name || ""),     // C: Tên người nhận
                        (item.bank_name || ""),         // D: Tên ngân hàng (đã format "Name (Code)")
                        (item.amount || 0),             // E: Số tiền
                        (item.note || "")               // F: Nội dung
                    ]);
                } else {
                    // VIB: STT | Name | Account | Amount | Detail | Bank Name
                    rows.push([
                        i + 1,                  // A: STT
                        (item.receiver_name || ""),     // B: Tên người nhận
                        "'" + (item.bank_number || ""), // C: Số TK (Thêm ' để giữ số 0)
                        (item.amount || 0),             // D: Số tiền
                        (item.note || ""),              // E: Nội dung
                        (item.bank_name || "")          // F: Tên ngân hàng
                    ]);
                }
            }
            // 5. GHI TỪ DÒNG 5
            if (rows.length > 0) {
                sheet.getRange(5, 1, rows.length, rows[0].length).setValues(rows);
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            "result": "success",
            "spreadsheet": ss.getName(),
            "sheet": sheet.getName(),
            "count": items ? items.length : 0,
            "bank_type": bankType,
            "version": "1.1"
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            "result": "error",
            "error": e.toString(),
            "stack": e.stack || ""
        })).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}