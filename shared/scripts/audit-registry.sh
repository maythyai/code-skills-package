#!/bin/bash
# audit-registry.sh — Wrapper to call audit-registry.js
cd "$(dirname "$0")/../.."
node shared/scripts/audit-registry.js "$@"
