# OpenAPI Code Generation Patterns

Language-specific patterns for turning an OpenAPI 3.x spec into production-ready
code. Each section covers: project layout, model generation, controller/handler
skeleton, and validation approach.

---

## 1. Ingestion Checklist (any language)

Before generating a single file:

1. Parse the spec with a validator (e.g., `openapi-generator-cli validate`, `spectral lint`).
2. Resolve all `$ref` chains; inline where helpful for readability.
3. Inventory: endpoints, schemas, security schemes, servers, enums.
4. Flag ambiguities: missing `required`, untyped `object` schemas, undocumented error responses.
5. Confirm framework + package versions with the user.

---

## 2. TypeScript / Node (Express + Zod)

### Model generation

```typescript
// src/models/User.ts — generated from components.schemas.User
import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(["admin", "member", "guest"]),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;
```

### Controller

```typescript
// src/controllers/usersController.ts
import { Router, Request, Response, NextFunction } from "express";
import { UserSchema } from "../models/User";
import { UsersService } from "../services/usersService";

export const usersRouter = Router();
const service = new UsersService();

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await service.getById(req.params.id);
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json(UserSchema.parse(user));
  } catch (err) {
    next(err);
  }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const input = UserSchema.parse(req.body);
    const created = await service.create(input);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});
```

### Error mapping

```typescript
// src/middleware/errorHandler.ts
import { ZodError } from "zod";
export function errorHandler(err: unknown, _req: any, res: any, _next: any) {
  if (err instanceof ZodError) return res.status(400).json({ error: "validation", details: err.issues });
  if (err instanceof Error && err.message === "not_found") return res.status(404).json({ error: "not_found" });
  res.status(500).json({ error: "internal" });
}
```

---

## 3. Python (FastAPI + Pydantic v2)

```python
# app/models/user.py
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Literal

class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: EmailStr
    name: str
    role: Literal["admin", "member", "guest"]
    created_at: datetime
```

```python
# app/routers/users.py
from fastapi import APIRouter, HTTPException, status
from app.models.user import User
from app.services.users import UsersService

router = APIRouter(prefix="/users", tags=["users"])
svc = UsersService()

@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await svc.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="not_found")
    return user

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(payload: User):
    return await svc.create(payload)
```

---

## 4. Java (Spring Boot 3 + Jakarta Validation)

```java
// src/main/java/com/example/api/model/User.java
public record User(
    @NotNull UUID id,
    @Email @NotNull String email,
    @Size(min=1, max=120) String name,
    @NotNull Role role,
    @NotNull Instant createdAt
) {}

public enum Role { ADMIN, MEMBER, GUEST }
```

```java
// src/main/java/com/example/api/controller/UsersController.java
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UsersController {
    private final UsersService service;

    @GetMapping("/{id}")
    public ResponseEntity<User> get(@PathVariable UUID id) {
        return service.getById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<User> create(@Valid @RequestBody User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(user));
    }
}
```

---

## 5. Go (net/http + chi + oapi-codegen)

Generate types with `oapi-codegen`:

```bash
oapi-codegen -package api -generate types,chi-server spec.yaml > api.gen.go
```

```go
// internal/handler/users.go
type UsersHandler struct { svc *svc.UsersService }

func (h *UsersHandler) GetUser(w http.ResponseWriter, r *http.Request, id api.UUID) {
    user, err := h.svc.Get(r.Context(), id)
    if errors.Is(err, svc.ErrNotFound) {
        http.Error(w, `{"error":"not_found"}`, http.StatusNotFound); return
    }
    if err != nil { http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError); return }
    json.NewEncoder(w).Encode(user)
}
```

---

## 6. Rust (axum + openapiv3-generated types)

```rust
// src/models.rs
#[derive(Serialize, Deserialize, Clone)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: Role,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum Role { Admin, Member, Guest }
```

```rust
// src/routes/users.rs
pub async fn get_user(Path(id): Path<Uuid>, State(svc): State<Arc<UsersService>>) -> Result<Json<User>, AppError> {
    svc.get(id).await.ok_or(AppError::NotFound)
        .map(Json)
}
```

---

## 7. Kotlin (Spring Boot + kotlinx.serialization)

```kotlin
data class User(
    val id: UUID,
    @field:Email val email: String,
    val name: String,
    val role: Role,
    val createdAt: Instant
)
enum class Role { ADMIN, MEMBER, GUEST }

@RestController
@RequestMapping("/users")
class UsersController(private val svc: UsersService) {
    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): ResponseEntity<User> =
        svc.get(id)?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()
}
```

---

## 8. Testing Strategy (all languages)

- **Unit tests** on services (mock the repository layer).
- **Contract tests** on controllers — assert response shapes match the spec.
- **Integration tests** with an embedded database or `testcontainers`.
- Use the spec's `examples` block as the source of truth for fixtures.

---

## 9. Post-Generation Checklist

- [ ] Project builds without warnings.
- [ ] All `required` spec fields are enforced at the boundary.
- [ ] All spec error responses have typed counterparts.
- [ ] Auth middleware matches the spec's `securitySchemes`.
- [ ] README documents setup, env vars, run, test, and links to the spec.
- [ ] `.env.example` lists every required environment variable (no values).
