---
name: cpp-coding-standards
description: C++ coding standards based on the C++ Core Guidelines (isocpp.github.io). Use when writing, reviewing, or refactoring C++ code to enforce modern, safe, and idiomatic practices.
origin: CSP
layer: 4
category: patterns
---

# C++ Coding Standards (C++ Core Guidelines)

Comprehensive coding standards for modern C++ (C++17/20/23) derived from the [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines). Enforces type safety, resource safety, immutability, and clarity.

## When to Use

- Writing new C++ code (classes, functions, templates)
- Reviewing or refactoring existing C++ code
- Making architectural decisions in C++ projects
- Enforcing consistent style across a C++ codebase
- Choosing between language features (e.g., `enum` vs `enum class`, raw pointer vs smart pointer)

### When NOT to Use

- Non-C++ projects
- Legacy C codebases that cannot adopt modern C++ features
- Embedded/bare-metal contexts where specific guidelines conflict with hardware constraints (adapt selectively)

## Cross-Cutting Principles

These themes recur across the entire guidelines and form the foundation:

1. **RAII everywhere** (P.8, R.1, E.6, CP.20): Bind resource lifetime to object lifetime
2. **Immutability by default** (P.10, Con.1-5, ES.25): Start with `const`/`constexpr`; mutability is the exception
3. **Type safety** (P.4, I.4, ES.46-49, Enum.3): Use the type system to prevent errors at compile time
4. **Express intent** (P.3, F.1, NL.1-2, T.10): Names, types, and concepts should communicate purpose
5. **Minimize complexity** (F.2-3, ES.5, Per.4-5): Simple code is correct code
6. **Value semantics over pointer semantics** (C.10, R.3-5, F.20, CP.31): Prefer returning by value and scoped objects

## Quick Reference Checklist

Before marking C++ work complete:

- [ ] No raw `new`/`delete` -- use smart pointers or RAII (R.11)
- [ ] Objects initialized at declaration (ES.20)
- [ ] Variables are `const`/`constexpr` by default (Con.1, ES.25)
- [ ] Member functions are `const` where possible (Con.2)
- [ ] `enum class` instead of plain `enum` (Enum.3)
- [ ] `nullptr` instead of `0`/`NULL` (ES.47)
- [ ] No narrowing conversions (ES.46)
- [ ] No C-style casts (ES.48)
- [ ] Single-argument constructors are `explicit` (C.46)
- [ ] Rule of Zero or Rule of Five applied (C.20, C.21)
- [ ] Base class destructors are public virtual or protected non-virtual (C.35)
- [ ] Templates are constrained with concepts (T.10)
- [ ] No `using namespace` in headers at global scope (SF.7)
- [ ] Headers have include guards and are self-contained (SF.8, SF.11)
- [ ] Locks use RAII (`scoped_lock`/`lock_guard`) (CP.20)
- [ ] Exceptions are custom types, thrown by value, caught by reference (E.14, E.15)
- [ ] `'\n'` instead of `std::endl` (SL.io.50)
- [ ] No magic numbers (ES.45)

## References

- [references/memory-safety-rules.md](references/memory-safety-rules.md) — RAII, smart pointers, Rule of Zero/Five, class hierarchy rules
- [references/modern-cpp-idioms.md](references/modern-cpp-idioms.md) — Functions, expressions, error handling, templates, standard library, enumerations, naming, performance
- [references/concurrency-rules.md](references/concurrency-rules.md) — Thread safety, RAII locks, scoped_lock, condition variables, anti-patterns
