---
name: csp-typescript-patterns
description: >
  TypeScript-specific design patterns and best practices for TypeScript 5.x:
  the type system (generics, conditional types, `infer`, mapped types, template
  literal types), `type` vs `interface`, discriminated unions, the `satisfies`
  operator, strict mode and key tsconfig options, ESM vs CJS, type guards and
  assertion functions, utility types, Result-style error handling, avoiding
  `any` in favour of `unknown`, module organization, and common anti-patterns.
  Use when writing, reviewing, or refactoring TypeScript code to apply
  type-safe, idiomatic patterns.
metadata:
  origin: CSP
  globs: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
layer: 4
category: patterns
phase: build
domain: language
---

# TypeScript Patterns

> This skill provides comprehensive TypeScript patterns for TypeScript 5.x,
> emphasizing the type system as a design tool rather than an afterthought.

## The Type System

TypeScript's value comes from modeling your domain precisely. Make illegal
states unrepresentable instead of validating them at runtime.

### Generics

Generics let functions and types work over many shapes while preserving
type information. Constrain type parameters with `extends`:

```typescript
// Unconstrained — works for anything
function identity<T>(value: T): T {
  return value;
}

// Constrained — T must have a `length`
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("alpha", "be"); // string
longest([1, 2, 3], [4]); // number[]

// Default type parameters
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}
```

### Conditional Types and `infer`

Conditional types branch on type relationships. `infer` captures a type from
within a match:

```typescript
// Extract the element type of an array
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type N = ElementOf<number[]>; // number

// Extract the resolved value of a Promise
type Awaited2<T> = T extends Promise<infer U> ? U : T;
type R = Awaited2<Promise<string>>; // string

// Extract function return type (how the built-in ReturnType works)
type MyReturnType<F> = F extends (...args: never[]) => infer R ? R : never;
type X = MyReturnType<() => boolean>; // boolean
```

### Mapped Types

Transform every property of a type. Combine with key remapping (`as`) for
powerful derivations:

```typescript
// Make every property nullable
type Nullable<T> = { [K in keyof T]: T[K] | null };

// Build getter names from property names (template literal in key position)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
  name: string;
  age: number;
}

type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }

// Strip readonly and optionality modifiers
type Mutable<T> = { -readonly [K in keyof T]-?: T[K] };
```

### Template Literal Types

Compose string literal types to model identifiers, routes, and events:

```typescript
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type Route = `/api/${string}`;
type Endpoint = `${HttpMethod} ${Route}`;

const ok: Endpoint = "GET /api/users"; // valid
// const bad: Endpoint = "FETCH /users"; // type error

// Event maps
type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventName<"click">; // "onClick"
```

## `type` vs `interface`

Both describe object shapes. Prefer `interface` for public object/class
contracts that may be extended or merged; prefer `type` for unions,
intersections, mapped types, and aliases of non-object types.

```typescript
// interface — extendable, supports declaration merging
interface Animal {
  name: string;
}
interface Animal {
  legs: number; // merges with the declaration above
}

// type — required for unions and computed types
type Result = Success | Failure;
type Id = string | number;
type Pair<T> = [T, T];
```

Guideline: reach for `interface` first for object models; switch to `type`
the moment you need a union, tuple, or mapped/conditional construct.

## Discriminated Unions

A shared literal "tag" property lets the compiler narrow exhaustively. This is
the single most useful pattern for modeling state.

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return (shape.base * shape.height) / 2;
    default:
      // Exhaustiveness check: if a new kind is added and not handled,
      // this assignment fails to compile.
      return assertNever(shape);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
```

## The `satisfies` Operator

`satisfies` validates that a value conforms to a type **without widening** its
inferred type. Use it instead of a type annotation when you want to keep the
narrow literal types.

```typescript
type Config = Record<string, string | number>;

// With annotation: `port` widens to string | number
const a: Config = { host: "localhost", port: 8080 };
// a.port -> string | number

// With satisfies: validated, but literal types preserved
const b = {
  host: "localhost",
  port: 8080,
} satisfies Config;
// b.port -> number (still narrow), b.host -> string

const routes = {
  home: "/",
  user: "/users/:id",
} satisfies Record<string, `/${string}`>;
// keyof typeof routes -> "home" | "user"
```

## Strict Mode and tsconfig

Always enable strict mode. It is a bundle of flags that catch the majority of
type bugs. Add `noUncheckedIndexedAccess` for safer index access.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true, // implies the flags below
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true, // arr[i] is T | undefined
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true, // explicit type-only imports
    "isolatedModules": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

`noUncheckedIndexedAccess` in action:

```typescript
const items = ["a", "b", "c"];
const first = items[0]; // string | undefined (must be handled)
if (first !== undefined) {
  first.toUpperCase(); // safe
}
```

## ESM vs CJS

Modern TypeScript targets ESM. With `"module": "NodeNext"`, relative imports in
ESM **must include the file extension** (`.js`, which maps to your `.ts`
source). Set `"type": "module"` in `package.json` for ESM.

```typescript
// ESM — note the .js extension on the relative import
import { createUser } from "./users/service.js";
export { createUser };

