// Created by Codex on 2025-12-27 17:21 +07
/**
 * sheetService.js
 * Logic for managing spreadsheets and syncing transactions.
 */

// --- 1. Sheet Management ---

function ensurePersonSheet(personId, options) {
    var opts = options || {};
    var props = PropertiesService.getScriptProperties();
    var key = personId ? "SHEET_" + personId : null;

    var incomingSheetId = opts.sheetId || opts.sheet_id || null;
    var incomingSheetUrl = opts.sheetUrl || opts.sheet_url || null;
    var resolvedId = incomingSheetId || extractSheetIdFromUrl(incomingSheetUrl);
    debugLog('[ensurePersonSheet] start', {
        personId: personId || null,
        incomingSheetId: incomingSheetId || null,
        incomingSheetUrl: incomingSheetUrl || null,
        resolvedId: resolvedId || null
    });

    if (!resolvedId && personId && key) {
        var storedId = props.getProperty(key);
        if (storedId) {
            try {
                var storedSheet = SpreadsheetApp.openById(storedId);
                debugLog('[ensurePersonSheet] using stored sheet', storedId);
                return { ss: storedSheet, id: storedId, url: storedSheet.getUrl(), new: false };
            } catch (e) {
                debugLog('[ensurePersonSheet] stored sheet invalid', storedId, e.toString());
                props.deleteProperty(key);
            }
        }
    }

    if (resolvedId) {
        try {
            var resolvedSheet = SpreadsheetApp.openById(resolvedId);
            if (key) props.setProperty(key, resolvedId);
            debugLog('[ensurePersonSheet] using provided sheet', resolvedId);
            return { ss: resolvedSheet, id: resolvedId, url: resolvedSheet.getUrl(), new: false };
        } catch (e) {
            // fall through to search/create
            debugLog('[ensurePersonSheet] provided sheet failed', resolvedId, e.toString());
            if (key) props.deleteProperty(key);
        }
    }

    if (personId) {
        var targetName = "MoneyFlow_" + personId;
        var files = DriveApp.getFilesByName(targetName);
        if (files.hasNext()) {
            var file = files.next();
            var ssByName = SpreadsheetApp.openById(file.getId());
            if (key) props.setProperty(key, ssByName.getId());
            debugLog('[ensurePersonSheet] using sheet by name', targetName, ssByName.getId());
            return { ss: ssByName, id: ssByName.getId(), url: ssByName.getUrl(), new: false };
        }
    }

    if (!personId) {
        var active = SpreadsheetApp.getActiveSpreadsheet();
        if (active) {
            debugLog('[ensurePersonSheet] using active sheet', active.getId());
            return { ss: active, id: active.getId(), url: active.getUrl(), new: false };
        }
    }

    var name = "MoneyFlow_" + (personId || "Sheet");
    var created = SpreadsheetApp.create(name);
    var createdId = created.getId();
    if (key) props.setProperty(key, createdId);

    debugLog('[ensurePersonSheet] created new sheet', name, createdId);
    return { ss: created, id: createdId, url: created.getUrl(), new: true };
}

function ensureCycleTab(ss, cycleTag) {
    var normalized = normalizeCycleTag(cycleTag) || getCycleTagFromDate(new Date());
    var tabName = normalized;
    var sheet = ss.getSheetByName(tabName);

    if (!sheet) {
        sheet = ss.insertSheet(tabName);
        debugLog('[ensureCycleTab] created tab', tabName);
    } else {
        // Check if header needs update? (Skipped for performance)
        debugLog('[ensureCycleTab] existing tab', tabName);
    }

    safeRun('setupSheetStructure', function () { setupSheetStructure(sheet); });
    safeRun('ensureShopLookupSheet', function () { ensureShopLookupSheet(ss); });
    safeRun('ensureBankInfoSheet', function () { ensureBankInfoSheet(ss); });
    safeRun('setupSummaryTable', function () { setupSummaryTable(sheet); });
    safeRun('applyCalcFormulas', function () { applyCalcFormulas(sheet); });
    safeRun('hideIdColumn', function () { sheet.hideColumns(1); });
    safeRun('setupShopIconFormula', function () { setupShopIconFormula(sheet); });

    return { sheet: sheet, tabName: tabName };
}

