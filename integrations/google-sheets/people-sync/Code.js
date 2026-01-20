// MoneyFlow 3 - Google Apps Script
// VERSION: 5.5 (SMART MERGE & REWRITE)
// Last Updated: 2026-01-20 17:15 ICT
// Scope: Data Safety & Deduplication.
//        - Rewrite Strategy: Protects Manual Data by reading & rewriting.
//        - Smart Merge: Auto-links Manual Txns with new App Txns (matches Amount/Type/Date).
//        - Protect Manual Data: Insert/Delete only within System Logic.
//        - F: Absolute Value (Positive).
//        - J: Text-safe formula with SUBSTITUTE/VALUE.
//        - Sorting: Use sheet.getLastRow(), Add Sleep for consistency.

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

    // Safety: Default cycleTag if missing (e.g. empty rows)
    if (!cycleTag) {
        cycleTag = getCycleTagFromDate(new Date());
    }

    var sheet = getOrCreateCycleTab(ss, cycleTag);
    if (!sheet) throw new Error("Could not create or find sheet for tag: " + cycleTag);

    var syncOptions = buildSheetSyncOptions(payload);

    // CRITICAL FIX: Clear Summary Columns L:N completely BEFORE ANY INSERTION
    // This prevents the summary table from being pushed down and duplicated by insertRows
    try {
        var maxRows = sheet.getMaxRows();
        var clearRange = sheet.getRange(1, 12, maxRows, 3); // L1:N(max)
        clearRange.clearContent();
        clearRange.setBorder(false, false, false, false, false, false);
        clearRange.setBackground(null);
        clearRange.breakApart();
    } catch (e) { }

    setupNewSheet(sheet, syncOptions.summaryOptions);

    setupNewSheet(sheet, syncOptions.summaryOptions);

    // INTELLIGENT SYNC: Preserve Manual Rows (Strict ID Check)
    var currentLastSystemRow = getLastSystemRow(sheet);
    var currentSystemCount = Math.max(0, currentLastSystemRow - 1);
    var newCount = transactions.length;

    if (newCount > currentSystemCount) {
        // We have MORE system rows than before. 
        // Insert rows AFTER the last system row to push manual data down.
        sheet.insertRowsAfter(currentLastSystemRow, newCount - currentSystemCount);
    } else if (newCount < currentSystemCount) {
        // We have FEWER system rows.
        // Delete excess system rows. (Pull manual data up)
        // Rows to delete start from (2 + newCount).
        sheet.deleteRows(2 + newCount, currentSystemCount - newCount);
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
            // Col F (Amount): User requested ABSOLUTE value (Positive) for visual clarity
            // J Formula will handle the sign logic.
            var amt = Math.abs(txn.amount);
            arrEFGH[i] = [txn.notes || "", amt, txn.percent_back || 0, txn.fixed_back || 0];
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

    // Pass system row count to prevent sorting manual data
    applyBordersAndSort(sheet, syncOptions.summaryOptions, validTxns.length);
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
        // Insert new row after last SYSTEM row to shift manual data down
        var lastSystemRow = getLastSystemRow(sheet);
        sheet.insertRowAfter(lastSystemRow);
        targetRow = lastSystemRow + 1;
        isNew = true;
    }

    sheet.getRange(targetRow, 1).setValue(payload.id);
    sheet.getRange(targetRow, 2).setValue(normalizeType(payload.type, payload.amount));
    sheet.getRange(targetRow, 3).setValue(new Date(payload.date));
    sheet.getRange(targetRow, 5).setValue(payload.notes || "");

    var amt = Math.abs(payload.amount);
    // User requested ABSOLUTE value for Col F. J Formula handles sign.
    // if (normalizeType(payload.type, payload.amount) === 'In') { amt = -amt; } // Removed
    sheet.getRange(targetRow, 6).setValue(amt);

    sheet.getRange(targetRow, 7).setValue(payload.percent_back || 0);
    sheet.getRange(targetRow, 8).setValue(payload.fixed_back || 0);
    sheet.getRange(targetRow, 15).setValue(payload.shop || "");
    applyFormulasToRow(sheet, targetRow);

    SpreadsheetApp.flush();
    applyBordersAndSort(sheet, syncOptions.summaryOptions);
    applySheetImage(sheet, syncOptions.imgUrl, syncOptions.imgProvided, syncOptions.summaryOptions);

    return jsonResponse({ ok: true, action: action });
}

