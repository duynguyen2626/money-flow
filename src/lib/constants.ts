// ============================================================================
// SYSTEM CONSTANTS - FIXED UUIDs FOR CORE LOGIC
// Context: These IDs must match the Seed SQL scripts.
// ============================================================================

export const SYSTEM_ACCOUNTS = {
    // Tài khoản dùng cho quy trình Hủy đơn/Hoàn tiền (Phase 17)
    PENDING_REFUNDS: '99999999-9999-9999-9999-999999999999',

    // Tài khoản trung gian dùng cho Chuyển khoản theo lô CKL (Phase 31)
    BATCH_CLEARING: '88888888-9999-9999-9999-888888888888',

    // User ID mặc định (Fallback khi chưa có Auth)
    DEFAULT_USER_ID: '917455ba-16c0-42f9-9cea-264f81a3db66',
};

export const SYSTEM_CATEGORIES = {
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
};