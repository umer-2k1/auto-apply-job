#!/usr/bin/env bash
# Fetch recent Gmail (verification/security codes) via the One CLI.
# Usage: scripts/one-gmail-code.sh ["gmail query"] [numberOfEmails]
#   e.g. scripts/one-gmail-code.sh "subject:(security code) newer_than:2d" 5
#   e.g. scripts/one-gmail-code.sh "from:greenhouse newer_than:1d" 5
#
# The Gmail connection key is resolved at RUNTIME from `one --agent list`
# (or ONE_GMAIL_KEY if you export it). It is never stored in this repo.
set -euo pipefail

# `one` is a Node script; ensure node (nvm) is on PATH for its shebang.
export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"

ONE="${ONE_BIN:-$HOME/.nvm/versions/node/v22.23.1/bin/one}"
ACTION="conn_mod_def::GGSNOTZxFUU::ZWXBuJboTpS3Q_U06pF8gA"   # Gmail "Get Emails"
QUERY="${1:-subject:(security code) newer_than:2d}"
N="${2:-5}"

KEY="${ONE_GMAIL_KEY:-}"
if [ -z "$KEY" ]; then
  KEY="$("$ONE" --agent list 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const g=(j.connections||[]).find(c=>c.platform==='gmail');if(g)process.stdout.write(g.key)}catch(e){}})" 2>/dev/null || true)"
fi
if [ -z "$KEY" ]; then
  echo "Could not resolve a Gmail connection key. Run: one --agent list" >&2
  exit 1
fi

"$ONE" --agent actions execute gmail "$ACTION" "$KEY" \
  -d "{\"connectionKey\":\"$KEY\",\"numberOfEmails\":$N,\"query\":\"$QUERY\",\"format\":\"full\"}"