function setupSheetStructure(sheet) {
    // Columns: A=ID, B=Type, C=Date, D=Shop, E=Notes, F=Amount, G=%Back, H=FixBack, I=SumBack, J=FinalPrice
    var headers = ['ID', 'Type', 'Date', 'Shop', 'Notes', 'Amount', '% Back', 'đ Back', 'Σ Back', 'Final Price'];

    sheet.getRange('A1:J1')
        .setValues([headers])
        .setFontWeight('bold')
        .setBackground('#E5E7EB')
        .setFontColor('#111827')
        .setFontSize(12)
        .setBorder(true, true, true, true, true, true);

    sheet.setFrozenRows(1);
    sheet.getRange('A:Z').setFontSize(12);

    // Column Widths
    sheet.setColumnWidth(1, 0);
    sheet.hideColumns(1);

    sheet.setColumnWidth(2, 70);   // Type
    sheet.setColumnWidth(3, 70);   // Date
    sheet.setColumnWidth(4, 44);   // Shop (icon)
    sheet.setColumnWidth(5, 250);  // Notes
    sheet.setColumnWidth(6, 110);  // Amount
    sheet.setColumnWidth(7, 70);   // % Back
    sheet.setColumnWidth(8, 80);   // đ Back
    sheet.setColumnWidth(9, 90);   // Sum Back
    sheet.setColumnWidth(10, 110); // Final Price
    sheet.setColumnWidth(11, 24);  // Spacer

    applyCalcFormulas(sheet);

    // Formatting
    sheet.getRange('F2:F').setNumberFormat('#,##0.00');
    sheet.getRange('G2:J').setNumberFormat('#,##0');
    sheet.getRange('C2:C').setNumberFormat('dd-MM');
    sheet.getRange('D:D').setHorizontalAlignment('center');

    // Table banding
    var existingBandings = sheet.getBandings();
    for (var i = 0; i < existingBandings.length; i++) {
        existingBandings[i].remove();
    }
    try {
        var bandingRange = sheet.getRange(1, 1, sheet.getMaxRows(), 10);
        var banding = bandingRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
        banding.setHeaderRowColor('#E5E7EB');
        banding.setFirstBandColor('#FFFFFF');
        banding.setSecondBandColor('#F8FAFC');
    } catch (e) {
        debugLog('[setupSheetStructure] banding failed', e.toString());
    }

    // Conditional Formatting
    var rule1 = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$B2="In"')
        .setBackground("#D5F5E3")
        .setFontColor("#145A32")
        .setRanges([sheet.getRange('A2:J')])
        .build();

    sheet.setConditionalFormatRules([rule1]);
}

function setupSummaryTable(sheet) {
    // Summary table at L1:N5 (leave K as spacer)
    sheet.getRange('L1:N1')
        .setValues([['No.', 'Summary', 'Value']])
        .setFontWeight('bold')
        .setBackground('#E5E7EB')
        .setFontColor('#111827')
        .setBorder(true, true, true, true, true, true)
        .setHorizontalAlignment('center');

    sheet.getRange('L2:L5').setValues([[1], [2], [3], [4]]);
    sheet.getRange('M2:M5').setValues([['In'], ['Sum Back'], ['Out'], ['Remains']]);

    applyFormulaSafe(sheet.getRange('N2'), '=IFERROR(SUM(FILTER($F$2:$F;$B$2:$B="In";$A$2:$A<>""));0)');
    applyFormulaSafe(sheet.getRange('N3'), '=IFERROR(SUM(FILTER($I$2:$I;$A$2:$A<>""));0)');
    applyFormulaSafe(sheet.getRange('N4'), '=IFERROR(SUM(FILTER($F$2:$F;$B$2:$B="Out";$A$2:$A<>""));0)');
    applyFormulaSafe(sheet.getRange('N5'), '=IFERROR(N4-(N2+N3);0)');

    sheet.getRange('N2:N5').setNumberFormat('#,##0').setFontWeight('bold');
    sheet.getRange('L2:N5').setBorder(true, true, true, true, true, true);

    sheet.setColumnWidth(12, 50);
    sheet.setColumnWidth(13, 130);
    sheet.setColumnWidth(14, 130);

    var bankInfoCell = sheet.getRange('L7:N7');
    try {
        bankInfoCell.merge();
    } catch (e) {
        // ignore if already merged
    }
    applyFormulaSafe(
        bankInfoCell,
        '=BankInfo!A2&" "&BankInfo!B2&" "&BankInfo!C2&" "&ROUND(N5;0)'
    );
    bankInfoCell.setFontWeight('bold').setHorizontalAlignment('left');
    bankInfoCell.setBorder(true, true, true, true, true, true);

    sheet.getRange('L2:N2').setBackground('#D1FAE5');
    sheet.getRange('L3:N3').setBackground('#DBEAFE');
    sheet.getRange('L4:N4').setBackground('#FEE2E2');
}

