# Testing Frameworks — MSTest, NUnit, xUnit Review Reference

Use this guide when reviewing C# test code. Covers structure, assertions, data-driven tests, and common mistakes.

## Project Conventions

- Name test projects `[ProjectName].Tests`.
- Mirror source namespaces in the test project.
- One test class per source class: `Calculator` → `CalculatorTests`.
- Always reference `Microsoft.NET.Test.Sdk` plus the framework adapter.
- Run with `dotnet test`; add `--collect:"XPlat Code Coverage"` for coverage.

## Framework Selection Matrix

| Feature | MSTest 3.x/4.x | NUnit | xUnit |
|---|---|---|---|
| Class attribute | `[TestClass]` | `[TestFixture]` | none |
| Test attribute | `[TestMethod]` | `[Test]` | `[Fact]` |
| Setup/teardown | constructor + `[TestCleanup]` | `[SetUp]`/`[TearDown]` | constructor + `IDisposable` |
| Shared context | `[ClassInitialize]` | `[OneTimeSetUp]` | `IClassFixture<T>` |
| Data-driven | `[DataRow]` / `[DynamicData]` | `[TestCase]` / `[TestCaseSource]` | `[Theory]` + `[InlineData]`/`[MemberData]` |
| Categories | `[TestCategory]` | `[Category]` | `[Trait("Category", "...")]` |
| Parallel control | `[assembly: Parallelize]` | `[LevelOfParallelism]` | `[Collection]` |

## Test Structure — Arrange-Act-Assert

Every test method should follow AAA. Keep one logical assertion per test; multiple `Assert` calls are fine when verifying one behavior.

```csharp
[TestMethod]
public void Add_TwoPositiveNumbers_ReturnsSum()
{
    // Arrange
    var calc = new Calculator();

    // Act
    var result = calc.Add(2, 3);

    // Assert
    Assert.AreEqual(5, result);
}
```

## Assertion Quick Reference

### Equality and Null

| Intent | MSTest | NUnit | xUnit |
|---|---|---|---|
| Value equality | `Assert.AreEqual(exp, act)` | `Assert.That(act, Is.EqualTo(exp))` | `Assert.Equal(exp, act)` |
| Reference equality | `Assert.AreSame(exp, act)` | `Assert.That(act, Is.SameAs(exp))` | `Assert.Same(exp, act)` |
| Null check | `Assert.IsNull(val)` | `Assert.That(val, Is.Null)` | `Assert.Null(val)` |

### Exceptions — prefer explicit throws over attributes

```csharp
// MSTest
var ex = Assert.ThrowsExactly<InvalidOperationException>(() => sut.Do());

// NUnit
var ex = Assert.Throws<InvalidOperationException>(() => sut.Do());

// xUnit
var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => sut.DoAsync());
```

Avoid `[ExpectedException]` (MSTest) — it masks which line threw.

### Collections

| Intent | MSTest | NUnit | xUnit |
|---|---|---|---|
| Contains item | `Assert.Contains(item, col)` | `Assert.That(col, Contains.Item(item))` | `Assert.Contains(item, col)` |
| Count check | `Assert.HasCount(n, col)` | `Assert.That(col, Has.Count.EqualTo(n))` | `Assert.Equal(n, col.Count)` |
| Empty | `Assert.IsEmpty(col)` | `Assert.That(col, Is.Empty)` | `Assert.Empty(col)` |

## Data-Driven Tests

Prefer strongly-typed data sources over `object[]` to get compile-time safety.

### MSTest — DynamicData with ValueTuple (3.7+)

```csharp
[TestMethod]
[DynamicData(nameof(Cases))]
public void Discount_CalculatesCorrectly(decimal price, int qty, decimal expected)
{
    Assert.AreEqual(expected, Calculator.Discount(price, qty));
}

public static IEnumerable<(decimal price, int qty, decimal expected)> Cases =>
[
    (100m, 1, 100m),
    (100m, 5, 450m),
];
```

### NUnit — TestCaseSource

```csharp
[Test, TestCaseSource(nameof(Cases))]
public void Discount_CalculatesCorrectly(decimal price, int qty, decimal expected)
{
    Assert.That(Calculator.Discount(price, qty), Is.EqualTo(expected));
}

static IEnumerable<TestCaseData> Cases =>
[
    new TestCaseData(100m, 1, 100m),
    new TestCaseData(100m, 5, 450m).SetName("Bulk discount"),
];
```

### xUnit — MemberData

```csharp
[Theory]
[MemberData(nameof(Cases))]
public void Discount_CalculatesCorrectly(decimal price, int qty, decimal expected)
{
    Assert.Equal(expected, Calculator.Discount(price, qty));
}

public static IEnumerable<object[]> Cases =>
[
    [100m, 1, 100m],
    [100m, 5, 450m],
];
```

## Test Lifecycle and Isolation

- Tests must be independent — no shared mutable state between methods.
- Prefer constructor injection over setup attributes when the framework allows (MSTest, xUnit).
- Use `IDisposable`/`IAsyncDisposable` for resource cleanup; reserve `[TestCleanup]`/`[TearDown]` for operations that must run even on failure.
- Mock dependencies via Moq or NSubstitute behind interfaces — never hit real databases or networks in unit tests.

## Parallelization

- Enable assembly-level parallelism for speed; mark shared-state classes with `[DoNotParallelize]` (MSTest), `[NonParallelizable]` (NUnit), or `[Collection("Sequential")]` (xUnit).
- Shared test fixtures (`IClassFixture<T>`, `ICollectionFixture<T>`) must be thread-safe.

## Common Mistakes to Flag

| Anti-pattern | Fix |
|---|---|
| `Assert.AreEqual(actual, expected)` — reversed args | Expected first: `Assert.AreEqual(expected, actual)` |
| `[ExpectedException]` attribute | Use `Assert.Throws<T>` |
| `items.Single()` in assertions | `Assert.ContainsSingle(items)` — clearer failure message |
| Hard cast `(MyType)obj` | `Assert.IsInstanceOfType<MyType>(obj)` — shows actual type on failure |
| Ignoring `CancellationToken` in async tests | Use `TestContext.CancellationToken` (MSTest) or `CancellationToken.None` explicitly |
| Test class not sealed (MSTest) | Seal test classes for performance and clarity |
| Multiple unrelated assertions in one test | Split into focused tests — one behavior per test |

## Review Checklist

- [ ] AAA pattern followed consistently
- [ ] Test names follow `Method_Scenario_Expected` convention
- [ ] No `[ExpectedException]` or sync-over-async in tests
- [ ] Data-driven tests use typed sources where possible
- [ ] Dependencies mocked behind interfaces
- [ ] Parallelization configured; shared-state classes excluded
- [ ] No real I/O in unit tests
