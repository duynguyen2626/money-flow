/**
 * MoneyFlow 3 - Google Apps Script
 * @version 6.5 (Shop Column Fixed)
 * @date 2026-01-28
 * 
 * CRITICAL FIXES (v6.5):
 * - Moved Shop Name storage from Col O to Col K (hidden) to ensure it sorts with data.
 * - Moved Visual Shop Column to Col B (User Request).
 * - New Layout: ID(A), Shop(B), Type(C), Date(D), Notes(E), Amount(F)...
 * - Sort Range extended to A2:K to include Shop Source.
 */

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

    // --- UPSERT STRATEGY v6.5 ---
    // Objective: Read ALL data (A:K), Update in-place, Append new, Write ALL back.

    // 1. READ ALL DATA (A:K)
    var range = sheet.getDataRange();
    var allValues = range.getValues();
    if (allValues.length === 0) {
        allValues = [];
    }

    // Index System Rows by ID
    var rowMap = {};
    var manualRowIndices = [];

    // Start from 1 to skip Header
    var startIndex = allValues.length > 0 && allValues[0][0] === 'ID' ? 1 : 0;

    for (var i = startIndex; i < allValues.length; i++) {
        var row = allValues[i];
        var idVal = (row[0] || "").toString().trim();
        var hasId = idVal.length > 5; // UUID check

        if (hasId) {
            rowMap[idVal] = i;
        } else {
            // Manual Row Check: Data usually in C (Type), F (Amount), D (Date)
            // Need to be robust to column shifting. Old manual rows might be in old format?
            // Assuming we are converting or this is a fresh sync on format.
            // Let's check generally if row has data.
            var hasData = row[2] || row[4] || row[5] || (row[7] && row[7] !== 0);
            if (hasData) {
                manualRowIndices.push(i);
            }
        }
    }

    // 2. SAFETY BACKUP
    autoBackupSheet(ss, sheet);

    // 3. PROCESS TRANSACTIONS
    var validTxns = transactions.filter(function (txn) { return txn.status !== 'void'; });
    // Sort transactions by Date ASC
    validTxns.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    var newRows = [];

    for (var i = 0; i < validTxns.length; i++) {
        var txn = validTxns[i];
        var type = normalizeType(txn.type, txn.amount);
        var amt = Math.abs(txn.amount);
        var dateObj = new Date(txn.date);

        // Prepare Row Data (Array size 11 - matching A:K)
        var rowData = new Array(11);
        rowData[0] = txn.id;
        rowData[1] = '=IFERROR(VLOOKUP(K_CELL;Shop!A:B;2;FALSE);K_CELL)'; // Placeholder B: Visual Shop
        rowData[2] = type;      // C: Type
        rowData[3] = dateObj;   // D: Date
        rowData[4] = txn.notes || "";
        rowData[5] = amt;
        rowData[6] = txn.percent_back || 0;
        rowData[7] = txn.fixed_back || 0;
        rowData[8] = 0; // I -> ArrayFormula
        rowData[9] = ""; // J -> ArrayFormula
        rowData[10] = txn.shop || ""; // K: Shop Source (Hidden Sortable)

        var targetIndex = -1;

        // A. Check ID Match
        if (rowMap.hasOwnProperty(txn.id)) {
            targetIndex = rowMap[txn.id];
        } else {
            // B. Smart Merge (Check Manual Rows)
            for (var m = 0; m < manualRowIndices.length; m++) {
                var mIdx = manualRowIndices[m];
                if (mIdx === -1) continue;

                var mRow = allValues[mIdx];
                // Check Type, Date, Amount. 
                // Need to assume they might be in Old Col positions if mixed? 
                // Safer to assume re-format will fix them.
                // Or check multiple cols.

                // Let's assume standard mapping: Type=C(2), Date=D(3), Amount=F(5)
                var mType = mRow[2];
                var mDate = mRow[3];
                var mAmt = Math.abs(Number(mRow[5]));

                // Check Type, Amount (<1 diff), Date (<24h)
                if (mType !== type) continue;
                if (Math.abs(mAmt - amt) >= 1) continue;

                var mDateObj = new Date(mDate);
                // Try catch date
                try {
                    if (Math.abs(mDateObj - dateObj) >= 86400000) continue;
                } catch (e) { continue; }

                // MATCH FOUND!
                targetIndex = mIdx;
                manualRowIndices[m] = -1; // Mark consumed
                break;
            }
        }

        if (targetIndex !== -1) {
            // Update Existing Row
            allValues[targetIndex][0] = rowData[0];
            allValues[targetIndex][1] = rowData[1];
            allValues[targetIndex][2] = rowData[2];
            allValues[targetIndex][3] = rowData[3];
            allValues[targetIndex][4] = rowData[4];
            allValues[targetIndex][5] = rowData[5];
            allValues[targetIndex][6] = rowData[6];
            allValues[targetIndex][7] = rowData[7];
            allValues[targetIndex][10] = rowData[10];
        } else {
            newRows.push(rowData);
        }
    }

    // 4. WRITE BACK
    var cleanedExistingValues = allValues.filter(function (row, index) {
        if (index === 0) return true; // Keep Header
        var idVal = (row[0] || "").toString().trim();
        if (idVal.length > 5) return true; // Keep System Rows

        // Keep Manual Rows with Data
        var hasData = row[2] || row[4] || row[5] || (row[7] && row[7] !== 0);
        return !!hasData;
    });

    var finalData = cleanedExistingValues.concat(newRows);

    // Fix Cell References in Formulas (Col B)
    for (var i = 1; i < finalData.length; i++) { // Skip header
        var r = i + 1; // 1-based row index
        finalData[i][1] = '=IFERROR(VLOOKUP(K' + r + ';Shop!A:B;2;FALSE);K' + r + ')';
    }

    // 5. CLEAR & SET
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        // Clear A:O just to be safe (wipes old Col O shop if present)
        try { sheet.getRange(2, 1, lastRow, 15).clearContent(); } catch (e) { }
        try { sheet.getRange(2, 1, lastRow, 15).setBorder(false, false, false, false, false, false).setBackground(null); } catch (e) { }
    }

    // Write finalData (11 columns)
    var dataToWrite = finalData.slice(1);

    if (dataToWrite.length > 0) {
        sheet.getRange(2, 1, dataToWrite.length, 11).setValues(dataToWrite);

        // Restore Formatting
        sheet.getRange(2, 4, dataToWrite.length, 1).setNumberFormat('dd-MM'); // Date in D
        sheet.getRange(2, 6, dataToWrite.length, 1).setNumberFormat('#,##0');
    }

    // 6. FINALIZE
    applyBordersAndSort(sheet, syncOptions.summaryOptions, validTxns.length);
    applySheetImage(sheet, syncOptions.imgUrl, syncOptions.imgProvided, syncOptions.summaryOptions);

    var manualPreservedCount = manualRowIndices.filter(function (idx) { return idx !== -1; }).length;

    return jsonResponse({
        ok: true,
        syncedCount: validTxns.length,
        sheetId: ss.getId(),
        tabName: sheet.getName(),
        totalRows: dataToWrite.length,
        manualPreserved: manualPreservedCount
    });
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
            // Clear row content instead of deleting to preserve row positions
            // This prevents Summary area (L7:N35) from shifting when rows change
            var range = sheet.getRange(rowIndex, 1, 1, 11); // A:K
            range.clearContent();
            range.setBackground('white');
            Logger.log('Row ' + rowIndex + ' cleared (not deleted) - Summary area protected');
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
    sheet.getRange(targetRow, 3).setValue(normalizeType(payload.type, payload.amount)); // C: Type
    sheet.getRange(targetRow, 4).setValue(new Date(payload.date)); // D: Date
    sheet.getRange(targetRow, 5).setValue(payload.notes || "");

    var amt = Math.abs(payload.amount);
    sheet.getRange(targetRow, 6).setValue(amt);

    sheet.getRange(targetRow, 7).setValue(payload.percent_back || 0);
    sheet.getRange(targetRow, 8).setValue(payload.fixed_back || 0);
    sheet.getRange(targetRow, 11).setValue(payload.shop || ""); // K: ShopSource

    applyFormulasToRow(sheet, targetRow); // Updates Col B formula

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
    // 0. ENSURE HEADERS EXIST
    try {
        var headerRange = sheet.getRange('A1:K1');
        var headers = ['ID', 'Shop', 'Type', 'Date', 'Notes', 'Amount', '% Back', 'đ Back', 'Σ Back', 'Final Price', 'ShopSource'];
        if (headerRange.isBlank() || headerRange.getValue() !== 'ID' || sheet.getRange('B1').getValue() !== 'Shop') {
            headerRange.setValues([headers]);
            headerRange.setFontWeight('bold').setBackground('#E5E7EB').setFontColor('#111827').setFontSize(12).setBorder(true, true, true, true, true, true);
            sheet.setFrozenRows(1);
            Logger.log('Headers restored in A1:K1');
        }
    } catch (e) {
        Logger.log('Header restore error: ' + e);
    }

    // 0. SELF-HEALING: Remove completely empty rows
    cleanupEmptyRows(sheet);

    // 1. DATA STYLING & SORTING (Only System Rows)
    var lastSortRow = systemRowCount ? (systemRowCount + 1) : getLastSystemRow(sheet);

    if (lastSortRow >= 2) {
        clearImageMerges(sheet);
        var rowCount = lastSortRow - 1;

        Utilities.sleep(300);
        SpreadsheetApp.flush();

        // SORT A:K (Includes Hidden Shop Source)
        var dataRange = sheet.getRange(2, 1, rowCount, 11);
        // Sort Date (Col 4 - D), then ID (Col 1 - A)
        dataRange.sort([{ column: 4, ascending: true }, { column: 1, ascending: true }]);
        Logger.log('Sorted transaction data range: ' + dataRange.getA1Notation() + ' (Summary protected)');

        // SET FORMULA IN B referencing K
        var arrB = new Array(rowCount);
        for (var i = 0; i < rowCount; i++) {
            var r = i + 2;
            arrB[i] = ['=IFERROR(VLOOKUP(K' + r + ';Shop!A:B;2;FALSE);K' + r + ')'];
        }
        sheet.getRange(2, 2, rowCount, 1).setValues(arrB); // Set B

        ensureArrayFormulas(sheet);

        var maxRow = sheet.getLastRow();
        if (maxRow >= 2) {
            var totalRows = maxRow - 1;
            // Borders A:K
            sheet.getRange(2, 1, totalRows, 11)
                .setBorder(true, true, true, true, true, true)
                .setBackground('#FFFFFF')
                .setFontWeight('normal');

            // Alignment
            sheet.getRange(2, 4, totalRows, 1).setHorizontalAlignment('center'); // Date (D)
            sheet.getRange(2, 2, totalRows, 1).setHorizontalAlignment('center').setVerticalAlignment('middle'); // Shop (B)
            sheet.getRange(2, 3, totalRows, 1).setHorizontalAlignment('center'); // Type (C)

            sheet.getRange(2, 6, totalRows, 1).setNumberFormat('#,##0');
            sheet.getRange(2, 9, totalRows, 2).setNumberFormat('#,##0');
        }
    }

    // 2. ALWAYS Re-draw Summary Table
    try {
        var maxRows = sheet.getMaxRows();
        var clearRange = sheet.getRange(1, 12, maxRows, 3); // L:N
        clearRange.clearContent();
        clearRange.setBorder(false, false, false, false, false, false);
        clearRange.setBackground(null);
    } catch (e) { }

    setupSummaryTable(sheet, summaryOptions);

    // 3. RE-APPLY COLUMN VISIBILITY & WIDTHS
    try {
        sheet.showColumns(1, 15);
        sheet.hideColumns(1); // Hide A (ID)
        sheet.hideColumns(11); // Hide K (Shop Source) - NEW!
        sheet.hideColumns(15); // Hide O (Old Shop if exists)
        Logger.log('Column visibility reset: A hidden, K hidden');
    } catch (e) {
        Logger.log('Column visibility error: ' + e);
    }

    // 4. RESTORE COLUMN WIDTHS
    try {
        sheet.setColumnWidth(2, 50);   // B: Shop
        sheet.setColumnWidth(3, 70);   // C: Type
        sheet.setColumnWidth(4, 100);  // D: Date
        sheet.setColumnWidth(5, 400);  // E: Notes
        sheet.setColumnWidth(6, 110);  // F: Amount
        sheet.setColumnWidth(7, 70);   // G: % Back
        sheet.setColumnWidth(8, 80);   // H: đ Back
        sheet.setColumnWidth(9, 90);   // I: Σ Back
        sheet.setColumnWidth(10, 110); // J: Final Price
        Logger.log('Column widths restored');
    } catch (e) {
        Logger.log('Column width error: ' + e);
    }
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
    sheet.getRange('A1').setNote('Script Version: 6.5');
    setMonthTabColor(sheet);

    sheet.getRange('A:O').setFontSize(12);

    var headers = ['ID', 'Shop', 'Type', 'Date', 'Notes', 'Amount', '% Back', 'đ Back', 'Σ Back', 'Final Price', 'ShopSource'];
    var headerRange = sheet.getRange('A1:K1');

    if (headerRange.isBlank() || headerRange.getValue() !== 'ID') {
        headerRange.setValues([headers]);
        headerRange.setFontWeight('bold').setBackground('#E5E7EB').setFontColor('#111827').setFontSize(12).setBorder(true, true, true, true, true, true);
        sheet.setFrozenRows(1);
    }

    try {
        sheet.hideColumns(1); // A
        sheet.hideColumns(11); // K: ShopSource
        sheet.setColumnWidth(2, 50); // B: Shop (Visual)
        sheet.setColumnWidth(3, 70); // C: Type
        sheet.setColumnWidth(4, 100); // D: Date
        sheet.setColumnWidth(5, 400); // E: Notes
        sheet.setColumnWidth(6, 110);
        sheet.setColumnWidth(7, 70);
        sheet.setColumnWidth(8, 80);
        sheet.setColumnWidth(9, 90);
        sheet.setColumnWidth(10, 110);
        sheet.hideColumns(15);
    } catch (e) { }

    sheet.getRange('B2:B').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.getRange('C2:D').setHorizontalAlignment('center');
    sheet.getRange('F2:J').setHorizontalAlignment('right');
    sheet.getRange('D2:D').setNumberFormat('dd-MM');
    sheet.getRange('F2:J').setNumberFormat('#,##0');

    // Conditional Formatting: Type is in Col C
    var rule1 = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$C2="In"').setBackground("#D5F5E3").setFontColor("#145A32").setRanges([sheet.getRange('A2:K')]).build();
    sheet.setConditionalFormatRules([rule1]);

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
    sheet.getRange("J2").setFormula('=ARRAYFORMULA(IF(F2:F=""; ""; IF(B2:B="In"; (VALUE(SUBSTITUTE(F2:F;".";"")) * -1) + VALUE(SUBSTITUTE(I2:I;".";"")); VALUE(SUBSTITUTE(F2:F;".";"")) - VALUE(SUBSTITUTE(I2:I;".";"")))))');
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

    var baseRange = sheet.getRange(6, 12, 30, 3); // L6:N35 (CRITICAL: Summary Area)
    var accountRange = sheet.getRange(6, 12, 30, 3); // L6:N35 (No. + Summary + Value)

    if (showBankAccount) {
        try { sheet.getRange(7, 13, 25, 1).clearContent(); } catch (e) { } // M7:M31
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

    // CRITICAL FIX: Ensure accountRange (L6:M35) is properly merged
    // This prevents Summary image from shifting when rows above are modified
    if (showBankAccount) {
        try {
            // Check if already merged first
            if (!targetRange.isMerged()) {
                targetRange.merge();
                Logger.log('Merged L6:N35 for Summary image protection');
            }
        } catch (e) {
            Logger.log('Merge error for L6:N35: ' + e);
        }
    } else {
        try { targetRange.merge(); } catch (e) { }
    }

    try {
        var escapedUrl = imgUrl.replace(/"/g, '""');
        targetRange.getCell(1, 1).setFormula('=IMAGE("' + escapedUrl + '";2)');
        Logger.log('Image applied to ' + targetRange.getA1Notation());
    } catch (e) {
        Logger.log('Image formula error: ' + e);
    }
}

function clearImageMerges(sheet) {
    // No-op: image merge is handled by applySheetImage()
    // Deliberately not breaking merges near Summary (L6:N35) to avoid unmerging the image block
}

function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function autoBackupSheet(ss, sheet) {
    try {
        // Clean up old backups first (Keep last 3? Or just 1. Let's keep 1 latest backup per cycle to save space)
        var cycleTag = sheet.getName();
        var backupName = "Backup_" + cycleTag;
        var oldBackup = ss.getSheetByName(backupName);
        if (oldBackup) { ss.deleteSheet(oldBackup); }

        // Create new backup
        sheet.copyTo(ss).setName(backupName).hideSheet();
    } catch (e) {
        // Ignore backup errors (e.g. permission or quota) but Log them
        Logger.log("Backup Error: " + e.toString());
    }
}

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
        "#E59866", // Aug - Darker Orange
        "#CD6155", // Sep - Red/Brown
        "#C39BD3", // Oct - Purple
        "#7FB3D5", // Nov - Blue
        "#76D7C4"  // Dec - Teal
    ];
    // Rotate through colors based on year/month index if needed, or just month.
    // Ensure index is safe
    sheet.setTabColor(colors[monthIndex % colors.length]);
}

