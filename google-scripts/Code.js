// MoneyFlow 3 - Google Apps Script
// VERSION: 4.2 (QR IMAGE MERGED CELL PLACEMENT)
// Task: place QR via IMAGE() in merged summary area with bank-row-aware positioning.

/*
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 Money Flow')
    .addItem('Re-apply Format', 'manualFormat')
    .addItem('Sort Current Sheet', 'manualSort')
    .addToUi();
}
*/

function createManualTestSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tabName = "Test_Manual_" + Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "HHmmss");
    var sheet = ss.insertSheet(tabName);
    setupNewSheet(sheet);
    sheet.getRange(2, 1).setValue("manual-test-id");
    sheet.getRange(2, 2).setValue("Out");
    sheet.getRange(2, 3).setValue(new Date());
    sheet.getRange(2, 5).setValue("Manual Test Item");
    sheet.getRange(2, 6).setValue(150000);
    applyFormulasToRow(sheet, 2);
    applyBordersAndSort(sheet);
}

function manualFormat() { setupNewSheet(SpreadsheetApp.getActiveSheet()); }
function manualSort() { applyBordersAndSort(SpreadsheetApp.getActiveSheet()); }

function doPost(e) {
    var lock = LockService.getScriptLock();
    if (lock.tryLock(45000)) {
        try {
            if (!e || !e.postData) return jsonResponse({ error: "No data received" });
            var payload = JSON.parse(e.postData.contents);
            var action = payload.action;

            Logger.log("doPost Action: " + action);

            if (action === 'ensureSheet' || action === 'create_cycle_sheet') {
                return handleEnsureSheet(payload);
            } else if (action === 'syncTransactions') {
                return handleSyncTransactions(payload);
            } else if (action === 'create' || action === 'edit' || action === 'update' || action === 'delete') {
                return handleSingleTransaction(payload, action);
            } else if (action === 'create_test_sheet') {
                return handleTestCreate(payload);
            } else {
                return jsonResponse({ error: "Unknown action: " + action });
            }
        } catch (err) {
            Logger.log("doPost Error: " + err);
            return jsonResponse({ error: err.toString() });
        } finally {
            lock.releaseLock();
        }
    } else {
        return jsonResponse({ error: "Server busy - Lock timeout" });
    }
}

function handleTestCreate(payload) {
    var personId = personId = payload.personId || payload.person_id || "TEST";
    var ss = getOrCreateSpreadsheet(personId, payload);
    var tabName = "Test_API_" + Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyMMdd_HHmmss");
    var sheet = ss.insertSheet(tabName);
    setupNewSheet(sheet);
    var dummyRow = 2;
    sheet.getRange(dummyRow, 1).setValue("api-test-id-1");
    sheet.getRange(dummyRow, 2).setValue("Out");
    sheet.getRange(dummyRow, 3).setValue(new Date(2025, 11, 20));
    sheet.getRange(dummyRow, 5).setValue("Item A");
    sheet.getRange(dummyRow, 6).setValue(200000);
    applyFormulasToRow(sheet, dummyRow);
    var dummyRow2 = 3;
    sheet.getRange(dummyRow2, 1).setValue("api-test-id-2");
    sheet.getRange(dummyRow2, 2).setValue("Out");
    sheet.getRange(dummyRow2, 3).setValue(new Date(2025, 11, 10));
    sheet.getRange(dummyRow2, 5).setValue("Item B");
    sheet.getRange(dummyRow2, 6).setValue(100000);
    applyFormulasToRow(sheet, dummyRow2);
    applyBordersAndSort(sheet);
    return jsonResponse({ ok: true, sheetUrl: ss.getUrl(), sheetId: ss.getId(), tabName: tabName });
}

function handleEnsureSheet(payload) {
    var personId = payload.personId || payload.person_id || null;
    var cycleTag = payload.cycleTag || payload.cycle_tag || getCycleTagFromDate(new Date());
    var ss = getOrCreateSpreadsheet(personId, payload);
    var sheet = getOrCreateCycleTab(ss, cycleTag);
    setupNewSheet(sheet);
    return jsonResponse({ ok: true, sheetUrl: ss.getUrl(), sheetId: ss.getId(), tabName: sheet.getName() });
}

