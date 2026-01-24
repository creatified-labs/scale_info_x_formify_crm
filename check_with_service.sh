#!/bin/bash
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bW1pb3Nnc25jc3hpZWhreXlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwOTA5MCwiZXhwIjoyMDgyNDg1MDkwfQ.tg3wp9yOp9Odb6yysq4OVtgVO8Bw9vMXI_ZPlXw6DJo"

echo "=== Event Types (with service role, should bypass RLS) ==="
curl -s "https://rwmmiosgsncsxiehkyyd.supabase.co/rest/v1/event_types?select=id,name,company_id,user_id" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | python3 -m json.tool

echo -e "\n=== Count with Prefer header ==="
curl -s "https://rwmmiosgsncsxiehkyyd.supabase.co/rest/v1/event_types?select=id" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Prefer: count=exact" \
  -I 2>&1 | grep -i "content-range"
