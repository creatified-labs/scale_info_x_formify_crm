module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/integrations/supabase/client.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/@supabase/supabase-js/dist/index.mjs [app-ssr] (ecmascript) <locals>");
// src/integrations/supabase/client.ts
"use client";
;
let _supabase = null;
function getSupabaseClient() {
    if (_supabase) return _supabase;
    // Access env vars safely - Next.js replaces these at build time
    const SUPABASE_URL = typeof process !== 'undefined' && process.env ? ("TURBOPACK compile-time value", "https://zhutmhzwolidcqkoczuo.supabase.co") : globalThis.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON = typeof process !== 'undefined' && process.env ? ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpodXRtaHp3b2xpZGNxa29jenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzcwNTQsImV4cCI6MjA3NzUxMzA1NH0.8QTSVk1jkkEjX76zGyWp1lodotFBUONQE5iLnzvQi1g") : globalThis.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    _supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
            storageKey: "formify-crm-auth",
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    return _supabase;
}
const supabase = new Proxy({}, {
    get (target, prop) {
        const client = getSupabaseClient();
        const value = client[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    }
});
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/hooks/use-toast.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "reducer",
    ()=>reducer,
    "toast",
    ()=>toast,
    "useToast",
    ()=>useToast
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;
const actionTypes = {
    ADD_TOAST: "ADD_TOAST",
    UPDATE_TOAST: "UPDATE_TOAST",
    DISMISS_TOAST: "DISMISS_TOAST",
    REMOVE_TOAST: "REMOVE_TOAST"
};
let count = 0;
function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER;
    return count.toString();
}
const toastTimeouts = new Map();
const addToRemoveQueue = (toastId)=>{
    if (toastTimeouts.has(toastId)) {
        return;
    }
    const timeout = setTimeout(()=>{
        toastTimeouts.delete(toastId);
        dispatch({
            type: "REMOVE_TOAST",
            toastId: toastId
        });
    }, TOAST_REMOVE_DELAY);
    toastTimeouts.set(toastId, timeout);
};
const reducer = (state, action)=>{
    switch(action.type){
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [
                    action.toast,
                    ...state.toasts
                ].slice(0, TOAST_LIMIT)
            };
        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t)=>t.id === action.toast.id ? {
                        ...t,
                        ...action.toast
                    } : t)
            };
        case "DISMISS_TOAST":
            {
                const { toastId } = action;
                // ! Side effects ! - This could be extracted into a dismissToast() action,
                // but I'll keep it here for simplicity
                if (toastId) {
                    addToRemoveQueue(toastId);
                } else {
                    state.toasts.forEach((toast)=>{
                        addToRemoveQueue(toast.id);
                    });
                }
                return {
                    ...state,
                    toasts: state.toasts.map((t)=>t.id === toastId || toastId === undefined ? {
                            ...t,
                            open: false
                        } : t)
                };
            }
        case "REMOVE_TOAST":
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: []
                };
            }
            return {
                ...state,
                toasts: state.toasts.filter((t)=>t.id !== action.toastId)
            };
    }
};
const listeners = [];
let memoryState = {
    toasts: []
};
function dispatch(action) {
    memoryState = reducer(memoryState, action);
    listeners.forEach((listener)=>{
        listener(memoryState);
    });
}
function toast({ ...props }) {
    const id = genId();
    const update = (props)=>dispatch({
            type: "UPDATE_TOAST",
            toast: {
                ...props,
                id
            }
        });
    const dismiss = ()=>dispatch({
            type: "DISMISS_TOAST",
            toastId: id
        });
    dispatch({
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open)=>{
                if (!open) dismiss();
            }
        }
    });
    return {
        id: id,
        dismiss,
        update
    };
}
function useToast() {
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"](memoryState);
    __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"](()=>{
        listeners.push(setState);
        return ()=>{
            const index = listeners.indexOf(setState);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }, [
        state
    ]);
    return {
        ...state,
        toast,
        dismiss: (toastId)=>dispatch({
                type: "DISMISS_TOAST",
                toastId
            })
    };
}
;
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/AuthContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/integrations/supabase/client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/hooks/use-toast.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // Set up auth state listener FIRST
        const { data: { subscription } } = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange((event, session)=>{
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            // Show feature announcement on sign-in
            if (event === 'SIGNED_IN' && session?.user) {
                showFeatureAnnouncement();
            }
        });
        // THEN check for existing session
        __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession().then(({ data: { session } })=>{
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });
        return ()=>subscription.unsubscribe();
    }, []);
    const showFeatureAnnouncement = ()=>{
        // Only show once per deployment
        const ANNOUNCEMENT_KEY = 'formify_announcement_2025_12_23';
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const hasSeenAnnouncement = undefined;
    };
    const signOut = async ()=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
        setUser(null);
        setSession(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            session,
            loading,
            signOut
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/AuthContext.tsx",
        lineNumber: 75,
        columnNumber: 5
    }, this);
}
function useAuth() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/lib/company.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCompanyId",
    ()=>getCompanyId
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/integrations/supabase/client.ts [app-ssr] (ecmascript)");
;
const LOCAL_STORAGE_KEY = "formify-dev-company-id";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isLocalhost() {
    if ("TURBOPACK compile-time truthy", 1) return false;
    //TURBOPACK unreachable
    ;
    const hostname = undefined;
}
function getEnvCompanyId() {
    const envValue = process.env.NEXT_PUBLIC_LOCAL_COMPANY_ID_BYPASS || process.env.NEXT_PUBLIC_DEV_COMPANY_ID || null;
    if (!envValue || typeof envValue !== "string") return null;
    const trimmed = envValue.trim();
    if (!UUID_REGEX.test(trimmed)) {
        return null;
    }
    return trimmed;
}
function getStoredCompanyId() {
    if (!isLocalhost() || ("TURBOPACK compile-time value", "undefined") === "undefined") return null;
    //TURBOPACK unreachable
    ;
    const stored = undefined;
}
function cacheLocalCompanyId(companyId) {
    if (!companyId || !isLocalhost() || ("TURBOPACK compile-time value", "undefined") === "undefined") return;
    //TURBOPACK unreachable
    ;
}
function ensureLocalDevCompanyId() {
    if (!isLocalhost() || ("TURBOPACK compile-time value", "undefined") === "undefined") return null;
    //TURBOPACK unreachable
    ;
    const existing = undefined;
}
async function ensureCompanyIdViaEdge() {
    const { data: sessionData } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return null;
    const base = ("TURBOPACK compile-time value", "https://zhutmhzwolidcqkoczuo.supabase.co") || ("TURBOPACK compile-time value", "https://zhutmhzwolidcqkoczuo.supabase.co");
    const anon = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpodXRtaHp3b2xpZGNxa29jenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzcwNTQsImV4cCI6MjA3NzUxMzA1NH0.8QTSVk1jkkEjX76zGyWp1lodotFBUONQE5iLnzvQi1g") || ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpodXRtaHp3b2xpZGNxa29jenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzcwNTQsImV4cCI6MjA3NzUxMzA1NH0.8QTSVk1jkkEjX76zGyWp1lodotFBUONQE5iLnzvQi1g");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const currentUser = (await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser()).data.user;
    const desiredName = currentUser?.user_metadata?.company_name ?? currentUser?.user_metadata?.name ?? null;
    const res = await fetch(`${base}/functions/v1/ensure-company`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: anon
        },
        body: JSON.stringify({
            name: desiredName
        })
    }).catch((error)=>{
        console.error("ensure-company request failed", error);
        return null;
    });
    if (!res || !res.ok) {
        if (res) {
            try {
                const body = await res.json();
                console.error("ensure-company failed", body);
            } catch (err) {
                console.error("ensure-company unable to parse error", err);
            }
        }
        const fallback = ensureLocalDevCompanyId();
        if (fallback) {
            cacheLocalCompanyId(fallback);
            return fallback;
        }
        return null;
    }
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.refreshSession();
    } catch (err) {
        console.warn("refreshSession after ensure-company failed", err);
    }
    const refreshedUser = (await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser()).data.user;
    const companyId = refreshedUser?.user_metadata?.company_id ?? null;
    cacheLocalCompanyId(companyId ?? undefined);
    return companyId;
}
async function getCompanyId(options) {
    const allowFallback = options?.allowFallback ?? true;
    const envCompanyId = getEnvCompanyId();
    if (envCompanyId) {
        return envCompanyId;
    }
    const storedCompanyId = getStoredCompanyId();
    if (storedCompanyId) {
        if (!allowFallback && storedCompanyId.startsWith("dev-company-")) {
        // Ignore dev placeholders when fallback is disabled
        } else {
            return storedCompanyId;
        }
    }
    const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
    if (!user) return null;
    const cid = user.user_metadata?.company_id;
    if (cid) return cid;
    const ensuredCompanyId = await ensureCompanyIdViaEdge();
    if (ensuredCompanyId) {
        if (!allowFallback && !UUID_REGEX.test(ensuredCompanyId)) {
            return null;
        }
        return ensuredCompanyId;
    }
    if (allowFallback) {
        const generated = ensureLocalDevCompanyId();
        if (generated) {
            cacheLocalCompanyId(generated);
            return generated;
        }
    }
    return null;
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/lib/track.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "track",
    ()=>track
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/integrations/supabase/client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/company.ts [app-ssr] (ecmascript)");
;
;
async function track(event, metadata = {}) {
    try {
        const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
        if (!user) return;
        const company_id = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCompanyId"])({
            allowFallback: false
        });
        if (!company_id) return;
        await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("usage_events").insert({
            company_id,
            user_id: user.id,
            event,
            metadata
        });
    } catch  {
    /* swallow analytics errors */ }
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/lib/status.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "bookingStatusToCallStatus",
    ()=>bookingStatusToCallStatus,
    "callStatusToBookingStatus",
    ()=>callStatusToBookingStatus,
    "formatBookingStatus",
    ()=>formatBookingStatus,
    "normalizeBookingStatus",
    ()=>normalizeBookingStatus,
    "statusTextColorClass",
    ()=>statusTextColorClass
]);
const normalize = (value)=>(value ?? "").trim().toLowerCase();
const normalizeBookingStatus = (value)=>{
    const normalized = normalize(value);
    if (normalized === "completed") return "completed";
    if (normalized === "cancelled" || normalized === "canceled") return "canceled";
    if (normalized === "no_show" || normalized === "no-show" || normalized === "no show") return "no_show";
    if (normalized === "hasnt_paid_yet" || normalized === "hasn't paid yet" || normalized === "hasnt paid yet") {
        return "hasnt_paid_yet";
    }
    return "scheduled";
};
const formatBookingStatus = (status)=>{
    switch(status){
        case "completed":
            return "Completed";
        case "canceled":
            return "Cancelled";
        case "no_show":
            return "No Show";
        case "hasnt_paid_yet":
            return "Hasn't Paid Yet";
        default:
            return "Scheduled";
    }
};
const statusTextColorClass = (status)=>{
    const normalized = normalizeBookingStatus(typeof status === "string" ? status : undefined);
    switch(normalized){
        case "completed":
            return "text-emerald-600";
        case "canceled":
        case "no_show":
            return "text-red-600";
        case "hasnt_paid_yet":
            return "text-amber-600";
        default:
            return "text-foreground";
    }
};
const bookingStatusToCallStatus = (status)=>{
    switch(status){
        case "completed":
            return "completed";
        case "canceled":
            return "cancelled";
        case "no_show":
            return "no-show";
        case "hasnt_paid_yet":
            return "hasn't paid yet";
        default:
            return "scheduled";
    }
};
const callStatusToBookingStatus = (status)=>{
    switch(status){
        case "completed":
            return "completed";
        case "cancelled":
            return "canceled";
        case "no-show":
            return "no_show";
        case "hasn't paid yet":
            return "hasnt_paid_yet";
        default:
            return "scheduled";
    }
};
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/button.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button,
    "buttonVariants",
    ()=>buttonVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/@radix-ui/react-slot/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/class-variance-authority/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
const buttonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline"
        },
        size: {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
const Button = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, variant, size, asChild = false, ...props }, ref)=>{
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Slot"] : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(buttonVariants({
            variant,
            size,
            className
        })),
        ref: ref,
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/button.tsx",
        lineNumber: 48,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
Button.displayName = "Button";
;
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DataProvider",
    ()=>DataProvider,
    "useData",
    ()=>useData
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/integrations/supabase/client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/company.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$track$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/track.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$status$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/status.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/button.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
const DataContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function DataProvider({ children }) {
    const [revenueEntries, setRevenueEntries] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [goals, setGoals] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [calls, setCalls] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [hydrated, setHydrated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const sb = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"];
    const showAuthRequiredToast = (title, description, opts)=>{
        const toastId = opts?.id ?? "auth-required";
        __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].dismiss(toastId);
        __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].custom((id)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-[320px] rounded-lg border bg-background p-4 shadow-lg",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-sm font-medium",
                            children: title
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx",
                            lineNumber: 101,
                            columnNumber: 13
                        }, this),
                        description ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-muted-foreground whitespace-pre-line",
                            children: description
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx",
                            lineNumber: 103,
                            columnNumber: 15
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-end gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    variant: "ghost",
                                    size: "sm",
                                    onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].dismiss(id),
                                    children: "Dismiss"
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx",
                                    lineNumber: 106,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    size: "sm",
                                    onClick: ()=>{
                                        __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].dismiss(id);
                                        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                                        ;
                                    },
                                    children: "Create account"
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx",
                                    lineNumber: 113,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx",
                            lineNumber: 105,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx",
                    lineNumber: 100,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx",
                lineNumber: 99,
                columnNumber: 9
            }, this), {
            id: toastId,
            duration: Infinity
        });
    };
    // Edge function helper
    const callFunction = async (name, method, payload, query)=>{
        const { data: session } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
        const token = session?.session?.access_token;
        if (!token) throw new Error('Not authenticated');
        const base = `${("TURBOPACK compile-time value", "https://zhutmhzwolidcqkoczuo.supabase.co")}/functions/v1/${name}`;
        const url = query ? `${base}?${new URLSearchParams(query).toString()}` : base;
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined
        });
        if (!res.ok) {
            const j = await res.json().catch(()=>({}));
            if (res.status === 403 && (j?.code === 'PLAN_UPGRADE_REQUIRED' || String(j?.code || '').includes('PREVIEW'))) {
                __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(j?.message || 'Upgrade required to use this feature');
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$track$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["track"])('feature_blocked', {
                    feature: name,
                    code: j?.code || 'FORBIDDEN'
                });
            } else {
                __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(j?.error || 'Request failed');
            }
            throw new Error(j?.error || `Function ${name} failed`);
        }
        return res.json().catch(()=>({}));
    };
    const mapRevenueFromDb = (row)=>({
            id: row.id,
            date: row.entry_date,
            amount: Number(row.amount),
            description: row.description || undefined,
            category: row.category || undefined,
            categoryName: row.category_name || undefined,
            categoryColor: row.category_color || undefined,
            createdAt: new Date(row.created_at),
            metadata: row.metadata || undefined
        });
    const mapGoalFromDb = (row)=>({
            id: row.id,
            goalType: row.goal_type,
            type: row.period_type,
            targetAmount: Number(row.target_amount),
            period: row.period_key || undefined,
            deadline: row.deadline || undefined,
            description: row.description || undefined,
            category: row.category || undefined,
            categoryName: row.category_name || undefined,
            categoryColor: row.category_color || undefined,
            categoryType: row.category_type || undefined,
            createdAt: new Date(row.created_at)
        });
    const mapCallFromDb = (row)=>({
            id: row.id,
            clientName: row.client_name,
            email: row.client_email || undefined,
            phone: row.client_phone || undefined,
            callType: row.call_type,
            date: row.call_date,
            time: row.call_time || "",
            duration: row.duration_minutes ?? 30,
            status: row.status,
            isConverted: row.is_converted ?? undefined,
            conversionAmount: row.conversion_amount ?? undefined,
            notes: row.notes || undefined,
            createdAt: new Date(row.created_at),
            joinUrl: row.join_url || undefined,
            bookingId: row.booking_id || undefined
        });
    // Fetch all data via RLS tables
    const fetchData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const background = hydrated;
        try {
            if (!background) {
                setLoading(true);
            }
            const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
            if (!user) {
                setRevenueEntries([]);
                setGoals([]);
                setCalls([]);
                return;
            }
            const companyId = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCompanyId"])({
                allowFallback: false
            });
            if (!companyId) {
                setRevenueEntries([]);
                setGoals([]);
                setCalls([]);
                return;
            }
            const [revenueRes, goalsRes, callsRes] = await Promise.all([
                sb.from("revenue_entries").select("*").eq("company_id", companyId).order("entry_date", {
                    ascending: false
                }).order("created_at", {
                    ascending: false
                }),
                sb.from("sales_goals").select("*").eq("company_id", companyId).order("created_at", {
                    ascending: false
                }),
                sb.from("call_logs").select("*").eq("company_id", companyId).order("call_date", {
                    ascending: false
                }).order("created_at", {
                    ascending: false
                })
            ]);
            if (revenueRes.error) throw revenueRes.error;
            if (goalsRes.error) throw goalsRes.error;
            if (callsRes.error) throw callsRes.error;
            setRevenueEntries((revenueRes.data ?? []).map((row)=>mapRevenueFromDb(row)));
            setGoals((goalsRes.data ?? []).map((row)=>mapGoalFromDb(row)));
            setCalls((callsRes.data ?? []).map((row)=>mapCallFromDb(row)));
        } catch (error) {
            console.error('Error loading data:', error);
            setRevenueEntries([]);
            setGoals([]);
            setCalls([]);
        } finally{
            if (!background) {
                setLoading(false);
            }
            if (!hydrated) {
                setHydrated(true);
            }
        }
    }, [
        hydrated,
        sb
    ]);
    const syncBookingToCalls = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        await fetchData();
    }, [
        fetchData
    ]);
    // Load data on mount and set up periodic refresh + storage event listener
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        void fetchData();
        const handleStorageChange = ()=>{
            void fetchData();
        };
        const handleManualRefresh = ()=>{
            void fetchData();
        };
        const handleBookingsRefresh = ()=>{
            void fetchData();
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('call-tracker-refresh', handleManualRefresh);
        window.addEventListener('bookings-refresh', handleBookingsRefresh);
        const interval = setInterval(()=>{
            void fetchData();
        }, 30000);
        const channel = sb.channel('bookings-calls-sync').on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings'
        }, ()=>{
            void syncBookingToCalls();
        }).subscribe();
        return ()=>{
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('call-tracker-refresh', handleManualRefresh);
            window.removeEventListener('bookings-refresh', handleBookingsRefresh);
            clearInterval(interval);
            sb.removeChannel(channel);
        };
    }, [
        fetchData,
        sb,
        syncBookingToCalls
    ]);
    const addRevenueEntry = async (entry)=>{
        try {
            const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
            if (!user) {
                showAuthRequiredToast("Sign in required", "Sign back in to add revenue entries.");
                return;
            }
            const companyId = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCompanyId"])({
                allowFallback: false
            });
            if (!companyId) {
                showAuthRequiredToast("We couldn’t find your company", "Sign back in so we can refresh your workspace access.", {
                    id: "missing-company"
                });
                return;
            }
            const insertPayload = {
                company_id: companyId,
                entry_date: entry.date,
                amount: entry.amount,
                description: entry.description ?? null,
                category: entry.category ?? null,
                category_name: entry.categoryName ?? null,
                category_color: entry.categoryColor ?? null,
                metadata: entry.metadata ?? null
            };
            const { data, error } = await sb.from('revenue_entries').insert(insertPayload).select('*').maybeSingle();
            if (error) throw error;
            if (data) {
                setRevenueEntries([
                    mapRevenueFromDb(data),
                    ...revenueEntries
                ]);
            }
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Revenue entry added');
        } catch (error) {
            console.error('Error adding revenue entry:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.message || 'Failed to add revenue entry');
        }
    };
    const updateRevenueEntry = async (entry)=>{
        try {
            const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
            if (!user) {
                showAuthRequiredToast("Sign in required", "Sign back in to update revenue entries.");
                return;
            }
            const updatePayload = {
                entry_date: entry.date,
                amount: entry.amount,
                description: entry.description ?? null,
                category: entry.category ?? null,
                category_name: entry.categoryName ?? null,
                category_color: entry.categoryColor ?? null,
                metadata: entry.metadata ?? null
            };
            const { error } = await sb.from('revenue_entries').update(updatePayload).eq('id', entry.id);
            if (error) throw error;
            setRevenueEntries(revenueEntries.map((e)=>e.id === entry.id ? entry : e));
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Revenue entry updated');
        } catch (error) {
            console.error('Error updating revenue entry:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.message || 'Failed to update revenue entry');
        }
    };
    const deleteRevenueEntry = async (entryId)=>{
        try {
            const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
            if (!user) {
                showAuthRequiredToast("Sign in required", "Sign back in to delete revenue entries.");
                return;
            }
            const { error } = await sb.from('revenue_entries').delete().eq('id', entryId);
            if (error) throw error;
            setRevenueEntries(revenueEntries.filter((e)=>e.id !== entryId));
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Revenue entry deleted');
        } catch (error) {
            console.error('Error deleting revenue entry:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.message || 'Failed to delete revenue entry');
        }
    };
    const addGoal = async (goal)=>{
        try {
            const companyId = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCompanyId"])({
                allowFallback: false
            });
            if (!companyId) {
                showAuthRequiredToast("We couldn’t find your company", "Sign back in so we can refresh your workspace access.", {
                    id: "missing-company"
                });
                return;
            }
            const payload = {
                action: 'create',
                payload: {
                    company_id: companyId,
                    title: goal.description || goal.categoryName || 'Goal',
                    target_amount: goal.targetAmount,
                    period_key: goal.period ?? null,
                    deadline: goal.deadline ?? null,
                    description: goal.description ?? null,
                    category: goal.category ?? null,
                    category_name: goal.categoryName ?? null,
                    category_color: goal.categoryColor ?? null,
                    category_type: goal.categoryType ?? null
                }
            };
            const created = await callFunction('goals-write', 'POST', payload);
            setGoals([
                mapGoalFromDb(created),
                ...goals
            ]);
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Goal created');
        } catch (error) {
            console.error('Error adding goal:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.message || 'Failed to create goal');
        }
    };
    const deleteGoal = async (goalId)=>{
        try {
            await callFunction('goals-write', 'POST', {
                action: 'delete',
                payload: {
                    id: goalId
                }
            });
            setGoals(goals.filter((g)=>g.id !== goalId));
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Goal deleted');
        } catch (error) {
            console.error('Error deleting goal:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.message || 'Failed to delete goal');
        }
    };
    const addCall = async (call)=>{
        try {
            const { data: session } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
            const token = session?.session?.access_token;
            if (!token) {
                // Public booking flow is unauthenticated; skip creating the internal call log without showing a toast.
                return;
            }
            const companyId = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCompanyId"])({
                allowFallback: false
            });
            if (!companyId) {
                showAuthRequiredToast("We couldn’t find your company", "Sign back in so we can refresh your workspace access.", {
                    id: "missing-company"
                });
                return;
            }
            const insertPayload = {
                company_id: companyId,
                client_name: call.clientName,
                client_email: call.email ?? null,
                client_phone: call.phone ?? null,
                call_type: call.callType,
                call_date: call.date,
                call_time: call.time || null,
                duration_minutes: call.duration ?? 30,
                status: call.status,
                is_converted: call.isConverted ?? false,
                conversion_amount: call.conversionAmount ?? null,
                notes: call.notes ?? null,
                booking_id: call.bookingId ?? null,
                join_url: call.joinUrl ?? null
            };
            const { data, error } = await sb.from('call_logs').insert(insertPayload).select('*').maybeSingle();
            if (error) throw error;
            if (data) {
                setCalls([
                    mapCallFromDb(data),
                    ...calls
                ]);
            }
            if (!call.bookingId) {
                __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Call added');
            }
        } catch (error) {
            console.error('Error adding call:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.message || 'Failed to add call');
        }
    };
    const updateCall = async (call)=>{
        try {
            const updatePayload = {
                client_name: call.clientName,
                client_email: call.email ?? null,
                client_phone: call.phone ?? null,
                call_type: call.callType,
                call_date: call.date,
                call_time: call.time || null,
                duration_minutes: call.duration ?? 30,
                status: call.status,
                is_converted: call.isConverted ?? false,
                conversion_amount: call.conversionAmount ?? null,
                notes: call.notes ?? null,
                booking_id: call.bookingId ?? null,
                join_url: call.joinUrl ?? null
            };
            const { error } = await sb.from('call_logs').update(updatePayload).eq('id', call.id);
            if (error) throw error;
            setCalls(calls.map((c)=>c.id === call.id ? call : c));
            if (call.bookingId) {
                const syncTasks = [];
                const bookingStatus = call.status ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$status$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callStatusToBookingStatus"])(call.status) : undefined;
                const startDate = new Date(`${call.date}T${call.time || '00:00'}`);
                const hasValidStart = !Number.isNaN(startDate.getTime());
                const endDate = hasValidStart ? new Date(startDate.getTime() + (call.duration ?? 30) * 60000) : null;
                const bookingUpdatePayload = {
                    booking_id: call.bookingId
                };
                if (call.clientName) bookingUpdatePayload.invitee_name = call.clientName;
                if (call.email) bookingUpdatePayload.invitee_email = call.email;
                if (call.phone !== undefined) bookingUpdatePayload.invitee_phone = call.phone || null;
                if (call.callType) bookingUpdatePayload.chosen_call_type = call.callType;
                if (hasValidStart) {
                    bookingUpdatePayload.start_time = startDate.toISOString();
                    if (endDate) {
                        bookingUpdatePayload.end_time = endDate.toISOString();
                    }
                }
                if (bookingStatus) bookingUpdatePayload.status = bookingStatus;
                bookingUpdatePayload.notes = call.notes ?? null;
                bookingUpdatePayload.video_join_url = call.joinUrl ?? null;
                syncTasks.push(callFunction('update-booking', 'POST', bookingUpdatePayload).catch((err)=>console.error('Error syncing booking details:', err)));
                if (call.isConverted !== undefined) {
                    syncTasks.push(callFunction('convert-booking', 'POST', {
                        booking_id: call.bookingId,
                        is_converted: call.isConverted,
                        conversion_amount: call.isConverted ? call.conversionAmount ?? 0 : null
                    }).catch((err)=>console.error('Error syncing booking conversion:', err)));
                }
                if (syncTasks.length) {
                    await Promise.allSettled(syncTasks);
                }
                window.dispatchEvent(new Event('bookings-refresh'));
            }
            if (call.isConverted && call.conversionAmount) {
                const existingRevenue = revenueEntries.find((e)=>e.metadata?.callId === call.id);
                if (existingRevenue) {
                    await updateRevenueEntry({
                        ...existingRevenue,
                        date: call.date,
                        amount: call.conversionAmount,
                        description: `Conversion from ${call.callType}: ${call.clientName}`
                    });
                } else {
                    await addRevenueEntry({
                        date: call.date,
                        amount: call.conversionAmount,
                        description: `Conversion from ${call.callType}: ${call.clientName}`,
                        category: 'calls',
                        categoryName: 'Calls',
                        categoryColor: 'hsl(142, 76%, 36%)',
                        metadata: {
                            callId: call.id
                        }
                    });
                }
            } else {
                const revenueEntry = revenueEntries.find((e)=>e.metadata?.callId === call.id);
                if (revenueEntry) {
                    await deleteRevenueEntry(revenueEntry.id);
                }
            }
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Call updated');
        } catch (error) {
            console.error('Error updating call:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.message || 'Failed to update call');
        }
    };
    const deleteCall = async (callId)=>{
        try {
            const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
            if (!user) {
                showAuthRequiredToast("Sign in required", "Sign back in to manage calls.");
                return;
            }
            const target = calls.find((c)=>c.id === callId);
            const { error } = await sb.from('call_logs').delete().eq('id', callId);
            if (error) throw error;
            const revenueEntry = revenueEntries.find((e)=>e.metadata?.callId === callId);
            if (revenueEntry) {
                await deleteRevenueEntry(revenueEntry.id);
            }
            setCalls(calls.filter((c)=>c.id !== callId));
            if (target?.bookingId) {
                try {
                    await callFunction('delete-booking', 'POST', {
                        booking_id: target.bookingId
                    });
                    window.dispatchEvent(new Event('bookings-refresh'));
                } catch (bookingErr) {
                    console.error('Error deleting linked booking:', bookingErr);
                }
            }
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Call deleted');
        } catch (error) {
            console.error('Error deleting call:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.message || 'Failed to delete call');
        }
    };
    const value = {
        revenueEntries,
        goals,
        calls,
        loading,
        addRevenueEntry,
        updateRevenueEntry,
        deleteRevenueEntry,
        addGoal,
        deleteGoal,
        addCall,
        updateCall,
        deleteCall,
        refetch: fetchData
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DataContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx",
        lineNumber: 683,
        columnNumber: 5
    }, this);
}
function useData() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DropdownMenu",
    ()=>DropdownMenu,
    "DropdownMenuCheckboxItem",
    ()=>DropdownMenuCheckboxItem,
    "DropdownMenuContent",
    ()=>DropdownMenuContent,
    "DropdownMenuGroup",
    ()=>DropdownMenuGroup,
    "DropdownMenuItem",
    ()=>DropdownMenuItem,
    "DropdownMenuLabel",
    ()=>DropdownMenuLabel,
    "DropdownMenuPortal",
    ()=>DropdownMenuPortal,
    "DropdownMenuRadioGroup",
    ()=>DropdownMenuRadioGroup,
    "DropdownMenuRadioItem",
    ()=>DropdownMenuRadioItem,
    "DropdownMenuSeparator",
    ()=>DropdownMenuSeparator,
    "DropdownMenuShortcut",
    ()=>DropdownMenuShortcut,
    "DropdownMenuSub",
    ()=>DropdownMenuSub,
    "DropdownMenuSubContent",
    ()=>DropdownMenuSubContent,
    "DropdownMenuSubTrigger",
    ()=>DropdownMenuSubTrigger,
    "DropdownMenuTrigger",
    ()=>DropdownMenuTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/@radix-ui/react-dropdown-menu/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-ssr] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Circle$3e$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/lucide-react/dist/esm/icons/circle.js [app-ssr] (ecmascript) <export default as Circle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
