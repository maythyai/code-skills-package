---
name: csp-api-codegen
description: >
  API code generation agent. Generates application code from OpenAPI/Swagger specs
  and TypeSpec definitions. Covers client SDKs, server stubs, validation schemas,
  and API plugin scaffolding. Use for "generate from OpenAPI", "create API from spec",
  "TypeSpec to code".
metadata:
  origin: CSP
  source: awesome-copilot/skills/openapi-to-application-code,typespec-*
  globs: ["**/*.{yaml,yml,json}", "**/openapi*", "**/typespec*"]
---

# API Codegen

Generate application code from API specifications. Two source formats:

| Source           | Use for                                                  |
|------------------|----------------------------------------------------------|
| OpenAPI / Swagger | Existing REST contract → client SDK, server stubs, schemas |
| TypeSpec          | Design-first API definition with rich type system         |

## Workflow

1. **Ingest the spec.**
   - URL, file path, or pasted content.
   - Validate completeness: endpoints, schemas, auth, servers, examples.
2. **Confirm target.** Ask (or infer from repo):
   - Language + framework + version.
   - Client SDK, server stubs, or both?
   - ORM / database? In-memory / mock?
   - Auth method (JWT / OAuth2 / API key / basic)?
3. **Generate.** Follow the relevant reference:
   - OpenAPI → `reference/openapi-codegen.md`
   - TypeSpec → `reference/typespec-patterns.md`
4. **Verify.**
   - Build / compile the generated project.
   - Run the generated tests.
   - Show one example request/response round-trip.
5. **Document.** Produce a README with setup, env vars, run commands, and a link back to the spec.

## Generation Principles

- **Spec is truth.** Do not invent endpoints, fields, or status codes.
- **Separate concerns.** Controllers / handlers, services, models, config.
- **Validate early.** Request validation at the boundary; typed models inside.
- **Error semantics.** Map spec error responses to typed exceptions / result types.
- **No secrets in code.** Read auth credentials from environment variables.
- **Idiomatic output.** Match the target framework's conventions (Spring annotations, FastAPI decorators, Express middleware, etc.).

## OpenAPI-Specific Rules

- Parse the spec fully before emitting any code — resolve `$ref` chains first.
- Respect `nullable`, `required`, `enum`, `minimum`, `maximum`, `pattern` in generated models.
- Group controllers by tag (preferred) or by path prefix.
- Generate both success and error response types for each endpoint.
- Emit pagination helpers when the spec uses `limit` / `offset` / `cursor` patterns.
- Include unit tests for services and contract tests for controllers.

## TypeSpec-Specific Rules

- Use `@typespec/http` + `@typespec/openapi3` as the baseline imports.
- For Microsoft 365 Copilot plugins, add `@microsoft/typespec-m365-copilot`.
- Define operations with `@route` + HTTP verb decorators (`@get`, `@post`, `@patch`, `@delete`).
- Use `@path`, `@query`, `@header`, `@body` for parameter placement.
- Add `@capabilities(confirmation)` for destructive operations.
- Add `@card` + Adaptive Card JSON for rich visual responses.
- Use `@visibility(Lifecycle.Read)` for read-only fields (`id`, `createdAt`).

## Output Structure (OpenAPI)

```
project/
├── README.md
├── [build config: pom.xml, build.gradle, package.json, pyproject.toml, Cargo.toml]
├── src/
│   ├── controllers/     # HTTP handlers, grouped by tag
│   ├── services/        # Business logic
│   ├── models/          # DTOs derived from schemas
│   ├── repositories/    # Data access (if DB)
│   └── config/          # App bootstrap, auth, middleware
├── tests/
│   ├── controllers/
│   └── services/
├── .env.example
└── docker-compose.yml   # optional
```

## Output Structure (TypeSpec)

```
api/
├── main.tsp             # Agent / service definition
├── actions.tsp          # Operations and models
├── cards/               # Adaptive Card JSON (optional)
├── package.json         # TypeSpec compiler + dependencies
└── tspconfig.yaml       # Emitter configuration
```

## Anti-Patterns

- Generating code before the spec is validated — garbage in, garbage out.
- Hardcoding secrets, base URLs, or environment-specific values.
- Treating every field as optional when the spec says `required`.
- Skipping error response types — clients need them to handle failures.
- Emitting controllers with no tests; contract tests catch spec drift early.

## Reference

- `reference/openapi-codegen.md` — OpenAPI → code patterns per language.
- `reference/typespec-patterns.md` — TypeSpec operation, auth, and card recipes.
