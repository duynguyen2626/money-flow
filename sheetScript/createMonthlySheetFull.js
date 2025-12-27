// Created by Codex on 2025-12-27 09:47 +07
function createMonthlySheetFull() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  // Generate Tag for Current Month: YYYY-MM -> e.g. "DEC.25"
  // reuse convertCycleTag or manual
  // cycleTag usually YYYY-MM
  var year = today.getFullYear();
  var month = today.getMonth() + 1; // 1-12
  var cycleTag = year + "-" + (month < 10 ? "0" + month : month);

  // Call shared logic
  // Since we are running in the binded context here, 'ss' is the target.
  // We use ensureCycleTab(ss, tag)

  var result = ensureCycleTab(ss, cycleTag);
  debugLog('[createMonthlySheetFull] ensured', result.tabName);

  SpreadsheetApp.getActive().toast(
    "Sheet created/verified: " + result.tabName,
    "Monthly Sheet", 5
  );
}