function handleSyncTransactions(payload) {
    var personId = payload.personId || payload.person_id || null;
    var cycleTag = payload.cycleTag || payload.cycle_tag || null;
    var transactions = payload.rows || [];

    if (!cycleTag && transactions.length > 0) {
        cycleTag = getCycleTagFromDate(new Date(transactions[0].date));
    }

    var ss = getOrCreateSpreadsheet(personId, payload);
    var sheet = getOrCreateCycleTab(ss, cycleTag);
    var syncOptions = buildSheetSyncOptions(payload);

    setupNewSheet(sheet, syncOptions.summaryOptions);

    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
        try { sheet.getRange(2, 15, lastRow - 1, 1).clearContent(); } catch (e) { }
        sheet.getRange(2, 1, lastRow - 1, 10).setBorder(false, false, false, false, false, false);
    }

    var validTxns = transactions.filter(function (txn) { return txn.status !== 'void'; });
    validTxns.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    if (validTxns.length > 0) {
        var numRows = validTxns.length;
        var startRow = 2;
        var arrABC = new Array(numRows);
        var arrD = new Array(numRows);
        var arrEFGH = new Array(numRows);
        var arrIJ = new Array(numRows);
        var arrO = new Array(numRows);

        for (var i = 0; i < numRows; i++) {
            var txn = validTxns[i];
            var r = startRow + i;
            arrABC[i] = [txn.id, normalizeType(txn.type, txn.amount), new Date(txn.date)];
            arrD[i] = ['=IFERROR(VLOOKUP(O' + r + ';Shop!A:B;2;FALSE);O' + r + ')'];
            arrEFGH[i] = [txn.notes || "", Math.abs(txn.amount), txn.percent_back || 0, txn.fixed_back || 0];
            arrIJ[i] = [
                '=IF(F' + r + '="";"";IF(F' + r + '*G' + r + '/100+H' + r + '=0;0;F' + r + '*G' + r + '/100+H' + r + '))',
                '=IF(F' + r + '="";"";IF(B' + r + '="In";(F' + r + '-I' + r + ')*(-1);F' + r + '-I' + r + '))'
            ];
            arrO[i] = [txn.shop || ""];
        }

        if (numRows > 0) {
            sheet.getRange(startRow, 1, numRows, 3).setValues(arrABC);
            sheet.getRange(startRow, 4, numRows, 1).setValues(arrD);
            sheet.getRange(startRow, 5, numRows, 4).setValues(arrEFGH);
            sheet.getRange(startRow, 9, numRows, 2).setValues(arrIJ);
            sheet.getRange(startRow, 15, numRows, 1).setValues(arrO);
            sheet.getRange(startRow, 1, numRows, 10).setBorder(true, true, true, true, true, true);
        }
    }
    applyBordersAndSort(sheet, syncOptions.summaryOptions);
    applySheetImage(sheet, syncOptions.imgUrl, syncOptions.imgProvided, syncOptions.summaryOptions);
    return jsonResponse({ ok: true, syncedCount: validTxns.length, sheetId: ss.getId(), tabName: sheet.getName() });
}

function handleSingleTransaction(payload, action) {
    var personId = payload.personId || payload.person_id || null;
    var cycleTag = getCycleTagFromDate(new Date(payload.date));
    var ss = getOrCreateSpreadsheet(personId, payload);
    var sheet = getOrCreateCycleTab(ss, cycleTag);
    var syncOptions = buildSheetSyncOptions(payload);

    setupNewSheet(sheet, syncOptions.summaryOptions);

    var rowIndex = findRowById(sheet, payload.id);

    if (action === 'delete' || payload.status === 'void') {
        if (rowIndex > 0) {
            sheet.getRange(rowIndex, 1, 1, 11).deleteCells(SpreadsheetApp.Dimension.ROWS);
            try { sheet.getRange(rowIndex, 15, 1, 1).deleteCells(SpreadsheetApp.Dimension.ROWS); } catch (e) { }
        }
        applySheetImage(sheet, syncOptions.imgUrl, syncOptions.imgProvided, syncOptions.summaryOptions);
        return jsonResponse({ ok: true, action: 'deleted' });
    }

    var targetRow = rowIndex > 0 ? rowIndex : sheet.getLastRow() + 1;
    if (targetRow < 2) targetRow = 2;

    sheet.getRange(targetRow, 1).setValue(payload.id);
    sheet.getRange(targetRow, 2).setValue(normalizeType(payload.type, payload.amount));
    sheet.getRange(targetRow, 3).setValue(new Date(payload.date));
    sheet.getRange(targetRow, 5).setValue(payload.notes || "");
    sheet.getRange(targetRow, 6).setValue(Math.abs(payload.amount));
    sheet.getRange(targetRow, 7).setValue(payload.percent_back || 0);
    sheet.getRange(targetRow, 8).setValue(payload.fixed_back || 0);
    sheet.getRange(targetRow, 15).setValue(payload.shop || "");
    applyFormulasToRow(sheet, targetRow);

    SpreadsheetApp.flush();
    applyBordersAndSort(sheet, syncOptions.summaryOptions);
    applySheetImage(sheet, syncOptions.imgUrl, syncOptions.imgProvided, syncOptions.summaryOptions);

    return jsonResponse({ ok: true, action: action });
}