function ensureShopLookupSheet(ss) {
    var shopSheet = ss.getSheetByName('Shop');
    if (shopSheet) return shopSheet;

    shopSheet = ss.insertSheet('Shop');
    shopSheet.getRange('A1:B1')
        .setValues([['Shop', 'Icon']])
        .setFontWeight('bold')
        .setBackground('#E5E7EB')
        .setFontColor('#111827')
        .setBorder(true, true, true, true, true, true);
    shopSheet.setFrozenRows(1);
    shopSheet.setColumnWidth(1, 160);
    shopSheet.setColumnWidth(2, 80);
    shopSheet.getRange('A2').setValue('Bank');
    shopSheet.getRange('B2').setValue('');
    return shopSheet;
}

function ensureBankInfoSheet(ss) {
    var bankSheet = ss.getSheetByName('BankInfo');
    if (bankSheet) return bankSheet;

    bankSheet = ss.insertSheet('BankInfo');
    bankSheet.getRange('A1:C1')
        .setValues([['Bank', 'Account', 'Name']])
        .setFontWeight('bold')
        .setBackground('#E5E7EB')
        .setFontColor('#111827')
        .setBorder(true, true, true, true, true, true);
    bankSheet.setFrozenRows(1);
    bankSheet.setColumnWidth(1, 160);
    bankSheet.setColumnWidth(2, 180);
    bankSheet.setColumnWidth(3, 180);
    return bankSheet;
}
function setupShopIconFormula(sheet) {
    // Store raw shop in column O, show icon in column D
    sheet.getRange('O1').setValue('Shop Raw');
    sheet.hideColumns(15);
    applyFormulaSafe(
        sheet.getRange('D2'),
        '=ARRAYFORMULA(IF(O2:O="";"";IFERROR(VLOOKUP(O2:O;Shop!A:B;2;FALSE);O2:O)))'
    );
}


// --- 2. Sync Logic ---

function syncTransactionsToSheet(sheet, transactions) {
    var lastRow = getLastDataRow(sheet);
    var normalizedTransactions = transactions.map(function (txn) {
        return {
            id: txn.id,
            type: txn.type,
            date: txn.date,
            shop: txn.shop,
            notes: txn.notes,
            amount: txn.amount,
            percent_back: txn.percent_back,
            fixed_back: txn.fixed_back
        };
    });

    // Sort transactions by date desc or asc? usually Descending for viewing.
    normalizedTransactions.sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
    });

    var newValues = normalizedTransactions.map(function (txn) {
        return [
            txn.id,
            normalizeType(txn.type, txn.amount),
            new Date(txn.date), // Date
            "",
            String(txn.notes || ""), // Ensure string
            Math.abs(txn.amount),
            txn.percent_back || 0,
            txn.fixed_back || 0
        ];
    });

    var shopValues = normalizedTransactions.map(function (txn) {
        return [txn.shop || ""];
    });

    // Clear old data
    if (lastRow >= 2) {
        sheet.getRange(2, 1, lastRow - 1, 10).clearContent();
        sheet.getRange(2, 15, lastRow - 1, 1).clearContent();
    }

    // Write new data
    if (newValues.length > 0) {
        sheet.getRange(2, 1, newValues.length, 8).setValues(newValues);
        sheet.getRange(2, 15, shopValues.length, 1).setValues(shopValues);
        // Restore formulas if needed? ArrayFormulas in Row 2 handle it automatically if they cover the whole column.
        // Our formulas are `I2:I` style, so they auto-expand? 
        // `ARRAYFORMULA(IF(F2:F="","",...))` -> Yes, they work on reference.
    }

    if (lastRow > 1) {
        sheet.getRange(2, 1, Math.max(lastRow - 1, 1), 10)
            .setBorder(true, true, true, true, true, true);
    }
    if (newValues.length > 0) {
        sheet.getRange(2, 1, newValues.length, 10)
            .setBorder(true, true, true, true, true, true);
    }

    safeRun('applyCalcFormulas', function () { applyCalcFormulas(sheet); });
    safeRun('hideIdColumn', function () { sheet.hideColumns(1); });
    safeRun('setupShopIconFormula', function () { setupShopIconFormula(sheet); });

    try {
        sheet.autoResizeColumns(2, 13);
    } catch (e) {
        debugLog('[syncTransactionsToSheet] autoResize failed', e.toString());
    }

    debugLog('[syncTransactionsToSheet] synced', newValues.length, 'rows to', sheet.getName());
    return { count: newValues.length };
}

