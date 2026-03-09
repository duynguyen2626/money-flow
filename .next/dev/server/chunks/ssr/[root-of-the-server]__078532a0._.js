module.exports = [
"[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[project]/src/app/icon.svg.mjs { IMAGE => \"[project]/src/app/icon.svg (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/icon.svg.mjs { IMAGE => \"[project]/src/app/icon.svg (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/loading.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/loading.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/services/bank.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createBankMapping",
    ()=>createBankMapping,
    "deleteBankMapping",
    ()=>deleteBankMapping,
    "deleteBankMappings",
    ()=>deleteBankMappings,
    "getBankByCode",
    ()=>getBankByCode,
    "getBankMappings",
    ()=>getBankMappings,
    "importBankMappingsFromExcel",
    ()=>importBankMappingsFromExcel,
    "searchBanks",
    ()=>searchBanks,
    "updateBankMapping",
    ()=>updateBankMapping
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$89$2e$0$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+supabase-js@2.89.0/node_modules/@supabase/supabase-js/dist/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
;
;
async function getBankMappings(bankType) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let supabase;
    if (serviceRoleKey) {
        supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$89$2e$0$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://puzvrlojtgneihgvevcx.supabase.co"), serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    } else {
        supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    }
    let query = supabase.from('bank_mappings').select('*');
    if (bankType) {
        query = query.eq('bank_type', bankType);
    }
    const { data, error } = await query.order('bank_name');
    if (error) {
        console.error('getBankMappings error:', error);
        throw error;
    }
    console.log('getBankMappings: data length', data?.length, 'bankType:', bankType);
    return data || [];
}
async function getBankByCode(code) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('bank_mappings').select('*').eq('bank_code', code).single();
    if (error) {
        if (error.code === 'PGRST116') return null // Not found
        ;
        throw error;
    }
    return data;
}
async function createBankMapping(mapping) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('bank_mappings').insert(mapping).select().single();
    if (error) throw error;
    return data;
}
async function updateBankMapping(id, mapping) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const updateData = {
        ...mapping,
        updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('bank_mappings').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
}
async function deleteBankMapping(id) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from('bank_mappings').delete().eq('id', id);
    if (error) throw error;
}
async function deleteBankMappings(ids) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from('bank_mappings').delete().in('id', ids);
    if (error) throw error;
}
async function searchBanks(query) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('bank_mappings').select('*').or(`bank_code.ilike.%${query}%,bank_name.ilike.%${query}%,short_name.ilike.%${query}%`).order('bank_name');
    if (error) throw error;
    return data || [];
}
async function importBankMappingsFromExcel(excelData, bankType = 'VIB') {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let supabase;
    if (serviceRoleKey) {
        supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$89$2e$0$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://puzvrlojtgneihgvevcx.supabase.co"), serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    } else {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Cannot perform privileged import.');
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables. Please check .env.local');
    }
    const lines = excelData.trim().split('\n');
    const results = {
        success: 0,
        errors: []
    };
    for(let i = 0; i < lines.length; i++){
        const line = lines[i].trim();
        if (!line) continue;
        try {
            // Skip common headers
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('bank_name') || lowerLine.startsWith('stt')) {
                continue;
            }
            const columns = line.split('\t');
            // For VIB, we expect at least 2 columns (Code-Name | FullName) or (STT | Code-Name | FullName)
            if (bankType === 'VIB' && columns.length < 2) {
                results.errors.push(`Line ${i + 1}: Not enough columns for VIB format`);
                continue;
            }
            // For MBB, we allow 1 column if it parses correctly
            if (bankType === 'MBB' && columns.length < 1) {
                results.errors.push(`Line ${i + 1}: Empty line`);
                continue;
            }
            let bankCode = '';
            let shortName = '';
            let fullName = '';
            if (bankType === 'MBB') {
                // MBB Format: Check if any column has "Name (CODE)" pattern
                // User input example: "Nông nghiệp và Phát triển nông thôn (VBA)"
                const possibleNameCol = columns[0].trim(); // Try first column
                // Regex for "text (CODE)" at end of string
                const match = possibleNameCol.match(/(.+)\s+\(([^)]+)\)$/);
                if (match && match[2]) {
                    bankCode = match[2].trim();
                    // Group 1 is the name part before (Code)
                    shortName = match[1].trim();
                    fullName = shortName; // Use short name as full name fallback
                } else {
                    // Try column 1 if exists?
                    if (columns.length > 1) {
                        const col1 = columns[1].trim();
                        const match1 = col1.match(/(.+)\s+\(([^)]+)\)$/);
                        if (match1 && match1[2]) {
                            bankCode = match1[2].trim();
                            shortName = match1[1].trim();
                            fullName = shortName;
                        }
                    }
                }
                // If Full Name provided in next col, use it
                if (columns.length > 1 && !fullName) {
                    fullName = columns[1].trim();
                }
            } else {
                // VIB (Legacy) Logic
                // STT | Code - Name | Full Name
                // OR: Code - Name | Full Name
                // If Col 0 is small integer, assume STT -> use Col 1.
                let nameCol = columns[0];
                let fullCol = columns[1];
                if (/^\d+$/.test(columns[0]) && columns.length >= 3) {
                    nameCol = columns[1];
                    fullCol = columns[2];
                }
                const codeNamePart = nameCol.trim();
                const separatorIndex = codeNamePart.indexOf(' - ');
                if (separatorIndex !== -1) {
                    bankCode = codeNamePart.substring(0, separatorIndex).trim();
                    shortName = codeNamePart.substring(separatorIndex + 3).trim();
                } else {
                    bankCode = codeNamePart;
                    shortName = codeNamePart;
                }
                fullName = fullCol?.trim() || '';
            }
            if (!bankCode) throw new Error('Could not extract bank code');
            const { error } = await supabase.from('bank_mappings').upsert({
                bank_code: bankCode,
                short_name: shortName,
                bank_name: fullName,
                bank_type: bankType,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'bank_code,bank_type' // Composite unique key
            });
            if (error) throw error;
            results.success++;
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push(`Line ${i + 1}: ${msg}`);
        }
    }
    return results;
}
}),
"[project]/src/services/webhook-link.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createSheetWebhookLink",
    ()=>createSheetWebhookLink,
    "deleteSheetWebhookLink",
    ()=>deleteSheetWebhookLink,
    "getSheetWebhookLinks",
    ()=>getSheetWebhookLinks
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
;
async function getSheetWebhookLinks() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('sheet_webhook_links').select('*').order('created_at', {
        ascending: false
    });
    if (error) {
        // Graceful fallback if migration not applied yet
        console.warn('sheet_webhook_links not available or failed to fetch', error);
        return [];
    }
    return data || [];
}
async function createSheetWebhookLink(payload) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('sheet_webhook_links').insert({
        name: payload.name,
        url: payload.url
    }).select().single();
    if (error) throw error;
    return data;
}
async function deleteSheetWebhookLink(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from('sheet_webhook_links').delete().eq('id', id);
    if (error) throw error;
    return true;
}
}),
"[project]/src/components/batch/batch-page-client-v2.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "BatchPageClientV2",
    ()=>BatchPageClientV2
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const BatchPageClientV2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call BatchPageClientV2() from the server but BatchPageClientV2 is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/batch/batch-page-client-v2.tsx <module evaluation>", "BatchPageClientV2");
}),
"[project]/src/components/batch/batch-page-client-v2.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "BatchPageClientV2",
    ()=>BatchPageClientV2
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const BatchPageClientV2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call BatchPageClientV2() from the server but BatchPageClientV2 is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/batch/batch-page-client-v2.tsx", "BatchPageClientV2");
}),
"[project]/src/components/batch/batch-page-client-v2.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$batch$2d$page$2d$client$2d$v2$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/batch/batch-page-client-v2.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$batch$2d$page$2d$client$2d$v2$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/batch/batch-page-client-v2.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$batch$2d$page$2d$client$2d$v2$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/app/batch/mbb/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MBBBatchPage,
    "generateMetadata",
    ()=>generateMetadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$account$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/account.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$bank$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/bank.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$webhook$2d$link$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/webhook-link.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$batch$2d$page$2d$client$2d$v2$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/batch/batch-page-client-v2.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
