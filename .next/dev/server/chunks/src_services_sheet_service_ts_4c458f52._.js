module.exports = [
"[project]/src/services/sheet.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"400d2de013d37b0bbb724af4f288eb88ded49e9914":"testConnection","4060fe034adb11cc00af354ad267ee815e91a9214e":"syncAllTransactions","40edb6c82872dea55c1b811121b71aee6ac9e620ae":"createTestSheet","602b83408d2c795c3900d163bd1e629e861529f74e":"autoSyncCycleSheetIfNeeded","605e31ac69ab7849ec06bb6c9febb2f08ba4b4ee77":"createCycleSheet","7042c28c696849962e767d5602b9229e98075819ca":"syncTransactionToSheet","70df2092e255464e9df4d0a49c9de1241c977db6a1":"syncCycleTransactions"},"",""] */ __turbopack_context__.s([
    "autoSyncCycleSheetIfNeeded",
    ()=>autoSyncCycleSheetIfNeeded,
    "createCycleSheet",
    ()=>createCycleSheet,
    "createTestSheet",
    ()=>createTestSheet,
    "syncAllTransactions",
    ()=>syncAllTransactions,
    "syncCycleTransactions",
    ()=>syncCycleTransactions,
    "syncTransactionToSheet",
    ()=>syncTransactionToSheet,
    "testConnection",
    ()=>testConnection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/month-tag.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-route] (ecmascript)");
