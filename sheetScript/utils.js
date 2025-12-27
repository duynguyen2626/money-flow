// Created by Codex on 2025-12-27 09:47 +07
/**
 * utils.js
 * Shared helpers for Money Flow 3
 */

function debugLog() {
  var parts = [];
  for (var i = 0; i < arguments.length; i++) {
    var value = arguments[i];
    if (typeof value === 'string') {
      parts.push(value);
    } else {
      try {
        parts.push(JSON.stringify(value));
      } catch (err) {
        parts.push(String(value));
      }
    }
  }
  var message = parts.join(' ');
  try {
    console.log(message);
  } catch (err) {
    Logger.log(message);
  }
}

function getColumnMapping() {
  return {
    ID: 0,          // A
    TYPE: 1,        // B
    DATE: 2,        // C
    SHOP: 3,        // D
    NOTES: 4,       // E
    AMOUNT: 5,      // F
    PERCENT_BACK: 6,// G
    FIXED_BACK: 7,  // H
    SUM_BACK: 8,    // I (Formula)
    FINAL_PRICE: 9  // J (Formula - Calculated via Trigger actually, but here it's a formula for display or raw value?)
    // Re-reading rules: "Final Price: Cột final_price được tự động tính toán (Amount + Cashback/Discount) qua Database Trigger."
    // But in Sheet, we might want a formula or just sync the value.
    // The previous script had formulas. Let's stick to syncing values if possible, or formulas if dynamic.
    // The user requirement says "Option A... default".
    // "createMonthlySheetFull.js" has formulas for H and I.
    // Let's use the new column structure:
    // A: ID
    // B: Type
    // C: Date
    // D: Shop
    // E: Notes
    // F: Amount
    // G: % Back
    // H: đ Back
    // I: Σ Back (Formula)
    // J: Final Price (Formula)
  };
}

function normalizeType(type, amount) {
  var t = (type || "").toString().toLowerCase();
  if (["debt", "expense", "out", "payment", "lending", "send"].indexOf(t) > -1) return "Out";
  if (["repayment", "income", "in", "receive", "collect"].indexOf(t) > -1) return "In";
  return amount < 0 ? "Out" : "In";
}

function formatDate(dateObj) {
  return Utilities.formatDate(new Date(dateObj), "GMT+7", "dd-MM");
}

function getCycleTagFromDate(dateObj) {
  var d = new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  var year = d.getFullYear();
  var month = d.getMonth() + 1; // 1-12
  return year + '-' + (month < 10 ? '0' + month : month);
}

function normalizeCycleTag(raw) {
  if (!raw) return null;
  var value = raw.toString().trim();
  if (value === '') return null;

  // Already YYYY-MM
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;

  // Legacy formats: DEC.25, DEC25, DEC-25
  var match = value.match(/^([A-Za-z]{3})\.?-?(\d{2})$/);
  if (match) {
    var monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var monthIndex = monthNames.indexOf(match[1].toUpperCase());
    if (monthIndex >= 0) {
      var year = '20' + match[2];
      var month = monthIndex + 1;
      return year + '-' + (month < 10 ? '0' + month : month);
    }
  }

  return value;
}

function extractCycleTagFromPayload(payload) {
  if (!payload) return null;
  var raw = payload.cycle_tag || payload.cycleTag || payload.tag;
  var normalized = normalizeCycleTag(raw);
  if (normalized) return normalized;
  if (payload.date) return getCycleTagFromDate(payload.date);
  return null;
}

function extractSheetIdFromUrl(url) {
  if (!url) return null;
  var match = url.toString().match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
