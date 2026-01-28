/**
 * MoneyFlow 3 - Google Apps Script
 * @version 7.2 (Layout Optimized & UX Refined)
 * @date 2026-01-28 17:01
 *
 * LAYOUT v7.2 (Explicit Columns):
 * A: ID (Hidden) | B: Type | C: Date | D: Shop | E: Notes
 * F: Amount | G: % Back | H: đ Back | I: Σ Back | J: Final | K: Src
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

    // UPDATE VERSION NOTE (Verification)
    sheet.getRange('A1').setNote('Script Version: 6.9\nUpdated: ' + new Date().toISOString());

    var syncOptions = buildSheetSyncOptions(payload);

    // --- UPSERT STRATEGY v6.9 ---
    // A: ID (Hidden) | B: Type | C: Date | D: Shop | E: Notes
    // F: Amt | G: % | H: d | I: S | J: Final | K: Src

    // 1. READ & DETECT LAYOUT
    var range = sheet.getDataRange();
    var allValues = range.getValues();
    if (allValues.length === 0) allValues = [];

    // DETECT LAYOUT VERSION
    var layoutVersion = 'v6.9'; // Default
    if (allValues.length > 0) {
        var a1 = (allValues[0][0] || "").toString().trim();
        var b1 = (allValues[0][1] || "").toString().trim();

        Logger.log('Layout Check - A1: [' + a1 + '], B1: [' + b1 + ']');

        // v6.8 had Date at A
        if (a1 === 'Date') layoutVersion = 'v6.8';
        else if (a1 === 'ID' && b1 === 'Type') layoutVersion = 'v6.9'; // Current
        else if (a1 === 'ID' && b1 === 'Date') layoutVersion = 'v6.7'; // Old
    }

    if (layoutVersion !== 'v6.9') Logger.log("⚠️ Layout " + layoutVersion + " detected. Auto-migrating to v6.9...");

    // Index System Rows by ID
    var rowMap = {};
    var manualRowIndices = [];

    var startIndex = (allValues.length > 0 && allValues[0][0] === 'ID') ? 1 : 0;

    for (var i = startIndex; i < allValues.length; i++) {
        var row = allValues[i];
        var idVal = "";

        // ID Extraction based on version
        if (layoutVersion === 'v6.8') {
            // v6.8: Meta at J (9) -> "ID|Shop"
            var meta = (row[9] || "").toString();
            if (meta) idVal = meta.split('|')[0].trim();
        } else {
            // v6.9 / v6.7 / Legacy: ID at A (0)
            idVal = (row[0] || "").toString().trim();
        }

        // Robust check: valid UUID length
        if (idVal.length > 5) {
            rowMap[idVal] = i;
        } else {
            // Manual Row Detection
            // v6.9: A:Empty, B:Type, C:Date, F:Amount
            var hasData = false;
            // Check broadly to catch manual rows from broken v6.8 too
            // If v6.8, manual rows might be at A(Date), D(Amt).
            if (layoutVersion === 'v6.8') {
                hasData = row[0] || row[3];
            } else {
                // v6.9 standard: Check Date (C-2), Amt (F-5)
                hasData = row[2] || row[5];
            }
            if (hasData) manualRowIndices.push(i);
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
        var shopSrc = (txn.shop || "");

        // Prepare Row Data (Array size 11 - matching A:K)
        var rowData = new Array(11);
        rowData[0] = txn.id;    // A: ID
        rowData[1] = type;      // B: Type
        rowData[2] = dateObj;   // C: Date
        rowData[3] = "";        // D: Shop (Formula)
        rowData[4] = txn.notes || ""; // E: Notes
        rowData[5] = amt;       // F: Amount
        rowData[6] = txn.percent_back || 0; // G
        rowData[7] = txn.fixed_back || 0;   // H
        rowData[8] = "";        // I: S Back (Formula)
        rowData[9] = "";        // J: Final (Formula)
        rowData[10] = shopSrc;  // K: Shop Source (Hidden)

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
                var mType, mDate, mAmt;

                // READ MANUAL DATA based on Detect Version
                if (layoutVersion === 'v6.8') {
                    // v6.8: A=Date, D=Amt, I=Type
                    mDate = mRow[0]; mAmt = mRow[3]; mType = mRow[8];
                } else if (layoutVersion === 'v6.7') {
                    // v6.7: B=Date, E=Amt, J=Type
                    mDate = mRow[1]; mAmt = mRow[4]; mType = mRow[9];
                } else if (layoutVersion === 'v6.3') {
                    mType = mRow[1]; mDate = mRow[2]; mAmt = mRow[5];
                } else {
                    // v6.9 (Target)
                    // B=Type, C=Date, F=Amount
                    mType = mRow[1]; mDate = mRow[2]; mAmt = mRow[5];
                }

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
            // Update Existing Row (Overwrite A-K)
            for (var k = 0; k < 11; k++) allValues[targetIndex][k] = rowData[k];
        } else {
            newRows.push(rowData);
        }
    }

    // 4. WRITE BACK & MIGRATE
    var validOutputRows = [];
    validOutputRows.push(['ID', 'Type', 'Date', 'Shop', 'Notes', 'Amount', '% Back', 'đ Back', 'Σ Back', 'Final Price', 'ShopSource']);

    for (var i = startIndex; i < allValues.length; i++) {
        var row = allValues[i];

        // Determine if ID exists (System Row) check
        var idVal = "";
        if (layoutVersion === 'v6.8') {
            var meta = (row[9] || "").toString();
            if (meta && meta.includes('|')) idVal = meta.split('|')[0];
        } else {
            idVal = (row[0] || "").toString();
        }
        var hasId = idVal.length > 5;

        // Manual Preservation check
        var isManual = manualRowIndices.includes(i);

        if (hasId || isManual) {
            var outRow = new Array(11);
            // Check if this row is already in v6.9 format (from update loop)
            var isV69 = (row[0] === idVal && (row[1] === 'In' || row[1] === 'Out'));

            if (isV69 || layoutVersion === 'v6.9' || layoutVersion === 'v6.3') {
                for (var k = 0; k < 11; k++) outRow[k] = row[k] || "";
            } else {
                // MIGRATE
                if (layoutVersion === 'v6.8') {
                    // v6.8 -> v6.9
                    var mVal = (row[9] || "").toString();
                    outRow[0] = mVal.split('|')[0];
                    outRow[1] = row[8]; // Type
                    outRow[2] = row[0]; // Date
                    outRow[3] = "";
                    outRow[4] = row[2]; // Note
                    outRow[5] = row[3]; // Amt
                    outRow[6] = row[4];
                    outRow[7] = row[5];
                    outRow[8] = ""; outRow[9] = "";
                    outRow[10] = mVal.split('|')[1] || "";
                } else if (layoutVersion === 'v6.7') {
                    // v6.7 -> v6.9
                    outRow[0] = row[0];
                    outRow[1] = row[9];
                    outRow[2] = row[1];
                    outRow[3] = "";
                    outRow[4] = row[3];
                    outRow[5] = row[4];
                    outRow[6] = row[5]; outRow[7] = row[6];
                    outRow[8] = ""; outRow[9] = "";
                    outRow[10] = row[10];
                }
            }
            validOutputRows.push(outRow);
        }
    }

    for (var i = 0; i < newRows.length; i++) validOutputRows.push(newRows[i]);

    // Formula loop removed (using Array Formulas in applyBordersAndSort)

    // 5. WRITE & CLEANUP
    var lastRow = sheet.getLastRow();
    if (lastRow > 0) {
        try { sheet.getRange(1, 1, lastRow + 10, 20).clearContent(); } catch (e) { }
        try { sheet.getRange(1, 1, lastRow + 10, 20).setBorder(false, false, false, false, false, false).setBackground(null); } catch (e) { }
    }

    if (validOutputRows.length > 0) {
        sheet.getRange(1, 1, validOutputRows.length, 11).setValues(validOutputRows);
        // Date Format (C = 3)
        sheet.getRange(2, 3, validOutputRows.length - 1, 1).setNumberFormat('dd-MM');
        // Amount Format (F = 6)
        sheet.getRange(2, 6, validOutputRows.length - 1, 1).setNumberFormat('#,##0');
    }

    applyBordersAndSort(sheet, syncOptions.summaryOptions, validTxns.length);
    applySheetImage(sheet, syncOptions.imgUrl, syncOptions.imgProvided, syncOptions.summaryOptions);

    // HIDE ID(A) and Source(K)
    try { sheet.hideColumns(1); sheet.hideColumns(11); } catch (e) { }

    return jsonResponse({
        ok: true,
        syncedCount: validTxns.length,
        sheetId: ss.getId(),
        tabName: sheet.getName(),
        totalRows: validOutputRows.length - 1,
        manualPreserved: manualRowIndices.filter(function (i) { return i !== -1 }).length
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
    sheet.getRange(targetRow, 2).setValue(normalizeType(payload.type, payload.amount)); // B: Type
    sheet.getRange(targetRow, 3).setValue(new Date(payload.date)); // C: Date
    sheet.getRange(targetRow, 5).setValue(payload.notes || ""); // E: Note

    var amt = Math.abs(payload.amount);
    sheet.getRange(targetRow, 6).setValue(amt); // F: Amount

    sheet.getRange(targetRow, 7).setValue(payload.percent_back || 0); // G
    sheet.getRange(targetRow, 8).setValue(payload.fixed_back || 0);   // H
    sheet.getRange(targetRow, 11).setValue(payload.shop || ""); // K: ShopSource

    // formulas handled by ensureArrayFormulas called in applyBordersAndSort

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
        var headers = ['ID', 'Type', 'Date', 'Shop', 'Notes', 'Amount', '% Back', 'đ Back', 'Σ Back', 'Final Price', 'ShopSource'];
        // Always reset headers to ensure style & content are correct
        headerRange.setValues([headers]);
        headerRange.setFontWeight('bold')
            .setBackground('#4f46e5')
            .setFontColor('#FFFFFF')
            .setBorder(true, true, true, true, true, true)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle');
        sheet.setFrozenRows(1);
    } catch (e) {
        Logger.log('Header restore error: ' + e);
    }

    // Set Tab Color (v6.7 Fix)
    try { setMonthTabColor(sheet); } catch (e) { }

    // 0. SELF-HEALING: Remove completely empty rows
    cleanupEmptyRows(sheet);

    // 1. DATA STYLING & SORTING (Only System Rows)
    var lastSortRow = systemRowCount ? (systemRowCount + 1) : getLastSystemRow(sheet);

    if (lastSortRow >= 2) {
        clearImageMerges(sheet);
        var rowCount = lastSortRow - 1;

        Utilities.sleep(300);
        SpreadsheetApp.flush();

        // SORT A:K
        // Sort Date (Col 3 - C)
        var dataRange = sheet.getRange(2, 1, rowCount, 11);
        dataRange.sort([{ column: 3, ascending: true }]);
        Logger.log('Sorted transaction data range: ' + dataRange.getA1Notation());

        // APPLY ARRAY FORMULAS
        // Shop, S Back, Final Price
        ensureArrayFormulas(sheet);

        var maxRow = sheet.getLastRow();
        if (maxRow >= 2) {
            var totalRows = maxRow - 1;
            // Borders A:K
            sheet.getRange(2, 1, totalRows, 11)
                .setBorder(true, true, true, true, true, true)
                .setBackground('#FFFFFF')
                .setFontWeight('normal');

            // Alignments (v6.9)
            // A: ID (Left)
            // B: Type (Center)
            // C: Date (Center)
            // D: Shop (Center)
            // E: Notes (Left)
            // F: Amt (Right)
            // G-J: Numbers (Right)
            // K: Src (Left)

            sheet.getRange(2, 1, totalRows, 1).setHorizontalAlignment('left'); // A: ID
            sheet.getRange(2, 2, totalRows, 1).setHorizontalAlignment('center'); // B: Type
            sheet.getRange(2, 3, totalRows, 1).setHorizontalAlignment('center'); // C: Date
            sheet.getRange(2, 4, totalRows, 1).setHorizontalAlignment('center'); // D: Shop
            sheet.getRange(2, 5, totalRows, 1).setHorizontalAlignment('left'); // E: Notes
            sheet.getRange(2, 6, totalRows, 1).setHorizontalAlignment('right'); // F: Amt
            sheet.getRange(2, 7, totalRows, 4).setHorizontalAlignment('right'); // G-J
            sheet.getRange(2, 11, totalRows, 1).setHorizontalAlignment('left'); // K: Src

            // Number Formats
            sheet.getRange(2, 3, totalRows, 1).setNumberFormat('dd-MM'); // Date(C)
            sheet.getRange(2, 6, totalRows, 1).setNumberFormat('#,##0'); // Amount(F)
            sheet.getRange(2, 8, totalRows, 3).setNumberFormat('#,##0'); // H-J (d, S, Final)
        }
    }

    // 2. ALWAYS Re-draw Summary Table (Shifted to M - Col 13)
    try {
        var startCol = 13; // M
        // Clear old summary area if any
        var maxRows = sheet.getMaxRows();
        var clearRange = sheet.getRange(1, startCol, maxRows, 3); // M:O
        // Handled by setupSummaryTable
    } catch (e) { }

    setupSummaryTable(sheet, summaryOptions);

    // 3. RE-APPLY COLUMN VISIBILITY & WIDTHS
    try {
        sheet.showColumns(1, 15);
        sheet.hideColumns(1); // Hide A (ID)
        sheet.hideColumns(11); // Hide K (ShopSource)
    } catch (e) { }

    // 4. RESTORE COLUMN WIDTHS
    try {
        sheet.setColumnWidth(2, 50);  // B: Type
        sheet.setColumnWidth(3, 80);  // C: Date
        sheet.setColumnWidth(4, 60);  // D: Shop
        sheet.setColumnWidth(5, 250); // E: Notes
        sheet.setColumnWidth(6, 100); // F: Amount
        sheet.setColumnWidth(7, 65);  // G: % Back
        sheet.setColumnWidth(8, 70);  // H: đ Back
        sheet.setColumnWidth(9, 75);  // I: Σ Back
        sheet.setColumnWidth(10, 95);
        sheet.setColumnWidth(12, 10); // Blank L
        sheet.setColumnWidth(13, 25);  // No. M (Very Narrow)
        sheet.setColumnWidth(14, 150); // Summary N
        sheet.setColumnWidth(15, 100); // Value O

        // Set Data Row Heights (2:Max)
        var maxRowForHeight = sheet.getLastRow();
        if (maxRowForHeight >= 2) {
            sheet.setRowHeights(2, maxRowForHeight - 1, 30);
        }
    } catch (e) { }
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
    sheet.getRange('A1').setNote('Script Version: 7.2');
    setMonthTabColor(sheet);

    sheet.getRange('A:O').setFontSize(12);

    // v6.9 Headers: ID (A), Type (B), Date (C), Shop (D), Notes (E), Amt (F), % (G), d (H), S (I), Final (J), Src (K)
    var headers = ['ID', 'Type', 'Date', 'Shop', 'Notes', 'Amount', '% Back', 'đ Back', 'Σ Back', 'Final Price', 'ShopSource'];
    var headerRange = sheet.getRange('A1:K1');

    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold')
        .setBackground('#4f46e5')
        .setFontColor('#FFFFFF')
        .setBorder(true, true, true, true, true, true)
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');
    sheet.setFrozenRows(1);

    // Hide ID (A) and Src (K)
    try {
        sheet.showColumns(1, 15);
        sheet.hideColumns(1);
        sheet.hideColumns(11);
    } catch (e) { }

    // Column Widths
    try {
        sheet.setColumnWidth(2, 50);  // B: Type
        sheet.setColumnWidth(3, 80);  // C: Date
        sheet.setColumnWidth(4, 60);  // D: Shop
        sheet.setColumnWidth(5, 250); // E: Notes
        sheet.setColumnWidth(6, 100); // F: Amount
        sheet.setColumnWidth(7, 65);  // G: % Back
        sheet.setColumnWidth(8, 70);  // H: đ Back
        sheet.setColumnWidth(9, 75);  // I: Σ Back
        sheet.setColumnWidth(10, 95);
        sheet.setColumnWidth(12, 10); // Blank L
        sheet.setColumnWidth(13, 25);  // No. M
        sheet.setColumnWidth(14, 150); // Summary N
        sheet.setColumnWidth(15, 100); // Value O
    } catch (e) { }

    // Conditional Formatting for Type (Column B - 2)
    var rules = sheet.getConditionalFormatRules();
    var hasTypeRule = rules.some(function (r) {
        var ranges = r.getRanges();
        return ranges.length > 0 && ranges[0].getColumn() === 2;
    });

    if (!hasTypeRule) {
        // IN (Green)
        var ruleIn = SpreadsheetApp.newConditionalFormatRule()
            .whenTextEqualTo('In')
            .setBackground('#DCFCE7')
            .setFontColor('#166534')
            .setRanges([sheet.getRange('B2:B1000')])
            .build();

        // OUT (Red)
        var ruleOut = SpreadsheetApp.newConditionalFormatRule()
            .whenTextEqualTo('Out')
            .setBackground('#FEE2E2')
            .setFontColor('#991B1B')
            .setRanges([sheet.getRange('B2:B1000')])
            .build();

        rules.push(ruleIn);
        rules.push(ruleOut);
        sheet.setConditionalFormatRules(rules);
    }

    // Ensure others
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

    // START AT COL M (13)
    var startCol = 13;

    // Clear all backgrounds first M2:O6
    sheet.getRange(2, startCol, 5, 3).setBackground(null).setFontColor('#000000');

    // Header M1:O1
    var r = sheet.getRange(1, startCol, 1, 3);
    r.setValues([['No.', 'Summary', 'Value']]);
    r.setFontWeight('bold')
        .setBackground('#4f46e5')
        .setFontColor('#FFFFFF')
        .setFontSize(12)
        .setBorder(true, true, true, true, true, true)
        .setHorizontalAlignment('center');

    var labels = [
        [1, 'In (Gross)'],
        [2, 'Out (Gross)'],
        [3, 'Total Back'],
        [4, 'Remains']
    ];
    sheet.getRange(2, startCol, 4, 2).setValues(labels);
    sheet.getRange(2, startCol, 4, 2).setFontWeight('bold');

    // FORMULAS UPDATE v6.9
    // B=Type, F=Amount, I=SumBack, J=FinalPrice

    // In (Gross): Sum of Amount (F) where Type (B) == "In" (Showing as negative credit)
    sheet.getRange(2, startCol + 2).setFormula('=SUMIFS(F:F;B:B;"In") * -1');
    sheet.getRange(2, startCol + 2).setFontColor('#14532d'); // Dark Green

    // Out (Gross): Sum of Amount (F) where Type (B) == "Out"
    sheet.getRange(3, startCol + 2).setFormula('=SUMIFS(F:F;B:B;"Out")');
    sheet.getRange(3, startCol + 2).setFontColor('#991b1b'); // Dark Red

    // Total Back: Sum of SumBack (I)
    sheet.getRange(4, startCol + 2).setFormula('=SUM(I:I)');
    sheet.getRange(4, startCol + 2).setFontColor('#1e40af'); // Blue

    // Remains: Sum of FinalPrice (J)
    sheet.getRange(5, startCol + 2).setFormula('=SUM(J:J)');

    // Styling
    sheet.getRange(2, startCol + 2, 4, 1).setNumberFormat('#,##0').setFontWeight('bold');
    sheet.getRange(2, startCol, 4, 3).setBorder(true, true, true, true, true, true);

    // Highlight Remains: Row 5
    sheet.getRange(5, startCol, 1, 3).setBackground('#fee2e2');

    // Bank Info at Row 6
    var bankCell = sheet.getRange(6, startCol, 1, 3);
    bankCell.breakApart();
    bankCell.setBackground('#f9fafb');

    try {
        if (showBankAccount) {
            if (shouldMerge) {
                bankCell.merge();
            }

            // Dynamic Formula with Remains (Col O, Row 5 => O5)
            if (bankAccountText) {
                var escapedText = bankAccountText.replace(/"/g, '""');
                bankCell.setFormula('="' + escapedText + ' " & TEXT(O5;"0")');
            } else {
                bankCell.setFormula('=BankInfo!A2&" "&BankInfo!B2&" "&BankInfo!C2&" "&TEXT(O5;"0")');
            }
            bankCell.breakApart();
            bankCell.merge();
            bankCell.setFontWeight('bold')
                .setHorizontalAlignment('left')
                .setBorder(true, true, true, true, true, true)
                .setWrap(false);
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
 * Ensures ArrayFormulas are present in cells B2, G2, H2, K2.
 * These formulas automatically expand down the sheet for all rows.
 * Clears any specific cell content in target columns to prevent #REF! errors.
 */
