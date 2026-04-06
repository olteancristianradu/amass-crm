#!/bin/bash
export PATH="/opt/homebrew/bin:$PATH"
cd /Users/cristian-radu/Documents/amass-crm
exec pnpm --filter @amass/web dev
