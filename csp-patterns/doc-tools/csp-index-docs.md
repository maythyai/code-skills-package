# CSP Documentation Index Generator

## Purpose
The `csp-index-docs` skill creates comprehensive, searchable indexes for documentation sets. This tool generates navigation structures that help users find information quickly across multiple documents or documentation shards.

## Functionality

### Core Behavior
1. **Content Scanning**: Scans documentation files and extracts metadata
2. **Index Generation**: Creates hierarchical indexes and tables of contents
3. **Search Index**: Generates searchable keyword indexes
4. **Cross-Reference Mapping**: Maps relationships between documents
5. **Navigation Structure**: Creates intuitive navigation hierarchies

### Index Types

#### Type 1: Hierarchical Index
Tree-structured index following document hierarchy:
```
Documentation Index
├── Getting Started
│   ├── Installation
│   ├── Quick Start
│   └── First Project
├── Core Concepts
│   ├── Architecture
│   ├── Configuration
│   └── Workflows
└── Reference
    ├── API Reference
    ├── CLI Commands
    └── Configuration Options
```

#### Type 2: Alphabetical Index
A-Z listing of topics and terms:
```
A
- Authentication (shard-3.md)
- API Reference (reference.md)

B
- Best Practices (guide.md#best-practices)
...
```

#### Type 3: Topic-Based Index
Grouped by themes or topics:
```
Installation & Setup
- System Requirements
- Installation Guide
- Configuration

Development
- Getting Started
- Core Concepts
- API Usage

Troubleshooting
- Common Issues
- FAQ
- Support
```

#### Type 4: Audience-Based Index
Organized by user role or expertise:
```
For Beginners
- Introduction
- Quick Start
- Basic Tutorial

For Developers
- API Reference
- Advanced Features
- Integration Guide

For Administrators
- Installation
- Configuration
- Maintenance
```

### Input Processing
- Documentation directories
- Markdown files
- Sharded documents
- Wiki pages
- Technical documentation sets

### Output Format
Produces multiple index formats:

```markdown
# Documentation Index

**Generated**: [Date]  
**Documents Indexed**: [Count]  
**Total Topics**: [Count]  
**Total Keywords**: [Count]

## Quick Navigation

### By Task
- [Getting Started](#getting-started)
- [Learning the Basics](#learning-the-basics)
- [Advanced Topics](#advanced-topics)
- [Reference](#reference)
- [Troubleshooting](#troubleshooting)

### By Role
- [New Users](#new-users)
- [Developers](#developers)
- [Administrators](#administrators)

---

## Getting Started

### Installation
- **[Installation Guide](installation.md)** - Complete installation instructions
  - System requirements
  - Step-by-step installation
  - Verification

### Quick Start
- **[Quick Start Tutorial](quickstart.md)** - Get up and running in 5 minutes
  - Create first project
  - Basic workflow
  - Next steps

---

## Learning the Basics

### Core Concepts
- **[Architecture Overview](architecture.md)** - Understanding the system
- **[Configuration Guide](configuration.md)** - Customizing your setup
- **[Workflow Documentation](workflows.md)** - Standard workflows

### Tutorials
- **[Beginner Tutorial](tutorial-beginner.md)** - Step-by-step guide
- **[Intermediate Tutorial](tutorial-intermediate.md)** - Advanced features
- **[Video Tutorials](videos.md)** - Visual learning resources

---

## Advanced Topics

### Advanced Features
- **[Advanced Configuration](advanced-config.md)** - Power user settings
- **[Custom Workflows](custom-workflows.md)** - Creating your own workflows
- **[Integration Guide](integration.md)** - Integrating with other tools

### Best Practices
- **[Best Practices Guide](best-practices.md)** - Recommended approaches
- **[Performance Optimization](performance.md)** - Speed and efficiency
- **[Security Guidelines](security.md)** - Security best practices

---

## Reference

### API Reference
- **[API Documentation](api/index.md)** - Complete API reference
  - [Authentication](api/auth.md)
  - [Core API](api/core.md)
  - [Utilities](api/utils.md)

### CLI Reference
- **[CLI Commands](cli/index.md)** - Command-line reference
  - [csp-help](cli/help.md)
  - [csp-init](cli/init.md)
  - [csp-build](cli/build.md)

### Configuration
- **[Configuration Options](config/index.md)** - All configuration options
  - [General Settings](config/general.md)
  - [Plugin Settings](config/plugins.md)
  - [Advanced Settings](config/advanced.md)

---

## Troubleshooting

### Common Issues
- **[FAQ](faq.md)** - Frequently asked questions
- **[Common Errors](errors.md)** - Error messages and solutions
- **[Troubleshooting Guide](troubleshooting.md)** - Diagnosing problems

### Support
- **[Getting Help](support.md)** - How to get support
- **[Reporting Issues](issues.md)** - Bug reports and feature requests
- **[Community](community.md)** - Community resources

---

## Alphabetical Index

### A
- [Advanced Configuration](advanced-config.md)
- [API Reference](api/index.md)
- [Architecture](architecture.md)
- [Authentication](api/auth.md)

### B
- [Best Practices](best-practices.md)
- [Build Command](cli/build.md)

### C
- [CLI Commands](cli/index.md)
- [Configuration](config/index.md)
- [Core API](api/core.md)
- [Custom Workflows](custom-workflows.md)

... [continues for all letters]

---

## Search Index

### Keywords by Document

**installation.md**
- install, setup, requirements, prerequisites, download

**quickstart.md**
- quick start, tutorial, beginner, first project, getting started

**architecture.md**
- architecture, design, structure, components, system

... [continues for all documents]

### Document Map

```
[Getting Started]
    ├── [Installation] → installation.md
    ├── [Quick Start] → quickstart.md
    └── [First Project] → first-project.md