const DropdownMenu = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Root"];
const DropdownMenuTrigger = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Trigger"];
const DropdownMenuGroup = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Group"];
const DropdownMenuPortal = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Portal"];
const DropdownMenuSub = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Sub"];
const DropdownMenuRadioGroup = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RadioGroup"];
const DropdownMenuSubTrigger = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, inset, children, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SubTrigger"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent", inset && "pl-8", className),
        ...props,
        children: [
            children,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                className: "ml-auto h-4 w-4"
            }, void 0, false, {
                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
                lineNumber: 37,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
        lineNumber: 27,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
DropdownMenuSubTrigger.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SubTrigger"].displayName;
const DropdownMenuSubContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SubContent"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
        lineNumber: 47,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
DropdownMenuSubContent.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SubContent"].displayName;
const DropdownMenuContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, sideOffset = 4, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Portal"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Content"], {
            ref: ref,
            sideOffset: sideOffset,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className),
            ...props
        }, void 0, false, {
            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
            lineNumber: 64,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
        lineNumber: 63,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
DropdownMenuContent.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Content"].displayName;
const DropdownMenuItem = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, inset, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Item"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", inset && "pl-8", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
        lineNumber: 83,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
DropdownMenuItem.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Item"].displayName;
const DropdownMenuCheckboxItem = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, children, checked, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CheckboxItem"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
        checked: checked,
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ItemIndicator"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                        className: "h-4 w-4"
                    }, void 0, false, {
                        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
                        lineNumber: 110,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
                    lineNumber: 109,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
                lineNumber: 108,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
        lineNumber: 99,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
DropdownMenuCheckboxItem.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CheckboxItem"].displayName;
const DropdownMenuRadioItem = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, children, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RadioItem"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ItemIndicator"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Circle$3e$__["Circle"], {
                        className: "h-2 w-2 fill-current"
                    }, void 0, false, {
                        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
                        lineNumber: 133,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
                    lineNumber: 132,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
                lineNumber: 131,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
        lineNumber: 123,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
DropdownMenuRadioItem.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RadioItem"].displayName;
const DropdownMenuLabel = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, inset, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Label"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
        lineNumber: 147,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
DropdownMenuLabel.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Label"].displayName;
const DropdownMenuSeparator = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Separator"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("-mx-1 my-1 h-px bg-muted", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
        lineNumber: 163,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
DropdownMenuSeparator.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Separator"].displayName;
const DropdownMenuShortcut = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("ml-auto text-xs tracking-widest opacity-60", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx",
        lineNumber: 176,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
;
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PreviewModeToggle",
    ()=>PreviewModeToggle,
    "usePreviewMode",
    ()=>usePreviewMode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/dropdown-menu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/lucide-react/dist/esm/icons/eye.js [app-ssr] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
"use client";
;
;
;
;
;
const PreviewModeToggle = ()=>{
    const [previewMode, setPreviewMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return "live";
        //TURBOPACK unreachable
        ;
        const stored = undefined;
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
    }, [
        previewMode
    ]);
    const label = previewMode === "preview" ? "Preview: Free" : previewMode === "solo" ? "Preview: Solo" : previewMode === "pro" ? "Preview: Pro" : "Current plan";
    const toggleMode = (mode)=>{
        setPreviewMode((current)=>current === mode ? "live" : mode);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                asChild: true,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                    variant: "outline",
                    size: "sm",
                    className: "gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                            className: "w-4 h-4"
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                            lineNumber: 55,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "hidden sm:inline",
                            children: label
                        }, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                            lineNumber: 56,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                    lineNumber: 54,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                align: "end",
                className: "w-48 bg-background z-50",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                        onClick: ()=>toggleMode("preview"),
                        children: [
                            previewMode === "preview" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                className: "w-4 h-4 mr-2"
                            }, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                                lineNumber: 61,
                                columnNumber: 41
                            }, ("TURBOPACK compile-time value", void 0)),
                            previewMode !== "preview" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "w-4 h-4 mr-2"
                            }, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                                lineNumber: 62,
                                columnNumber: 41
                            }, ("TURBOPACK compile-time value", void 0)),
                            "Free Plan"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                        lineNumber: 60,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                        onClick: ()=>toggleMode("solo"),
                        children: [
                            previewMode === "solo" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                className: "w-4 h-4 mr-2"
                            }, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                                lineNumber: 66,
                                columnNumber: 38
                            }, ("TURBOPACK compile-time value", void 0)),
                            previewMode !== "solo" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "w-4 h-4 mr-2"
                            }, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                                lineNumber: 67,
                                columnNumber: 38
                            }, ("TURBOPACK compile-time value", void 0)),
                            "Solo Plan"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                        lineNumber: 65,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                        onClick: ()=>toggleMode("pro"),
                        children: [
                            previewMode === "pro" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                className: "w-4 h-4 mr-2"
                            }, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                                lineNumber: 71,
                                columnNumber: 37
                            }, ("TURBOPACK compile-time value", void 0)),
                            previewMode !== "pro" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "w-4 h-4 mr-2"
                            }, void 0, false, {
                                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                                lineNumber: 72,
                                columnNumber: 37
                            }, ("TURBOPACK compile-time value", void 0)),
                            "Pro Plan"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                        lineNumber: 70,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx",
        lineNumber: 52,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const usePreviewMode = ()=>{
    const [previewMode, setPreviewMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return "live";
        //TURBOPACK unreachable
        ;
        const stored = undefined;
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const handlePreviewModeChange = (event)=>{
            const custom = event;
            setPreviewMode(custom.detail);
        };
        window.addEventListener("previewModeChange", handlePreviewModeChange);
        return ()=>{
            window.removeEventListener("previewModeChange", handlePreviewModeChange);
        };
    }, []);
    return previewMode;
};
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/EntitlementsContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EntitlementsProvider",
    ()=>EntitlementsProvider,
    "useEntitlements",
    ()=>useEntitlements
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/integrations/supabase/client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$PreviewModeToggle$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/PreviewModeToggle.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/company.ts [app-ssr] (ecmascript)");
"use client";
;
async function ensureProPlanForCompany(companyId, currentPlan) {
    if (currentPlan !== "preview") {
        return currentPlan;
    }
    try {
        const { data: sessionData } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return currentPlan;
        const baseUrl = ("TURBOPACK compile-time value", "https://zhutmhzwolidcqkoczuo.supabase.co") || ("TURBOPACK compile-time value", "https://zhutmhzwolidcqkoczuo.supabase.co");
        const anonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpodXRtaHp3b2xpZGNxa29jenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzcwNTQsImV4cCI6MjA3NzUxMzA1NH0.8QTSVk1jkkEjX76zGyWp1lodotFBUONQE5iLnzvQi1g") || ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpodXRtaHp3b2xpZGNxa29jenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzcwNTQsImV4cCI6MjA3NzUxMzA1NH0.8QTSVk1jkkEjX76zGyWp1lodotFBUONQE5iLnzvQi1g");
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        await fetch(`${baseUrl}/functions/v1/ensure-company`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                apikey: anonKey
            },
            body: JSON.stringify({
                name: null
            })
        }).catch((err)=>{
            console.error("ensure-company invocation failed", err);
        });
        const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("companies").select("plan_id").eq("id", companyId).maybeSingle();
        const nextPlan = data?.plan_id || "pro";
        return nextPlan;
    } catch (error) {
        console.error("ensureProPlanForCompany error", error);
        return currentPlan;
    }
}
;
;
;
;
const PREVIEW_ENTITLEMENTS = {
    plan_id: "preview",
    users_seats_max: 1,
    scheduling_capacity: {
        events_max: 1,
        bookings_per_month_max: 10
    },
    integrations_bundle: "basic",
    questions_forms_max: 2,
    call_tracking: "basic",
    goals_management: "personal",
    analytics_revenue: "basic",
    exports_automations: false,
    branding_domain: "powered_by_badge",
    support: "email_72h"
};
const SOLO_ENTITLEMENTS = {
    plan_id: "solo",
    users_seats_max: 1,
    scheduling_capacity: {
        events_max: 3,
        bookings_per_month_max: 30
    },
    integrations_bundle: "basic",
    questions_forms_max: 3,
    call_tracking: "included",
    goals_management: "personal",
    analytics_revenue: "basic",
    exports_automations: false,
    branding_domain: "powered_by_badge",
    support: "email_72h"
};
const PRO_ENTITLEMENTS = {
    plan_id: "pro",
    users_seats_max: 5,
    scheduling_capacity: {
        events_max: 10,
        bookings_per_month_max: 120
    },
    integrations_bundle: "included",
    questions_forms_max: "unlimited",
    call_tracking: "included",
    goals_management: "included",
    analytics_revenue: "advanced",
    exports_automations: "csv_webhooks",
    branding_domain: "custom_1",
    support: "priority_24_48h"
};
const EntitlementsContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(null);
function EntitlementsProvider({ children }) {
    const [entitlements, setEntitlements] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(PRO_ENTITLEMENTS);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const previewMode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$PreviewModeToggle$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePreviewMode"])();
    const [isEmbed, setIsEmbed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const embedded = undefined;
    }, []);
    const fetchEntitlements = async ()=>{
        try {
            const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
            if (!user) {
                setEntitlements(PRO_ENTITLEMENTS);
                setLoading(false);
                return;
            }
            // Resolve company for this user
            const companyId = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$company$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCompanyId"])({
                allowFallback: false
            });
            if (!companyId) {
                setEntitlements(PRO_ENTITLEMENTS);
                setLoading(false);
                return;
            }
            const companyQuery = await __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$integrations$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('companies').select('id, plan_id').eq('id', companyId).maybeSingle();
            if (companyQuery.error || !companyQuery.data) {
                setEntitlements(PRO_ENTITLEMENTS);
            } else {
                let planRaw = companyQuery.data.plan_id || 'preview';
                if (planRaw === 'preview') {
                    planRaw = await ensureProPlanForCompany(companyId, planRaw);
                }
                const normalizedPlan = planRaw === 'preview' ? 'pro' : planRaw;
                const mapped = normalizedPlan === 'pro' ? PRO_ENTITLEMENTS : SOLO_ENTITLEMENTS;
                setEntitlements(mapped);
            }
        } catch (error) {
            console.error("Error fetching entitlements:", error);
            setEntitlements(PRO_ENTITLEMENTS);
        } finally{
            setLoading(false);
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        fetchEntitlements();
    }, []);
    // Apply preview mode override only when explicitly set; otherwise use fetched entitlements
    const allowPreviewOverride = !isEmbed;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
    }, [
        allowPreviewOverride,
        entitlements.plan_id
    ]);
    const effectiveEntitlements = allowPreviewOverride && previewMode === "solo" ? SOLO_ENTITLEMENTS : allowPreviewOverride && previewMode === "pro" ? PRO_ENTITLEMENTS : entitlements;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(EntitlementsContext.Provider, {
        value: {
            entitlements: effectiveEntitlements,
            loading,
            refetch: fetchEntitlements
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/EntitlementsContext.tsx",
        lineNumber: 212,
        columnNumber: 5
    }, this);
}
function useEntitlements() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(EntitlementsContext);
    if (!context) {
        throw new Error("useEntitlements must be used within EntitlementsProvider");
    }
    return context;
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/tooltip.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Tooltip",
    ()=>Tooltip,
    "TooltipContent",
    ()=>TooltipContent,
    "TooltipProvider",
    ()=>TooltipProvider,
    "TooltipTrigger",
    ()=>TooltipTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/@radix-ui/react-tooltip/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const TooltipProvider = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Provider"];