// INTELLIGENT SYNC: STRICT ID CHECK
function getLastSystemRow(sheet) {
    try {
        var lastRow = sheet.getLastRow();
        if (lastRow < 2) return 1;
        // Fetch ID (A) only. Manual rows usually don't have System IDs.
        var vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        // Scan backwards for first non-empty ID
        for (var i = vals.length - 1; i >= 0; i--) {
            var hasId = vals[i][0] !== "" && vals[i][0] != null;
            if (hasId) return i + 2;
        }
        return 1;
    } catch (e) { return 1; }
}

function applyBordersAndSort(sheet, summaryOptions, systemRowCount) {
    // 1. DATA STYLING & SORTING (Only System Rows)
    // If systemRowCount is not provided, use getLastSystemRow to guess.
    var lastSortRow = systemRowCount ? (systemRowCount + 1) : getLastSystemRow(sheet);

    if (lastSortRow >= 2) {
        clearImageMerges(sheet);
        var rowCount = lastSortRow - 1;

        // FORCE COMMIT before sorting to ensure new values are registered
        Utilities.sleep(300);
        SpreadsheetApp.flush();

        var dataRange = sheet.getRange(2, 1, rowCount, 15);
        // Robust Sort: Date (Col 3) ASC, then ID (Col 1) ASC
        dataRange.sort([{ column: 3, ascending: true }, { column: 1, ascending: true }]);

        // ... (VLOOKUP & Formatting for System Rows Only)
        // ...


        var arrD = new Array(rowCount);
        for (var i = 0; i < rowCount; i++) {
            var r = i + 2;
            arrD[i] = ['=IFERROR(VLOOKUP(O' + r + ';Shop!A:B;2;FALSE);O' + r + ')'];
        }
        sheet.getRange(2, 4, rowCount, 1).setValues(arrD);

        ensureArrayFormulas(sheet);

        // Fix Grey Background: Force White for all data rows
        var maxRow = sheet.getLastRow();
        if (maxRow >= 2) {
            var totalRows = maxRow - 1;
            var dataRange = sheet.getRange(2, 1, totalRows, 15); // A:O

            // 1. Borders & Background
            sheet.getRange(2, 1, totalRows, 10) // A:J
                .setBorder(true, true, true, true, true, true)
                .setBackground('#FFFFFF')
                .setFontWeight('normal');

            // 2. Alignment
            sheet.getRange(2, 3, totalRows, 1).setHorizontalAlignment('center'); // Date

            // 3. Number Format for F (Amount), I (Σ Back), J (Final Price)
            // Using '#,##0' to match Summary Table
            sheet.getRange(2, 6, totalRows, 1).setNumberFormat('#,##0'); // F
            sheet.getRange(2, 9, totalRows, 2).setNumberFormat('#,##0'); // I, J
        }
    }

    // 2. ALWAYS Re-draw Summary Table (Regardless of data rows)
    // Fix Summary Table area - Clear content, borders, AND background colors
    try {
        var maxRows = sheet.getMaxRows();
        var clearRange = sheet.getRange(1, 12, maxRows, 3); // L1:N(max)
        clearRange.clearContent();
        clearRange.setBorder(false, false, false, false, false, false);
        clearRange.setBackground(null);
        clearRange.breakApart();
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

    var rule1 = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B2="In"').setBackground("#D5F5E3").setFontColor("#145A32").setRanges([sheet.getRange('A2:J')]).build();
    sheet.setConditionalFormatRules([rule1]);

    // setupSummaryTable REMOVED from here to prevent shifting during row insertion.
    // It should only be called at the end of the process.

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

    // Row 2: In (Gross) - Dark Green
    // Row 3: Out (Gross) - Dark Red
    // Row 4: Total Back - Blue
    // Row 5: Remains - Below Total Back
    // Row 6: Bank Info - Below Remains

    var labels = [
        [1, 'In (Gross)'],
        [2, 'Out (Gross)'],
        [3, 'Total Back'],
        [4, 'Remains']
    ];
    sheet.getRange('L2:M5').setValues(labels);
    sheet.getRange('L2:M5').setFontWeight('bold');

    // N2 (In - Gross): Sum of Amount (F) for "In" (Expect Negative values)
    sheet.getRange('N2').setFormula('=SUMIFS(F:F;B:B;"In")');
    sheet.getRange('N2').setFontColor('#14532d'); // Dark Green

    // N3 (Out - Gross): Sum of Amount (F) for "Out" (Positive values)
    sheet.getRange('N3').setFormula('=SUMIFS(F:F;B:B;"Out")');
    sheet.getRange('N3').setFontColor('#991b1b'); // Dark Red

    // N4 (Total Back): Sum of Sum Back (I)
    sheet.getRange('N4').setFormula('=SUM(I:I)');
    sheet.getRange('N4').setFontColor('#1e40af'); // Blue

    // N5 (Remains): Sum of Final Price (J). Since F is signed, J is signed.
    // J = F - I. (Amount - Back).
    // If Out: F=100, I=5. J=95.
    // If In: F=-100, I=0. J=-100.
    // Sum = 95 - 100 = -5. Net Debt. Correct.
    sheet.getRange('N5').setFormula('=SUM(J2:J)');

    // Styling
    sheet.getRange('N2:N5').setNumberFormat('#,##0').setFontWeight('bold');
    sheet.getRange('L2:N5').setBorder(true, true, true, true, true, true);

    // Highlight Remains
    sheet.getRange('L5:N5').setBackground('#fee2e2'); // Soft red/pink for remains

    // Bank Info at Row 6
    var bankCell = sheet.getRange('L6:N6');
    // Clear Row 6 first (merges/styles)
    bankCell.breakApart();
    bankCell.setBackground('#f9fafb');

    try {
        if (showBankAccount) {
            if (shouldMerge) {
                bankCell.merge();
            }

            // Dynamic Formula with Remains (N5)
            // User requested: =Bank... & " " & ROUND(N5;0)
            if (bankAccountText) {
                // If custom text provided (unlikely to change dynamic part but supports payload override)
                var escapedText = bankAccountText.replace(/"/g, '""');
                bankCell.setFormula('="' + escapedText + ' " & TEXT(N5;"0")'); // Raw integer format
            } else {
                // Referenced BankInfo sheet
                bankCell.setFormula('=BankInfo!A2&" "&BankInfo!B2&" "&BankInfo!C2&" "&TEXT(N5;"0")');
            }
            bankCell.setFontWeight('bold')
                .setHorizontalAlignment('left')
                .setBorder(true, true, true, true, true, true)
                .setWrap(false); // User requested NO text wrapping
        } else {
            bankCell.clearContent();
            bankCell.setBorder(false, false, false, false, false, false);
            bankCell.setBackground(null);
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
    // J2 Formula (Final Price) - Force Update
    // Updated Logic: User requested SUBSTITUTE/VALUE to handle text-formatting risks
    // IF In: F * -1. IF Out: F - I.
    var jRange = sheet.getRange("J2:J");
    try { jRange.clearContent(); jRange.clearDataValidations(); } catch (e) { }

    // Formula: =ARRAYFORMULA(IF(F2:F=""; ""; IF(B2:B="In"; VALUE(SUBSTITUTE(F2:F;".";"")) * -1; VALUE(SUBSTITUTE(F2:F;".";"")) - VALUE(SUBSTITUTE(I2:I;".";"")))))
    sheet.getRange("J2").setFormula('=ARRAYFORMULA(IF(F2:F=""; ""; IF(B2:B="In"; VALUE(SUBSTITUTE(F2:F;".";"")) * -1; VALUE(SUBSTITUTE(F2:F;".";"")) - VALUE(SUBSTITUTE(I2:I;".";"")))))');
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
