module.exports = [
"[project]/src/lib/account-utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "computeNextDueDate",
    ()=>computeNextDueDate,
    "formatCurrency",
    ()=>formatCurrency,
    "getAccountTypeLabel",
    ()=>getAccountTypeLabel,
    "getSharedLimitParentId",
    ()=>getSharedLimitParentId,
    "parseSavingsConfig",
    ()=>parseSavingsConfig
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/cashback.ts [app-ssr] (ecmascript)");
;
function getAccountTypeLabel(type) {
    return type.replace('_', ' ').replace(/\b\w/g, (char)=>char.toUpperCase());
}
function formatCurrency(value, currency = 'VND') {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
    }).format(value);
}
function computeNextDueDate(rawConfig, referenceDate = new Date()) {
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(rawConfig ?? null);
    const clampDay = (year, month, day)=>{
        const endOfMonth = new Date(year, month + 1, 0).getDate();
        return Math.min(day, endOfMonth);
    };
    const now = new Date(referenceDate);
    now.setHours(0, 0, 0, 0); // Compare dates only
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    // Priority 1: Explicit Due Date
    if (config.dueDate) {
        const dueDay = config.dueDate;
        // Check "This Month" instance
        const thisMonthDay = clampDay(currentYear, currentMonth, dueDay);
        const thisMonthDate = new Date(currentYear, currentMonth, thisMonthDay);
        thisMonthDate.setHours(23, 59, 59, 999); // End of day for comparison
        if (now <= thisMonthDate) {
            return thisMonthDate;
        }
        // Else Next Month instance
        const nextMonthDay = clampDay(currentYear, currentMonth + 1, dueDay);
        return new Date(currentYear, currentMonth + 1, nextMonthDay);
    }
    // Priority 2: Statement Day + 15 days
    const statementDay = config.statementDay;
    if (!statementDay) {
        return null;
    }
    const addDays = (date, days)=>{
        const copy = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
    };
    // Calculate this month's statement date
    const thisMonthStatement = new Date(currentYear, currentMonth, clampDay(currentYear, currentMonth, statementDay));
    // Calculate this month's due date (statement + 15 days)
    const thisMonthDue = addDays(thisMonthStatement, 15);
    thisMonthDue.setHours(23, 59, 59, 999);
    // If today is before this month's due date, return it
    if (now <= thisMonthDue) {
        return thisMonthDue;
    }
    // Otherwise, calculate next month's statement and due date
    const nextMonthStatement = new Date(currentYear, currentMonth + 1, clampDay(currentYear, currentMonth + 1, statementDay));
    return addDays(nextMonthStatement, 15);
}
function parseSavingsConfig(raw) {
    if (!raw) {
        return {
            interestRate: null,
            termMonths: null,
            maturityDate: null
        };
    }
    let parsed = null;
    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        } catch  {
            parsed = null;
        }
    } else if (typeof raw === 'object') {
        parsed = raw;
    }
    const toNumber = (value)=>{
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    };
    return {
        interestRate: toNumber(parsed?.interestRate),
        termMonths: toNumber(parsed?.termMonths ?? parsed?.term),
        maturityDate: typeof parsed?.maturityDate === 'string' ? parsed.maturityDate : null
    };
}
function getSharedLimitParentId(raw) {
    if (!raw) {
        return null;
    }
    const parsed = typeof raw === 'object' ? raw : null;
    if (!parsed) {
        return null;
    }
    const candidate = parsed.sharedLimitParentId ?? parsed.shared_limit_parent_id ?? parsed.parentAccountId ?? parsed.parent_account_id;
    return typeof candidate === 'string' && candidate.trim() !== '' ? candidate.trim() : null;
}
}),
"[project]/src/lib/constants.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ============================================================================
// SYSTEM CONSTANTS - FIXED UUIDs FOR CORE LOGIC
// Context: These IDs must match the Seed SQL scripts.
// ============================================================================
__turbopack_context__.s([
    "ASSET_TYPES",
    ()=>ASSET_TYPES,
    "SYSTEM_ACCOUNTS",
    ()=>SYSTEM_ACCOUNTS,
    "SYSTEM_CATEGORIES",
    ()=>SYSTEM_CATEGORIES
]);
const SYSTEM_ACCOUNTS = {
    // Tài khoản dùng cho quy trình Hủy đơn/Hoàn tiền (Phase 17)
    PENDING_REFUNDS: '99999999-9999-9999-9999-999999999999',
    // Tài khoản trung gian dùng cho Chuyển khoản theo lô CKL (Phase 31)
    BATCH_CLEARING: '88888888-9999-9999-9999-888888888888',
    // User ID mặc định (Fallback khi chưa có Auth)
    DEFAULT_USER_ID: '917455ba-16c0-42f9-9cea-264f81a3db66',
    // Tài khoản Draft Fund (Phase 62)
    DRAFT_FUND: '88888888-9999-9999-9999-111111111111'
};
const SYSTEM_CATEGORIES = {
    // Danh mục dùng cho Refund (Phase 22)
    REFUND: 'e0000000-0000-0000-0000-000000000095',
    // Danh mục dùng cho Thu nợ (Phase 22)
    DEBT_REPAYMENT: 'e0000000-0000-0000-0000-000000000096',
    // Danh mục dùng cho Thu nợ người khác (Phase 18.5)
    COLLECT_DEBT: 'e0000000-0000-0000-0000-000000000097',
    // Danh mục dùng cho Chiết khấu/Quà tặng (Phase 14.2)
    DISCOUNT_GIVEN: 'e0000000-0000-0000-0000-000000000098',
    // Danh mục Shopping mặc định (Phase 17.5)
    SHOPPING: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
    // Danh mục dùng cho Service (Phase 62)
    SERVICE: 'e0000000-0000-0000-0000-000000000088',
    // Danh mục Online Services (Phase 62)
    ONLINE_SERVICES: 'e0000000-0000-0000-0000-000000000088',
    // Danh mục Phí Ngân hàng (Phase 63)
    BANK_FEE: 'e0000000-0000-0000-0000-000000000099',
    // Danh mục Credit Payment (Batch Transfer)
    CREDIT_PAYMENT: 'e0000000-0000-0000-0000-000000000091',
    // Danh mục Money Transfer (for Transfer quick-add)
    MONEY_TRANSFER: 'e0000000-0000-0000-0000-000000000080',
    // Danh mục Hoàn tiền (Cashback)
    CASHBACK: 'e0000000-0000-0000-0000-000000000092'
};
const ASSET_TYPES = [
    'savings',
    'investment',
    'asset'
];
}),
];

//# sourceMappingURL=src_lib_cb9d080e._.js.map