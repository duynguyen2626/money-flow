function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // 1. Chọn đúng tên sheet
    var sheetName = "Danh sách chuyển tiền";
    var sheet = ss.getSheetByName(sheetName);

    // Nếu chưa có thì tạo mới
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Header chuẩn Bank (A4)
      sheet.getRange("A4:F4").setValues([["STT", "Tên người nhận", "Số tài khoản nhận", "Số tiền chuyển", "Nội dung giao dịch", "Tên ngân hàng nhận"]]);
    }

    // 2. Xóa dữ liệu cũ (từ dòng 5 trở xuống) - Clear sạch để paste mới
    var lastRow = sheet.getLastRow();
    if (lastRow >= 5) {
      sheet.getRange(5, 1, lastRow - 4, 6).clearContent();
    }

    // 3. Map dữ liệu (A->F)
    var items = data.items;
    if (items && items.length > 0) {
      var rows = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        rows.push([
          i + 1,                  // A: STT
          item.receiver_name,     // B: Tên người nhận
          "'" + item.bank_number, // C: Số TK (Thêm ' để giữ số 0)
          item.amount,            // D: Số tiền
          item.note,              // E: Nội dung (đã xử lý ở App: VCB 2025-11)
          item.bank_name          // F: Tên ngân hàng
        ]);
      }
      // 4. Ghi từ dòng 5
      sheet.getRange(5, 1, rows.length, rows[0].length).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
