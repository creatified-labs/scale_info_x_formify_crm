module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/formify-sales-crm-lovable/nextjs-app/src/app/api/dev-auth/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
;
async function GET(request) {
    // Only allow in development
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const supabaseUrl = ("TURBOPACK compile-time value", "https://zhutmhzwolidcqkoczuo.supabase.co");
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceRoleKey) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing Supabase configuration'
            }, {
                status: 500
            });
        }
        // Get the return URL
        const url = new URL(request.url);
        const returnTo = url.searchParams.get('returnTo') || '/scheduling';
        // Create admin client
        const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        const testEmail = 'dev@localhost.test';
        const testOrgId = 'dev-local-test';
        // Find or create company
        let { data: company } = await supabaseAdmin.from('companies').select('id').eq('whop_org_id', testOrgId).maybeSingle();
        if (!company) {
            const { data: newCompany, error: companyError } = await supabaseAdmin.from('companies').insert({
                whop_org_id: testOrgId,
                slug: `dev-local-${Date.now()}`,
                name: 'Local Dev Company',
                plan_id: 'preview',
                booking_slug_prefix: `dev${Date.now()}`.slice(0, 32),
                primary_contact_email: testEmail
            }).select('id').single();
            if (companyError) {
                console.error('Company creation error:', companyError);
                return __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Failed to create company',
                    details: companyError.message
                }, {
                    status: 500
                });
            }
            company = newCompany;
        }
        // Find or create user
        let { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        let user = users.find((u)=>u.email === testEmail);
        if (!user) {
            const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: testEmail,
                email_confirm: true,
                user_metadata: {
                    company_id: company.id,
                    company_name: 'Local Dev Company',
                    whop_org_id: testOrgId,
                    name: 'Local Dev User'
                }
            });
            if (userError) {
                console.error('User creation error:', userError);
                return __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Failed to create user',
                    details: userError.message
                }, {
                    status: 500
                });
            }
            user = newUser.user;
        }
        // Create company member if needed
        const { error: memberError } = await supabaseAdmin.from('company_members').upsert({
            company_id: company.id,
            user_id: user.id,
            role: 'owner'
        }, {
            onConflict: 'company_id,user_id'
        });
        if (memberError) {
            console.error('Member upsert error:', memberError);
        }
        // Set a known password for the dev user
        const devPassword = 'dev-local-password-12345';
        // Update user's password
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: devPassword
        });
        if (passwordError) {
            console.error('Password update error:', passwordError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Failed to set password',
                details: passwordError.message
            }, {
                status: 500
            });
        }
        // Redirect to client-side login page that will sign in with password
        const loginUrl = `${url.origin}/api/dev-auth/login?email=${encodeURIComponent(testEmail)}&password=${encodeURIComponent(devPassword)}&returnTo=${encodeURIComponent(returnTo)}`;
        return __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl);
    } catch (error) {
        console.error('Dev auth error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to authenticate',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__75c43779._.js.map