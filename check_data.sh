#!/bin/bash
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bW1pb3Nnc25jc3hpZWhreXlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwOTA5MCwiZXhwIjoyMDgyNDg1MDkwfQ.tg3wp9yOp9Odb6yysq4OVtgVO8Bw9vMXI_ZPlXw6DJo"

echo "=== All Event Types ==="
curl -s "https://rwmmiosgsncsxiehkyyd.supabase.co/rest/v1/event_types?select=id,name,slug,company_id" \
  -H "apikey: $ANON_KEY" | python3 -m json.tool

echo -e "\n=== All Companies ==="
curl -s "https://rwmmiosgsncsxiehkyyd.supabase.co/rest/v1/companies?select=id,name,whop_company_id" \
  -H "apikey: $ANON_KEY" | python3 -m json.tool
