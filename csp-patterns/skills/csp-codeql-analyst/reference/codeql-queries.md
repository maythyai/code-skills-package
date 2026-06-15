# CodeQL Query Reference

## Query Structure

```ql
/**
 * @name Hardcoded credentials
 * @kind problem
 * @problem.severity error
 * @security-severity 9.8
 * @precision high
 * @tags security external/cwe/cwe-798
 */
import javascript

from StringLiteral pwd, VariableDeclarator decl
where
  decl.getInit() = pwd and
  decl.getName().regexpMatch("(?i)(password|passwd|pwd|secret|api_?key)") and
  pwd.getValue().length() > 4
select decl, "Hardcoded credential '" + decl.getName() + "'"
```

### Metadata Fields

| Field | Values |
|-------|--------|
| `@kind` | `problem` (alert), `path-problem` (data flow), `metric`, `query` |
| `@problem.severity` | `error`, `warning`, `recommendation` |
| `@security-severity` | `0.0`–`10.0` (CVSS-like, shown in GitHub Security tab) |
| `@precision` | `very-high`, `high`, `medium`, `low` |
| `@tags` | `security`, `correctness`, `external/cwe/cwe-XXX` |

## Taint Tracking (Data Flow)

Traces user input from **sources** to **sinks**, flagging unsanitized paths.

```ql
/**
 * @name SQL injection via user input
 * @kind path-problem
 * @problem.severity error
 * @security-severity 9.8
 * @precision high
 * @tags security external/cwe/cwe-089
 */
import javascript
import semmle.javascript.security.DataFlowImpl

module SqlInjectionConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node node) {
    exists(ExpressRouteHandler h | node = h.getARequestParameter())
  }
  predicate isSink(DataFlow::Node node) {
    exists(CallExpr call |
      call.getCallee().(PropAccess).getName() = "query" and
      call.getAnArgument() = node and
      node instanceof AddExpr  // string concat into query
    )
  }
  predicate isBarrier(DataFlow::Node node) {
    node.(CallExpr).getCallee().(PropAccess).getName() = "escape"
    or exists(ParameterizedQuery pq | node = pq.getAnArgument())
  }
}

module SqlInjectionFlow = DataFlow::Global<SqlInjectionConfig>;

from SqlInjectionFlow::PathNode source, SqlInjectionFlow::PathNode sink
where SqlInjectionFlow::flowPath(source, sink)
select sink.getNode(), source, sink,
  "SQL injection: user input from $@ flows to raw query.", source.getNode(), "request param"
```

### Taint Components

| Component | Role | JS/TS Examples |
|-----------|------|----------------|
| **Source** | Untrusted data entry | `req.params`, `req.body`, `req.query` |
| **Sink** | Dangerous operation | `db.query(string)`, `exec()`, `eval()` |
| **Barrier** | Stops the flow | `escape()`, parameterized query, `DOMPurify` |

### Language Sources and Sinks Quick Ref

**Python:** `request.args`/`request.form` → `cursor.execute(str)`/`os.system()`/`eval()`
**Java:** `@RequestParam`/`HttpServletRequest.getParameter()` → `Statement.execute()`/`Runtime.exec()`
**Go:** `r.FormValue()`/`r.URL.Query()` → `db.Query(str)`/`exec.Command()`/`template.HTML()`

## Common Query Patterns

### Insecure Cryptography

```ql
import javascript

from CallExpr call, string funcName
where
  call.getCallee().(PropAccess).getName() = funcName and
  (funcName = "createHash" and
   call.getArgument(0).(StringLiteral).getValue().regexpMatch("(?i)(md5|sha1)")
   or funcName = "createCipher")
select call, "Insecure crypto: " + funcName
```

### SSRF Detection

```ql
import javascript

from CallExpr fetchCall, DataFlow::Node urlNode
where
  fetchCall.getCallee().getName() = "fetch" and
  urlNode.asExpr() = fetchCall.getArgument(0) and
  exists(Expr source |
    source.(PropAccess).getName().regexpMatch("url|endpoint|href") and
    DataFlow::localFlow(source, urlNode))
select fetchCall, "Potential SSRF: user-controlled URL passed to fetch()"
```

### Missing Auth Check

```ql
import javascript

from Function handler, string routePath
where
  exists(ExpressRouteSetup s |
    s.getRoutePath() = routePath and s.getHandler() = handler) and
  routePath.regexpMatch("(?i)(admin|delete|update|create|user)") and
  not exists(CallExpr mw |
    mw.getAnArgument() = handler.getAParameter() and
    mw.getCallee().getName().regexpMatch("(?i)(auth|require|protect|verify)"))
select handler, "Sensitive route '" + routePath + "' may lack auth middleware"
```

## Custom Query Packs

### Pack Setup

```bash
codeql pack init my-org/security-queries   # creates qlpack.yml
codeql pack install                         # install dependencies
codeql pack publish                         # publish to GHCR
```

**qlpack.yml:**
```yaml
name: my-org/security-queries
version: 1.0.0
dependencies:
  codeql/javascript-all: "^4.0.0"
```

### Using in GitHub Actions

```yaml
- uses: github/codeql-action/init@v4
  with:
    packs: |
      my-org/security-queries@1.0.0
```

## Monorepo Configuration

```yaml
# .github/codeql/codeql-config.yml
paths:
  - apps/frontend/src
  - apps/backend/src
paths-ignore:
  - "**/node_modules/**"
  - "**/test/**"
queries:
  - uses: security-extended
```

Use `category` to separate SARIF results per component:
```yaml
- uses: github/codeql-action/analyze@v4
  with:
    category: "/language:${{ matrix.language }}/component:frontend"
```

## SARIF Output Reference

| Field | Meaning |
|-------|---------|
| `ruleId` | Query ID (e.g., `js/sql-injection`) |
| `message.text` | Human-readable description |
| `locations[].physicalLocation` | File, startLine, startColumn |
| `codeFlows[].threadFlows[]` | Step-by-step data flow (for path-problem queries) |
| `properties.security-severity` | CVSS score (0.0–10.0) |
| `fingerprints` | Unique IDs for deduplication |

**Example:** `ruleId: js/sql-injection`, `security-severity: 9.8` → Critical SQL injection.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Resource not accessible` | Add `security-events: write` permission |
| Autobuild fails | Switch to `build-mode: manual` |
| No source code seen | Verify `--source-root` and language ID |
| SARIF upload fails | Check 10 MB limit and token permissions |
| Out of memory | Use larger runner or reduce `paths` scope |

| Codebase Size | RAM | CPU | Disk |
|---------------|-----|-----|------|
| <100K LOC | 8 GB | 2 cores | 14 GB SSD |
| 100K–1M LOC | 16 GB | 4–8 cores | 14 GB SSD |
| >1M LOC | 64 GB | 8 cores | 14 GB SSD |
