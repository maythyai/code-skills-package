# MCP Builder — Additional Language Templates

Reference templates for MCP servers in .NET, PHP, and platform-specific deployment patterns beyond the TypeScript/Python examples in `code-examples.md`.

## .NET / C# MCP Server

Uses the official `ModelContextProtocol` NuGet packages (stable 1.x line).

### Project Setup

```
dotnet new web -n MyMcpServer
cd MyMcpServer
dotnet add package ModelContextProtocol.AspNetCore
```

### STDIO Server

```csharp
using ModelContextProtocol.Server;
using System.ComponentModel;

var builder = Host.CreateApplicationBuilder(args);
builder.Logging.SetMinimumLevel(LogLevel.Trace);
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();

var app = builder.Build();
app.Run();

[McpServerToolType]
public class TicketTools
{
    [McpServerTool, Description("Search tickets by status. Returns ticket list as JSON.")]
    public async Task<string> SearchTickets(
        [Description("Filter: open, closed, or all")] string status = "open",
        [Description("Max results")] int limit = 20)
    {
        // Implementation
        return JsonSerializer.Serialize(results);
    }
}
```

### Streamable HTTP Server

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services
    .AddMcpServer()
    .WithHttpTransport(options =>
    {
        // Set true for horizontally-scaled stateless deployments
        // WARNING: breaks sampling, elicitation, and roots
        options.Stateless = false;
    })
    .WithToolsFromAssembly()
    .WithPrompts<MyPrompts>()
    .WithResources<MyResources>();

var app = builder.Build();
app.MapMcp("/mcp");  // endpoint path
app.Run();
```

### Critical .NET Rules

1. **Pin stable 1.x packages** -- never `0.3-preview` or `0.4-preview`
2. **STDIO: never write to stdout** -- stdout is the JSON-RPC channel. Use `LogToStandardErrorThreshold = LogLevel.Trace`
3. **Always `[Description]`** on tools and parameters -- this is what the LLM sees
4. **Register every primitive** -- `[McpServerPromptType]` without `.WithPrompts<T>()` is invisible
5. **SSE is deprecated** -- use Streamable HTTP; only enable `EnableLegacySse = true` for old clients
6. **Default to .NET 10** for new projects

## PHP MCP Server

Uses the official PHP SDK (`mcp/sdk ^0.1`) with PHP 8.2+.

### Project Structure

```
my-mcp-server/
├── composer.json
├── server.php
├── src/
│   ├── Tools/
│   ├── Resources/
│   └── Prompts/
└── tests/
```

### Server Entry Point

```php
#!/usr/bin/env php
<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Mcp\Server;
use Mcp\Server\Transport\StdioTransport;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\Cache\Psr16Cache;

$cache = new Psr16Cache(
    new FilesystemAdapter('mcp-discovery', 3600, __DIR__ . '/cache')
);

$server = Server::builder()
    ->setServerInfo('my-server', '1.0.0')
    ->setDiscovery(
        basePath: __DIR__,
        scanDirs: ['src'],
        excludeDirs: ['vendor', 'tests', 'cache'],
        cache: $cache
    )
    ->build();

$server->run(new StdioTransport());
```

### Tool with PHP Attributes

```php
namespace App\Tools;

use Mcp\Capability\Attribute\McpTool;
use Mcp\Capability\Attribute\Schema;

class SearchTools
{
    #[McpTool]
    public function searchTickets(
        #[Schema(pattern: '^(open|closed|all)$')]
        string $status = 'open',
        int $limit = 20
    ): string {
        // Implementation
        return json_encode($results);
    }
}
```

### Resource and Prompt Patterns

```php
// Static resource
#[McpResource(uri: 'config://settings', mimeType: 'application/json')]
public function getSettings(): array { return ['key' => 'value']; }

// Dynamic resource template
#[McpResourceTemplate(uriTemplate: 'ticket://{id}')]
public function getTicket(string $id): array { /* ... */ }

// Prompt with completion providers
#[McpPrompt(name: 'code_review')]
public function reviewCode(
    #[CompletionProvider(values: ['php', 'javascript', 'python'])]
    string $language,
    string $code
): array { /* ... */ }
```

### PHP Guidelines
- Use `declare(strict_types=1)` in every file
- Follow PSR-12 coding standard
- Always use PSR-16 cache for discovery in production
- Write PHPUnit tests for all tools
- Use PHPDoc blocks for tool descriptions

## Copilot Studio Integration

For MCP servers deployed as Power Platform connectors:

### Schema Constraints
- **No reference types** in tool inputs/outputs (Copilot Studio filters them)
- **Single type values only** (no arrays of multiple types)
- **Avoid enum inputs** (interpreted as string, not enum) -- validate in tool logic
- Use only primitive types: string, number, integer, boolean, array, object
- All endpoints must return full URIs

### Connector Structure
```
/apiDefinition.swagger.json   # Power Platform connector schema
/apiProperties.json           # Connector metadata and auth config
/script.csx                   # Custom C# transformations
/server/                      # MCP server implementation
```

### Required Protocol Headers
```
x-ms-agentic-protocol: mcp-streamable-1.0
Content-Type: application/json-rpc
```

### Validation Checklist
- JSON-RPC 2.0 compliance
- `McpResponse` and `McpErrorResponse` schema definitions
- Resources accessible only through tool outputs
- Clear tool descriptions for Copilot Studio orchestration
- Generative Orchestration compatibility

## Deployment and Management

### Deployment Strategies

**Local development**: STDIO transport via `npx @modelcontextprotocol/inspector`

**Production options**:
1. **Direct deploy**: Server runs on infrastructure, agents connect via Streamable HTTP
2. **Platform connector**: Package as Power Platform connector for organizational distribution
3. **Store listing**: Submit to agent marketplace for public availability

### Lifecycle Management

| Phase | Key Actions |
|-------|-------------|
| **Pre-deploy** | Pilot with small group, validate auth, document capabilities |
| **Deploy** | Phased rollout, monitor errors, collect feedback |
| **Operate** | Track adoption, iterate on descriptions, update tools |
| **Retire** | Deprecate gracefully, migrate consumers, remove registration |

### Governance Checklist
- **Authentication**: OAuth 2.0 or API key rotation, never hardcoded secrets
- **Authorization**: Scope permissions per tool, principle of least privilege
- **Data access**: Audit what data each tool can reach
- **Monitoring**: Track error rates, latency, adoption per tool
- **Compliance**: Verify data residency, privacy policies, audit logs

### Common Deployment Issues

| Problem | Likely Cause |
|---------|-------------|
| Tool not appearing | Missing registration or wrong endpoint path |
| Auth failures | Token expired, wrong scope, MCP server unreachable |
| High latency | Missing connection pooling, no caching, synchronous chains |
| Description confusion | Agent picks wrong tool -- refine name and description |
| Stateless breakage | Sampling/elicitation requires stateful HTTP or STDIO |
