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
"[project]/formify-sales-crm-lovable/nextjs-app/src/app/api/dev-auth/callback/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/formify-sales-crm-lovable/nextjs-app/node_modules/next/server.js [app-route] (ecmascript)");
;
async function GET(request) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const returnTo = url.searchParams.get('returnTo') || '/scheduling';
    if (!token) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Missing token'
        }, {
            status: 400
        });
    }
    // Return an HTML page that will set the session client-side
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authenticating...</title>
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
      </head>
      <body>
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
          <div style="text-align: center;">
            <h2>Authenticating...</h2>
            <p>Setting up your session...</p>
          </div>
        </div>
        <script>
          (async () => {
            try {
              const { createClient } = supabase;
              const supabaseClient = createClient(
                '${("TURBOPACK compile-time value", "https://zhutmhzwolidcqkoczuo.supabase.co")}',
                '${("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpodXRtaHp3b2xpZGNxa29jenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzcwNTQsImV4cCI6MjA3NzUxMzA1NH0.8QTSVk1jkkEjX76zGyWp1lodotFBUONQE5iLnzvQi1g")}'
              );

              // Verify the OTP token
              const { data, error } = await supabaseClient.auth.verifyOtp({
                token_hash: '${token}',
                type: 'magiclink'
              });

              if (error) {
                console.error('Auth error:', error);
                alert('Authentication failed: ' + error.message);
                window.location.href = '${returnTo}';
                return;
              }

              console.log('Session created:', data);

              // Redirect to the return URL
              setTimeout(() => {
                window.location.href = '${returnTo}';
              }, 500);
            } catch (e) {
              console.error('Error:', e);
              alert('Authentication failed');
              window.location.href = '${returnTo}';
            }
          })();
        </script>
      </body>
    </html>
  `;
    return new __TURBOPACK__imported__module__$5b$project$5d2f$formify$2d$sales$2d$crm$2d$lovable$2f$nextjs$2d$app$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](html, {
        headers: {
            'Content-Type': 'text/html'
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b944ca7c._.js.map