const Tooltip = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Root"];
const TooltipTrigger = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Trigger"];
const TooltipContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, sideOffset = 4, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Content"], {
        ref: ref,
        sideOffset: sideOffset,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/tooltip.tsx",
        lineNumber: 18,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
TooltipContent.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Content"].displayName;
;
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toast.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toast",
    ()=>Toast,
    "ToastAction",
    ()=>ToastAction,
    "ToastClose",
    ()=>ToastClose,
    "ToastDescription",
    ()=>ToastDescription,
    "ToastProvider",
    ()=>ToastProvider,
    "ToastTitle",
    ()=>ToastTitle,
    "ToastViewport",
    ()=>ToastViewport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/@radix-ui/react-toast/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/class-variance-authority/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
const ToastProvider = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Provider"];
const ToastViewport = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Viewport"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toast.tsx",
        lineNumber: 16,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
ToastViewport.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Viewport"].displayName;
const toastVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cva"])("group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full", {
    variants: {
        variant: {
            default: "border bg-background text-foreground",
            destructive: "destructive group border-destructive bg-destructive text-destructive-foreground"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
const Toast = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, variant, ...props }, ref)=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Root"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(toastVariants({
            variant
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toast.tsx",
        lineNumber: 49,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
});
Toast.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Root"].displayName;
const ToastAction = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Action"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toast.tsx",
        lineNumber: 62,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