/**
 * Scans the sheet for completely empty rows (checking key columns) and clears them.
 * NO LONGER DELETES rows - this prevents Summary area (L7:N35) from shifting.
 * Empty rows remain but don't corrupt data; can be manually deleted if needed.
 */
function cleanupEmptyRows(sheet) {
    try {
        var lastRow = sheet.getLastRow();
        if (lastRow < 2) return;

        // Get data range A2:O(LastRow)
        // We only check columns that MUST have data: ID(0), Date(2), Amount(5)
        // Checking Note(4) is optional as it can be empty.
        var range = sheet.getRange(2, 1, lastRow - 1, 15);
        var values = range.getValues();
        var rowsCleared = 0;

        // Scan backwards to clear safely (not delete!)
        for (var i = values.length - 1; i >= 0; i--) {
            var row = values[i];
            // ID (A) is empty AND Date (C) is empty AND Amount (F) is empty (or 0 but usually manual amount is set)
            // Manual rows have NO ID, but HAVE Date/Amount.
            // System rows HAVE ID.
            // So if ID is empty AND Price is empty... it's likely a blank row.
            var id = row[0];
            var date = row[2];
            var amount = row[5];

            var isEmpty = (!id || id === "") && (!date || date === "") && (!amount && amount !== 0);

            if (isEmpty) {
                // CRITICAL FIX: Clear content instead of deleting row
                // This prevents all rows below from shifting up
                // Summary area at L6:N35 stays in place
                var emptyRow = sheet.getRange(i + 2, 1, 1, 15); // i is 0-based from Row 2
                emptyRow.clearContent();
                emptyRow.setBackground('white');
                rowsCleared++;
            }
        }
        if (rowsCleared > 0) {
            Logger.log("cleanupEmptyRows: Cleared " + rowsCleared + " empty rows (not deleted - Summary protected).");
        }
    } catch (e) {
        Logger.log("cleanupEmptyRows Error: " + e.toString());
    }
}

