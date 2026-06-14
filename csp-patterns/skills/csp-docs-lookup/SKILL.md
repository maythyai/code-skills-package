---
name: csp-docs-lookup
description: >
  Fetch up-to-date library and framework docs via Context7 MCP instead of training data.
  Use for setup questions, API references, code examples, or when the user names a framework.
  Combines skill methodology with agent execution capability.
csp-layer: 4-patterns
csp-source: merged(CSP)
---

# Docs Lookup

Fetch current documentation via Context7 MCP instead of relying on training data. Combines the lookup methodology with the agent execution capability in one unified skill.

## When to Use

- Asks setup or configuration questions ("How do I configure Next.js middleware?")
- Requests code depending on a library ("Write a Prisma query for...")
- Needs API or reference information ("What are the Supabase auth methods?")
- Mentions specific frameworks or libraries (React, Vue, Svelte, Express, Tailwind, Prisma, Supabase, etc.)
- User asks how to use a library, framework, or API
- Needs up-to-date code examples

Use whenever the request depends on accurate, up-to-date behavior of a library, framework, or API.

## Core Concepts

- **Context7**: MCP server that exposes live documentation
- **resolve-library-id**: Returns Context7-compatible library IDs (e.g. `/vercel/next.js`) from a library name and query
- **query-docs**: Fetches documentation and code snippets for a given library ID and question

## Process

### Step 1: Resolve the Library ID

Call **resolve-library-id** with:
- **libraryName**: The library or product name from the user's question
- **query**: The user's full question (improves relevance ranking)

Select the best match using:
- **Name match**: Prefer exact or closest match
- **Benchmark score**: Higher = better quality (100 is highest)
- **Source reputation**: Prefer High or Medium reputation
- **Version**: If user specified a version, prefer version-specific library ID

### Step 2: Fetch the Documentation

Call **query-docs** with:
- **libraryId**: The selected Context7 library ID (e.g. `/vercel/next.js`)
- **query**: The user's specific question or task (be specific for relevant snippets)

**Limit:** Do not call query-docs (or resolve-library-id) more than 3 times per question. If unclear after 3 calls, state the uncertainty.

### Step 3: Use the Documentation

- Answer using the fetched, current information
- Include relevant code examples from the docs
- Cite the library or version when it matters

## Examples

### Next.js middleware
1. resolve-library-id: `libraryName: "Next.js"`, `query: "How do I set up Next.js middleware?"`
2. Pick best match (e.g. `/vercel/next.js`)
3. query-docs: `libraryId: "/vercel/next.js"`, same query
4. Answer with minimal `middleware.ts` example from docs

### Prisma query with relations
1. resolve-library-id: `libraryName: "Prisma"`, `query: "How do I query with relations?"`
2. Select official Prisma library ID
3. query-docs with that ID
4. Return Prisma Client pattern (`include` or `select`) with code snippet

### Supabase auth methods
1. resolve-library-id: `libraryName: "Supabase"`
2. Pick Supabase docs library ID
3. query-docs
4. Summarize auth methods with minimal examples

## Best Practices

- **Be specific**: Use the user's full question as the query for better relevance
- **Version awareness**: Use version-specific library IDs when users mention versions
- **Prefer official sources**: Prefer official packages over community forks
- **No sensitive data**: Redact API keys, passwords, tokens from any query sent to Context7
- **Return answers with examples**: Always include code snippets from the fetched docs
