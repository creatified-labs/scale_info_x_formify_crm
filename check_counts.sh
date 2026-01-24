#!/bin/bash
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bW1pb3Nnc25jc3hpZWhreXlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwOTA5MCwiZXhwIjoyMDgyNDg1MDkwfQ.tg3wp9yOp9Odb6yysq4OVtgVO8Bw9vMXI_ZPlXw6DJo"

echo "=== Count of Event Types ==="
curl -s "https://rwmmiosgsncsxiehkyyd.supabase.co/rest/v1/event_types?select=*&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Prefer: count=exact" \
  -I | grep -i "content-range"

echo -e "\n=== Count of Bookings ==="
curl -s "https://rwmmiosgsncsxiehkyyd.supabase.co/rest/v1/bookings?select=*&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Prefer: count=exact" \
  -I | grep -i "content-range"

echo -e "\n=== Sample Event Types (if any exist) ==="
curl -s "https://rwmmiosgsncsxiehkyyd.supabase.co/rest/v1/event_types?select=id,name,company_id,user_id,is_archived&limit=5" \
  -H "apikey: $ANON_KEY" | python3 -m json.tool
