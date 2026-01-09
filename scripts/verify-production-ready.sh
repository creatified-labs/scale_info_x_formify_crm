#!/bin/bash
# Production Readiness Verification Script
# Run this before deploying to production

set -e

echo "🔍 Verifying production readiness..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Mock data seeding is disabled (check for actual function calls, not comments)
echo "📋 Checking mock data seeding..."
if grep -v "^\s*//" src/contexts/AuthContext.tsx | grep -q "^\s*seedMockData()"; then
  echo -e "${RED}❌ FAIL: seedMockData() is still being called in AuthContext${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ PASS: Mock data seeding is disabled${NC}"
fi
echo ""

# Check 2: No hardcoded Supabase fallbacks in next.config.ts
echo "📋 Checking next.config.ts..."
if grep -q "zhutmhzwolidcqkoczuo" next.config.ts; then
  echo -e "${RED}❌ FAIL: Old Supabase instance hardcoded in next.config.ts${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ PASS: No hardcoded Supabase fallbacks${NC}"
fi
echo ""

# Check 3: Production environment check in whop-session
echo "📋 Checking whop-session route..."
if grep -q "isDevelopment = process.env.NODE_ENV === 'development'" src/app/api/whop-session/route.ts; then
  echo -e "${GREEN}✅ PASS: Production environment check exists${NC}"
else
  echo -e "${RED}❌ FAIL: Missing production environment check in whop-session${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Error handling exists
echo "📋 Checking error handling..."
if grep -q "toast({" src/contexts/AuthContext.tsx && grep -q "Bootstrap failed" src/contexts/AuthContext.tsx; then
  echo -e "${GREEN}✅ PASS: Error toasts are configured${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: Error handling may be incomplete${NC}"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 5: Verify .env.local has warning comments
echo "📋 Checking .env.local documentation..."
if grep -q "WARNING.*Remove or leave empty in production" .env.local; then
  echo -e "${GREEN}✅ PASS: .env.local has production warnings${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: .env.local missing production warnings${NC}"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 6: Dev-auth is protected
echo "📋 Checking dev-auth protection..."
if grep -q "NODE_ENV !== 'development'" src/app/api/dev-auth-v2/route.ts; then
  echo -e "${GREEN}✅ PASS: Dev-auth routes are protected${NC}"
else
  echo -e "${RED}❌ FAIL: Dev-auth routes not properly protected${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 7: Verify required env vars are documented
echo "📋 Checking documentation..."
if [ -f "PRODUCTION_CHECKLIST.md" ] && [ -f "BOOTSTRAP_FIXES_SUMMARY.md" ]; then
  echo -e "${GREEN}✅ PASS: Production documentation exists${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: Missing production documentation${NC}"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
  echo ""
  echo "Your app is ready for production deployment! 🚀"
  echo ""
  echo "Next steps:"
  echo "1. Review PRODUCTION_CHECKLIST.md"
  echo "2. Update Vercel environment variables"
  echo "3. Deploy to production"
  echo "4. Test with a fresh Whop installation"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  WARNINGS: $WARNINGS${NC}"
  echo ""
  echo "You have warnings but no critical errors."
  echo "Review the warnings above before deploying."
  exit 0
else
  echo -e "${RED}❌ ERRORS: $ERRORS${NC}"
  echo -e "${YELLOW}⚠️  WARNINGS: $WARNINGS${NC}"
  echo ""
  echo "You have critical errors that must be fixed before production deployment!"
  echo "Review the errors above and fix them."
  exit 1
fi
