# MCP Server — Language Templates

Quick-start skeletons for Model Context Protocol servers in eight languages.
Each block contains: minimal project file, server entry, one tool, and the
test hook. Use the full generator skill (`csp-mcp-builder`) for the
complete project layout; use this file as a cheat sheet when scaffolding.

---

## Python (FastMCP + uv)

```toml
# pyproject.toml
[project]
name = "my-mcp"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["mcp[cli]"]
```

```python
# server.py
from mcp.server.fastmcp import FastMCP
mcp = FastMCP("my-mcp")

@mcp.tool()
def greet(name: str) -> str:
    """Greet a user by name."""
    return f"Hello, {name}!"

if __name__ == "__main__":
    mcp.run()  # stdio by default; use transport="streamable-http" for HTTP
```

```bash
uv add "mcp[cli]"
uv run mcp dev server.py      # Inspector
uv run mcp install server.py  # Claude Desktop
```

---

## TypeScript (McpServer + zod)

```json
// package.json
{ "type": "module", "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0", "zod": "^3.0"
} }
```

```typescript
// server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "my-mcp", version: "1.0.0" });
server.registerTool("greet", {
  title: "Greet",
  description: "Greet a user by name",
  inputSchema: { name: z.string() },
}, async ({ name }) => ({ content: [{ type: "text", text: `Hello, ${name}!` }] }));

await server.connect(new StdioServerTransport());
```

---

## Go (github.com/modelcontextprotocol/go-sdk)

```go
// go.mod: require github.com/modelcontextprotocol/go-sdk v1.0.0

type GreetInput struct {
    Name string `json:"name" jsonschema:"required"`
}

func Greet(ctx context.Context, req *mcp.CallToolRequest, in GreetInput) (*mcp.CallToolResult, struct{Message string}, error) {
    return nil, struct{Message string}{Message: "Hello, " + in.Name}, nil
}

func main() {
    server := mcp.NewServer(&mcp.Implementation{Name: "my-mcp", Version: "v1"}, nil)
    mcp.AddTool(server, &mcp.Tool{Name: "greet", Description: "Greet"}, Greet)
    server.Run(context.Background(), &mcp.StdioTransport{})
}
```

---

## Rust (rmcp + tokio)

```toml
# Cargo.toml
[dependencies]
rmcp = { version = "0.8", features = ["server"] }
rmcp-macros = "0.8"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
schemars = "0.8"
```

```rust
#[tool(name = "greet", description = "Greet a user")]
async fn greet(params: Parameters<GreetParams>) -> String {
    format!("Hello, {}!", params.inner().name)
}
```

---

## Java (io.modelcontextprotocol.sdk:mcp + Reactor)

```xml
<dependency>
  <groupId>io.modelcontextprotocol.sdk</groupId>
  <artifactId>mcp</artifactId>
  <version>0.14.1</version>
</dependency>
```

```java
McpServer server = McpServerBuilder.builder()
    .serverInfo("my-mcp", "1.0.0")
    .capabilities(c -> c.tools(true).resources(true).prompts(true))
    .build();
server.addToolHandler("greet", args ->
    Mono.just(ToolResponse.success().addTextContent("Hello, " + args.get("name").asText()).build()));
```

---

## Kotlin (io.modelcontextprotocol:kotlin-sdk + Ktor)

```kotlin
// build.gradle.kts
implementation("io.modelcontextprotocol:kotlin-sdk:0.7.2")
implementation("io.ktor:ktor-server-netty:3.0.0")
```

```kotlin
val server = Server(
    serverInfo = Implementation(name = "my-mcp", version = "1.0.0"),
    options = ServerOptions(capabilities = ServerCapabilities(tools = ServerCapabilities.Tools()))
) { "My MCP server" }

server.addTool(name = "greet", description = "Greet", inputSchema = buildJsonObject { /* ... */ }) { req ->
    CallToolResult(listOf(TextContent(text = "Hello, ${req.params.arguments["name"]}")))
}

server.connect(StdioServerTransport())
```

---

## Ruby (mcp gem)

```ruby
# Gemfile
gem 'mcp', '~> 0.4.0'
```

```ruby
class GreetTool < MCP::Tool
  tool_name 'greet'
  description 'Greet a user'
  input_schema(properties: { name: { type: 'string' } }, required: ['name'])

  def self.call(name:, server_context:)
    MCP::Tool::Response.new([{ type: 'text', text: "Hello, #{name}!" }])
  end
end

server = MCP::Server.new(name: 'my-mcp', version: '1.0.0', tools: [GreetTool])
MCP::Server::Transports::StdioTransport.new(server).open
```

---

## Swift (MCP Swift SDK)

```swift
// Package.swift
.package(url: "https://github.com/modelcontextprotocol/swift-sdk.git", from: "0.10.0")
```

```swift
let server = Server(name: "MyMCP", version: "1.0.0",
    capabilities: .init(tools: .init(listChanged: true)))

await server.withMethodHandler(CallTool.self) { params in
    switch params.name {
    case "greet":
        let name = params.arguments?["name"]?.stringValue ?? "world"
        return .init(content: [.text("Hello, \(name)!")], isError: false)
    default:
        return .init(content: [.text("Unknown tool")], isError: true)
    }
}

try await server.start(transport: StdioTransport(logger: logger))
```

---

## Cross-Language Checklist

Every generated MCP server should:

- [ ] Register at least one tool with a clear description and typed input schema.
- [ ] Validate inputs early and return `isError: true` with a useful message on failure.
- [ ] Log to stderr (or the SDK's logger), never stdout — stdout is the protocol channel.
- [ ] Handle graceful shutdown (SIGINT / SIGTERM).
- [ ] Include one unit test per tool and one integration test against the handler.
- [ ] Document stdio + HTTP transport usage in the README.
- [ ] Provide a `claude_desktop_config.json` snippet for local install.
