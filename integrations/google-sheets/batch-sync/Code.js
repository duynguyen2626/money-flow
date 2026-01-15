// MoneyFlow 3 - Google Apps Script (Batch Management)
// VERSION: 1.6 (Auto-deploy enabled)
// Task: MBB data starts at A3, VIB data starts at A5. Remove MBB script header.

function doPost(e) {
    try {
        var lock = LockService.getScriptLock();
        if (!lock.tryLock(10000)) {
            return ContentService.createTextOutput(JSON.stringify({
                "result": "error",
                "error": "Script is busy. Please try again."
            })).setMimeType(ContentService.MimeType.JSON);
        }

        try {
            // 1. PARSE DATA
            var data;
            try {
                data = JSON.parse(e.postData.contents);
            } catch (jsonErr) {
                throw new Error("Failed to parse JSON payload: " + jsonErr.toString());
            }

            // Detect bank_type (NORMALIZE)
            var bankType = (data.bank_type || 'VIB').toString().trim().toUpperCase();
            Logger.log("Incoming Payload bankType: " + bankType);

            // 2. CHỌN SPREADSHEET
            var ss;
            try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (ignore) { }

            if (!ss) {
                if (data.spreadsheet_id) ss = SpreadsheetApp.openById(data.spreadsheet_id);
                else if (data.spreadsheet_url) ss = SpreadsheetApp.openByUrl(data.spreadsheet_url);
            }

            if (!ss) throw new Error("Target Spreadsheet not found.");

            // 3. CHỌN SHEET
            var defaultSheetName = bankType === 'MBB' ? "eMB_BulkPayment" : "Danh sách chuyển tiền";
            var sheetName = data.sheet_name || defaultSheetName;
            var sheet = ss.getSheetByName(sheetName);

            if (!sheet) {
                var sheets = ss.getSheets();
                if (sheets.length > 0) sheet = sheets[0];
                else throw new Error("No sheets found.");
            }

            // 4. SETUP HEADER & DATA START ROW
            // MBB: Template has headers at Row 2, Data starts at Row 3 (A3)
            // VIB: Header should be at Row 4 (A4), Data starts at Row 5 (A5)
            var dataStartRow = (bankType === 'MBB') ? 3 : 5;

            if (bankType === 'VIB') {
                var checkValue = sheet.getRange(4, 1).getValue();
                var hasHeader = checkValue && checkValue.toString().trim().toUpperCase() === "STT";
                if (!hasHeader) {
                    Logger.log("VIB Header not found at row 4. Setting up...");
                    var vibHeaderRange = sheet.getRange("A4:F4");
                    vibHeaderRange.clearDataValidations();
                    vibHeaderRange.setValues([[
                        "STT", "Tên người nhận", "Số tài khoản nhận", "Số tiền chuyển", "Nội dung giao dịch", "Tên ngân hàng nhận"
                    ]]);
                    vibHeaderRange.setFontWeight("bold").setBackground("#f3f3f3");
                }
            } else if (bankType === 'MBB') {
                Logger.log("MBB Mode: Skipping header writing (Data starts at A3).");
                // Optional: Ensure Row 3 doesn't have an accidental script header if it was there from previous Turn
                var checkA3 = sheet.getRange(3, 1).getValue();
                if (checkA3 && checkA3.toString().trim().toUpperCase() === "STT") {
                    Logger.log("Clearing accidental script header at A3...");
                    sheet.getRange(3, 1, 1, 6).clearContent().clearDataValidations();
                }
            }

            // 5. XÓA DỮ LIỆU CŨ
            var lastRow = sheet.getLastRow();
            if (lastRow >= dataStartRow) {
                try {
                    sheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, 6).clearContent().clearDataValidations();
                } catch (e) { }
            }

            // 6. MAP DỮ LIỆU
            var items = data.items || [];
            if (items.length > 0) {
                var rows = [];
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (bankType === 'MBB') {
                        rows.push([
                            i + 1,
                            "'" + (item.bank_number || ""),
                            (item.receiver_name || ""),
                            (item.bank_name || ""),
                            (item.amount || 0),
                            (item.note || "")
                        ]);
                    } else {
                        rows.push([
                            i + 1,
                            (item.receiver_name || ""),
                            "'" + (item.bank_number || ""),
                            (item.amount || 0),
                            (item.note || ""),
                            (item.bank_name || "")
                        ]);
                    }
                }
                var targetRange = sheet.getRange(dataStartRow, 1, rows.length, rows[0].length);
                targetRange.clearDataValidations().setValues(rows);
            }

            return ContentService.createTextOutput(JSON.stringify({
                "result": "success",
                "bank_type": bankType,
                "count": items.length,
                "version": "1.6"
            })).setMimeType(ContentService.MimeType.JSON);

        } finally {
            lock.releaseLock();
        }
    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            "result": "error",
            "error": e.toString(),
            "version": "1.6"
        })).setMimeType(ContentService.MimeType.JSON);
    }
}