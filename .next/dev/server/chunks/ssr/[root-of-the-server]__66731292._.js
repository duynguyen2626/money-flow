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
"[project]/src/lib/utils.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn,
    "formatCompactMoney",
    ()=>formatCompactMoney,
    "formatCurrency",
    ()=>formatCurrency,
    "formatMoneyVND",
    ()=>formatMoneyVND,
    "formatVNLongAmount",
    ()=>formatVNLongAmount,
    "getAccountInitial",
    ()=>getAccountInitial
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/tailwind-merge@3.4.0/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-rsc] (ecmascript)");
function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(amount);
}
function formatMoneyVND(amount) {
    return new Intl.NumberFormat("vi-VN").format(amount);
}
function getAccountInitial(name) {
    return name.split(" ").map((word)=>word[0]).join("").toUpperCase().slice(0, 2);
}
function formatCompactMoney(amount) {
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000000) {
        return (amount / 1000000).toFixed(1) + "M";
    }
    if (absAmount >= 1000) {
        return (amount / 1000).toFixed(0) + "k";
    }
    return amount.toString();
}
function formatVNLongAmount(amount) {
    const absAmount = Math.round(Math.abs(amount));
    if (absAmount === 0) return '0';
    const b = Math.floor(absAmount / 1_000_000_000);
    let remainder = absAmount % 1_000_000_000;
    const m = Math.floor(remainder / 1_000_000);
    remainder %= 1_000_000;
    const k = Math.floor(remainder / 1_000);
    const d = remainder % 1_000;
    const parts = [];
    const formatWithHundreds = (val, unit)=>{
        if (val <= 0) return;
        if (val >= 100) {
            const h = Math.floor(val / 100);
            const rem = val % 100;
            if (rem > 0) {
                parts.push(`${h} Trăm ${rem} ${unit}`);
            } else {
                parts.push(`${h} Trăm ${unit}`);
            }
        } else {
            parts.push(`${val} ${unit}`);
        }
    };
    formatWithHundreds(b, 'Tỷ');
    formatWithHundreds(m, 'Triệu');
    formatWithHundreds(k, 'Ngàn');
    if (d > 0) {
        if (d >= 100) {
            const h = Math.floor(d / 100);
            const rem = d % 100;
            if (rem > 0) {
                parts.push(`${h} Trăm ${rem}`);
            } else {
                parts.push(`${h} Trăm`);
            }
        } else {
            parts.push(`${d}`);
        }
    }
    return parts.join(' ').trim();
}
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
}),
"[project]/src/components/ui/card.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent,
    "CardDescription",
    ()=>CardDescription,
    "CardFooter",
    ()=>CardFooter,
    "CardHeader",
    ()=>CardHeader,
    "CardTitle",
    ()=>CardTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-rsc] (ecmascript)");
;
;
;
const Card = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("rounded-xl border bg-card text-card-foreground shadow", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
Card.displayName = "Card";
const CardHeader = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("flex flex-col space-y-1.5 p-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
CardHeader.displayName = "CardHeader";
const CardTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("font-semibold leading-none tracking-tight", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
CardTitle.displayName = "CardTitle";
const CardDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
CardDescription.displayName = "CardDescription";
const CardContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("p-6 pt-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 60,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
CardContent.displayName = "CardContent";
const CardFooter = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("flex items-center p-6 pt-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
CardFooter.displayName = "CardFooter";
;
}),
"[project]/src/components/batch/bank-link-with-loading.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "BankLinkWithLoading",
    ()=>BankLinkWithLoading
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const BankLinkWithLoading = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call BankLinkWithLoading() from the server but BankLinkWithLoading is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/batch/bank-link-with-loading.tsx <module evaluation>", "BankLinkWithLoading");
}),
"[project]/src/components/batch/bank-link-with-loading.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "BankLinkWithLoading",
    ()=>BankLinkWithLoading
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const BankLinkWithLoading = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call BankLinkWithLoading() from the server but BankLinkWithLoading is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/batch/bank-link-with-loading.tsx", "BankLinkWithLoading");
}),
"[project]/src/components/batch/bank-link-with-loading.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$link$2d$with$2d$loading$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/batch/bank-link-with-loading.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$link$2d$with$2d$loading$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/batch/bank-link-with-loading.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$link$2d$with$2d$loading$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/batch/bank-settings-slide.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "BankSettingsSlideTrigger",
    ()=>BankSettingsSlideTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const BankSettingsSlideTrigger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call BankSettingsSlideTrigger() from the server but BankSettingsSlideTrigger is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/batch/bank-settings-slide.tsx <module evaluation>", "BankSettingsSlideTrigger");
}),
"[project]/src/components/batch/bank-settings-slide.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "BankSettingsSlideTrigger",
    ()=>BankSettingsSlideTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const BankSettingsSlideTrigger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call BankSettingsSlideTrigger() from the server but BankSettingsSlideTrigger is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/batch/bank-settings-slide.tsx", "BankSettingsSlideTrigger");
}),
"[project]/src/components/batch/bank-settings-slide.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$settings$2d$slide$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/batch/bank-settings-slide.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$settings$2d$slide$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/batch/bank-settings-slide.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$settings$2d$slide$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/services/batch.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addBatchItem",
    ()=>addBatchItem,
    "archiveBatch",
    ()=>archiveBatch,
    "cloneBatch",
    ()=>cloneBatch,
    "cloneBatchItem",
    ()=>cloneBatchItem,
    "confirmBatchItem",
    ()=>confirmBatchItem,
    "confirmBatchSource",
    ()=>confirmBatchSource,
    "createBatch",
    ()=>createBatch,
    "createBatchFromClone",
    ()=>createBatchFromClone,
    "deleteBatch",
    ()=>deleteBatch,
    "deleteBatchItem",
    ()=>deleteBatchItem,
    "deleteBatchItemsBulk",
    ()=>deleteBatchItemsBulk,
    "fundBatch",
    ()=>fundBatch,
    "getAccountBatchStats",
    ()=>getAccountBatchStats,
    "getAccountsWithPendingBatchItems",
    ()=>getAccountsWithPendingBatchItems,
    "getBatchById",
    ()=>getBatchById,
    "getBatchSettings",
    ()=>getBatchSettings,
    "getBatches",
    ()=>getBatches,
    "getBatchesByMonthAndType",
    ()=>getBatchesByMonthAndType,
    "getBatchesByType",
    ()=>getBatchesByType,
    "getCurrentMonthYear",
    ()=>getCurrentMonthYear,
    "getNextMonthYear",
    ()=>getNextMonthYear,
    "getPendingBatchItemsByAccount",
    ()=>getPendingBatchItemsByAccount,
    "importBatchItemsFromExcel",
    ()=>importBatchItemsFromExcel,
    "restoreBatch",
    ()=>restoreBatch,
    "revertBatchItem",
    ()=>revertBatchItem,
    "sendBatchToSheet",
    ()=>sendBatchToSheet,
    "syncMasterOldBatches",
    ()=>syncMasterOldBatches,
    "updateBatch",
    ()=>updateBatch,
    "updateBatchCycle",
    ()=>updateBatchCycle,
    "updateBatchItem",
    ()=>updateBatchItem,
    "updateBatchNoteMode",
    ()=>updateBatchNoteMode,
    "updateBatchSettings",
    ()=>updateBatchSettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/date-fns@4.1.0/node_modules/date-fns/addMonths.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/constants.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/month-tag.ts [app-rsc] (ecmascript)");
