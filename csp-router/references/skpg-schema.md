# SKPG JSON Schema

## graph.json

```json
{
  "version": "1.0",
  "generated_at": "ISO-8601",
  "nodes": {
    "<node_id>": {
      "id": "string (SHA256 first 12 chars of kind::name)",
      "kind": "skill|workflow|phase|trigger|category|agent",
      "name": "string",
      "metadata": {
        "layer": "number",
        "category": "string",
        "phase": "string",
        "domain": "string",
        "role": "string"
      }
    }
  },
  "edges": [
    {
      "source": "node_id",
      "target": "node_id",
      "kind": "depends_on|triggers|contains|related_to|extends|used_by",
      "metadata": {}
    }
  ],
  "stats": {
    "node_count": "number",
    "edge_count": "number",
    "skill_count": "number"
  }
}
```

### Node ID Generation

```
id = SHA256(`${kind}::${name}`).slice(0, 12)
```

### Edge Types

| Kind | Source → Target | Meaning |
|------|----------------|---------|
| `depends_on` | skill → skill | Prerequisite dependency |
| `triggers` | trigger → skill | Keyword activates skill |
| `contains` | category → skill | Category membership |
| `related_to` | skill → skill | Declared relationship |
| `extends` | skill → skill | Extension/override |
| `used_by` | skill → workflow | Workflow usage |
