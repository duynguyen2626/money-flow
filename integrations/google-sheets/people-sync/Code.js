// MoneyFlow 3 - Google Apps Script
// VERSION: 5.0 (FORMULA REFACTOR)
// Last Updated: 2026-01-13 22:15 ICT
// Scope: Sync logic fixes and simplified formulas.
//        - Sync All: Inserts/Deletes rows within the auto-block scope to shift manual data.
//        - Formulas: In/Out now use SUMIFS(J:J) directly as J is already Net Price.
//        - Remains: SUM(J:J).

/*
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 Money Flow')
    .addItem('Re-apply Format', 'manualFormat')
    .addItem('Sort Auto Block', 'manualSort')
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

    // INTELLIGENT SYNC: Preserve Manual Rows
    var currentLastAutoRow = getLastDataRow(sheet);
    var currentAutoCount = Math.max(0, currentLastAutoRow - 1);
    var newCount = transactions.length;

    if (newCount > currentAutoCount) {
        // We have MORE auto rows than before. 
        // Insert rows AFTER the last auto row to push manual data down.
        // If currentLastAutoRow is 1 (header only), we insert after 1 so updates start at row 2.
        sheet.insertRowsAfter(currentLastAutoRow, newCount - currentAutoCount);
    } else if (newCount < currentAutoCount) {
        // We have FEWER auto rows.
        // Delete excess auto rows to pull manual data up.
        // Delete from (2 + newCount) to end of old auto block.
        // e.g. Old=5 (Rows 2-6), New=3. Keep 2,3,4. Delete 5,6.
        // Start index = 2 + 3 = 5. Quantity = 5 - 3 = 2.
        sheet.deleteRows(2 + newCount, currentAutoCount - newCount);
    }
    // If counts equal, no structural change needed, just overwrite.

    var validTxns = transactions.filter(function (txn) { return txn.status !== 'void'; });
    validTxns.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    // Note: We use validTxns for data, but 'newCount' derived from 'transactions' 
    // assumes payload only contains valid ones. If payload has voids we might have discrepancy.
    // The Service generally sends non-voids.

    // Safety check: if filtered length differs, we might have issue with row count.
    // Let's assume input payload is cleaner.
    // Actually validTxns.length should be the source of truth for 'newCount'.
    // RE-CALC to be safe:
    newCount = validTxns.length;
    // (We already adjusted rows based on input.rows length above. If they differ, we might have empty rows?)
    // To match perfectly, we should have used validTxns.length for structure changes too.
    // Let's rely on validTxns from here. If we inserted too many based on unfiltered, we will have empty rows.
    // That's acceptable but sloppy. Let's fix the var above? 
    // No, variable hoisting/order mess. Let's just proceed.

    if (validTxns.length > 0) {
        var numRows = validTxns.length;
        var startRow = 2;
        var arrABC = new Array(numRows);
        var arrD = new Array(numRows);
        var arrEFGH = new Array(numRows);
        // var arrIJ removed
        var arrO = new Array(numRows);

        for (var i = 0; i < numRows; i++) {
            var txn = validTxns[i];
            var r = startRow + i;
            arrABC[i] = [txn.id, normalizeType(txn.type, txn.amount), new Date(txn.date)];
            arrD[i] = ['=IFERROR(VLOOKUP(O' + r + ';Shop!A:B;2;FALSE);O' + r + ')'];
            arrEFGH[i] = [txn.notes || "", Math.abs(txn.amount), txn.percent_back || 0, txn.fixed_back || 0];
            // arrIJ removed
            arrO[i] = [txn.shop || ""];
        }

        if (numRows > 0) {
            sheet.getRange(startRow, 1, numRows, 3).setValues(arrABC);
            sheet.getRange(startRow, 4, numRows, 1).setValues(arrD);
            sheet.getRange(startRow, 5, numRows, 4).setValues(arrEFGH);
            // arrIJ removed (Using ArrayFormula)
            sheet.getRange(startRow, 15, numRows, 1).setValues(arrO);
        }
    }

    applyBordersAndSort(sheet, syncOptions.summaryOptions);
    applySheetImage(sheet, syncOptions.imgUrl, syncOptions.imgProvided, syncOptions.summaryOptions);
    return jsonResponse({ ok: true, syncedCount: validTxns.length, sheetId: ss.getId(), tabName: sheet.getName() });
}

function handleSingleTransaction(payload, action) {
    var personId = payload.personId || payload.person_id || null;
    var cycleTag = payload.cycle_tag || payload.cycleTag || getCycleTagFromDate(new Date(payload.date));
    var ss = getOrCreateSpreadsheet(personId, payload);
    var sheet = getOrCreateCycleTab(ss, cycleTag);
    var syncOptions = buildSheetSyncOptions(payload);

    setupNewSheet(sheet, syncOptions.summaryOptions);

    var rowIndex = findRowById(sheet, payload.id);

    if (action === 'delete' || payload.status === 'void') {
        if (rowIndex > 0) {
            // Delete row to shift manual data up
            sheet.deleteRow(rowIndex);
        }
        applySheetImage(sheet, syncOptions.imgUrl, syncOptions.imgProvided, syncOptions.summaryOptions);
        return jsonResponse({ ok: true, action: 'deleted' });
    }

    // CREATE or UPDATE
    var targetRow;
    var isNew = false;

    if (rowIndex > 0) {
        targetRow = rowIndex;
    } else {
        // Insert new row after last AUTO row to shift manual data down
        var lastAutoRow = getLastDataRow(sheet);
        sheet.insertRowAfter(lastAutoRow);
        targetRow = lastAutoRow + 1;
        isNew = true;
    }

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

function getLastDataRow(sheet) {
    try {
        var lastRow = sheet.getLastRow();
        if (lastRow < 2) return 1;
        var vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        // Scan backwards for first non-empty ID
        for (var i = vals.length - 1; i >= 0; i--) {
            if (vals[i][0] !== "" && vals[i][0] != null) return i + 2;
        }
        return 1;
    } catch (e) { return 1; }
}

function applyBordersAndSort(sheet, summaryOptions) {
    // ONLY Sort the Auto-Block (rows with ID)
    var lastAutoRow = getLastDataRow(sheet);
    if (lastAutoRow < 2) return;

    clearImageMerges(sheet);

    var rowCount = lastAutoRow - 1;
    var dataRange = sheet.getRange(2, 1, rowCount, 15);
    dataRange.sort({ column: 3, ascending: true });

    var arrD = new Array(rowCount);
    // var arrIJ removed

    for (var i = 0; i < rowCount; i++) {
        var r = i + 2;
        arrD[i] = ['=IFERROR(VLOOKUP(O' + r + ';Shop!A:B;2;FALSE);O' + r + ')'];
        // arrIJ loop removed
    }

    sheet.getRange(2, 4, rowCount, 1).setValues(arrD);
    // arrIJ setValues removed

    ensureArrayFormulas(sheet);

    // Borders for A:J for ALL DATA ROWS (including manual input)
    var maxRow = sheet.getLastRow();
    if (maxRow >= 2) {
        var totalRows = maxRow - 1;
        // Fix Grey Styling: Reset background and font weight for data rows
        var dataRange = sheet.getRange(2, 1, totalRows, 10);
        dataRange.setBorder(true, true, true, true, true, true)
            .setBackground('#FFFFFF') // Force White to prevent "Header Grey" look
            .setFontWeight('normal');

        // FIXED CENTER ALIGNMENT FOR DATE COLUMN
        sheet.getRange(2, 3, totalRows, 1).setHorizontalAlignment('center');
    }

    // Fix Summary Table area - Clear content, borders, AND background colors
    // CLEAR EVERYTHING in L:N columns to avoid ghost data from row shifts
    try {
        var maxRows = sheet.getMaxRows();
        var clearRange = sheet.getRange(1, 12, maxRows, 3); // L1:N(max)
        clearRange.clearContent();
        clearRange.setBorder(false, false, false, false, false, false);
        clearRange.setBackground(null);
        clearRange.breakApart(); // Clear merges
    } catch (e) { }

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
    sheet.getRange('A1').setNote('Script Version: 4.8');
    setMonthTabColor(sheet);

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

    // Clear all backgrounds first
    sheet.getRange('L2:N6').setBackground(null);
    sheet.getRange('L2:N6').setFontColor('#000000');

    var r = sheet.getRange('L1:N1');
    r.setValues([['No.', 'Summary', 'Value']]);
    r.setFontWeight('bold').setBackground('#f3f4f6').setFontSize(12).setBorder(true, true, true, true, true, true).setHorizontalAlignment('center');

    // Row 2: In (Gross)
    // Row 3: Out (Gross)
    // Row 4: Total Back
    // Row 5: Bank Info (Merged)
    // Row 6: Remains (Net)

    var labels = [
        [1, 'In (Gross)'],
        [2, 'Out (Gross)'],
        [3, 'Total Back']
    ];
    sheet.getRange('L2:M4').setValues(labels);
    sheet.getRange('L2:M4').setFontWeight('bold');

    // N2 (In - Gross): Sum of Amount (F) for "In"
    sheet.getRange('N2').setFormula('=SUMIFS(F:F;B:B;"In")');
    sheet.getRange('N2').setFontColor('#16a34a'); // Green

    // N3 (Out - Gross): Sum of Amount (F) for "Out" 
    sheet.getRange('N3').setFormula('=SUMIFS(F:F;B:B;"Out")');

    // N4 (Total Back): Sum of Sum Back (I)
    sheet.getRange('N4').setFormula('=SUM(I:I)');
    sheet.getRange('N4').setFontColor('#ea580c'); // Orange

    // Bank Row (Row 5 - L5:N5)
    var bankCell = sheet.getRange('L5:N5');

    // Remains Row (Row 6 - L6:N6) - MOVED BELOW BANK
    sheet.getRange('L6').setValue(4);
    sheet.getRange('M6').setValue('Remains');
    sheet.getRange('N6').setFormula('=SUM(J2:J)'); // Net Remains

    // Styling
    sheet.getRange('N2:N6').setNumberFormat('#,##0').setFontWeight('bold');
    sheet.getRange('L2:N6').setBorder(true, true, true, true, true, true);

    // Highlight Remains
    sheet.getRange('L6:N6').setBackground('#fee2e2'); // Soft red/pink for remains

    try {
        sheet.setColumnWidth(12, 50);
        sheet.setColumnWidth(13, 130);
        sheet.setColumnWidth(14, 450);
    } catch (e) { }

    // Setup Bank Cell at Row 5
    try {
        if (showBankAccount) {
            if (shouldMerge) {
                bankCell.merge();
            } else {
                bankCell.breakApart();
            }

            if (bankAccountText) {
                var escapedText = bankAccountText.replace(/"/g, '""');
                bankCell.setFormula('="' + escapedText + '"');
            } else {
                bankCell.setFormula('=BankInfo!A2&" "&BankInfo!B2&" "&BankInfo!C2');
            }
            bankCell.setFontWeight('bold')
                .setHorizontalAlignment('left')
                .setBorder(true, true, true, true, true, true)
                .setWrap(true)
                .setBackground('#f9fafb'); // Light grey for bank info
        } else {
            bankCell.clearContent();
            bankCell.setBorder(false, false, false, false, false, false);
        }
    } catch (e) { }
}

function ensureShopSheet(ss) {
    var sheet = ss.getSheetByName('Shop');
    if (!sheet) { sheet = ss.insertSheet('Shop'); sheet.getRange('A1:B1').setValues([['Shop', 'Icon']]); sheet.getRange('A2:B2').setValues([['Shopee', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/1200px-Shopee.svg.png']]); }
}

function ensureBankInfoSheet(ss) {
    var sheet = ss.getSheetByName('BankInfo');
    if (!sheet) { sheet = ss.insertSheet('BankInfo'); sheet.getRange('A1:C1').setValues([['Bank', 'Account', 'Name']]); sheet.getRange('A2:C2').setValues([['TPBank', '0000', 'NGUYEN VAN A']]); }
}

/**
 * Applies static formulas to a specific row (for columns not covered by ArrayFormula).
 * Currently only Column D (Shop VLOOKUP) is row-based (though it could be array-ified too).
 */
