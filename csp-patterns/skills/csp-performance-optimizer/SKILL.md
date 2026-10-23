---
name: csp-performance-optimizer
description: Performance optimization specialist for identifying bottlenecks, improving efficiency, and reducing resource consumption. Use when optimizing code or investigating performance issues.
layer: 3
category: patterns
phase: build
domain: quality
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
anti_rationalizations:
  "Premature optimization is the root of all evil": "But so is premature pessimism. Profile first."
  "This is fast enough": "Fast enough today may not be fast enough tomorrow. Think scale."
---

# Performance Optimizer

Systematic performance improvement:
1. Measure before optimizing (profile, don't guess)
2. Focus on hot paths (80/20 rule)
3. Optimize algorithms before micro-optimizations
4. Consider memory vs CPU tradeoffs
5. Verify improvements with benchmarks

## Memory Leak Debugging

Use when the user reports high memory usage, OOM crashes, or memory that grows with uptime.
First isolate the side: browser (client) vs Node.js/server. The fix differs; the method doesn't.

### Three-Snapshot Method

1. **Baseline** — heap snapshot in the initial state
2. **Target** — snapshot after the suspected action
3. **Revert** — snapshot after returning to the initial state (undo the action)

The leak is confirmed when Target grows and Revert does NOT return to Baseline. Amplify
weak leaks by repeating the action ~10 times before snapshotting.

Capture options:
- Browser: DevTools Memory tab; CDP `HeapProfiler.takeHeapSnapshot`
- Node: `v8.writeHeapSnapshot()` at checkpoints; `node --inspect` + Memory profiler; sample `process.memoryUsage()` (heapUsed + external) over time for the trend

### Analyze by Comparison, Not Inspection

- Compare snapshot 1 vs 2: sort classes by count/size growth, drill into the top offenders
- For each offender, inspect the **retainer chain** — what keeps it reachable — before changing code
- Check the **dominator tree** to see what a large subtree is anchored to
- Never read raw `.heapsnapshot` files as text; use tooling summaries/diffs

### Common Culprits

| Culprit | Symptom | Fix |
|---------|---------|-----|
| Detached DOM nodes | Nodes removed but retained (cached, referenced) | Null references; ask before clearing — some are intentional caches |
| Event listeners not removed | `addEventListener` without matching removal | `removeEventListener` / `AbortController` / framework cleanup |
| Growing caches/maps | Cache keys accumulate forever | TTL/LRU bounds (e.g. max 256 entries), WeakMap/WeakRef where appropriate |
| Closures capturing context | Retired objects alive via closures | Release references on teardown |
| Global variables | Accidental globals, module-level accumulators | Scope down; reset on lifecycle events |
| Timers/intervals not cleared | `setInterval` keeps callbacks + scope alive | `clearInterval` on unmount/dispose |
| Console retention | Objects logged in devtools stay reachable | Remove debug logging (esp. in Node) |
| Abandoned promises | Pending promise chains pin state | Resolve/reject on teardown paths |

Power-of-two default: cap caches at 256 entries unless a measured reason says otherwise.

### Node OOM Diagnosis

- Distinguish heap growth (leak) from burst (legit peak): sample RSS/heapUsed over minutes; a monotonic sawtooth that never returns to baseline = leak
- Raising `--max-old-space-size` only delays the crash; fix the leak first, size the heap second
- Watch `external` memory (Buffers, native) separately — it bypasses the JS heap limit

### Verify the Fix

After patching, re-run the three-snapshot cycle: Revert must return to Baseline. A fix
without a verified return-to-baseline is unproven.
