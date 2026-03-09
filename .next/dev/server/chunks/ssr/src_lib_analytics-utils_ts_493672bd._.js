module.exports = [
"[project]/src/lib/analytics-utils.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "computeCardCashbackProfit",
    ()=>computeCardCashbackProfit
]);
function computeCardCashbackProfit(input) {
    const fee = input.annualFee ?? 0;
    const interest = input.interest ?? 0;
    return input.cashbackRedeemed + interest - fee - input.cashbackGiven;
}
}),
];

//# sourceMappingURL=src_lib_analytics-utils_ts_493672bd._.js.map