function upsertTransactionRow(sheet, txn, action) {
    if (!txn || !txn.id) return { count: 0 };
    var rowData = [
        txn.id,
        normalizeType(txn.type, txn.amount),
        new Date(txn.date),
        "",
        String(txn.notes || ""),
        Math.abs(txn.amount),
        txn.percent_back || 0,
        txn.fixed_back || 0
    ];
    var shopValue = txn.shop || "";

    var rowIndex = findRowIndexById(sheet, txn.id, 1);
    if (action === 'delete') {
        if (rowIndex > 0) sheet.deleteRow(rowIndex);
        debugLog('[upsertTransactionRow] delete', txn.id, rowIndex);
        return { count: rowIndex > 0 ? 1 : 0 };
    }

    if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        sheet.getRange(rowIndex, 15, 1, 1).setValues([[shopValue]]);
        debugLog('[upsertTransactionRow] update', txn.id, rowIndex);
    } else {
        var nextRow = Math.max(2, getLastDataRow(sheet) + 1);
        sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
        sheet.getRange(nextRow, 15, 1, 1).setValues([[shopValue]]);
        debugLog('[upsertTransactionRow] insert', txn.id, nextRow);
    }

    safeRun('applyCalcFormulas', function () { applyCalcFormulas(sheet); });
    safeRun('hideIdColumn', function () { sheet.hideColumns(1); });
    safeRun('setupShopIconFormula', function () { setupShopIconFormula(sheet); });
    return { count: 1 };
}

function applyCalcFormulas(sheet) {
    applyFormulaSafe(
        sheet.getRange('I2'),
        '=ARRAYFORMULA(IF(F2:F="";"";IF(F2:F*G2:G/100+H2:H=0;"";F2:F*G2:G/100+H2:H)))'
    );
    applyFormulaSafe(
        sheet.getRange('J2'),
        '=ARRAYFORMULA(IF(F2:F="";"";IF(B2:B="In";(F2:F-I2:I)*(-1);F2:F-I2:I)))'
    );
}

function safeRun(label, fn) {
    try {
        fn();
    } catch (e) {
        debugLog('[' + label + '] failed', e.toString());
    }
}

function applyFormulaSafe(range, formula) {
    try {
        range.setFormula(formula);
        return;
    } catch (e) {
        // Try locale fallback (comma-separated)
    }
    try {
        range.setFormula(formula.replace(/;/g, ','));
    } catch (err) {
        debugLog('[applyFormulaSafe] failed', err.toString());
    }
}

function getLastDataRow(sheet) {
    var maxRows = sheet.getMaxRows();
    if (maxRows < 2) return 1;
    var values = sheet.getRange(2, 1, maxRows - 1, 1).getValues();
    for (var i = values.length - 1; i >= 0; i--) {
        if (values[i][0] !== '' && values[i][0] !== null) {
            return i + 2;
        }
    }
    return 1;
}