function ensureArrayFormulas(sheet) {
    try {
        var lastRow = sheet.getLastRow();
        if (lastRow > 2) {
            // Clear content in Formula Columns: D, I, J
            sheet.getRange("D3:D").clearContent();
            sheet.getRange("I3:I").clearContent();
            sheet.getRange("J3:J").clearContent();
        }
        // Force Clear Row 2
        sheet.getRange("D2").clearContent();
        sheet.getRange("I2").clearContent();
        sheet.getRange("J2").clearContent();
    } catch (e) { }

    // D2: Shop (v6.9)
    // Formula logic: 
    // 1. Get mapped value from Shop sheet
    // 2. If it is a URL (starts with http), show as IMAGE(..., 1)
    // 3. Otherwise show the mapping or original text
    var shopFormula = '=ARRAYFORMULA(IF(K2:K=""; ""; ' +
        'LET(mapped; IFERROR(VLOOKUP(TRIM(K2:K); Shop!A:B; 2; FALSE); TRIM(K2:K)); ' +
        'IF(LEFT(mapped; 4)="http"; IMAGE(mapped; 1); mapped) ' +
        ')))';
    sheet.getRange("D2").setFormula(shopFormula);

    // I2: S Back (Amount F * % G + d H)
    sheet.getRange("I2").setFormula('=ARRAYFORMULA(IF(F2:F=""; ""; (IF(ISNUMBER(F2:F); F2:F; VALUE(SUBSTITUTE(F2:F;".";""))) * IF(ISNUMBER(G2:G); G2:G; 0) / 100) + IF(ISNUMBER(H2:H); H2:H; 0)))');

    // J2: Final Price (In: -Amt + Back; Out: Amt - Back)
    // Type is in B
    sheet.getRange("J2").setFormula('=ARRAYFORMULA(IF(F2:F=""; ""; IF(B2:B="In"; (IF(ISNUMBER(F2:F); F2:F; VALUE(SUBSTITUTE(F2:F;".";""))) * -1) + I2:I; IF(ISNUMBER(F2:F); F2:F; VALUE(SUBSTITUTE(F2:F;".";""))) - I2:I)))');
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

    var baseRange = sheet.getRange(7, 13, 20, 3); // M7:O26 (Range as requested)
    var accountRange = sheet.getRange(7, 13, 20, 3); // M7:O26

    if (showBankAccount) {
        try {
            // BREAK APART FIRST to ensure reliable merge
            sheet.getRange(7, 13, 50, 3).breakApart();
            accountRange.clearContent();
        } catch (e) { }
    } else {
        try {
            sheet.getRange(7, 13, 50, 3).breakApart();
            baseRange.clearContent();
        } catch (e) { }
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
            targetRange.breakApart();
            targetRange.merge();
            Logger.log('Merged M7:O26 for Summary image protection');
        } catch (e) {
            Logger.log('Merge error for M7:O26: ' + e);
        }
    } else {
        try {
            targetRange.breakApart();
            targetRange.merge();
        } catch (e) { }
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
 * NO LONGER DELETES rows - this prevents Summary area (M2:O6) from shifting.
 * Empty rows remain but don't corrupt data; can be manually deleted if needed.
 */
/**
 * Scans the sheet for completely empty rows (checking key columns) and clears them.
 * NO LONGER DELETES rows - this prevents Summary area (M2:O6) from shifting.
 * Empty rows remain but don't corrupt data; can be manually deleted if needed.
 */
function cleanupEmptyRows(sheet) {
    try {
        var lastRow = sheet.getLastRow();
        if (lastRow < 2) return;

        // Get data range A2:K(LastRow)
        var range = sheet.getRange(2, 1, lastRow - 1, 11); // A:K
        var values = range.getValues();
        var rowsCleared = 0;

        // Scan backwards
        for (var i = values.length - 1; i >= 0; i--) {
            var row = values[i];

            // v6.9 Checks (0-indexed relative to A:K)
            // A(0): ID (System)
            // C(2): Date (Manual/System)
            // F(5): Amount (Manual/System)

            var idVal = row[0];
            var dateVal = row[2];
            var amtVal = row[5];

            // Consider empty if NO ID, NO Date, NO Amount
            var isEmpty = (!idVal || idVal === "") && (!dateVal || dateVal === "") && (!amtVal && amtVal !== 0);

            if (isEmpty) {
                // Clear content A:K (Columns 1 to 11)
                // Protect Summary at M:O
                var emptyRow = sheet.getRange(i + 2, 1, 1, 11);
                emptyRow.clearContent();
                emptyRow.setBackground('white');
                emptyRow.setBorder(false, false, false, false, false, false);
                rowsCleared++;
            }
        }
        if (rowsCleared > 0) {
            Logger.log("cleanupEmptyRows: Cleared " + rowsCleared + " empty rows (Summary M:O protected).");
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
        summaryPosition: 'M6:O6 (Header), M2:O5 (Data)',
        errors: []
    };

    // Check 1: Verify M1:O1 is merged (Header) or M6 if BankInfo?
    // Summary Table now at M:O. Rows 1-6.
    try {
        var header = sheet.getRange('M1:O1'); // Header
        // Actually usually not merged? 
        // setup: r.setValues([['No.', 'Summary', 'Value']]); (3 cells).
        // BankInfo at Row 6 IS merged.

        var bankCell = sheet.getRange('M6:O6');
        validation.summaryMerged = bankCell.isMerged();
        Logger.log("✓ Bank Info merged (M6:O6): " + validation.summaryMerged);

        if (!validation.summaryMerged) {
            validation.errors.push("Bank Info area (M6:O6) not merged - may be corrupted or feature disabled");
            // Not necessarily error if BankInfo disabled.
        }
    } catch (e) {
        validation.errors.push("Error checking Summary merge: " + e);
        Logger.log("✗ Error checking Summary merge: " + e);
    }

    // Check 2: Check for #REF! errors in Summary (M2:O6)
    try {
        var summaryRange = sheet.getRange('M2:O6');
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
            Logger.log("✓ No #REF! errors in Summary area (M2:O6)");
        } else {
            Logger.log("✗ Found #REF! errors in Summary area:");
            refErrors.forEach(function (err) { Logger.log("  - " + err); });
            validation.errors = validation.errors.concat(refErrors);
        }
    } catch (e) {
        validation.errors.push("Error checking Summary values: " + e);
        Logger.log("✗ Error checking Summary values: " + e);
    }

    // Check 3: Verify transaction range A2:K
    try {
        var lastRow = sheet.getLastRow();
        var txnRange = sheet.getRange('A2:K' + lastRow);
        Logger.log("✓ Transaction data range: " + txnRange.getA1Notation());
    } catch (e) {
        validation.errors.push("Error reading transaction range: " + e);
        Logger.log("✗ Error reading transaction range: " + e);
    }

    // Final validation
    validation.structureValid = validation.noRefErrors;

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
