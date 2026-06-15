# Code Exemplars Identification

How to scan a codebase and identify high-quality code examples that demonstrate coding standards and patterns for team consistency.

## Exemplar Quality Criteria

A file qualifies as an exemplar when it demonstrates most of these traits:

1. **Readability** -- Clear naming, logical flow, manageable function length
2. **Documentation** -- Docstrings/comments explaining purpose, parameters, and rationale
3. **Error handling** -- Comprehensive validation, graceful failure, resource cleanup
4. **Design adherence** -- Follows established patterns, architectural principles, SOLID
5. **Separation of concerns** -- Single responsibility, no mixed concerns in one unit
6. **Efficiency** -- No code smells, appropriate abstractions, no premature optimization
7. **Representativeness** -- Uses the same patterns other files in the project should follow

**Critical rule**: Only reference actual files that exist in the codebase. Never include hypothetical or placeholder examples. Verify every file path.

## Categorization Methods

Organize exemplars by the method that best serves the team:

### By Architecture Layer
- **Presentation**: UI components, controllers, API endpoints, view models/DTOs
- **Business Logic**: Services, domain logic, workflow orchestration
- **Data Access**: Repositories, data models, query patterns
- **Cross-Cutting**: Logging, error handling, auth, validation, middleware

### By Pattern Type
- **Creational**: Factory, builder, singleton patterns as used in the project
- **Structural**: Adapter, decorator, proxy implementations
- **Behavioral**: Strategy, observer, command patterns
- **Project-specific**: Custom patterns unique to this codebase

### By File Type
- **Models/Entities**: Domain objects, DTOs, schemas
- **Services**: Business logic implementations
- **Controllers/Handlers**: Request handling and routing
- **Utilities**: Shared helpers, formatters, validators
- **Tests**: Unit, integration, and E2E test patterns

## Technology-Specific Exemplar Categories

### TypeScript / JavaScript
- Component structure (React/Vue/Angular)
- State management patterns
- API integration with proper error handling
- Form handling with validation
- Custom hooks or composables
- Middleware and interceptors

### Python
- Class definitions with proper docstrings
- API routes/views (FastAPI, Django, Flask)
- Data models (Pydantic, SQLAlchemy, Django ORM)
- Service functions with dependency injection
- Async patterns and context managers
- Test cases with fixtures

### Java / Kotlin
- Entity classes (JPA, Room)
- Service layer with transaction management
- Repository patterns (Spring Data, Exposed)
- Controller/resource classes
- Configuration and DI setup
- Coroutine/Flow patterns (Kotlin)

### Go
- Interface definitions and implementations
- Error handling patterns (wrapped errors, sentinel errors)
- HTTP handler structure
- Goroutine and channel patterns
- Test table patterns

### .NET / C#
- Domain models with encapsulation
- Repository implementations (EF Core)
- Service layer with DI
- Controller patterns with validation
- Middleware components
- xUnit/NUnit test patterns

## Exemplar Documentation Format

For each identified exemplar, document:

```
### [Pattern Name]
**File**: `path/to/file.ext`
**Category**: [Architecture Layer / Pattern Type]
**Why exemplary**: [1-2 sentences on what makes this stand out]
**Key details**:
- [Specific technique or principle demonstrated]
- [Notable implementation choice]
```

Keep snippets small -- show the representative 5-10 lines, not the entire file. Point to the file path for full context.

## Exemplar Limits

- **Maximum per category**: 3 exemplars. More causes choice paralysis.
- **Minimum quality bar**: If a category has no files meeting the quality criteria, omit the category rather than including mediocre examples.
- **Recency preference**: Prefer recently modified files -- they reflect current team standards, not legacy approaches.

## Anti-Pattern Detection

While scanning, also note patterns to avoid:

- **God classes/files** -- units doing too many things
- **Copy-paste duplication** -- near-identical blocks in multiple files
- **Commented-out code** -- dead code left in place
- **Magic numbers/strings** -- unexplained literals
- **Inconsistent error handling** -- some functions handle errors, others ignore them
- **Missing validation** -- accepting untrusted input without checks

Document anti-patterns separately from exemplars. Use them to define "what not to do" sections in the standards document.

## Comprehensive Analysis Additions

For deeper analysis, also observe:

- **Consistency patterns**: Recurring conventions across the codebase that may not be written down
- **Architecture observations**: Layered, microservice, event-driven patterns evident in structure
- **Implementation conventions**: How the team handles common tasks (logging, config, testing)
- **Evolution evidence**: How patterns have changed over time (check git history for major refactors)

## Output Structure

```
1. Introduction -- purpose and how to use this document
2. Table of contents with links to categories
3. Organized exemplar sections (by chosen categorization method)
4. Anti-patterns to avoid (if any detected)
5. Recommendations for maintaining quality going forward
```

The document should be actionable: a developer implementing a new feature should be able to open the relevant category, find an exemplar, and model their implementation after it.
