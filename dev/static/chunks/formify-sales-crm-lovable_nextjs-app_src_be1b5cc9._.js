(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/formify-sales-crm-lovable/nextjs-app/src/lib/localMode.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isLocalMode",
    ()=>isLocalMode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const getWindow = ()=>("TURBOPACK compile-time truthy", 1) ? window : "TURBOPACK unreachable";
function isLocalMode() {
    if (__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_LOCAL_MODE === "true") return true;
    if (__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_LOCAL_MODE === "false") return false;
    return false;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/lib/localStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "readLocal",
    ()=>readLocal,
    "removeLocal",
    ()=>removeLocal,
    "writeLocal",
    ()=>writeLocal
]);
const hasWindow = ("TURBOPACK compile-time value", "object") !== "undefined";
function readLocal(key, fallback) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.warn(`Failed to parse localStorage key ${key}`, err);
        return fallback;
    }
}
function writeLocal(key, value) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.warn(`Failed to write localStorage key ${key}`, err);
    }
}
function removeLocal(key) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    window.localStorage.removeItem(key);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/lib/whopOAuth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "startWhopOAuth",
    ()=>startWhopOAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$whop$2d$apps$2f$iframe$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/@whop-apps/iframe/dist/index.js [app-client] (ecmascript)");
;
function isInWhopIframe() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Check if we're in an iframe
    const inIframe = window.self !== window.top;
    // Check if parent is Whop domain
    try {
        const parentHostname = window.location !== window.parent.location ? document.referrer : document.location.href;
        return inIframe && (parentHostname.includes('whop.com') || parentHostname.includes('dash.whop.com'));
    } catch  {
        // Cross-origin restriction means we're likely in an iframe
        return inIframe;
    }
}
async function startWhopOAuth({ provider, scope, restPath = "/oauth_callback" }) {
    // Check if running in Whop iframe context
    if (!isInWhopIframe()) {
        throw new Error("Whop OAuth only works when the app is embedded in Whop's dashboard. " + "For local development, use the direct Google OAuth flow instead.");
    }
    const appId = ("TURBOPACK compile-time value", "app_0QTmgZrcNle54C");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const sdk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$whop$2d$apps$2f$iframe$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createAppIframeSDK"])({
        appId
    });
    const { baseHref } = await sdk.getTopLevelUrlData({});
    const normalizedRestPath = restPath?.replace(/^\//, "") ?? "";
    const fullUrl = new URL(baseHref + normalizedRestPath);
    const pathname = encodeURIComponent(fullUrl.pathname + fullUrl.search);
    const redirectUrl = new URL(`/_whop/oauth/oauth/${provider}/init`, window.location.origin);
    if (scope) {
        redirectUrl.searchParams.set("scope", scope);
    }
    redirectUrl.searchParams.set("redirect", pathname);
    await sdk.openExternalUrl({
        url: redirectUrl.toString()
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/lib/usage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getUsageCurrentCompany",
    ()=>getUsageCurrentCompany
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/integrations/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/company.ts [app-client] (ecmascript)");
;
;
async function getUsageCurrentCompany() {
    const companyId = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCompanyId"])({
        allowFallback: false
    });
    if (!companyId) return {
        companyId: null,
        bookingsTotal: 0,
        activeEvents: 0
    };
    const { count: bookingsTotal } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('bookings').select('id', {
        count: 'exact',
        head: true
    }).eq('company_id', companyId);
    const { count: activeEvents } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('event_types').select('id', {
        count: 'exact',
        head: true
    }).eq('company_id', companyId).eq('is_archived', false);
    return {
        companyId,
        bookingsTotal: bookingsTotal || 0,
        activeEvents: activeEvents || 0
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/tabs.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$EventTypesList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/scheduling/EventTypesList.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$AvailabilityEditor$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/scheduling/AvailabilityEditor.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$TimeBlocksEditor$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/scheduling/TimeBlocksEditor.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$BookingsList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/scheduling/BookingsList.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$IntegrationsSettings$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/scheduling/IntegrationsSettings.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$NotificationsSettings$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/scheduling/NotificationsSettings.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/integrations/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$contexts$2f$EntitlementsContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/EntitlementsContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$usage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/usage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$entitlements$2f$PreviewBanner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/entitlements/PreviewBanner.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
const dynamic = 'force-dynamic';
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
;
;
const Scheduling = ()=>{
    _s();
    const [effectiveUserId, setEffectiveUserId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const { entitlements } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$contexts$2f$EntitlementsContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEntitlements"])();
    const [usage, setUsage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLocalhost, setIsLocalhost] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showIntegrations, setShowIntegrations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Scheduling.useEffect": ()=>{
            // Set client-side only values after mount to avoid hydration mismatch
            const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
            setIsLocalhost(isLocal);
            // Only show integrations tab on localhost until it's fully working
            setShowIntegrations(isLocal);
        }
    }["Scheduling.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Scheduling.useEffect": ()=>{
            let isMounted = true;
            const resolveUser = {
                "Scheduling.useEffect.resolveUser": async ()=>{
                    const { data: sessionData } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
                    const sessionUser = sessionData?.session?.user;
                    if (sessionUser?.id && isMounted) {
                        setEffectiveUserId(sessionUser.id);
                        return;
                    }
                    const { data: userData } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
                    const userId = userData?.user?.id ?? null;
                    if (isMounted) {
                        setEffectiveUserId(userId);
                    }
                }
            }["Scheduling.useEffect.resolveUser"];
            resolveUser();
            const { data: listener } = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange({
                "Scheduling.useEffect": (_event, session)=>{
                    if (!isMounted) return;
                    const userId = session?.user?.id ?? null;
                    setEffectiveUserId(userId);
                }
            }["Scheduling.useEffect"]);
            return ({
                "Scheduling.useEffect": ()=>{
                    isMounted = false;
                    listener.subscription.unsubscribe();
                }
            })["Scheduling.useEffect"];
        }
    }["Scheduling.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Scheduling.useEffect": ()=>{
            ({
                "Scheduling.useEffect": async ()=>{
                    const u = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$usage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUsageCurrentCompany"])();
                    setUsage({
                        bookingsTotal: u.bookingsTotal
                    });
                }
            })["Scheduling.useEffect"]();
        }
    }["Scheduling.useEffect"], []);
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('event-types');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-background p-4 md:p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto space-y-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-3xl font-bold",
                            children: "Scheduling"
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                            lineNumber: 77,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-muted-foreground",
                            children: "Manage your event types, availability, and bookings"
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                            lineNumber: 78,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                    lineNumber: 76,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                entitlements.plan_id === 'preview' && usage && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$entitlements$2f$PreviewBanner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PreviewBanner"], {
                    used: usage.bookingsTotal,
                    limit: 10
                }, void 0, false, {
                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                    lineNumber: 84,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tabs"], {
                    value: activeTab,
                    onValueChange: setActiveTab,
                    className: "w-full",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsList"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                    value: "event-types",
                                    children: "Event Types"
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                    lineNumber: 89,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                    value: "availability",
                                    children: "Availability"
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                    lineNumber: 90,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                    value: "time-blocks",
                                    children: "Time Blocks"
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                    lineNumber: 91,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                    value: "bookings",
                                    children: "Bookings"
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                    lineNumber: 92,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                isLocalhost && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                    value: "notifications",
                                    children: "Notifications"
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                    lineNumber: 94,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                showIntegrations && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                    value: "integrations",
                                    children: "Integrations"
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                    lineNumber: 96,
                                    columnNumber: 34
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                            lineNumber: 88,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                            value: "event-types",
                            className: "mt-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$EventTypesList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EventTypesList"], {}, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                lineNumber: 100,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                            lineNumber: 99,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                            value: "availability",
                            className: "mt-6",
                            children: activeTab === 'availability' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$AvailabilityEditor$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvailabilityEditor"], {}, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                lineNumber: 104,
                                columnNumber: 46
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                            lineNumber: 103,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                            value: "time-blocks",
                            className: "mt-6",
                            children: activeTab === 'time-blocks' && (effectiveUserId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$TimeBlocksEditor$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TimeBlocksEditor"], {
                                userId: effectiveUserId,
                                scope: "global_for_host"
                            }, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                lineNumber: 110,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-muted-foreground",
                                children: "Loading time blocks..."
                            }, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                lineNumber: 112,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0)))
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                            lineNumber: 107,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                            value: "bookings",
                            className: "mt-6",
                            children: activeTab === 'bookings' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$BookingsList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BookingsList"], {}, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                lineNumber: 118,
                                columnNumber: 42
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                            lineNumber: 117,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        isLocalhost && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                            value: "notifications",
                            className: "mt-6",
                            children: activeTab === 'notifications' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$NotificationsSettings$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NotificationsSettings"], {}, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                lineNumber: 123,
                                columnNumber: 49
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                            lineNumber: 122,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)),
                        showIntegrations && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                            value: "integrations",
                            className: "mt-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$scheduling$2f$IntegrationsSettings$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IntegrationsSettings"], {}, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                                lineNumber: 129,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                            lineNumber: 128,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
                    lineNumber: 87,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
            lineNumber: 75,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/(protected)/scheduling/page.tsx",
        lineNumber: 74,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Scheduling, "Edwmr43xBy9TkUbP18FRsmyDhAs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$contexts$2f$EntitlementsContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEntitlements"]
    ];
});
_c = Scheduling;
const __TURBOPACK__default__export__ = Scheduling;
var _c;
__turbopack_context__.k.register(_c, "Scheduling");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=formify-sales-crm-lovable_nextjs-app_src_be1b5cc9._.js.map