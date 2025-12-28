"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as callsRepo from "@/lib/repo/calls";

interface MigrationResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export const MigrationTool = () => {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const migrateLocalStorageCalls = async () => {
    setMigrating(true);
    setResult(null);

    try {
      const storedCalls = localStorage.getItem('calls');
      
      if (!storedCalls) {
        toast.info('No legacy calls found in localStorage');
        setResult({ imported: 0, skipped: 0, errors: ['No data found'] });
        setMigrating(false);
        return;
      }

      const calls = JSON.parse(storedCalls);
      
      if (!Array.isArray(calls) || calls.length === 0) {
        toast.info('No calls to migrate');
        setResult({ imported: 0, skipped: 0, errors: ['No valid calls found'] });
        setMigrating(false);
        return;
      }

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const call of calls) {
        try {
          // Generate idempotent key
          const idempotentKey = `legacy-${call.id || call.clientName}-${call.date}-${call.time}`;
          
          // Check if already migrated (by checking if a call exists with same client, date, time)
          const existingCalls = await callsRepo.listCalls({
            dateFrom: call.date,
            dateTo: call.date,
          });

          const exists = existingCalls.some(
            (existing: any) => 
              existing.client_name === call.clientName &&
              existing.start_utc.split('T')[0] === call.date &&
              new Date(existing.start_utc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) === call.time
          );

          if (exists) {
            skipped++;
            continue;
          }

          // Import the call
          await callsRepo.createCall({
            clientName: call.clientName,
            clientEmail: call.email,
            clientPhone: call.phone,
            date: call.date,
            time: call.time,
            duration: call.duration || 30,
            status: call.status || 'scheduled',
            notes: call.notes,
            conversionAmount: call.isConverted ? (call.conversionAmount || 0) : 0,
          });

          imported++;
        } catch (error: any) {
          console.error('Error importing call:', error);
          errors.push(`${call.clientName}: ${error.message}`);
          skipped++;
        }
      }

      setResult({ imported, skipped, errors });

      if (imported > 0) {
        // Mark migration as completed
        localStorage.setItem('calls_migration_completed', new Date().toISOString());
        
        // Clear the old localStorage calls
        localStorage.removeItem('calls');
        
        toast.success(`Migration complete! Imported ${imported} calls`);
      } else {
        toast.info('No new calls were imported');
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(error.message || 'Migration failed');
      setResult({ imported: 0, skipped: 0, errors: [error.message] });
    } finally {
      setMigrating(false);
    }
  };

  const migrationCompleted = typeof window !== 'undefined' ? localStorage.getItem('calls_migration_completed') : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Legacy Data Migration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {migrationCompleted ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Migration completed on {new Date(migrationCompleted).toLocaleString()}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This tool will import legacy calls from localStorage into Supabase.
                This is a one-time operation. Existing calls will be skipped to avoid duplicates.
              </AlertDescription>
            </Alert>

            <Button
              onClick={migrateLocalStorageCalls}
              disabled={migrating}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {migrating ? 'Migrating...' : 'Import Legacy Calls'}
            </Button>
          </>
        )}

        {result && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Imported: {result.imported}</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="w-4 h-4" />
              <span>Skipped: {result.skipped}</span>
            </div>
            {result.errors.length > 0 && (
              <div className="flex items-start gap-2 text-red-600">
                <XCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <div>Errors: {result.errors.length}</div>
                  <ul className="list-disc list-inside text-xs mt-1">
                    {result.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>... and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