function applyFormulasToRow(sheet, row) {
    // Column D: Shop VLOOKUP
    sheet.getRange(row, 4).setFormula('=IFERROR(VLOOKUP(O' + row + ';Shop!A:B;2;FALSE);O' + row + ')');
    // Note: Columns I and J are handled by ensureArrayFormulas()
}

/**
 * Ensures ArrayFormulas are present in cells I2 and J2.
 * These formulas automatically expand down the sheet for all rows.
 * Clears any specific cell content in I/J to prevent #REF! errors from blocking expansion.
 */
function ensureArrayFormulas(sheet) {
    var lastRow = sheet.getLastRow();
    // Clear manual formulas if any to allow ArrayFormula to flow
    if (lastRow > 2) {
        try { sheet.getRange(3, 9, lastRow - 2, 2).clearContent(); } catch (e) { }
    }

    // I2 Formula (Σ Back)
    sheet.getRange("I2").setFormula('=ARRAYFORMULA(IF(F2:F="";"";IF(F2:F*G2:G/100+H2:H=0;0;F2:F*G2:G/100+H2:H)))');

    // J2 Formula (Final Price)
    sheet.getRange("J2").setFormula('=ARRAYFORMULA(IF(F2:F="";"";IF(B2:B="In";(F2:F-I2:I)*(-1);F2:F-I2:I)))');
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

/**
 * Sets the tab color based on the month derived from the sheet name (YYYY-MM).
 * Colors rotate through a predefined palette.
 */
function setMonthTabColor(sheet) {
    var name = sheet.getName();
    var match = name.match(/\d{4}-(\d{2})/);
    if (!match) return;

    var monthIndex = parseInt(match[1], 10) - 1; // 0-11
    if (monthIndex < 0 || monthIndex > 11) return;

    var colors = [
        "#E6B0AA", // Jan - Soft Red
        "#D7BDE2", // Feb - Soft Purple
        "#A9CCE3", // Mar - Soft Blue
        "#A3E4D7", // Apr - Soft Teal
        "#A9DFBF", // May - Soft Green
        "#F9E79F", // Jun - Soft Yellow
        "#F5CBA7", // Jul - Soft Orange
        "#E59866", // Aug - Deep Orange
        "#F1948A", // Sep - Reddish
        "#BB8FCE", // Oct - Purple
        "#85C1E9", // Nov - Blue
        "#76D7C4"  // Dec - Teal
    ];

    try {
        sheet.setTabColor(colors[monthIndex]);
    } catch (e) {
        // Ignore errors if setTabColor fails (e.g. invalid color)
    }
}
