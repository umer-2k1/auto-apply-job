#!/usr/bin/env bash
# Fetch recent Gmail (verification/security codes) via the One CLI.
# Usage: scripts/one-gmail-code.sh ["gmail query"] [numberOfEmails]
#   e.g. scripts/one-gmail-code.sh "subject:(security code) newer_than:2d" 5
#   e.g. scripts/one-gmail-code.sh "from:greenhouse newer_than:1d" 5
set -euo pipefail

ONE="${ONE_BIN:-$HOME/.nvm/versions/node/v22.23.1/bin/one}"
KEY="${ONE_GMAIL_KEY:-live::gmail::default::3e1ab628917349c4af987d5a4ddb6f80}"
ACTION="conn_mod_def::GGSNOTZxFUU::ZWXBuJboTpS3Q_U06pF8gA"   # Gmail "Get Emails"
QUERY="${1:-subject:(security code) newer_than:2d}"
N="${2:-5}"

"$ONE" --agent actions execute gmail "$ACTION" "$KEY" \
  -d "{\"connectionKey\":\"$KEY\",\"numberOfEmails\":$N,\"query\":\"$QUERY\",\"format\":\"full\"}"