function applyBordersAndSort(sheet, summaryOptions) {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    clearImageMerges(sheet);

    var dataRange = sheet.getRange(2, 1, lastRow - 1, 15);
    dataRange.sort({ column: 3, ascending: true });

    var arrD = new Array(lastRow - 1);
    var arrIJ = new Array(lastRow - 1);

    for (var i = 0; i < lastRow - 1; i++) {
        var r = i + 2;
        arrD[i] = ['=IFERROR(VLOOKUP(O' + r + ';Shop!A:B;2;FALSE);O' + r + ')'];
        arrIJ[i] = [
            '=IF(F' + r + '="";"";IF(F' + r + '*G' + r + '/100+H' + r + '=0;0;F' + r + '*G' + r + '/100+H' + r + '))',
            '=IF(F' + r + '="";"";IF(B' + r + '="In";(F' + r + '-I' + r + ')*(-1);F' + r + '-I' + r + '))'
        ];
    }

    sheet.getRange(2, 4, lastRow - 1, 1).setValues(arrD);
    sheet.getRange(2, 9, lastRow - 1, 2).setValues(arrIJ);

    // Borders for A:J only
    sheet.getRange(2, 1, lastRow - 1, 10).setBorder(true, true, true, true, true, true);

    // FIXED CENTER ALIGNMENT FOR DATE COLUMN - AGAIN
    // Explicitly selecting C2 down to C<lastRow>
    sheet.getRange(2, 3, lastRow - 1, 1).setHorizontalAlignment('center');

    // Fix Summary Table area
    sheet.getRange('L7:N').clearContent();
    sheet.getRange('L7:N').setBorder(false, false, false, false, false, false);

    setupSummaryTable(sheet, summaryOptions);
}


