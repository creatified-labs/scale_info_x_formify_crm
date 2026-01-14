#!/bin/bash

# Script to apply the booking sync migration to Supabase
# This will sync all bookings to call_logs and populate analytics tables

set -e

echo "🚀 Applying booking sync migration..."

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if we have the necessary environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: SUPABASE_DB_URL not found in .env.local"
  echo "Please add it to your .env.local file"
  exit 1
fi

# Apply the migration using psql
echo "Connecting to database..."
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260114000000_sync_bookings_to_call_logs.sql

echo "✅ Migration applied successfully!"
echo ""
echo "Next steps:"
echo "1. Check your dashboard to verify bookings are synced"
echo "2. Verify tenant_totals and tenant_daily_call_stats are populated"
echo "3. Test the analytics display in your app"
