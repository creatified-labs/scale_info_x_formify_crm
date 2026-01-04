"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function TestAuthPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [session, setSession] = useState<any>(null);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    async function runTest() {
      addLog('🔍 Starting authentication diagnostics...');

      // Test 1: Check hostname
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      addLog(`Hostname: ${hostname} (isLocalhost: ${isLocalhost})`);

      // Test 2: Check existing session
      addLog('Checking for existing session...');
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        addLog(`✅ Session exists! User: ${existingSession.user.email}`);
        addLog(`Metadata: ${JSON.stringify(existingSession.user.user_metadata)}`);
        setSession(existingSession);
      } else {
        addLog('❌ No existing session');
      }

      // Test 3: Try dev-auth
      if (isLocalhost) {
        addLog('🔄 Calling /api/dev-auth...');
        try {
          const response = await fetch('/api/dev-auth?api=true');
          addLog(`Response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            addLog(`✅ Dev-auth response: ${JSON.stringify(data)}`);

            if (data.session_url) {
              addLog('Extracting token from session URL...');
              const url = new URL(data.session_url);
              const token = url.searchParams.get('token');
              addLog(`Token: ${token?.substring(0, 20)}...`);

              addLog('Verifying OTP...');
              const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: token!,
                type: 'magiclink',
              });

              if (verifyError) {
                addLog(`❌ Verify error: ${verifyError.message}`);
              } else {
                addLog('✅ OTP verified successfully!');
                addLog('Refreshing session...');
                await supabase.auth.refreshSession();
                const { data: { session: newSession } } = await supabase.auth.getSession();
                addLog(`✅ New session created! User: ${newSession?.user?.email}`);
                addLog(`Metadata: ${JSON.stringify(newSession?.user?.user_metadata)}`);
                setSession(newSession);
              }
            }
          } else {
            const errorText = await response.text();
            addLog(`❌ Dev-auth failed: ${errorText}`);
          }
        } catch (error: any) {
          addLog(`❌ Error: ${error.message}`);
        }
      }

      addLog('✅ Diagnostics complete!');
    }

    runTest();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🔐 Authentication Diagnostics</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Session Status:</h2>
        {session ? (
          <div className="bg-green-900 p-4 rounded">
            <p>✅ Authenticated as: {session.user.email}</p>
            <p>Company ID: {session.user.user_metadata?.company_id || '❌ Missing'}</p>
          </div>
        ) : (
          <div className="bg-red-900 p-4 rounded">
            <p>❌ Not authenticated</p>
          </div>
        )}
      </div>

      <div className="bg-gray-900 p-4 rounded font-mono text-sm">
        <h2 className="text-xl font-semibold mb-4">Console Logs:</h2>
        {logs.map((log, i) => (
          <div key={i} className="mb-1">{log}</div>
        ))}
      </div>
    </div>
  );
}