function getOrCreateSpreadsheet(personId, payload) {
    var props = PropertiesService.getScriptProperties();
    var sheetId = payload.sheetId || payload.sheet_id;
    if (sheetId) { try { return SpreadsheetApp.openById(sheetId); } catch (e) { } }
    if (personId) {
        var storedId = props.getProperty('SHEET_' + personId);
        if (storedId) { try { return SpreadsheetApp.openById(storedId); } catch (e) { props.deleteProperty('SHEET_' + personId); } }
    }
    return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateCycleTab(ss, cycleTag) {
    var normalized = normalizeCycleTag(cycleTag);
    var sheet = ss.getSheetByName(normalized) || ss.insertSheet(normalized);
    return sheet;
}

function setupNewSheet(sheet, summaryOptions) {
    SpreadsheetApp.flush();
    sheet.getRange('A1').setNote('Script Version: 4.2');

    sheet.getRange('A:O').setFontSize(12);

    var headers = ['ID', 'Type', 'Date', 'Shop', 'Notes', 'Amount', '% Back', 'đ Back', 'Σ Back', 'Final Price'];
    var headerRange = sheet.getRange('A1:J1');

    if (headerRange.isBlank() || headerRange.getValue() !== 'ID') {
        headerRange.setValues([headers]);
        headerRange.setFontWeight('bold').setBackground('#E5E7EB').setFontColor('#111827').setFontSize(12).setBorder(true, true, true, true, true, true);
        sheet.setFrozenRows(1);
    }

    try {
        sheet.hideColumns(1);
        sheet.setColumnWidth(2, 70);
        sheet.setColumnWidth(3, 100);
        sheet.setColumnWidth(4, 50);
        sheet.setColumnWidth(5, 400);
        sheet.setColumnWidth(6, 110);
        sheet.setColumnWidth(7, 70);
        sheet.setColumnWidth(8, 80);
        sheet.setColumnWidth(9, 90);
        sheet.setColumnWidth(10, 110);
        sheet.setColumnWidth(11, 50);
        sheet.hideColumns(15);
    } catch (e) { }

    sheet.getRange('D2:D').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.getRange('F2:J').setHorizontalAlignment('right');

    // AGGRESSIVE DATE ALIGNMENT
    sheet.getRange('C:C').setHorizontalAlignment('center');
    sheet.getRange('C2:C').setNumberFormat('dd-MM');

    sheet.getRange('F2:F').setNumberFormat('#,##0');
    sheet.getRange('G2:H').setNumberFormat('#,##0');
    sheet.getRange('I2:J').setNumberFormat('#,##0');

    var rule1 = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B2="In"').setBackground("#D5F5E3").setFontColor("#145A32").setRanges([sheet.getRange('A2:J')]).build();
    sheet.setConditionalFormatRules([rule1]);

    setupSummaryTable(sheet, summaryOptions);
    ensureShopSheet(sheet.getParent());
    ensureBankInfoSheet(sheet.getParent());
    SpreadsheetApp.flush();
}

function setupSummaryTable(sheet, summaryOptions) {
    var showBankAccount;
    var shouldMerge = true;
    var bankAccountText = '';

    if (typeof summaryOptions === 'boolean') {
        shouldMerge = !summaryOptions;
    } else if (summaryOptions) {
        if (typeof summaryOptions.showBankAccount === 'boolean') {
            showBankAccount = summaryOptions.showBankAccount;
        }
        if (typeof summaryOptions.shouldMerge === 'boolean') {
            shouldMerge = summaryOptions.shouldMerge;
        }
        if (typeof summaryOptions.bankAccountText === 'string') {
            bankAccountText = summaryOptions.bankAccountText.trim();
        }
    }

    if (typeof showBankAccount === 'undefined') {
        showBankAccount = true;
    }
    var r = sheet.getRange('L1:N1');
    r.setValues([['No.', 'Summary', 'Value']]);
    r.setFontWeight('bold').setBackground('#fde4e4').setFontSize(12).setBorder(true, true, true, true, true, true).setHorizontalAlignment('center');

    var d = sheet.getRange('L2:M5');
    d.setValues([[1, 'In'], [2, 'Sum Back'], [3, 'Out'], [4, 'Remains']]);

    sheet.getRange('N2').setFormula('=SUMIFS(J:J;B:B;"In")');
    sheet.getRange('N3').setFormula('=SUM(I2:I)');
    sheet.getRange('N4').setFormula('=SUMIFS(J:J;B:B;"Out")');
    sheet.getRange('N5').setFormula('=N4+N2');

    sheet.getRange('N2:N5').setNumberFormat('#,##0').setFontWeight('bold');
    sheet.getRange('L2:N5').setBorder(true, true, true, true, true, true);
    sheet.getRange('L5:N5').setBackground('#f8d0d0').setFontWeight('bold');

    sheet.getRange('L2:N2').setFontColor('#137333');
    sheet.getRange('L3:N3').setFontColor('#1a73e8');
    sheet.getRange('L4:N6').setFontColor('#000000');

    try {
        sheet.setColumnWidth(12, 50);
        sheet.setColumnWidth(13, 130);
        sheet.setColumnWidth(14, 130);
    } catch (e) { }

    var bankCell = sheet.getRange('L6:N6');
    try {
        if (showBankAccount) {
            if (shouldMerge) {
                bankCell.merge();
            } else {
                bankCell.breakApart();
            }
        } else {
            bankCell.breakApart();
        }
    } catch (e) { }
    if (showBankAccount) {
        if (bankAccountText) {
            var escapedText = bankAccountText.replace(/"/g, '""');
            bankCell.setFormula('="' + escapedText + ' " & ROUND(N5;0)');
        } else {
            bankCell.setFormula('=BankInfo!A2&" "&BankInfo!B2&" "&BankInfo!C2&" "&ROUND(N5;0)');
        }
        bankCell.setFontWeight('bold').setHorizontalAlignment('left').setBorder(true, true, true, true, true, true);
    } else {
        bankCell.clearContent();
        bankCell.setBorder(false, false, false, false, false, false);
    }
}

function ensureShopSheet(ss) {
    var sheet = ss.getSheetByName('Shop');
    if (!sheet) { sheet = ss.insertSheet('Shop'); sheet.getRange('A1:B1').setValues([['Shop', 'Icon']]); sheet.getRange('A2:B2').setValues([['Shopee', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/1200px-Shopee.svg.png']]); }
}

function ensureBankInfoSheet(ss) {
    var sheet = ss.getSheetByName('BankInfo');
    if (!sheet) { sheet = ss.insertSheet('BankInfo'); sheet.getRange('A1:C1').setValues([['Bank', 'Account', 'Name']]); sheet.getRange('A2:C2').setValues([['TPBank', '0000', 'NGUYEN VAN A']]); }
}

function applyFormulasToRow(sheet, row) {
    sheet.getRange(row, 4).setFormula('=IFERROR(VLOOKUP(O' + row + ';Shop!A:B;2;FALSE);O' + row + ')');
    sheet.getRange(row, 9).setFormula('=IF(F' + row + '="";"";IF(F' + row + '*G' + row + '/100+H' + row + '=0;0;F' + row + '*G' + row + '/100+H' + row + '))');
    sheet.getRange(row, 10).setFormula('=IF(F' + row + '="";"";IF(B' + row + '="In";(F' + row + '-I' + row + ')*(-1);F' + row + '-I' + row + '))');
}

function findRowById(sheet, id) {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) { if (ids[i][0] == id) return i + 2; }
    return -1;
}

function normalizeType(type, amount) {
    var t = (type || "").toString().toLowerCase();
    if (t.indexOf('debt') >= 0 || t.indexOf('expense') >= 0 || t.indexOf('out') >= 0) return 'Out';
    if (t.indexOf('repay') >= 0 || t.indexOf('income') >= 0 || t.indexOf('in') >= 0) return 'In';
    return amount < 0 ? 'Out' : 'In';
}

function getCycleTagFromDate(date) {
    var d = date instanceof Date ? date : new Date(date);
    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    return year + '-' + (month < 10 ? '0' + month : month);
}

function normalizeCycleTag(tag) {
    if (!tag) return null;
    var str = tag.toString().trim();
    if (/^\d{4}-\d{2}$/.test(str)) return str;
    var match = str.match(/^([A-Z]{3})(\d{2})$/i);
    if (match) { var month = { 'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12' }[match[1].toUpperCase()]; if (month) return '20' + match[2] + '-' + month; }
    return str;
}

function buildSheetSyncOptions(payload) {
    var summaryOptions = {};
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'bank_account')) {
        var bankAccountText = typeof payload.bank_account === 'string' ? payload.bank_account.trim() : '';
        summaryOptions.showBankAccount = bankAccountText.length > 0;
        summaryOptions.bankAccountText = bankAccountText;
    }
    if (payload && payload.anh_script_mode) {
        summaryOptions.shouldMerge = false;
    }

    var imgProvided = payload && Object.prototype.hasOwnProperty.call(payload, 'img');
    var imgUrl = '';
    if (imgProvided) {
        imgUrl = typeof payload.img === 'string' ? payload.img.trim() : '';
    }

    return {
        summaryOptions: summaryOptions,
        imgProvided: imgProvided,
        imgUrl: imgUrl
    };
}

function applySheetImage(sheet, imgUrl, imgProvided, summaryOptions) {
    if (!imgProvided) return;

    var showBankAccount = true;
    if (summaryOptions && typeof summaryOptions.showBankAccount === 'boolean') {
        showBankAccount = summaryOptions.showBankAccount;
    }

    var baseRange = sheet.getRange(6, 13, 26, 2); // M6:N31
    var accountRange = sheet.getRange(7, 12, 25, 3); // L7:N31

    if (showBankAccount) {
        try { sheet.getRange(7, 13, 25, 2).clearContent(); } catch (e) { } // M7:N31
        try { accountRange.clearContent(); } catch (e) { }
    } else {
        try { baseRange.clearContent(); } catch (e) { }
        try { accountRange.clearContent(); } catch (e) { }
    }

    try {
        var existing = sheet.getImages();
        for (var i = 0; i < existing.length; i++) {
            existing[i].remove();
        }
    } catch (e) { }

    if (!imgUrl) return;

    var targetRange = showBankAccount ? accountRange : baseRange;
    try { targetRange.merge(); } catch (e) { }

    try {
        var escapedUrl = imgUrl.replace(/"/g, '""');
        targetRange.getCell(1, 1).setFormula('=IMAGE("' + escapedUrl + '";2)');
    } catch (e) { }
}

function clearImageMerges(sheet) {
    try { sheet.getRange(6, 13, 26, 2).breakApart(); } catch (e) { } // M6:N31
    try { sheet.getRange(7, 12, 25, 3).breakApart(); } catch (e) { } // L7:N31
}

function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