// Type-only imports keep runtime bundles clean (with verbatimModuleSyntax)
import type { User } from "./users/types.js";
import { type Logger, createLogger } from "./logging.js";
```

```jsonc
// package.json — dual exports for ESM and CJS consumers
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

## Type Guards and Assertion Functions

Narrow `unknown`/union types with user-defined type guards (`x is T`) or
assertion functions (`asserts x is T`).

```typescript
interface User {
  id: string;
  email: string;
}

// Type guard: returns a boolean, narrows on true
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value &&
    typeof (value as User).id === "string"
  );
}

const data: unknown = await fetchJson();
if (isUser(data)) {
  data.email; // narrowed to User
}

// Assertion function: throws if the condition fails, narrows afterwards
function assertIsUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new TypeError("Expected a User");
  }
}

assertIsUser(data);
data.id; // narrowed for the rest of the scope
```

## Utility Types

The standard library ships transformations you should reuse before writing
your own:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

type PublicUser = Omit<User, "password">; // drop a field
type UserPatch = Partial<User>; // all optional (PATCH body)
type UserCredentials = Pick<User, "email" | "password">;
type ReadonlyUser = Readonly<User>;
type RequiredUser = Required<UserPatch>;

type Role = "admin" | "editor" | "viewer";
type RolePermissions = Record<Role, string[]>;

// Narrowing unions
type T1 = Exclude<Role, "viewer">; // "admin" | "editor"
type T2 = Extract<Role, "admin">; // "admin"
type T3 = NonNullable<string | null>; // string

// Function-related
type Fn = (a: number, b: string) => boolean;
type Ret = ReturnType<Fn>; // boolean
type Args = Parameters<Fn>; // [number, string]
```

## Error Handling: the Result Pattern

Throwing is fine for truly exceptional cases, but for expected failures a
`Result` type makes error handling explicit and type-checked.

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

function parseConfig(raw: string): Result<Config, string> {
  try {
    const parsed = JSON.parse(raw) as Config;
    return ok(parsed);
  } catch {
    return err("Invalid JSON in config");
  }
}

const result = parseConfig(input);
if (result.ok) {
  use(result.value); // narrowed to Config
} else {
  console.error(result.error); // narrowed to string
}
```

## Avoid `any`, Prefer `unknown`

`any` disables type checking and silently propagates. `unknown` forces you to
narrow before use, keeping safety intact.

```typescript
// Bad: any lets anything through
function parseBad(json: string): any {
  return JSON.parse(json);
}
parseBad("{}").foo.bar.baz; // compiles, crashes at runtime

// Good: unknown forces validation at the boundary
function parseGood(json: string): unknown {
  return JSON.parse(json);
}
const value = parseGood("{}");
if (isUser(value)) {
  value.email; // safe — narrowed
}
```

If you must escape the type system, isolate the cast behind a guarded function
and document why. Never sprinkle `as any` through business logic.

## Module Organization

```
src/
├── index.ts            # public barrel — re-exports the package API
├── users/
│   ├── types.ts        # interfaces & types (no runtime code)
│   ├── service.ts      # business logic
│   └── repository.ts   # data access
├── shared/
│   ├── result.ts       # Result<T, E> helpers
│   └── guards.ts       # reusable type guards
└── infrastructure/
    └── db.ts
```

```typescript
// src/index.ts — explicit barrel, type-only where appropriate
export { UserService } from "./users/service.js";
export type { User, CreateUserInput } from "./users/types.js";
export { ok, err, type Result } from "./shared/result.js";
```

Keep types that have no runtime footprint in dedicated `types.ts` files so
`verbatimModuleSyntax` can erase them cleanly.

## Anti-Patterns

| Anti-pattern | Why it hurts | Do instead |
|---|---|---|
| `any` everywhere | Disables all type checking | Use `unknown` + narrowing, or precise types |
| `as Foo` to silence errors | Hides real type mismatches | Fix the type, or use a guard / `satisfies` |
| `// @ts-ignore` | Suppresses without explanation | `// @ts-expect-error` with a comment, or fix it |
| `enum` for simple constants | Generates runtime code, odd semantics | `as const` object or string literal union |
| Optional everything (`?`) | Loses guarantees, pushes checks everywhere | Model required vs optional precisely; use unions |
| Non-null assertion `x!` | Asserts away `null`/`undefined` unsafely | Narrow with a guard or handle the absent case |
| Wide return types | Callers lose information | Return literal/narrow types; use `satisfies` |
| Mutable shared types | Accidental mutation bugs | `readonly`, `Readonly<T>`, `as const` |

Prefer `as const` over `enum`:

```typescript
// Instead of: enum Status { Active = "active", ... }
const Status = {
  Active: "active",
  Inactive: "inactive",
} as const;

type Status = (typeof Status)[keyof typeof Status]; // "active" | "inactive"
```

## When to Use This Skill

- Designing type-safe APIs, SDKs, and shared libraries
- Modeling domain state with discriminated unions
- Refactoring loosely-typed (`any`-heavy) TypeScript
- Configuring `tsconfig.json` for a new project
- Choosing between ESM and CJS module output
- Building reusable generic utilities and type-level helpers
