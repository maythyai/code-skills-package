#!/usr/bin/env bash
set -e

echo "=== SWE-bench Evaluation Environment ==="
echo "Run Mode: ${RUN_MODE:-vanilla}"
echo "Claude Code version: $(claude --version 2>/dev/null || echo 'not installed')"

# Configure Claude Code if auth token is provided
if [ -n "$ANTHROPIC_AUTH_TOKEN" ]; then
    echo "Anthropic auth token configured"
    export ANTHROPIC_AUTH_TOKEN="$ANTHROPIC_AUTH_TOKEN"
else
    echo "WARNING: ANTHROPIC_AUTH_TOKEN not set"
fi

# Configure custom base URL if provided
if [ -n "$ANTHROPIC_BASE_URL" ]; then
    echo "Using custom Anthropic base URL: $ANTHROPIC_BASE_URL"
    export ANTHROPIC_BASE_URL="$ANTHROPIC_BASE_URL"
fi

# Install CSP if in csp mode
if [ "$RUN_MODE" = "csp" ]; then
    echo "Installing code-skills-package for enhanced mode..."

    # Check if CSP source is mounted
    if [ -d "/workspace/csp-source" ]; then
        echo "Installing CSP from mounted source..."
        cd /workspace/csp-source && npm install && npm link
    else
        echo "Installing CSP from npm..."
        npm install -g code-skills-package
    fi

    # Initialize CSP configuration
    mkdir -p ~/.claude

    echo "CSP installation complete"
fi

# Execute the command passed to the container
exec "$@"
