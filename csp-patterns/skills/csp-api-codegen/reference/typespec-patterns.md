# TypeSpec Patterns

Recipes for building TypeSpec APIs, with or without the Microsoft 365 Copilot
plugin surface. Assumes TypeSpec compiler (`@typespec/compiler`) is installed.

---

## 1. Minimal Service

```typespec
import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service({ title: "Items API", version: "1.0.0" })
@server("https://api.example.com", "Production")
namespace ItemsApi;

model Item {
  @visibility(Lifecycle.Read) id: int32;
  title: string;
  description?: string;
  status: "active" | "completed" | "archived";
  @format("date-time") createdAt: utcDateTime;
}

@route("/items")
@get op list(): Item[];

@route("/items/{id}")
@get op get(@path id: int32): Item | { @statusCode code: 404; error: string };

@route("/items")
@post op create(@body item: OmitProperties<Item, "id" | "createdAt">): Item;
```

---

## 2. CRUD with Confirmation & Cards (M365 Copilot)

```typespec
import "@microsoft/typespec-m365-copilot";
using TypeSpec.M365.Copilot.Actions;

@actions(#{
  nameForHuman: "Items API",
  descriptionForModel: "Read, create, update, and delete items",
  descriptionForHuman: "Manage items"
})
namespace ItemsApi {

  @route("/items")
  @card(#{ dataPath: "$", title: "$.title", file: "item-card.json" })
  @get op listItems(@query userId?: int32): Item[];

  @route("/items/{id}")
  @delete
  @capabilities(#{
    confirmation: #{
      type: "AdaptiveCard",
      title: "Delete Item",
      body: "Delete item #{{ function.parameters.id }}? This cannot be undone."
    }
  })
  op delete(@path id: int32): void;
}
```

`item-card.json` (in `cards/`):

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    { "type": "TextBlock", "text": "**${if(title, title, 'N/A')}**", "wrap": true },
    { "type": "TextBlock", "text": "${if(description, description, 'N/A')}", "wrap": true }
  ],
  "actions": [
    { "type": "Action.OpenUrl", "title": "View", "url": "https://example.com/items/${id}" }
  ]
}
```

---

## 3. Authentication Options

### No auth (public)
No `@useAuth` decorator needed.

### API key

```typespec
@useAuth(ApiKeyAuth<ApiKeyLocation.header, "X-API-Key">)
namespace SecureApi { ... }
```

### OAuth2 Authorization Code

```typespec
@useAuth(OAuth2Auth<[{
  type: OAuth2FlowType.authorizationCode;
  authorizationUrl: "https://oauth.example.com/authorize";
  tokenUrl: "https://oauth.example.com/token";
  refreshUrl: "https://oauth.example.com/token";
  scopes: ["read", "write"];
}]>)
namespace SecureApi { ... }
```

### Registered auth reference

```typespec
@useAuth(Auth)

@authReferenceId("registration-id-here")
model Auth is ApiKeyAuth<ApiKeyLocation.header, "X-API-Key">;
```

---

## 4. Agent Definition (M365 Copilot)

`main.tsp`:

```typespec
import "@typespec/http";
import "@typespec/openapi3";
import "@microsoft/typespec-m365-copilot";
import "./actions.tsp";

using TypeSpec.M365.Copilot.Agents;
using TypeSpec.M365.Copilot.Actions;

@agent({
  name: "ItemAssistant",
  description: "Helps users manage their items"
})
@instructions("""
  Use the listItems action to show the user's items.
  Always confirm before deleting.
""")
namespace ItemAssistant {
  op list is ItemsApi.listItems;
  op remove is ItemsApi.delete;
}
```

---

## 5. Reasoning & Responding Instructions

Guide the model on how to use the operation and how to format results:

```typespec
@reasoning("""
  Consider the user's context when calling this operation.
  Prefer recent items over older ones.
""")
@responding("""
  Present results as a table with columns: ID, Title, Status.
  Include a summary count at the end.
""")
@route("/items")
@get op listItems(): Item[];
```

---

## 6. Advanced Parameter Patterns

### Multiple query parameters

```typespec
@route("/items")
@get op list(
  @query userId?: int32,
  @query status?: "active" | "completed" | "archived",
  @query limit?: int32,
  @query offset?: int32
): { items: Item[]; total: int32; hasMore: boolean };
```

### Header parameters

```typespec
@route("/items")
@get op list(
  @header("X-API-Version") apiVersion?: string,
  @query userId?: int32
): Item[];
```

### Typed error responses

```typespec
model ErrorResponse {
  error: { code: string; message: string; details?: string[] };
}

@route("/items/{id}")
@get op get(@path id: int32): Item | ErrorResponse;
```

---

## 7. Naming & Style Conventions

- Operation names: verb + noun, camelCase (`listItems`, `createTicket`, `deleteUser`).
- Models: PascalCase nouns (`Item`, `CreateItemRequest`, `ErrorResponse`).
- Paths: kebab-case plural nouns (`/items`, `/user-profiles/{id}`).
- Enums via unions: `"active" | "completed"` (preferred over TypeSpec `enum` for OpenAPI emit).
- Read-only fields: `@visibility(Lifecycle.Read)` (`id`, `createdAt`).
- Timestamps: `utcDateTime` + `@format("date-time")`.
- Confirmations: always on DELETE, PATCH on sensitive resources, bulk operations.
- Warning emoji `⚠️` in destructive confirmation bodies.

---

## 8. Emitter Configuration

`tspconfig.yaml`:

```yaml
emit:
  - "@typespec/openapi3"
  - "@microsoft/typespec-m365-copilot"
options:
  "@typespec/openapi3":
    output-file: openapi.yaml
    omit-unreachable-types: true
  "@microsoft/typespec-m365-copilot":
    output-dir: ./m365
```

`package.json`:

```json
{
  "name": "items-api",
  "version": "1.0.0",
  "dependencies": {
    "@typespec/compiler": "latest",
    "@typespec/http": "latest",
    "@typespec/openapi3": "latest",
    "@microsoft/typespec-m365-copilot": "latest"
  },
  "scripts": {
    "build": "tsp compile .",
    "watch": "tsp compile . --watch"
  }
}
```

---

## 9. Troubleshooting

| Symptom                              | Fix                                                          |
|--------------------------------------|--------------------------------------------------------------|
| Parameter missing in Copilot         | Check `@query` / `@path` / `@body` decorators                |
| Adaptive card not rendering          | Verify `file:` path in `@card`; validate JSON syntax         |
| Confirmation not appearing           | Ensure `@capabilities` has a `confirmation` object           |
| Read-only field writable in client   | Add `@visibility(Lifecycle.Read)`                            |
| OpenAPI emit skips a model           | Confirm it is reachable from an operation                    |
| `tsp compile` fails with unknown decorator | Check `import` statements — decorators must be imported |

---

## 10. Testing Prompts (Copilot plugin)

After generating a plugin, validate with these prompts:

- "List all my items in a table."
- "Show items for user ID 1."
- "Get details of item 42."
- "Create a new item titled 'My Task' for user 1."
- "Update item 10 to status completed."
- "Delete item 99."

Each should resolve to the expected operation, surface confirmation where configured, and render cards where attached.