async function generateMetadata() {
    const { getAccounts } = await __turbopack_context__.A("[project]/src/services/account.service.ts [app-rsc] (ecmascript, async loader)");
    const accounts = await getAccounts();
    const matched = accounts.find((a)=>a.name.toLowerCase().includes('mbb'));
    return {
        title: 'MBB Batch',
        icons: matched?.image_url ? {
            icon: matched.image_url
        } : undefined
    };
}
async function MBBBatchPage(props) {
    const searchParams = await props.searchParams;
    const month = searchParams.month;
    const bankType = 'MBB';
    const { getBatchesByType, getBatchById, getBatchSettings } = await __turbopack_context__.A("[project]/src/services/batch.service.ts [app-rsc] (ecmascript, async loader)");
    const batches = await getBatchesByType(bankType);
    const settings = await getBatchSettings(bankType);
    const cutoffDay = settings?.cutoff_day || 15;
    const period = searchParams.period || 'before';
    let activeBatch = null;
    const visibleBatches = batches.filter((b)=>!b.is_archived);
    let targetBatchId = null;
    if (month) {
        // Try to find batch for the selected month AND period
        const found = batches.find((b)=>b.month_year === month && (b.period === period || !b.period && period === 'before'));
        if (found) {
            targetBatchId = found.id;
        }
    } else if (visibleBatches.length > 0) {
        const sorted = [
            ...visibleBatches
        ].sort((a, b)=>{
            const tagA = a.month_year || '';
            const tagB = b.month_year || '';
            return tagB.localeCompare(tagA);
        });
        targetBatchId = sorted[0].id;
    }
    if (targetBatchId) {
        activeBatch = await getBatchById(targetBatchId);
    }
    const accounts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$account$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAccounts"])();
    const bankMappings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$bank$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getBankMappings"])(bankType);
    const webhookLinks = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$webhook$2d$link$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSheetWebhookLinks"])();
    const { getAccountsWithActiveInstallments } = await __turbopack_context__.A("[project]/src/services/installment.service.ts [app-rsc] (ecmascript, async loader)");
    const activeInstallmentAccounts = await getAccountsWithActiveInstallments();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Suspense"], {
        fallback: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-8 text-center text-slate-500 animate-pulse",
            children: "Loading MBB Batch..."
        }, void 0, false, {
            fileName: "[project]/src/app/batch/mbb/page.tsx",
            lineNumber: 66,
            columnNumber: 29
        }, void 0),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$batch$2d$page$2d$client$2d$v2$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BatchPageClientV2"], {
            batches: batches,
            accounts: accounts,
            bankMappings: bankMappings,
            webhookLinks: webhookLinks,
            bankType: bankType,
            activeBatch: activeBatch,
            activeInstallmentAccounts: activeInstallmentAccounts,
            cutoffDay: cutoffDay,
            globalSheetUrl: settings?.display_sheet_url,
            globalSheetName: settings?.display_sheet_name
        }, void 0, false, {
            fileName: "[project]/src/app/batch/mbb/page.tsx",
            lineNumber: 67,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/batch/mbb/page.tsx",
        lineNumber: 66,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/batch/mbb/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/batch/mbb/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__078532a0._.js.map