ToastAction.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Action"].displayName;
const ToastClose = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Close"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600", className),
        "toast-close": "",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
            className: "h-4 w-4"
        }, void 0, false, {
            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toast.tsx",
            lineNumber: 86,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toast.tsx",
        lineNumber: 77,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
ToastClose.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Close"].displayName;
const ToastTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Title"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-sm font-semibold", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toast.tsx",
        lineNumber: 95,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
ToastTitle.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Title"].displayName;
const ToastDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Description"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-sm opacity-90", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toast.tsx",
        lineNumber: 107,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
ToastDescription.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Description"].displayName;
;
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toaster.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/hooks/use-toast.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toast.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
function Toaster() {
    const { toasts } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useToast"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ToastProvider"], {
        children: [
            toasts.map(function({ id, title, description, action, ...props }) {
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Toast"], {
                    ...props,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid gap-1",
                            children: [
                                title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ToastTitle"], {
                                    children: title
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toaster.tsx",
                                    lineNumber: 22,
                                    columnNumber: 25
                                }, this),
                                description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ToastDescription"], {
                                    children: description
                                }, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toaster.tsx",
                                    lineNumber: 24,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toaster.tsx",
                            lineNumber: 21,
                            columnNumber: 13
                        }, this),
                        action,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ToastClose"], {}, void 0, false, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toaster.tsx",
                            lineNumber: 28,
                            columnNumber: 13
                        }, this)
                    ]
                }, id, true, {
                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toaster.tsx",
                    lineNumber: 20,
                    columnNumber: 11
                }, this);
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ToastViewport"], {}, void 0, false, {
                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toaster.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toaster.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/app/providers.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Providers",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next-themes/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/AuthContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$contexts$2f$DataContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/DataContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$contexts$2f$EntitlementsContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/contexts/EntitlementsContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/tooltip.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/src/components/ui/toaster.tsx [app-ssr] (ecmascript)");
"use client";
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
function Providers({ children }) {
    // Create QueryClient instance in state to ensure it's only created once
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>new __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueryClient"]());
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ThemeProvider"], {
        attribute: "class",
        defaultTheme: "system",
        enableSystem: true,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
            client: queryClient,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthProvider"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$contexts$2f$EntitlementsContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EntitlementsProvider"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$contexts$2f$DataContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DataProvider"], {
                            children: [
                                children,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Toaster"], {}, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/providers.tsx",
                                    lineNumber: 25,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$src$2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Toaster"], {}, void 0, false, {
                                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/providers.tsx",
                                    lineNumber: 26,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/providers.tsx",
                            lineNumber: 23,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/providers.tsx",
                        lineNumber: 22,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/providers.tsx",
                    lineNumber: 21,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/providers.tsx",
                lineNumber: 20,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/providers.tsx",
            lineNumber: 19,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/formify-sales-crm-lovable/nextjs-app/src/app/providers.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e2072437._.js.map