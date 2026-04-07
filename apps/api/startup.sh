#!/bin/sh
# Startup script for AMASS CRM API
# Validates environment configuration and runs database migrations before starting the app

set -e  # Exit on any error

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${GREEN}[Startup] Starting AMASS CRM API...${NC}"
echo ""

# Determine if DATABASE_URL is set
if [ -z "${DATABASE_URL}" ]; then
  echo "${RED}[Startup] ERROR: DATABASE_URL is not set${NC}"
  echo ""
  echo "DATABASE_URL is REQUIRED to run this application."
  echo ""
  echo "On Railway: Add database.postgres plugin to your project, which will"
  echo "automatically set the DATABASE_URL environment variable."
  echo ""
  echo "Locally: Set DATABASE_URL in your .env file:"
  echo "  DATABASE_URL='postgresql://user:password@localhost:5432/amass_crm'"
  echo ""
  exit 1
fi

echo "${GREEN}[Startup] ✓ DATABASE_URL is set${NC}"

# Validate DATABASE_URL format (should start with postgres:// or postgresql://)
if ! echo "${DATABASE_URL}" | grep -E '^postgres(ql)?://' > /dev/null; then
  echo "${RED}[Startup] ERROR: DATABASE_URL format is invalid${NC}"
  echo ""
  echo "DATABASE_URL must be a valid PostgreSQL connection string."
  echo "Expected format: postgresql://user:password@host:port/dbname"
  echo "Provided value starts with: $(echo ${DATABASE_URL} | cut -c1-50)..."
  echo ""
  exit 1
fi

echo "${GREEN}[Startup] ✓ DATABASE_URL format is valid${NC}"
echo ""

# Run Prisma migrations
echo "${YELLOW}[Startup] Running database migrations...${NC}"
if npx prisma migrate deploy; then
  echo "${GREEN}[Startup] ✓ Database migrations completed successfully${NC}"
else
  # If migrations fail, log it but continue (might be first run or schema issues)
  echo "${YELLOW}[Startup] ⚠ Database migrations failed or skipped${NC}"
  echo "The application will attempt to start anyway. Check database connectivity."
fi

echo ""
echo "${GREEN}[Startup] Configuration validated. Starting server...${NC}"
echo ""

# Start the Node.js application
exec node dist/index.js