;
;
;
function getCycleTag(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
function isValidWebhook(url) {
    if (!url) return false;
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed);
}
function normalizePercent(value) {
    if (value === null || value === undefined) return 0;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    // If value > 1, assume it's a percentage number (5 = 5%).
    // If value <= 1, assume it's a decimal (0.05 = 5%).
    // This is a heuristic, but covers 99% of cases (nobody has >100% cashback, and nobody has <1% cashback typically indistinguishable from decimal).
    // Actually, we should standardize. 
    // The service now sends raw number (5, 8). 
    // So if we get 5, we return 0.05.
    // If we get 0.05, we return 0.05.
    return numeric > 1 ? numeric / 100 : numeric;
}
function calculateTotals(txn) {
    const originalAmount = Math.abs(Number(txn.original_amount ?? txn.amount ?? 0)) || 0;
    const percentRate = normalizePercent(txn.cashback_share_percent_input ?? txn.cashback_share_percent ?? undefined);
    const fixedBack = Math.max(0, Number(txn.cashback_share_fixed ?? 0) || 0);
    const percentBack = originalAmount * percentRate;
    const totalBackCandidate = txn.cashback_share_amount !== null && txn.cashback_share_amount !== undefined ? Number(txn.cashback_share_amount) : percentBack + fixedBack;
    const totalBack = Math.min(originalAmount, Math.max(0, totalBackCandidate));
    return {
        originalAmount,
        percentRate,
        percentBack,
        fixedBack,
        totalBack
    };
}
function extractSheetId(sheetUrl) {
    if (!sheetUrl) return null;
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match?.[1] ?? null;
}
async function getProfileSheetLink(personId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: profile, error } = await supabase.from('people').select('id, sheet_link').eq('id', personId).maybeSingle();
    if (error) {
        console.error('Failed to fetch profile for sheet sync:', error);
    }
    const profileRow = profile;
    if (profileRow) {
        const sheetLink = profileRow.sheet_link?.trim() ?? null;
        console.log('[Sheet] Profile lookup result', {
            lookupId: personId,
            profileId: profileRow.id ?? null,
            sheet_link: sheetLink
        });
        if (isValidWebhook(sheetLink)) {
            return sheetLink;
        }
    }
    const { data: accountRow, error: accountError } = await supabase.from('accounts').select('owner_id, people!accounts_owner_id_fkey (id, sheet_link)').eq('id', personId).eq('type', 'debt').maybeSingle();
    if (accountError) {
        console.error('Failed to fetch account for sheet sync:', accountError);
    }
    const ownerProfile = accountRow?.people;
    const ownerProfileId = accountRow?.owner_id ?? ownerProfile?.id ?? null;
    if (ownerProfile) {
        const sheetLink = ownerProfile.sheet_link?.trim() ?? null;
        console.log('[Sheet] Account-owner lookup result', {
            lookupId: personId,
            profileId: ownerProfileId,
            sheet_link: sheetLink
        });
        if (isValidWebhook(sheetLink)) {
            return sheetLink;
        }
    }
    console.warn('[Sheet] No valid sheet link configured', {
        lookupId: personId,
        profileId: ownerProfileId ?? profileRow?.id ?? null
    });
    return null;
}
async function getProfileSheetInfo(personId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const attempt = await supabase.from('people').select('id, google_sheet_url').eq('id', personId).maybeSingle();
    if (attempt.error?.code === '42703' || attempt.error?.code === 'PGRST204') {
        return {
            sheetUrl: null,
            sheetId: null
        };
    }
    if (!attempt.error && attempt.data?.google_sheet_url) {
        const sheetUrl = attempt.data.google_sheet_url?.trim() ?? null;
        return {
            sheetUrl,
            sheetId: extractSheetId(sheetUrl)
        };
    }
    const { data: accountRow } = await supabase.from('accounts').select('owner_id, people!accounts_owner_id_fkey (id, google_sheet_url)').eq('id', personId).eq('type', 'debt').maybeSingle();
    const ownerProfile = accountRow?.people;
    const sheetUrl = ownerProfile?.google_sheet_url?.trim() ?? null;
    return {
        sheetUrl,
        sheetId: extractSheetId(sheetUrl)
    };
}
async function postToSheet(sheetLink, payload) {
    const response = await fetch(sheetLink, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    let json = null;
    try {
        json = await response.json();
    } catch (error) {
        json = null;
    }
    if (!response.ok) {
        return {
            success: false,
            json,
            message: json?.error ?? `Sheet response ${response.status}`
        };
    }
    if (json && json.ok === false) {
        return {
            success: false,
            json,
            message: json.error ?? 'Sheet returned error'
        };
    }
    return {
        success: true,
        json
    };
}
function buildPayload(txn, action) {
    const { originalAmount, percentRate, fixedBack, totalBack } = calculateTotals(txn);
    // If amount is negative, it's a credit to the debt account (Repayment) -> Type "In"
    // If amount is positive, it's a debit to the debt account (Lending) -> Type "Debt"
    // Allow override via txn.type
    const type = txn.type ?? ((txn.amount ?? 0) < 0 ? 'In' : 'Debt');
    return {
        action: action === 'update' ? 'edit' : action,
        id: txn.id,
        type: type,
        date: txn.occurred_at ?? txn.date ?? null,
        occurred_at: txn.occurred_at ?? txn.date ?? null,
        shop: txn.shop_name ?? '',
        notes: txn.note ?? '',
        note: txn.note ?? '',
        amount: originalAmount,
        // We want to send the raw number (0-100).
        // If input was 5, normalizePercent made it 0.05.
        // So we assume 'percentRate' is ALWAYS decimal [0..1].
        // We multiply by 100 to send to sheet.
        percent_back: Math.round(percentRate * 100 * 100) / 100,
        fixed_back: fixedBack,
        total_back: totalBack,
        tag: txn.tag ?? undefined,
        img: txn.img_url ?? undefined
    };
}
async function syncTransactionToSheet(personId, txn, action = 'create') {
    try {
        // Check for #nosync or #deprecated tags
        const note = (txn.note || '').toLowerCase();
        if (note.includes('#nosync') || note.includes('#deprecated')) {
            // If tagged as nosync, we treat it as a deletion from the sheet
            action = 'delete';
        }
        const sheetLink = await getProfileSheetLink(personId);
        if (!sheetLink) return;
        // Fetch person's sheet preferences (replaces hardcoded ANH_SCRIPT)
        const supabaseTxn = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        const { data: personData, error: personError } = await supabaseTxn.from('people').select('sheet_show_bank_account, sheet_bank_info, sheet_linked_bank_id, sheet_show_qr_image, sheet_full_img').eq('id', personId).single();
        if (personError) {
            console.error('[syncTransactionToSheet] Error fetching person preferences:', personError);
        }
        const showBankAccount = personData?.sheet_show_bank_account ?? false;
        const manualBankInfo = personData?.sheet_bank_info ?? '';
        const linkedBankId = personData?.sheet_linked_bank_id;
        const showQrImage = personData?.sheet_show_qr_image ?? false;
        const qrImageUrl = personData?.sheet_full_img ?? null;
        let resolvedBankInfo = manualBankInfo;
        if (showBankAccount && linkedBankId) {
            const { data: acc } = await supabaseTxn.from('accounts').select('name, receiver_name, account_number').eq('id', linkedBankId).single();
            if (acc) {
                const parts = [
                    acc.name,
                    acc.account_number,
                    acc.receiver_name
                ].filter(Boolean);
                resolvedBankInfo = parts.join(' ') || manualBankInfo;
            }
        }
        console.log('[syncTransactionToSheet] Person sheet preferences:', {
            personId,
            showBankAccount,
            resolvedBankInfo,
            showQrImage,
            qrImageUrl: qrImageUrl ? '(URL set)' : '(not set)'
        });
        const payload = {
            ...buildPayload(txn, action),
            person_id: personId,
            cycle_tag: txn.tag ?? undefined,
            bank_account: showBankAccount ? resolvedBankInfo : '',
            img: showQrImage && qrImageUrl ? qrImageUrl : '' // Send empty to clear if disabled
        };
        console.log(`[Sheet Sync] Sending payload to ${personId}:`, {
            action: payload.action,
            id: payload.id,
            shop: payload.shop,
            amount: payload.amount,
            note: payload.note,
            notes: payload.notes,
            type: payload.type
        });
        const result = await postToSheet(sheetLink, payload);
        if (!result.success) {
            console.error('Sheet sync failed:', result.message ?? 'Sheet sync failed');
        }
    } catch (err) {
        console.error('Sheet sync failed:', err);
    }
}
async function testConnection(personId) {
    try {
        const sheetLink = await getProfileSheetLink(personId);
        if (!sheetLink) {
            return {
                success: false,
                message: 'No valid sheet link configured'
            };
        }
        const today = new Date().toISOString().slice(0, 10);
        const payload = {
            action: 'create',
            type: 'TEST-CONNECTION',
            amount: 0,
            shop: 'MoneyFlow Bot',
            notes: 'Connection successful!',
            date: today
        };
        const result = await postToSheet(sheetLink, payload);
        if (!result.success) {
            return {
                success: false,
                message: result.message ?? 'Sheet create failed'
            };
        }
        return {
            success: true
        };
    } catch (err) {
        console.error('Test connection failed:', err);
        return {
            success: false,
            message: 'Failed to send test signal'
        };
    }
}
async function syncAllTransactions(personId) {
    try {
        const sheetLink = await getProfileSheetLink(personId);
        if (!sheetLink) {
            return {
                success: false,
                message: 'No valid sheet link configured'
            };
        }
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        // Query transactions table directly - legacy line items removed
        const { data, error } = await supabase.from('transactions').select(`
        id,
        occurred_at,
        note,
        status,
        tag,
        type,
        amount,
        cashback_share_percent,
        cashback_share_fixed,
        shop_id,
        shops ( name ),
        account_id,
        accounts!account_id ( name ),
        categories ( name )
      `).eq('person_id', personId).neq('status', 'void').order('occurred_at', {
            ascending: true
        });
        // Fetch person's sheet preferences for bank info & QR
        const { data: personData } = await supabase.from('people').select('sheet_show_bank_account, sheet_bank_info, sheet_linked_bank_id, sheet_show_qr_image, sheet_full_img').eq('id', personId).single();
        const showBankAccount = personData?.sheet_show_bank_account ?? false;
        const manualBankInfo = personData?.sheet_bank_info ?? '';
        const linkedBankId = personData?.sheet_linked_bank_id;
        const showQrImage = personData?.sheet_show_qr_image ?? false;
        const qrImageUrl = personData?.sheet_full_img ?? null;
        let resolvedBankInfo = manualBankInfo;
        if (showBankAccount && linkedBankId) {
            const { data: acc } = await supabase.from('accounts').select('name, receiver_name, account_number').eq('id', linkedBankId).single();
            if (acc) {
                const parts = [
                    acc.name,
                    acc.account_number,
                    acc.receiver_name
                ].filter(Boolean);
                resolvedBankInfo = parts.join(' ') || manualBankInfo;
            }
        }
        if (error) {
            console.error('Failed to load transactions for sync:', error);
            return {
                success: false,
                message: 'Failed to load transactions'
            };
        }
        console.log(`[SheetSync] syncAllTransactions for personId: ${personId}. Found ${data?.length} transactions.`);
        const rows = data ?? [];
        // Group transactions by cycle tag
        const cycleMap = new Map();
        for (const txn of rows){
            const cycleTag = txn.tag || getCycleTag(new Date(txn.occurred_at));
            if (!cycleMap.has(cycleTag)) {
                cycleMap.set(cycleTag, []);
            }
            cycleMap.get(cycleTag).push(txn);
        }
        let totalSynced = 0;
        // Sync each cycle as a batch
        for (const [cycleTag, cycleTxns] of cycleMap.entries()){
            const rowsPayload = cycleTxns.map((txn)=>{
                const shopData = txn.shops;
                let shopName = Array.isArray(shopData) ? shopData[0]?.name : shopData?.name;
                // Fallback for Repayment/Transfer if shop is empty -> Use Account Name
                if (!shopName) {
                    const categoryName = txn.categories?.name;
                    if (txn.note?.toLowerCase().startsWith('rollover') || categoryName === 'Rollover') {
                        shopName = 'Rollover';
                    } else {
                        const accData = txn.accounts;
                        shopName = (Array.isArray(accData) ? accData[0]?.name : accData?.name) ?? '';
                    }
                }
                // Pass the raw transaction fields that buildPayload needs
                return buildPayload({
                    ...txn,
                    shop_name: shopName
                }, 'create');
            });
            const payload = {
                action: 'syncTransactions',
                personId: personId,
                cycleTag: cycleTag,
                rows: rowsPayload,
                bank_account: showBankAccount ? resolvedBankInfo : '',
                img: showQrImage && qrImageUrl ? qrImageUrl : ''
            };
            const result = await postToSheet(sheetLink, payload);
            if (!result.success) {
                return {
                    success: false,
                    message: result.message ?? `Sheet sync failed for cycle ${cycleTag}`
                };
            }
            totalSynced += rowsPayload.length;
        }
        return {
            success: true,
            count: totalSynced
        };
    } catch (err) {
        console.error('Sync all transactions failed:', err);
        return {
            success: false,
            message: 'Sync failed'
        };
    }
}
async function createTestSheet(personId) {
    try {
        const sheetLink = await getProfileSheetLink(personId);
        if (!sheetLink) {
            return {
                success: false,
                message: 'No valid sheet link configured'
            };
        }
        const sheetInfo = await getProfileSheetInfo(personId);
        const response = await postToSheet(sheetLink, {
            action: 'create_test_sheet',
            person_id: personId,
            sheet_id: sheetInfo.sheetId ?? undefined,
            sheet_url: sheetInfo.sheetUrl ?? undefined
        });
        if (!response.success) {
            return {
                success: false,
                message: response.message ?? 'Test create failed'
            };
        }
        return {
            success: true,
            sheetUrl: response.json?.sheetUrl ?? null,
            sheetId: response.json?.sheetId ?? null
        };
    } catch (err) {
        return {
            success: false,
            message: 'Unexpected error testing sheet'
        };
    }
}
async function createCycleSheet(personId, cycleTag) {
    try {
        const sheetLink = await getProfileSheetLink(personId);
        if (!sheetLink) {
            return {
                success: false,
                message: 'No valid sheet link configured'
            };
        }
        const sheetInfo = await getProfileSheetInfo(personId);
        const response = await postToSheet(sheetLink, {
            action: 'create_cycle_sheet',
            person_id: personId,
            cycle_tag: cycleTag,
            sheet_id: sheetInfo.sheetId ?? undefined,
            sheet_url: sheetInfo.sheetUrl ?? undefined
        });
        if (!response.success) {
            return {
                success: false,
                message: response.message ?? 'Failed to create cycle sheet'
            };
        }
        const json = response.json ?? null;
        const sheetUrl = json?.sheetUrl ?? json?.sheet_url ?? null;
        const sheetId = json?.sheetId ?? json?.sheet_id ?? null;
        return {
            success: true,
            sheetUrl,
            sheetId
        };
    } catch (error) {
        console.error('Create cycle sheet failed:', error);
        return {
            success: false,
            message: 'Failed to create cycle sheet'
        };
    }
}
async function syncCycleTransactions(personId, cycleTag, sheetId) {
    try {
        const sheetLink = await getProfileSheetLink(personId);
        if (!sheetLink) {
            return {
                success: false,
                message: 'No valid sheet link configured'
            };
        }
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        const legacyTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["yyyyMMToLegacyMMMYY"])(cycleTag);
        const tags = legacyTag ? [
            cycleTag,
            legacyTag
        ] : [
            cycleTag
        ];
        const { data, error } = await supabase.from('transactions').select(`
        id,
        occurred_at,
        note,
        status,
        tag,
        type,
        amount,
        cashback_share_percent,
        cashback_share_fixed,
        shop_id,
        shops ( name ),
        account_id,
        accounts!account_id ( name ),
        categories ( name )
      `).eq('person_id', personId).in('tag', tags).neq('status', 'void').order('occurred_at', {
            ascending: true
        });
        if (error) {
            console.error('Failed to load cycle transactions:', error);
            return {
                success: false,
                message: 'Failed to load transactions'
            };
        }
        const rows = (data ?? []).filter((txn)=>{
            const note = (txn.note || '').toLowerCase();
            return !note.includes('#nosync') && !note.includes('#deprecated');
        }).map((txn)=>{
            const shopData = txn.shops;
            let shopName = Array.isArray(shopData) ? shopData[0]?.name : shopData?.name;
            if (!shopName) {
                const categoryName = txn.categories?.name;
                if (txn.note?.toLowerCase().startsWith('rollover') || categoryName === 'Rollover') {
                    shopName = 'Rollover';
                } else {
                    const accData = txn.accounts;
                    shopName = (Array.isArray(accData) ? accData[0]?.name : accData?.name) ?? '';
                }
            }
            // Pass the raw transaction fields that buildPayload needs
            return buildPayload({
                ...txn,
                shop_name: shopName
            }, 'create');
        });
        console.log(`[Sheet Sync] Sending ${rows.length} mapped transactions to ${personId} for cycle ${cycleTag}`);
        // Fetch person's sheet preferences (replaces hardcoded ANH_SCRIPT)
        const supabaseCycle = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        const { data: personData, error: personError } = await supabaseCycle.from('people').select('sheet_show_bank_account, sheet_bank_info, sheet_linked_bank_id, sheet_show_qr_image, sheet_full_img').eq('id', personId).single();
        if (personError) {
            console.error('[syncCycleTransactions] Error fetching person preferences:', personError);
        }
        const showBankAccount = personData?.sheet_show_bank_account ?? false;
        const manualBankInfo = personData?.sheet_bank_info ?? '';
        const linkedBankId = personData?.sheet_linked_bank_id;
        const showQrImage = personData?.sheet_show_qr_image ?? false;
        const qrImageUrl = personData?.sheet_full_img ?? null;
        let resolvedBankInfo = manualBankInfo;
        if (showBankAccount && linkedBankId) {
            const { data: acc } = await supabaseCycle.from('accounts').select('name, receiver_name, account_number').eq('id', linkedBankId).single();
            if (acc) {
                const parts = [
                    acc.name,
                    acc.account_number,
                    acc.receiver_name
                ].filter(Boolean);
                resolvedBankInfo = parts.join(' ') || manualBankInfo;
            }
        }
        console.log('[syncCycleTransactions] Person sheet preferences:', {
            personId,
            showBankAccount,
            resolvedBankInfo,
            showQrImage,
            qrImageUrl: qrImageUrl ? '(URL set)' : '(not set)'
        });
        const payload = {
            action: 'syncTransactions',
            person_id: personId,
            cycle_tag: cycleTag,
            sheet_id: sheetId ?? undefined,
            rows: rows,
            bank_account: showBankAccount ? resolvedBankInfo : '',
            img: showQrImage && qrImageUrl ? qrImageUrl : ''
        };
        console.log('[syncCycleTransactions] Final payload:', {
            ...payload,
            rows: `[${payload.rows.length} rows]`
        });
        const result = await postToSheet(sheetLink, payload);
        if (!result.success) {
            return {
                success: false,
                message: result.message ?? 'Sheet sync failed'
            };
        }
        return {
            success: true,
            count: rows.length,
            syncedCount: result.json?.syncedCount,
            manualPreserved: result.json?.manualPreserved,
            totalRows: result.json?.totalRows
        };
    } catch (error) {
        console.error('Sync cycle transactions failed:', error);
        return {
            success: false,
            message: 'Sync failed'
        };
    }
}
async function autoSyncCycleSheetIfNeeded(personId, cycleTag) {
    try {
        console.log(`[AutoSync] Checking if auto-sync needed for ${personId} / ${cycleTag}`);
        // 1. Check if person has sheet_link configured
        const sheetLink = await getProfileSheetLink(personId);
        if (!sheetLink) {
            console.log(`[AutoSync] Skipping ${personId}: No sheet link configured`);
            return;
        }
        // 2. Check if cycle sheet already exists
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        const { data: existing } = await supabase.from('person_cycle_sheets').select('id, sheet_id, sheet_url').eq('person_id', personId).eq('cycle_tag', cycleTag).maybeSingle();
        if (existing?.sheet_id || existing?.sheet_url) {
            console.log(`[AutoSync] Skipping ${personId}: Cycle sheet already exists`);
            return;
        }
        console.log(`[AutoSync] Triggering auto-sync for ${personId} / ${cycleTag}`);
        // 3. Create cycle sheet
        const createResult = await createCycleSheet(personId, cycleTag);
        if (!createResult.success) {
            console.error(`[AutoSync] Failed to create cycle sheet: ${createResult.message}`);
            return;
        }
        // 4. Sync transactions
        const syncResult = await syncCycleTransactions(personId, cycleTag, createResult.sheetId);
        if (!syncResult.success) {
            console.error(`[AutoSync] Failed to sync transactions: ${syncResult.message}`);
            return;
        }
        // 5. Update database
        const payload = {
            person_id: personId,
            cycle_tag: cycleTag,
            sheet_id: createResult.sheetId,
            sheet_url: createResult.sheetUrl
        };
        if (existing?.id) {
            await supabase.from('person_cycle_sheets').update(payload).eq('id', existing.id);
        } else {
            await supabase.from('person_cycle_sheets').insert(payload);
        }
        console.log(`[AutoSync] Successfully auto-synced ${personId} / ${cycleTag}`);
    } catch (error) {
        console.error(`[AutoSync] Error for ${personId} / ${cycleTag}:`, error);
    // Silent fail - don't throw, just log
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    syncTransactionToSheet,
    testConnection,
    syncAllTransactions,
    createTestSheet,
    createCycleSheet,
    syncCycleTransactions,
    autoSyncCycleSheetIfNeeded
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(syncTransactionToSheet, "7042c28c696849962e767d5602b9229e98075819ca", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(testConnection, "400d2de013d37b0bbb724af4f288eb88ded49e9914", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(syncAllTransactions, "4060fe034adb11cc00af354ad267ee815e91a9214e", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(createTestSheet, "40edb6c82872dea55c1b811121b71aee6ac9e620ae", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(createCycleSheet, "605e31ac69ab7849ec06bb6c9febb2f08ba4b4ee77", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(syncCycleTransactions, "70df2092e255464e9df4d0a49c9de1241c977db6a1", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(autoSyncCycleSheetIfNeeded, "602b83408d2c795c3900d163bd1e629e861529f74e", null);
}),
];

//# sourceMappingURL=src_services_sheet_service_ts_4c458f52._.js.map