[Core Concepts]
    ├── [Architecture] → architecture.md
    ├── [Configuration] → configuration.md
    └── [Workflows] → workflows.md

[Reference]
    ├── [API] → api/index.md
    ├── [CLI] → cli/index.md
    └── [Config] → config/index.md
```

---

## Statistics

- **Total Documents**: 25
- **Total Words**: 45,000
- **Average Document Length**: 1,800 words
- **Topics Covered**: 150
- **Cross-References**: 85

## Last Updated
[Date and time of index generation]
```

## Implementation Details

### Indexing Process
1. **File Discovery**: Find all documentation files
2. **Metadata Extraction**: Extract titles, headings, keywords
3. **Content Analysis**: Analyze content for topics and themes
4. **Relationship Mapping**: Identify cross-references and dependencies
5. **Index Generation**: Create multiple index formats
6. **Validation**: Verify all links and references work

### Metadata Extraction
For each document, extract:
- Title (from H1 or frontmatter)
- Description (from first paragraph or frontmatter)
- Keywords (from headings and content)
- Sections (H2, H3 headings)
- Word count
- Last modified date
- Tags (from frontmatter)

### Keyword Extraction Algorithm
1. Extract headings (H1, H2, H3)
2. Extract bold and italic text
3. Extract code identifiers
4. Remove common stop words
5. Stem words to root forms
6. Rank by frequency and position
7. Select top keywords per document

### Quality Gates
Before finalizing index:
- All documents are indexed
- All links are valid
- Keywords are relevant
- Navigation is intuitive
- Multiple index formats are provided
- Search index is comprehensive

## Usage Examples

### Basic Index Generation
```
User: "Create an index for our documentation"

csp-index-docs ./docs/
```

Output: Complete index with hierarchical, alphabetical, and topic-based navigation

### Sharded Document Index
```
User: "Generate index for sharded documents"

csp-index-docs ./shards/ --type hierarchical
```

Output: Navigation index for document shards with cross-references

### Topic-Based Index
```
User: "Create a topic-based index"

csp-index-docs ./docs/ --type topic
```

Output: Index organized by themes and topics

### Search Index Generation
```
User: "Generate search index"

csp-index-docs ./docs/ --search-index
```

Output: JSON search index for client-side search

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "index", "table of contents", "navigation", "search"
- Recognized as a documentation management tool
- Can be used on any documentation set

### With Other CSP Tools
- \*\*csp-shard-doc**: Creates index for sharded documents
- \*\*csp-review-editorial-structure**: Reviews index structure
- **Phase Workflows**: Generates documentation indexes

### With Specialized Agents
- Technical Writer leads index generation
- All agents can review their indexed outputs

## Best Practices

1. **Multiple Formats**: Provide hierarchical, alphabetical, and topic indexes
2. **Clear Navigation**: Make it easy to find information
3. **Descriptive Titles**: Use clear, descriptive document titles
4. **Cross-References**: Link related documents
5. **Search Support**: Include searchable keywords
6. **Keep Updated**: Regenerate index when documents change
7. **Validate Links**: Ensure all links work

## Anti-Patterns to Avoid
- Flat indexes (no hierarchy)
- Missing documents
- Broken links
- Poor descriptions
- No search support
- Outdated indexes

## Advanced Features

### Incremental Indexing
Update index for changed documents only:
```
csp-index-docs ./docs/ --incremental
```

### Custom Index Templates
Use custom templates for index generation:
```
csp-index-docs ./docs/ --template custom-template.md
```

### Multi-Language Support
Generate indexes for multiple languages:
```
csp-index-docs ./docs/ --languages en,zh,ja
```

### Index Analytics
Analyze documentation coverage:
```
csp-index-docs ./docs/ --analytics
```

Output:
- Topic coverage map
- Documentation gaps
- Popular keywords
- Link analysis
