// Created by Codex on 2025-12-27 09:47 +07
/**
 * MoneyFlow Sync Script
 * Router for Sheet Management & Sync
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    if (!e || !e.postData) throw new Error("No data");
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    debugLog('[doPost] action', action || 'none');

    var result = {};

    if (action === "ensureSheet" || action === "create_cycle_sheet") {
      var personId = data.personId || data.person_id || null;
      var cycleTag = data.cycleTag || data.cycle_tag || extractCycleTagFromPayload(data);
      debugLog('[doPost] ensureSheet', {
        personId: personId,
        cycleTag: cycleTag,
        sheetId: data.sheetId || data.sheet_id || null,
        sheetUrl: data.sheetUrl || data.sheet_url || null
      });

      var personRes = ensurePersonSheet(personId, data);
      var tabRes = ensureCycleTab(personRes.ss, cycleTag);

      result = {
        ok: true,
        sheetUrl: personRes.url,
        sheetId: personRes.id,
        tabName: tabRes.tabName,
        status: personRes.new ? "created" : "existing"
      };

    } else if (action === "syncTransactions") {
      var personId = data.personId || data.person_id || null;
      var cycleTag = data.cycleTag || data.cycle_tag || null;
      var rows = Array.isArray(data.rows) ? data.rows : [];

      if (!cycleTag && rows.length > 0) {
        cycleTag = extractCycleTagFromPayload(rows[0]);
      }

      debugLog('[doPost] syncTransactions', {
        personId: personId,
        cycleTag: cycleTag,
        rows: rows.length
      });

      var sheetRes = ensurePersonSheet(personId, data);
      var cycleRes = ensureCycleTab(sheetRes.ss, cycleTag);
      var syncRes = syncTransactionsToSheet(cycleRes.sheet, rows);

      result = {
        ok: true,
        syncedCount: syncRes.count,
        sheetId: sheetRes.id,
        tabName: cycleRes.tabName
      };

    } else if (action === "create" || action === "edit" || action === "update" || action === "delete") {
      var personId = data.personId || data.person_id || null;
      var cycleTag = extractCycleTagFromPayload(data);
      debugLog('[doPost] single action', { action: action, id: data.id, cycleTag: cycleTag });
      var sheetRes = ensurePersonSheet(personId, data);
      var cycleRes = ensureCycleTab(sheetRes.ss, cycleTag);

      var syncRes = upsertTransactionRow(cycleRes.sheet, {
        id: data.id,
        type: data.type,
        date: data.date,
        shop: data.shop || "",
        notes: data.notes || "",
        amount: data.amount,
        percent_back: data.percent_back || 0,
        fixed_back: data.fixed_back || 0
      }, action === "update" ? "edit" : action);

      result = {
        ok: true,
        syncedCount: syncRes.count,
        sheetId: sheetRes.id,
        tabName: cycleRes.tabName
      };

    } else {
      debugLog('[doPost] legacy handler');
      // Fallback to Legacy Logic
      return handleLegacyDoPost(data, e);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    debugLog('[doPost] error', err.toString());
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function handleLegacyDoPost(data, e) {
  // --- Original Logic Wrappers ---
  // If the request doesn't have "action" or has "sync_all" in the old format,
  // we try to process it using the old logic (which we should keep or adapt).
  // The user said: "Do not break existing... keep old endpoints working."
  // Existing doPost logic was inside the function. I'll paste it here as a helper.

  var ss = SpreadsheetApp.getActiveSpreadsheet(); // Default to the bound SS for legacy calls?
  debugLog('[legacy] start', ss ? ss.getId() : 'no-active-ss');
  // Old script used `getActiveSpreadsheet()`. If this script is standalone, `getActive` might fail if not bound.
  // But purely `doPost` usually runs as the owner.
  // If this is a Bound Script, `getActiveSpreadsheet` works.
  // If it's Standalone, we need an ID. The old script assumed `getActiveSpreadsheet`.
  // I will assume it creates/uses sheets in the "current" file acting as Master, OR
  // maybe the old script WAS bound.

  // NOTE: I am rewriting `doPost.js`. I need to preserve the old body logic.

  var logSheet = ensureLogSheet(ss);
  var output = { processed: 0, errors: [], skipped: 0 };

  try {
    var rawData = data;
    var transactions = [];
    var isSyncAll = false;

    if (Array.isArray(rawData)) {
      transactions = rawData;
    } else if (rawData.action === "sync_all" && Array.isArray(rawData.transactions)) {
      isSyncAll = true;
      transactions = rawData.transactions;
    } else {
      // Single object
      if (rawData.id) transactions = [rawData];
    }

    if (isSyncAll && transactions.length > 0) {
      // Legacy Sync All Logic (Clear Sheets by Year)
      var affectedYears = {};
      for (var i = 0; i < transactions.length; i++) {
        var d = new Date(transactions[i].date);
        if (!isNaN(d.getTime())) {
          affectedYears[d.getFullYear().toString()] = true;
        }
      }
      for (var year in affectedYears) {
        var sheet = ss.getSheetByName(year);
        if (sheet) {
          var lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
          }
        }
      }
    }

    // Process Transactions
    for (var i = 0; i < transactions.length; i++) {
      var txn = transactions[i];
      try {
        if (!txn.id || !txn.date) { output.skipped++; continue; }

        var txnDate = new Date(txn.date);
        var sheetName = txnDate.getFullYear().toString();
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
          sheet.appendRow(["Type", "Date", "Shop/Note", "Description", "Amount (Gross)", "% Back", "Fix Back", "Total Back", "Tag", "Transaction ID"]);
          sheet.setFrozenRows(1);
        }

        var rowContent = [
          normalizeType(txn.type, txn.amount),
          Utilities.formatDate(txnDate, "GMT+7", "dd/MM/yyyy"),
          txn.shop || "",
          txn.notes || "",
          Math.abs(txn.amount),
          txn.percent_back || 0,
          txn.fixed_back || 0,
          txn.total_back || 0,
          txn.tag || "",
          txn.id
        ];

        var rowIndex = findRowIndexById(sheet, txn.id, 10);
        if (txn.action === "delete") {
          if (rowIndex > 0) sheet.deleteRow(rowIndex);
        } else {
          if (rowIndex > 0) {
            sheet.getRange(rowIndex, 1, 1, rowContent.length).setValues([rowContent]);
          } else {
            sheet.appendRow(rowContent);
          }
        }
        output.processed++;
      } catch (inner) {
        output.errors.push({ id: txn.id, error: inner.toString() });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", result: output }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    logError(logSheet, "Legacy Error: " + e.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helpers needed for Legacy (duplicated here or imported? createMonthlySheetFull has none, old Post had them)
// I removed them from the main body, so I need to put them back or rely on `utils.js` if compatible.
// `ensureLogSheet`, `logError`, `findRowIndexById` were local.
// `normalizeType` is in utils.js now, but I need to make sure it's available. 
// Scripts in GAS share global scope.

function ensureLogSheet(ss) {
  var sheet = ss.getSheetByName("_SystemLogs");
  if (!sheet) {
    sheet = ss.insertSheet("_SystemLogs");
    sheet.appendRow(["Timestamp", "Message"]);
  }
  return sheet;
}

function logError(sheet, message) {
  if (sheet) sheet.appendRow([new Date(), message]);
}

function findRowIndexById(sheet, id, idColumnIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var colIndex = idColumnIndex || 1;
  var idColumn = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
  for (var i = 0; i < idColumn.length; i++) {
    if (idColumn[i][0] == id) return i + 2;
  }
  return -1;
}