;
;
;
;
async function getBatches() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('batches').select('*').order('created_at', {
        ascending: false
    });
    if (error) throw error;
    return data;
}
async function getBatchById(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('batches').select('*, batch_items(*, target_account:accounts(name, type, cashback_config))').eq('id', id).single();
    if (error) throw error;
    return data;
}
async function createBatch(batch) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    if (!batch.source_account_id) {
        batch.source_account_id = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DRAFT_FUND;
    }
    console.log('Creating batch with data:', JSON.stringify(batch, null, 2));
    const { data, error } = await supabase.from('batches').insert(batch).select().single();
    if (error) {
        console.error('Error creating batch:', error);
        throw error;
    }
    console.log('Batch created successfully:', data);
    return data;
}
async function updateBatch(id, batch) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('batches').update(batch).eq('id', id).select().single();
    if (error) throw error;
    return data;
}
async function deleteBatch(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Fetch batch to get source account for balance recalculation
    const { data: batch } = await supabase.from('batches').select('source_account_id, funding_transaction_id').eq('id', id).single();
    // 2. Delete linked transactions (funding and matches)
    // Funding transaction is directly linked
    const txnIdsToDelete = [];
    if (batch?.funding_transaction_id) txnIdsToDelete.push(batch.funding_transaction_id);
    // Also delete any transaction that has this batch_id in metadata
    const { data: moreTxns } = await supabase.from('transactions').select('id, account_id, target_account_id').contains('metadata', {
        batch_id: id
    });
    if (moreTxns) {
        moreTxns.forEach((t)=>{
            if (!txnIdsToDelete.includes(t.id)) txnIdsToDelete.push(t.id);
        });
    }
    if (txnIdsToDelete.length > 0) {
        await supabase.from('transactions').delete().in('id', txnIdsToDelete);
    }
    // 3. Delete the batch (Cascade will handle items)
    const { error } = await supabase.from('batches').delete().eq('id', id);
    if (error) throw error;
    // 4. Recalculate balances
    if (batch?.source_account_id) {
        const { recalculateBalance } = await __turbopack_context__.A("[project]/src/services/account.service.ts [app-rsc] (ecmascript, async loader)");
        await recalculateBalance(batch.source_account_id);
        await recalculateBalance(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].BATCH_CLEARING);
    }
    // Recalculate balances for all affected accounts in moreTxns
    if (moreTxns) {
        const { recalculateBalance } = await __turbopack_context__.A("[project]/src/services/account.service.ts [app-rsc] (ecmascript, async loader)");
        const accountIds = new Set();
        moreTxns.forEach((t)=>{
            if (t.account_id) accountIds.add(t.account_id);
            if (t.target_account_id) accountIds.add(t.target_account_id);
        });
        for (const accountId of accountIds){
            await recalculateBalance(accountId);
        }
    }
}
async function addBatchItem(item) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('batch_items').insert(item).select().single();
    if (error) throw error;
    return data;
}
async function updateBatchItem(id, item) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // Safety check: Prevent changing core fields of a confirmed item
    if (item.amount !== undefined || item.target_account_id !== undefined) {
        const { data: existing, error: fetchErr } = await supabase.from('batch_items').select('status, amount, target_account_id').eq('id', id).single();
        if (!fetchErr && existing?.status === 'confirmed') {
            const amountChanged = item.amount !== undefined && existing.amount !== item.amount;
            const targetChanged = item.target_account_id !== undefined && existing.target_account_id !== item.target_account_id;
            if (amountChanged || targetChanged) {
                throw new Error('Cannot change Amount or Target Account of a confirmed item. Uncheck it first to prevent data inconsistency.');
            }
        }
    }
    const { data, error } = await supabase.from('batch_items').update(item).eq('id', id).select().single();
    if (error) throw error;
    return data;
}
async function deleteBatchItem(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from('batch_items').delete().eq('id', id);
    if (error) throw error;
}
async function deleteBatchItemsBulk(ids) {
    if (!ids || ids.length === 0) return;
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from('batch_items').delete().in('id', ids);
    if (error) throw error;
}
async function cloneBatchItem(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Fetch original
    const { data: item, error: fetchError } = await supabase.from('batch_items').select('*').eq('id', id).single();
    if (fetchError || !item) throw new Error('Item not found');
    // 2. Prepare clone (remove ID and timestamps, reset status)
    const { id: _id, created_at: _created_at, updated_at: _updated_at, status: _status, is_confirmed: _is_confirmed, transaction_id: _transaction_id, ...cloneData } = item;
    // 3. Insert as new
    const { data: newItem, error: insertError } = await supabase.from('batch_items').insert({
        ...cloneData,
        status: 'pending'
    }).select().single();
    if (insertError) throw insertError;
    return newItem;
}
async function confirmBatchItem(itemId, targetAccountId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Fetch Item
    const { data: item, error: itemError } = await supabase.from('batch_items').select('*, batch:batches(name)').eq('id', itemId).single();
    if (itemError || !item) throw new Error('Item not found');
    if (item.status === 'confirmed') return; // Already confirmed
    // Use provided targetAccountId or fallback to item's target
    const finalTargetId = targetAccountId || item.target_account_id;
    if (!finalTargetId) throw new Error('No target account specified');
    // Set category: Default to Transfer, override if note matches online service
    let categoryId = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_CATEGORIES"].MONEY_TRANSFER;
    const noteLower = item.note?.toLowerCase() || '';
    if (noteLower.includes('online service')) {
        categoryId = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_CATEGORIES"].ONLINE_SERVICES;
    }
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null // Use null if no user (will rely on RLS default)
    ;
    // Phase 7X: Smart Installment Matching
    let installmentPlanId = null;
    const isInstallment = item.is_installment_payment; // Prioritize checkbox
    if (isInstallment) {
        // Find active installments for this account
        // Note: We use raw query here to avoid circular deps or heavy imports if possible,
        // but importing types is fine.
        const { data: activePlans } = await supabase.from('installments').select('id, monthly_amount, remaining_amount').eq('status', 'active').order('created_at', {
            ascending: true
        }); // Oldest first
        if (activePlans && activePlans.length > 0) {
            // 1. Filter by Account? 
            // Wait, installments are linked to an Original Transaction.
            // That transaction has an Account ID.
            // We need to filter plans where original_transaction.account_id == finalTargetId
            // But the above query didn't join.
            // Let's re-query with join
            const { data: accountPlans } = await supabase.from('installments').select('id, monthly_amount, remaining_amount, original_transaction:transactions!inner(account_id)').eq('status', 'active').eq('original_transaction.account_id', finalTargetId).order('created_at', {
                ascending: true
            });
            if (accountPlans && accountPlans.length > 0) {
                const itemAmount = Math.abs(item.amount);
                // Try to find exact match on monthly amount (allow small diff < 1000 VND)
                const matchedPlan = accountPlans.find((p)=>Math.abs(p.monthly_amount - itemAmount) < 1000);
                if (matchedPlan) {
                    installmentPlanId = matchedPlan.id;
                } else {
                    // If only one active plan exists, assume it's that one? 
                    // Risk: Paying wrong plan.
                    // Better strategy: If I marked it as installment manually, likely I want to pay the one matching amount.
                    // If no match, maybe I just log it?
                    // Let's fallback to the Oldest Active Plan if only 1 exists?
                    if (accountPlans.length === 1) {
                        installmentPlanId = accountPlans[0].id;
                    }
                }
            }
        }
    }
    // 2. Create Transaction (Draft Fund -> Target) [Single-Table Schema]
    const { data: txn, error: txnError } = await supabase.from('transactions').insert({
        occurred_at: new Date().toISOString(),
        note: `${item.batch.name} - ${item.note}`,
        status: 'posted',
        tag: 'BATCH_AUTO',
        created_by: userId,
        category_id: categoryId,
        // Single-table fields
        account_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].BATCH_CLEARING,
        target_account_id: finalTargetId,
        amount: Math.abs(item.amount),
        type: 'transfer',
        is_installment: isInstallment,
        installment_plan_id: installmentPlanId,
        metadata: {
            type: 'batch_funding',
            batch_id: item.batch_id,
            batch_item_id: item.id
        }
    }).select().single();
    if (txnError) throw txnError;
    // Phase 7X: Auto-Settle Trigger
    if (installmentPlanId) {
        __turbopack_context__.A("[project]/src/services/installment.service.ts [app-rsc] (ecmascript, async loader)").then(({ checkAndAutoSettleInstallment })=>{
            checkAndAutoSettleInstallment(installmentPlanId);
        }).catch((err)=>console.error("Failed to auto-settle batch installment", err));
    }
    // 3. Update Item Status
    const { error: updateError } = await supabase.from('batch_items').update({
        status: 'confirmed',
        transaction_id: txn.id,
        target_account_id: finalTargetId,
        is_confirmed: true
    }).eq('id', itemId);
    if (updateError) throw updateError;
    // 4. Recalculate Balances
    const { recalculateBalance } = await __turbopack_context__.A("[project]/src/services/account.service.ts [app-rsc] (ecmascript, async loader)");
    await recalculateBalance(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].BATCH_CLEARING);
    await recalculateBalance(finalTargetId);
    return true;
}
async function revertBatchItem(transactionId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Find the batch item linked to this transaction
    const { data: item, error: itemError } = await supabase.from('batch_items').select('id').eq('transaction_id', transactionId).single();
    if (itemError || !item) {
        // It's possible this transaction isn't linked to a batch item. Just ignore.
        return false;
    }
    // 2. Reset item status
    const { error: updateError } = await supabase.from('batch_items').update({
        status: 'pending',
        transaction_id: null,
        is_confirmed: false
    }).eq('id', item.id);
    if (updateError) throw updateError;
    return true;
}
async function getPendingBatchItemsByAccount(accountId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('batch_items').select('id, amount, receiver_name, note, batch_id, batch:batches(name)').eq('target_account_id', accountId).eq('status', 'pending').order('created_at', {
        ascending: false
    });
    if (error) throw error;
    return data;
}
async function importBatchItemsFromExcel(batchId, excelData, batchTag) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const lines = excelData.trim().split('\n');
    const results = {
        success: 0,
        errors: []
    };
    // 1. Fetch Batch to get Bank Type
    const { data: batch, error: batchError } = await supabase.from('batches').select('bank_type').eq('id', batchId).single();
    const bankType = batch?.bank_type || 'VIB' // Default to VIB
    ;
    // Get all accounts for lookup
    const { data: accounts } = await supabase.from('accounts').select('id, name, account_number');
    const accountByName = new Map(accounts?.map((a)=>[
            a.name.toLowerCase(),
            a.id
        ]) || []);
    const accountByNumber = new Map(accounts?.map((a)=>[
            a.account_number,
            a.id
        ]) || []);
    // Get all bank mappings for lookup (name -> code)
    const { data: bankMappings } = await supabase.from('bank_mappings').select('*');
    // Create lookup map: Normalized Name -> Code
    const bankMap = new Map();
    bankMappings?.forEach((b)=>{
        if (b.bank_name) bankMap.set(b.bank_name.toLowerCase(), b.bank_code);
        if (b.short_name) bankMap.set(b.short_name.toLowerCase(), b.bank_code);
        if (b.bank_code) bankMap.set(b.bank_code.toLowerCase(), b.bank_code);
    });
    // Helper to find bank code (VIB style)
    const findBankCode = (input)=>{
        const lower = input.toLowerCase().trim();
        if (bankMap.has(lower)) return bankMap.get(lower);
        for (const [key, code] of bankMap.entries()){
            if (lower.includes(key)) return code;
        }
        return input;
    };
    // Helper to extract short name
    const extractShortName = (fullName)=>{
        const parts = fullName.trim().split(/\s+/);
        return parts[parts.length - 1] || fullName;
    };
    // --- MBB Helper: Extract Code from "Name (Code)" ---
    // Example: "Nông nghiệp... (VBA)" -> VBA
    const extractMbbBankCode = (input)=>{
        const match = input.match(/\(([^)]+)\)$/);
        if (match && match[1]) {
            return match[1].trim();
        }
        return input; // Fallback
    };
    for(let i = 0; i < lines.length; i++){
        const line = lines[i].trim();
        if (!line) continue;
        // Skip header
        if (line.toLowerCase().includes('stt') || line.toLowerCase().includes('danh sách')) {
            continue;
        }
        try {
            const columns = line.split('\t');
            if (columns.length < 3) {
                results.errors.push(`Line ${i + 1}: Not enough columns`);
                continue;
            }
            let receiverName = '';
            let bankNumber = '';
            let bankNameRaw = '';
            let amount = 0;
            let note = '';
            let bankCode = '';
            if (bankType === 'MBB') {
                // MBB Format: 
                // Col 0: STT (Ord No)
                // Col 1: Account No
                // Col 2: Beneficiary Name
                // Col 3: Beneficiary Bank (Name (Code))
                // Col 4: Amount
                // Col 5: Detail
                // Usually STT is first. Let's assume strict format:
                // If columns[0] is digit, assume STT.
                // MBB from user request: STT | Acc | Name | Bank | Amount | Content
                // Let's implement strict column mapping for MBB
                // 1 | 999 | NAME | Bank(Code) | 1000 | Note
                // Sometimes the user might exclude STT? Let's check.
                // If col 0 is digit and col 1 is digit -> likely Ok.
                // If col 0 is digit(Acc) and col 1 is Text(Name) -> No STT?
                let offset = 0;
                // Heuristic: If Col 0 is small digit (<1000) and Col 1 is Account No (Digits), it's STT
                // But Account No is also digits.
                // Let's rely on standard copy.
                // Try offset logic similar to original but tuned for MBB.
                // Is Col 0 the Account No?
                // Mbb: Col 1 is Acc No?
                // Sample: "1" (STT) "Account" ...
                if (/^\d+$/.test(columns[0]) && columns.length >= 6) {
                    // Check if Col 1 looks like Account Number
                    offset = 1;
                }
                bankNumber = columns[offset]?.trim() || '';
                receiverName = columns[offset + 1]?.trim() || '';
                bankNameRaw = columns[offset + 2]?.trim() || '';
                const amountStr = columns[offset + 3]?.trim() || '0';
                amount = parseInt(amountStr.replace(/\D/g, '')) || 0;
                note = columns[offset + 4]?.trim() || '';
                bankCode = extractMbbBankCode(bankNameRaw);
            } else {
                // VIB (Legacy) / Default Logic
                // Detect Format A vs B
                let offset = 0;
                if (/^\d+$/.test(columns[0]?.trim()) && columns.length >= 6) {
                    offset = 1;
                }
                const col1 = columns[offset]?.trim();
                const col2 = columns[offset + 1]?.trim();
                const isCol1Digits = /^\d+$/.test(col1.replace(/\s/g, ''));
                const isNewFormat = isCol1Digits; // Account No first
                if (isNewFormat) {
                    bankNumber = col1;
                    receiverName = col2;
                    bankNameRaw = columns[offset + 2]?.trim() || '';
                    const amountStr = columns[offset + 3]?.trim();
                    amount = amountStr ? parseInt(amountStr.replace(/\D/g, '')) : 0;
                    note = columns[offset + 4]?.trim() || '';
                } else {
                    receiverName = col1;
                    bankNumber = col2;
                    bankNameRaw = columns[offset + 2]?.trim() || '';
                    const amountStr = columns[offset + 3]?.trim();
                    amount = amountStr ? parseInt(amountStr.replace(/\D/g, '')) : 0;
                    note = columns[offset + 4]?.trim() || '';
                }
                bankCode = findBankCode(bankNameRaw);
            }
            // Common Logic for Note & Insertion
            const finalBankName = bankCode !== bankNameRaw ? bankCode : bankNameRaw;
            if (batchTag) {
                const shortName = extractShortName(receiverName);
                const code = bankCode !== bankNameRaw ? bankCode : 'BANK';
                const smartNote = `${code}-${shortName}-${batchTag}`;
                note = smartNote.toUpperCase();
            }
            let targetAccountId = accountByNumber.get(bankNumber);
            if (!targetAccountId) {
                targetAccountId = accountByName.get(receiverName.toLowerCase());
            }
            const { error: insertError } = await supabase.from('batch_items').insert({
                batch_id: batchId,
                receiver_name: receiverName,
                target_account_id: targetAccountId || null,
                amount: amount,
                note: note,
                bank_name: finalBankName,
                bank_number: bankNumber,
                card_name: '',
                status: 'pending'
            });
            if (insertError) {
                results.errors.push(`Line ${i + 1}: ${insertError.message}`);
            } else {
                results.success++;
            }
        } catch (error) {
            results.errors.push(`Line ${i + 1}: ${error.message}`);
        }
    }
    return results;
}
async function fundBatch(batchId, overrideSourceAccountId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Fetch Batch Details (to get Source Account and Name)
    const { data: batch, error: batchError } = await supabase.from('batches').select('*, batch_items(amount)').eq('id', batchId).single();
    if (batchError || !batch) throw new Error('Batch not found');
    let sourceAccountId = overrideSourceAccountId || batch.source_account_id;
    // Auto-discover source account if not set (e.g., from MBB/VIB UI)
    if (!sourceAccountId) {
        // Find default account based on Bank Type
        const { data: matchedAccounts } = await supabase.from('accounts').select('id').ilike('name', `%${batch.bank_type}%`).eq('type', 'bank').order('created_at', {
            ascending: true
        }).limit(1);
        if (matchedAccounts && matchedAccounts.length > 0) {
            sourceAccountId = matchedAccounts[0].id;
            // Update the batch with this source account
            await supabase.from('batches').update({
                source_account_id: sourceAccountId
            }).eq('id', batchId);
        } else {
            throw new Error(`Please select a source account first, or create a Bank account with name containing ${batch.bank_type}`);
        }
    }
    const batchItems = Array.isArray(batch.batch_items) ? batch.batch_items : [];
    if (batchItems.length === 0) throw new Error('Batch has no items to fund');
    // 2. Calculate Total Amount
    const totalAmount = batchItems.reduce((sum, item)=>sum + Math.abs(item.amount), 0);
    if (totalAmount <= 0) throw new Error('Batch has no amount to fund');
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DEFAULT_USER_ID;
    // 3. Check if already funded and if we need to update
    let isFunded = batch.status === 'funded';
    let currentFundedAmount = 0;
    if (batch.funding_transaction_id) {
        const { data: fundingTxn } = await supabase.from('transactions').select('amount, status').eq('id', batch.funding_transaction_id).single();
        if (fundingTxn && fundingTxn.status !== 'void') {
            currentFundedAmount = Math.abs(fundingTxn.amount || 0);
        } else {
            // The funding transaction was voided or deleted
            isFunded = false;
        }
    } else {
        isFunded = false;
    }
    if (isFunded) {
        const diff = totalAmount - currentFundedAmount;
        // If amount changed (up or down), try to update the original funding txn first
        if (diff !== 0 && batch.funding_transaction_id) {
            const { data: updatedTxn, error: updateErr } = await supabase.from('transactions').update({
                amount: totalAmount,
                note: `Transfer to ${batch.bank_type} Clearing - ${batch.name}`
            }).eq('id', batch.funding_transaction_id).select().single();
            if (!updateErr) {
                // Recalculate balances
                const { recalculateBalance } = await __turbopack_context__.A("[project]/src/services/account.service.ts [app-rsc] (ecmascript, async loader)");
                await recalculateBalance(batch.source_account_id);
                await recalculateBalance(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].BATCH_CLEARING);
                return {
                    transactionId: updatedTxn.id,
                    totalAmount,
                    fundedAmount: totalAmount,
                    createdTransaction: false,
                    status: 'updated_funding',
                    sourceAccountId: batch.source_account_id
                };
            }
        }
        if (diff <= 0) {
            return {
                transactionId: null,
                totalAmount,
                fundedAmount: currentFundedAmount,
                createdTransaction: false,
                status: 'already_funded',
                sourceAccountId: batch.source_account_id
            };
        }
        const metadata = {
            batch_id: batch.id,
            type: 'batch_funding_additional'
        };
        const nameParts = batch.name.split(' ');
        const tag = nameParts[nameParts.length - 1];
        // [Single-Table Schema] Create transfer transaction directly
        const { data: txn, error: txnError } = await supabase.from('transactions').insert({
            occurred_at: new Date().toISOString(),
            note: `[Waiting] Re-calculate Batch [${batch.bank_type}]: ${batch.name} (Diff: ${diff})`,
            status: 'posted',
            tag: tag,
            created_by: userId,
            account_id: batch.source_account_id,
            target_account_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].BATCH_CLEARING,
            category_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_CATEGORIES"].MONEY_TRANSFER,
            amount: diff,
            type: 'transfer',
            metadata: metadata
        }).select().single();
        if (txnError) throw txnError;
        if (!batch.funding_transaction_id || currentFundedAmount === 0) {
            await supabase.from('batches').update({
                funding_transaction_id: txn.id
            }).eq('id', batchId);
        }
        // Recalculate Balances
        const { recalculateBalance } = await __turbopack_context__.A("[project]/src/services/account.service.ts [app-rsc] (ecmascript, async loader)");
        await recalculateBalance(batch.source_account_id);
        await recalculateBalance(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].BATCH_CLEARING);
        return {
            transactionId: txn.id,
            totalAmount,
            fundedAmount: diff,
            createdTransaction: true,
            status: 'additional_funded',
            sourceAccountId: sourceAccountId
        };
    }
    // --- NEW FUNDING (Original Logic) ---
    // 3. Extract Tag from Name (e.g. "CKL 2025-11" -> "2025-11")
    const nameParts = batch.name.split(' ');
    const rawTag = nameParts[nameParts.length - 1];
    const tag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["normalizeMonthTag"])(rawTag) ?? rawTag;
    const metadata = {
        batch_id: batch.id,
        type: 'batch_funding'
    };
    // 4. Create Transaction [Single-Table Schema]
    const { data: txn, error: txnError } = await supabase.from('transactions').insert({
        occurred_at: new Date().toISOString(),
        note: `Transfer to Trung gian CKL [${batch.bank_type}] - ${batch.name}`,
        status: 'posted',
        tag: tag,
        created_by: userId,
        account_id: sourceAccountId,
        target_account_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].BATCH_CLEARING,
        category_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_CATEGORIES"].MONEY_TRANSFER,
        amount: totalAmount,
        type: 'transfer',
        metadata: metadata
    }).select().single();
    if (txnError) throw txnError;
    // 5. Update Batch Status
    const { error: updateError } = await supabase.from('batches').update({
        status: 'funded',
        funding_transaction_id: txn.id
    }).eq('id', batchId);
    if (updateError) throw updateError;
    // 6. Recalculate Balances
    const { recalculateBalance } = await __turbopack_context__.A("[project]/src/services/account.service.ts [app-rsc] (ecmascript, async loader)");
    await recalculateBalance(sourceAccountId);
    await recalculateBalance(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].BATCH_CLEARING);
    return {
        transactionId: txn.id,
        totalAmount,
        fundedAmount: totalAmount,
        createdTransaction: true,
        status: 'funded',
        sourceAccountId: sourceAccountId
    };
}
async function getAccountBatchStats(accountId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: items, error } = await supabase.from('batch_items').select('amount, status, batch:batches(is_template, status)').eq('target_account_id', accountId).in('status', [
        'pending',
        'confirmed'
    ]);
    if (error) {
        // If no items found, return empty stats
        return {
            waiting: 0,
            confirmed: 0
        };
    }
    // Filter out template batches and calculate sums
    const filteredItems = items?.filter((item)=>!item.batch?.is_template) || [];
    const waiting = filteredItems.filter((i)=>i.status === 'pending').reduce((sum, i)=>sum + Math.abs(i.amount), 0);
    const confirmed = filteredItems.filter((i)=>i.status === 'confirmed').reduce((sum, i)=>sum + Math.abs(i.amount), 0);
    return {
        waiting,
        confirmed
    };
}
async function getAccountsWithPendingBatchItems() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('batch_items').select('target_account_id').eq('status', 'pending');
    if (error) throw error;
    // Return unique account IDs
    const accountIds = new Set(data.map((item)=>item.target_account_id).filter(Boolean));
    return Array.from(accountIds);
}
async function sendBatchToSheet(batchId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: batch, error: batchError } = await supabase.from('batches').select(`
            *,
            batch_items (
                *,
                accounts:target_account_id(name)
            )
        `).eq('id', batchId).single();
    if (batchError || !batch) throw new Error('Batch not found');
    let effectiveSheetLink = batch.sheet_link;
    let targetSpreadsheetUrl = batch.sheet_link;
    // Fallback to global settings if missing
    const { data: globalSettings } = await supabase.from('batch_settings').select('sheet_url, display_sheet_url').eq('bank_type', batch.bank_type || 'VIB').single();
    if (!effectiveSheetLink && globalSettings?.sheet_url) {
        effectiveSheetLink = globalSettings.sheet_url;
    }
    // The deployed web app (effectiveSheetLink) needs the target google sheet (targetSpreadsheetUrl)
    if (globalSettings?.display_sheet_url) {
        targetSpreadsheetUrl = globalSettings.display_sheet_url;
    }
    if (!effectiveSheetLink) throw new Error('No Apps Script link configured for this bank type');
    // Send all items regardless of confirmed/pending status as requested by user
    const items = batch.batch_items || [];
    console.log(`[Batch Service] Sending ${items.length} items to Google Sheets via GAS`);
    console.log(`[Batch Service] Effective GAS Link: ${effectiveSheetLink}`);
    console.log(`[Batch Service] Target Sheet URL: ${targetSpreadsheetUrl}`);
    // Fetch bank mappings to lookup codes - FILTER BY BANK_TYPE
    const { data: bankMappings } = await supabase.from('bank_mappings').select('bank_code, bank_name, short_name').eq('bank_type', batch.bank_type || 'VIB');
    const bankMap = new Map();
    const bankObjMap = new Map() // Store full objects for proper formatting
    ;
    bankMappings?.forEach((b)=>{
        if (b.bank_name) bankMap.set(b.bank_name.toLowerCase(), b.bank_code);
        if (b.short_name) bankMap.set(b.short_name.toLowerCase(), b.bank_code);
        bankObjMap.set(b.bank_code, b);
    });
    const payload = {
        bank_type: (batch.bank_type || 'VIB').toUpperCase(),
        sheet_name: batch.sheet_name,
        spreadsheet_url: targetSpreadsheetUrl,
        items: items.map((item)=>{
            let bankName = item.bank_name || '';
            // Only try to format if it doesn't look like it's already formatted
            // VIB: "Code - Name", MBB: "Name (Code)"
            const isVibFormatted = bankName.includes(' - ');
            const isMbbFormatted = /\(.+\)$/.test(bankName);
            if (bankName && !isVibFormatted && !isMbbFormatted) {
                // Try to find code by name or short name
                const code = bankMap.get(bankName.toLowerCase());
                if (code) {
                    const bankObj = bankObjMap.get(code);
                    if (batch.bank_type === 'MBB') {
                        // MBB Format: Use bank_name from database (e.g., "Ngoại thương Việt Nam (VCB)")
                        const mbbName = bankObj?.bank_name || bankName;
                        bankName = `${mbbName} (${code})`;
                    } else {
                        // VIB Format: Use stored name if valid, else fallback to mapping
                        // This fixes the issue where user selects "VCB" but gets "Vietcombank" due to mapping override
                        const vibName = bankName || bankObj?.short_name;
                        bankName = `${code} - ${vibName}`;
                    }
                }
            }
            // Parse note fallback "Vcb Signature Before Feb2026 by Mbb"
            let finalNote = item.note || '';
            if (!finalNote) {
                const accountName = item.accounts?.name || 'Unknown';
                const isBefore = batch.period === 'before' || batch.name?.toLowerCase().includes('early');
                const periodStr = isBefore ? 'Before' : 'After';
                const [year, month] = (batch.month_year || '').split('-');
                let monthYearStr = '';
                if (year && month) {
                    const monthNames = [
                        'Jan',
                        'Feb',
                        'Mar',
                        'Apr',
                        'May',
                        'Jun',
                        'Jul',
                        'Aug',
                        'Sep',
                        'Oct',
                        'Nov',
                        'Dec'
                    ];
                    monthYearStr = `${monthNames[parseInt(month, 10) - 1]}${year}`; // e.g. Feb2026
                }
                const bankTypeName = batch.bank_type === 'MBB' ? 'Mbb' : 'Vib';
                finalNote = `${accountName} ${periodStr} ${monthYearStr} by ${bankTypeName}`;
            }
            return {
                receiver_name: item.receiver_name || '',
                bank_number: item.bank_number || '',
                amount: item.amount || 0,
                note: finalNote,
                bank_name: bankName
            };
        })
    };
    console.log(`[Batch Service] Final Payload:`, JSON.stringify({
        ...payload,
        items: `[${payload.items.length} items hidden for log]`
    }));
    try {
        const response = await fetch(effectiveSheetLink, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const result = await response.json();
            return {
                success: true,
                count: items.length,
                gasResult: result
            };
        } else {
            const text = await response.text();
            console.error('GAS returned non-JSON response (likely HTML error or login page). First 500 chars:', text.substring(0, 500));
            throw new Error(`Google Script returned an invalid response (HTML). Likely a deployment or permission issue. Preview: ${text.substring(0, 100)}...`);
        }
    } catch (e) {
        console.error('Failed to send items to sheet', e);
        throw e;
    }
}
async function confirmBatchSource(batchId, realAccountId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Get Batch
    const { data: batch, error: batchError } = await supabase.from('batches').select('*').eq('id', batchId).single();
    if (batchError || !batch) throw new Error('Batch not found');
    if (batch.source_account_id !== __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DRAFT_FUND) {
        throw new Error('Batch source is not Draft Fund');
    }
    // 2. Calculate Total Amount (from funding transaction) [Single-Table Migration]
    if (!batch.funding_transaction_id) throw new Error('Batch not funded yet');
    const { data: fundingTxn } = await supabase.from('transactions').select('amount').eq('id', batch.funding_transaction_id).single();
    const amount = Math.abs(fundingTxn?.amount || 0);
    if (amount <= 0) throw new Error('No funded amount found');
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DEFAULT_USER_ID;
    // 3. Create Transfer: Real -> Draft [Single-Table Schema]
    const { data: txn, error: txnError } = await supabase.from('transactions').insert({
        occurred_at: new Date().toISOString(),
        note: `Confirm Source for Batch: ${batch.name}`,
        status: 'posted',
        tag: 'BATCH_CONFIRM',
        created_by: userId,
        account_id: realAccountId,
        target_account_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DRAFT_FUND,
        amount: amount,
        type: 'transfer'
    }).select().single();
    if (txnError) throw txnError;
    // 4. Update Batch Source
    const { error: updateError } = await supabase.from('batches').update({
        source_account_id: realAccountId
    }).eq('id', batchId);
    if (updateError) throw updateError;
    // 5. Recalculate Balances
    const { recalculateBalance } = await __turbopack_context__.A("[project]/src/services/account.service.ts [app-rsc] (ecmascript, async loader)");
    await recalculateBalance(realAccountId);
    await recalculateBalance(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DRAFT_FUND);
    return true;
}
async function cloneBatch(batchId, overrides = {}) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: originalBatch, error: batchError } = await supabase.from('batches').select('*, batch_items(*)').eq('id', batchId).single();
    if (batchError || !originalBatch) throw new Error('Original batch not found');
    const { data: newBatch, error: createError } = await supabase.from('batches').insert({
        name: overrides.name || `${originalBatch.name} (Clone)`,
        sheet_link: overrides.sheet_link || originalBatch.sheet_link,
        source_account_id: overrides.source_account_id || originalBatch.source_account_id,
        status: overrides.status || 'draft',
        is_template: overrides.is_template ?? false,
        bank_type: overrides.bank_type || originalBatch.bank_type,
        sheet_name: overrides.sheet_name || originalBatch.sheet_name
    }).select().single();
    if (createError) throw createError;
    const items = originalBatch.batch_items || [];
    if (items.length > 0) {
        const newItems = items.map((item)=>({
                batch_id: newBatch.id,
                receiver_name: item.receiver_name,
                target_account_id: item.target_account_id,
                amount: item.amount,
                note: item.note,
                bank_name: item.bank_name,
                card_name: item.card_name,
                status: 'pending'
            }));
        const { error: itemsError } = await supabase.from('batch_items').insert(newItems);
        if (itemsError) throw itemsError;
    }
    return newBatch;
}
async function updateBatchCycle(batchId, action) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Fetch Batch
    const { data: batch, error: batchError } = await supabase.from('batches').select('*, batch_items(*)').eq('id', batchId).single();
    if (batchError || !batch) throw new Error('Batch not found');
    // 2. Detect Current Tag
    const tagRegex = /(\d{4}-(0[1-9]|1[0-2]))|([A-Za-z]{3}\d{2})/;
    const match = batch.name.match(tagRegex);
    const currentTag = match ? match[0] : null;
    if (!currentTag) throw new Error('Could not detect month tag (e.g. 2025-12 or NOV24) in batch name');
    const normalizedCurrentTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["normalizeMonthTag"])(currentTag) ?? currentTag;
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isYYYYMM"])(normalizedCurrentTag)) {
        throw new Error(`Invalid month tag in batch name: ${currentTag}`);
    }
    // 3. Calculate New Tag
    const [yearStr, monthStr] = normalizedCurrentTag.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const currentDate = new Date(year, month - 1, 1);
    const newDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(currentDate, action === 'next' ? 1 : -1);
    const newTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toYYYYMMFromDate"])(newDate);
    // 4. Update Batch Name
    const newName = batch.name.replace(currentTag, newTag);
    await supabase.from('batches').update({
        name: newName
    }).eq('id', batchId);
    // 5. Update Batch Items
    const items = batch.batch_items || [];
    const sourceTags = [
        currentTag,
        normalizedCurrentTag
    ];
    for (const item of items){
        if (!item.note) continue;
        let updatedNote = item.note;
        for (const sourceTag of sourceTags){
            if (updatedNote.includes(sourceTag)) {
                updatedNote = updatedNote.split(sourceTag).join(newTag);
            }
        }
        if (updatedNote !== item.note) {
            await supabase.from('batch_items').update({
                note: updatedNote
            }).eq('id', item.id);
        }
    }
    return {
        success: true,
        oldTag: normalizedCurrentTag,
        newTag
    };
}
async function updateBatchNoteMode(batchId, mode) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Get Batch Items
    const { data: batch, error: batchError } = await supabase.from('batches').select('*, batch_items(*)').eq('id', batchId).single();
    if (batchError || !batch) throw new Error('Batch not found');
    const items = batch.batch_items || [];
    if (items.length === 0) return {
        success: true,
        count: 0
    };
    // 2. Determine Month Tags
    const today = new Date();
    const currentMonthTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toYYYYMMFromDate"])(today);
    const prevMonthTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toYYYYMMFromDate"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(today, -1));
    const currentLegacyMonthTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toLegacyMMMYYFromDate"])(today);
    const prevLegacyMonthTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toLegacyMMMYYFromDate"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(today, -1));
    const targetTag = mode === 'current' ? currentMonthTag : prevMonthTag;
    const sourceTags = mode === 'current' ? [
        prevMonthTag,
        prevLegacyMonthTag
    ] : [
        currentMonthTag,
        currentLegacyMonthTag
    ];
    // 3. Update Notes
    let updatedCount = 0;
    const updates = items.map((item)=>{
        let note = item.note || '';
        let didChange = false;
        for (const sourceTag of sourceTags){
            if (sourceTag && note.includes(sourceTag)) {
                note = note.split(sourceTag).join(targetTag);
                didChange = true;
            }
        }
        if (didChange) {
            updatedCount++;
            return {
                id: item.id,
                note
            };
        }
        // If note doesn't have source tag, but we want to enforce the target tag?
        // For now, only swap if source tag exists to avoid messing up other notes.
        return null;
    }).filter(Boolean);
    if (updates.length === 0) return {
        success: true,
        count: 0
    };
    // 4. Perform Bulk Update
    // Supabase doesn't have a simple bulk update for different values in one go via SDK easily without RPC or loop.
    // We'll use a loop for now as batch size is usually small (<50).
    // Optimization: Use upsert if possible, but we only want to update note.
    for (const update of updates){
        await supabase.from('batch_items').update({
            note: update.note
        }).eq('id', update.id);
    }
    return {
        success: true,
        count: updatedCount
    };
}
async function getBatchesByType(bankType, isArchived) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    let query = supabase.from('batches').select('*, batch_items(count)').eq('bank_type', bankType);
    if (isArchived !== undefined) {
        query = query.eq('is_archived', isArchived);
    }
    const { data, error } = await query.order('month_year', {
        ascending: false
    }).order('created_at', {
        ascending: false
    });
    if (error) throw error;
    return data;
}
async function archiveBatch(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from('batches').update({
        is_archived: true
    }).eq('id', id);
    if (error) throw error;
}
async function restoreBatch(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from('batches').update({
        is_archived: false
    }).eq('id', id);
    if (error) throw error;
}
async function getBatchesByMonthAndType(bankType) {
    const batches = await getBatchesByType(bankType);
    // Group by month_year
    const grouped = batches.reduce((acc, batch)=>{
        const month = batch.month_year || 'unknown';
        if (!acc[month]) {
            acc[month] = [];
        }
        acc[month].push(batch);
        return acc;
    }, {});
    return grouped;
}
async function createBatchFromClone(params) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Get source batch details
    const { data: sourceBatch, error: sourceError } = await supabase.from('batches').select('*').eq('id', params.source_batch_id).single();
    if (sourceError) throw sourceError;
    // 2. Create new batch
    const monthName = formatMonthName(params.month_year);
    const { data: newBatch, error: batchError } = await supabase.from('batches').insert({
        name: `${monthName} (${params.bank_type})`,
        month_year: params.month_year,
        bank_type: params.bank_type,
        cloned_from_id: params.source_batch_id,
        source_account_id: sourceBatch.source_account_id || __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].DRAFT_FUND,
        status: 'pending'
    }).select().single();
    if (batchError) throw batchError;
    // 3. Create batch items
    const itemsToInsert = params.items.map((item)=>({
            batch_id: newBatch.id,
            amount: item.amount,
            bank_name: item.bank_name,
            receiver_name: item.receiver_name,
            bank_number: item.bank_number,
            card_name: item.card_name,
            note: item.note,
            status: 'pending'
        }));
    const { error: itemsError } = await supabase.from('batch_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;
    return newBatch;
}
async function getBatchSettings(bankType) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('batch_settings').select('*').eq('bank_type', bankType).single();
    if (error) throw error;
    return data;
}
async function updateBatchSettings(bankType, settings) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('batch_settings').update({
        ...settings,
        updated_at: new Date().toISOString()
    }).eq('bank_type', bankType).select().single();
    if (error) throw error;
    return data;
}
/**
 * Format month_year to human-readable name
 * @param monthYear Format: 'YYYY-MM' (e.g., '2026-01')
 * @returns Format: 'Jan 2026'
 */ function formatMonthName(monthYear) {
    const [year, month] = monthYear.split('-');
    const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${year}`;
}
function getCurrentMonthYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
function getNextMonthYear(currentMonth) {
    const base = currentMonth || getCurrentMonthYear();
    const [year, month] = base.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const nextDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(date, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
    return `${nextYear}-${nextMonth}`;
}
async function syncMasterOldBatches() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: batchesRaw } = await supabase.from('batches').select('id, name, bank_type');
    const batches = batchesRaw;
    if (!batches) return {
        success: false,
        message: 'No batches'
    };
    let processedFunds = 0;
    let processedItems = 0;
    for (const batch of batches){
        // Sync fund transactions
        const { data: fundTxnsRaw } = await supabase.from('transactions').select('id, metadata').eq('target_account_id', __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_ACCOUNTS"].BATCH_CLEARING).ilike('note', `%${batch.name}%`);
        const fundTxns = fundTxnsRaw;
        if (fundTxns) {
            for (const txn of fundTxns){
                const meta = txn.metadata || {};
                if (!meta.type) {
                    await supabase.from('transactions').update({
                        category_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_CATEGORIES"].MONEY_TRANSFER,
                        metadata: {
                            ...meta,
                            type: 'batch_funding',
                            batch_id: batch.id
                        }
                    }).eq('id', txn.id);
                    processedFunds++;
                }
            }
        }
        // Sync batch items
        const { data: itemsRaw } = await supabase.from('batch_items').select('id, transaction_id, batch_id').eq('batch_id', batch.id).not('transaction_id', 'is', null);
        const items = itemsRaw;
        if (items) {
            for (const item of items){
                const { data: itemTxnRaw } = await supabase.from('transactions').select('id, metadata, note').eq('id', item.transaction_id).maybeSingle();
                const itemTxn = itemTxnRaw;
                if (itemTxn) {
                    const meta = itemTxn.metadata || {};
                    if (!meta.type) {
                        const newNote = itemTxn.note.includes(`${batch.name}`) ? itemTxn.note : `${batch.name} - ${itemTxn.note}`;
                        await supabase.from('transactions').update({
                            category_id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SYSTEM_CATEGORIES"].MONEY_TRANSFER,
                            note: newNote,
                            metadata: {
                                ...meta,
                                type: 'batch_funding',
                                batch_id: item.batch_id,
                                batch_item_id: item.id
                            }
                        }).eq('id', itemTxn.id);
                        processedItems++;
                    }
                }
            }
        }
    }
    return {
        success: true,
        processedFunds,
        processedItems
    };
}
}),
"[project]/src/components/batch/bank-selection-landing.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BankSelectionLanding",
    ()=>BankSelectionLanding
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/image.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/card.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.554.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-rsc] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.554.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/database.js [app-rsc] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.554.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-rsc] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.554.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-rsc] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.554.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/clock.js [app-rsc] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$batch$2d$settings$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/batch-settings.actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$link$2d$with$2d$loading$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/batch/bank-link-with-loading.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$settings$2d$slide$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/batch/bank-settings-slide.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$batch$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/batch.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
async function BankSelectionLanding() {
    // Load settings and data
    const [mbbResult, vibResult, mbbBatches, vibBatches] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$batch$2d$settings$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getBatchSettingsAction"])('MBB'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$batch$2d$settings$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getBatchSettingsAction"])('VIB'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$batch$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getBatchesByType"])('MBB'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$batch$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getBatchesByType"])('VIB')
    ]);
    const mbbSetting = mbbResult.data;
    const vibSetting = vibResult.data;
    // Helper to calculate stats
    const calculateStats = (batches)=>{
        const activeBatches = batches.filter((b)=>!b.is_archived);
        const totalItems = activeBatches.reduce((acc, b)=>acc + (b.batch_items?.[0]?.count || 0), 0);
        return {
            activeCount: activeBatches.length,
            totalItems
        };
    };
    const mbbStats = calculateStats(mbbBatches);
    const vibStats = calculateStats(vibBatches);
    const totalPendingBatches = mbbStats.activeCount + vibStats.activeCount;
    const banks = [
        {
            id: 'mbb',
            name: 'MB Bank',
            fullName: 'Military Commercial Joint Stock Bank',
            imageUrl: mbbSetting?.image_url || null,
            color: 'indigo',
            gradient: 'from-blue-600 to-indigo-700',
            href: '/batch/mbb',
            stats: mbbStats
        },
        {
            id: 'vib',
            name: 'VIB',
            fullName: 'Vietnam International Bank',
            imageUrl: vibSetting?.image_url || null,
            color: 'purple',
            gradient: 'from-purple-600 to-fuchsia-700',
            href: '/batch/vib',
            stats: vibStats
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-full bg-slate-50/50 flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white border-b border-slate-200",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container mx-auto px-6 py-10",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2 mb-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-1.5 bg-red-100 rounded-md",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                                    className: "h-5 w-5 text-red-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                    lineNumber: 70,
                                                    columnNumber: 37
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                lineNumber: 69,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm font-bold text-slate-400 uppercase tracking-widest",
                                                children: "System"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                lineNumber: 72,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                        lineNumber: 68,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-4xl font-black text-slate-900 tracking-tight",
                                        children: "Batch Processing"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                        lineNumber: 74,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-slate-500 font-medium max-w-lg",
                                        children: "Centralized hub for high-volume transaction imports and reconciliation."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                        lineNumber: 77,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                lineNumber: 67,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4 min-w-[160px]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                                                    className: "h-5 w-5 text-blue-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                    lineNumber: 85,
                                                    columnNumber: 37
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                lineNumber: 84,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] font-black uppercase text-slate-400",
                                                        children: "Pending"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                        lineNumber: 88,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-xl font-bold text-slate-900",
                                                        children: [
                                                            totalPendingBatches,
                                                            " Batches"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                        lineNumber: 89,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                lineNumber: 87,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                        lineNumber: 83,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$settings$2d$slide$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BankSettingsSlideTrigger"], {}, void 0, false, {
                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                        lineNumber: 92,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                lineNumber: 82,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                        lineNumber: 66,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                    lineNumber: 65,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                lineNumber: 64,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 container mx-auto px-6 py-12",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid md:grid-cols-2 gap-8 max-w-5xl mx-auto",
                        children: banks.map((bank)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$link$2d$with$2d$loading$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BankLinkWithLoading"], {
                                href: bank.href,
                                target: "_blank",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Card"], {
                                    className: "group relative overflow-hidden h-full border-none shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-white",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CardContent"], {
                                        className: "p-0 flex flex-col h-full",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("h-48 relative overflow-hidden bg-gradient-to-br", bank.gradient),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-colors"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                        lineNumber: 111,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                        lineNumber: 112,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-0 p-8 flex flex-col justify-between",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex justify-between items-start",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "w-16 h-16 bg-white rounded-none shadow-2xl flex items-center justify-center p-0 overflow-hidden ring-4 ring-white/20 group-hover:scale-105 transition-transform duration-500",
                                                                        children: bank.imageUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                                            src: bank.imageUrl,
                                                                            alt: bank.name,
                                                                            width: 64,
                                                                            height: 64,
                                                                            className: "object-cover w-full h-full"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                            lineNumber: 119,
                                                                            columnNumber: 57
                                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("text-2xl font-black bg-gradient-to-br bg-clip-text text-transparent", bank.gradient),
                                                                            children: bank.id.toUpperCase()
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                            lineNumber: 127,
                                                                            columnNumber: 57
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                        lineNumber: 117,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                                            className: "h-5 w-5 text-white"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                            lineNumber: 136,
                                                                            columnNumber: 53
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                        lineNumber: 135,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                lineNumber: 115,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-white",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                                        className: "text-3xl font-black tracking-tight mb-1",
                                                                        children: bank.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                        lineNumber: 141,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-white/70 text-xs font-medium uppercase tracking-widest",
                                                                        children: bank.fullName
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                        lineNumber: 142,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                lineNumber: 140,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                        lineNumber: 114,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                lineNumber: 106,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-8 flex-1 flex flex-col",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "grid grid-cols-2 gap-6 mb-8",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "space-y-1",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "flex items-center gap-1.5 text-slate-400",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                                                                className: "h-3.5 w-3.5"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                                lineNumber: 152,
                                                                                columnNumber: 53
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-[10px] font-black uppercase tracking-wider",
                                                                                children: "Active Months"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                                lineNumber: 153,
                                                                                columnNumber: 53
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                        lineNumber: 151,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-2xl font-bold text-slate-900",
                                                                        children: bank.stats.activeCount
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                        lineNumber: 155,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                lineNumber: 150,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "space-y-1",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "flex items-center gap-1.5 text-slate-400",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                                                                className: "h-3.5 w-3.5"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                                lineNumber: 159,
                                                                                columnNumber: 53
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-[10px] font-black uppercase tracking-wider",
                                                                                children: "Total Items"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                                lineNumber: 160,
                                                                                columnNumber: 53
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                        lineNumber: 158,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-2xl font-bold text-slate-900",
                                                                        children: bank.stats.totalItems.toLocaleString()
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                        lineNumber: 162,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                lineNumber: 157,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                        lineNumber: 149,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-auto flex items-center gap-2 text-sm font-bold group-hover:gap-3 transition-all",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("bg-clip-text text-transparent bg-gradient-to-r", bank.gradient),
                                                                children: "Process Transfers"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                lineNumber: 167,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("h-4 w-4", bank.color === 'indigo' ? "text-indigo-600" : "text-purple-600")
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                                lineNumber: 173,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                        lineNumber: 166,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                                lineNumber: 148,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                        lineNumber: 104,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                    lineNumber: 103,
                                    columnNumber: 29
                                }, this)
                            }, bank.id, false, {
                                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                lineNumber: 102,
                                columnNumber: 25
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                        lineNumber: 100,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-16 text-center",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-slate-500 text-sm font-medium",
                                    children: "Need to configure sheet URLs?"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                    lineNumber: 188,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/batch/settings",
                                    className: "text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1 transition-colors",
                                    children: [
                                        "Visit Settings ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$554$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                            className: "h-3.5 w-3.5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                            lineNumber: 193,
                                            columnNumber: 44
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                                    lineNumber: 189,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                            lineNumber: 187,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                        lineNumber: 186,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
                lineNumber: 98,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/batch/bank-selection-landing.tsx",
        lineNumber: 62,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/batch/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BatchIndexPage,
    "metadata",
    ()=>metadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$selection$2d$landing$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/batch/bank-selection-landing.tsx [app-rsc] (ecmascript)");
;
;
const metadata = {
    title: 'Batch Import | Money Flow'
};
function BatchIndexPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$batch$2f$bank$2d$selection$2d$landing$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BankSelectionLanding"], {}, void 0, false, {
        fileName: "[project]/src/app/batch/page.tsx",
        lineNumber: 12,
        columnNumber: 12
    }, this);
}
}),
"[project]/src/app/batch/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/batch/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__66731292._.js.map