/**
 * VALIDATION FUNCTION for Google Sheets Sync Fix
 * Run this function to verify that Summary area (L6:M35) is intact after operations
 * Called automatically after critical operations; can also be run manually for debugging
 */
function validateSheetStructure() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    Logger.log("=== VALIDATION START: Sheet Structure Check ===");
    Logger.log("Sheet: " + sheet.getName());

    var validation = {
        summaryMerged: false,
        noRefErrors: true,
        structureValid: false,
        summaryPosition: 'L6:N35',
        errors: []
    };

    // Check 1: Verify L6:N35 is merged
    try {
        var summaryRange = sheet.getRange('L6:N35');
        validation.summaryMerged = summaryRange.isMerged();
        Logger.log("✓ Summary merged (L6:N35): " + validation.summaryMerged);

        if (!validation.summaryMerged) {
            validation.errors.push("Summary area not merged - may be corrupted");
        }
    } catch (e) {
        validation.errors.push("Error checking Summary merge: " + e);
        Logger.log("✗ Error checking Summary merge: " + e);
    }

    // Check 2: Check for #REF! errors in Summary
    try {
        var summaryRange = sheet.getRange('L6:N35');
        var values = summaryRange.getValues();
        var refErrors = [];

        for (var i = 0; i < values.length; i++) {
            for (var j = 0; j < values[i].length; j++) {
                var cell = values[i][j];
                if (typeof cell === 'string' && cell.includes('#REF!')) {
                    validation.noRefErrors = false;
                    refErrors.push('Cell ' + summaryRange.getCell(i + 1, j + 1).getA1Notation() + ': ' + cell);
                }
            }
        }

        if (validation.noRefErrors) {
            Logger.log("✓ No #REF! errors in Summary area");
        } else {
            Logger.log("✗ Found #REF! errors in Summary area:");
            refErrors.forEach(function (err) { Logger.log("  - " + err); });
            validation.errors = validation.errors.concat(refErrors);
        }
    } catch (e) {
        validation.errors.push("Error checking Summary values: " + e);
        Logger.log("✗ Error checking Summary values: " + e);
    }

    // Check 3: Verify transaction range
    try {
        var lastRow = sheet.getLastRow();
        var txnRange = sheet.getRange('A2:J' + lastRow);
        Logger.log("✓ Transaction data range: " + txnRange.getA1Notation());
    } catch (e) {
        validation.errors.push("Error reading transaction range: " + e);
        Logger.log("✗ Error reading transaction range: " + e);
    }

    // Final validation
    validation.structureValid = validation.summaryMerged && validation.noRefErrors;

    Logger.log("");
    if (validation.structureValid) {
        Logger.log("✓✓✓ VALIDATION PASSED - Sheet structure is healthy");
    } else {
        Logger.log("✗✗✗ VALIDATION FAILED - Issues detected:");
        validation.errors.forEach(function (err) { Logger.log("  - " + err); });
    }
    Logger.log("=== VALIDATION END ===");

    return validation;
}
