# CSP Document Sharding Tool

## Purpose
The `csp-shard-doc` skill splits large documents into smaller, more manageable pieces while preserving context and maintaining navigability. This tool is essential for breaking down monolithic documentation into focused, reusable components.

## Functionality

### Core Behavior
1. **Intelligent Splitting**: Splits documents at logical boundaries
2. **Context Preservation**: Maintains context across shards
3. **Navigation Generation**: Creates navigation structures
4. **Cross-Reference Updates**: Updates internal links and references
5. **Metadata Management**: Adds metadata to each shard

### Sharding Strategies

#### Strategy 1: By Section
Split at major section boundaries:
- Each H2 becomes a separate document
- H1 becomes the index document
- Preserves section hierarchy

#### Strategy 2: By Topic
Split by thematic topics:
- Groups related content together
- Creates topic-based documents
- Adds cross-references between topics

#### Strategy 3: By Audience
Split by target audience:
- Beginner content
- Intermediate content
- Advanced content
- Reference material

#### Strategy 4: By Size
Split to achieve target document size:
- Aim for 1000-3000 words per shard
- Split at paragraph boundaries
- Preserve code blocks intact

### Input Processing
- Large markdown documents
- Documentation directories
- Wiki pages
- Technical specifications
- User manuals

### Output Format
Produces sharded documents with navigation:

```markdown
# Sharding Report: [Original Document]

## Sharding Summary
- **Original Size**: [Word count / Page count]
- **Shards Created**: [Count]
- **Strategy Used**: [Section/Topic/Audience/Size]
- **Average Shard Size**: [Word count]

## Shard Index

### 1. [Shard 1 Title]
- **File**: [filename.md]
- **Size**: [Word count]
- **Sections**: [List of sections included]
- **Dependencies**: [Other shards referenced]

### 2. [Shard 2 Title]
- **File**: [filename.md]
- **Size**: [Word count]
- **Sections**: [List of sections included]
- **Dependencies**: [Other shards referenced]

...

## Navigation Structure

### Main Index (index.md)
```
- [Shard 1 Title](shard-1.md)
- [Shard 2 Title](shard-2.md)
- [Shard 3 Title](shard-3.md)
```

### Cross-References
- Shard 2 references Shard 1 for [topic]
- Shard 3 references Shard 2 for [topic]

## Generated Files
1. `index.md` - Main navigation index
2. `shard-1-[topic].md` - First shard
3. `shard-2-[topic].md` - Second shard
4. `shard-3-[topic].md` - Third shard
...
```

## Implementation Details

### Sharding Process
1. **Document Analysis**: Parse document structure and content
2. **Strategy Selection**: Choose appropriate sharding strategy
3. **Split Point Identification**: Find optimal split points
4. **Content Extraction**: Extract content for each shard
5. **Context Addition**: Add context and navigation to each shard
6. **Link Updates**: Update internal references
7. **Index Generation**: Create navigation index

### Intelligent Splitting Rules

#### Never Split:
- Inside code blocks
- Inside tables
- Inside lists
- Mid-paragraph
- Between heading and content

#### Prefer Splitting:
- Before H2 headings
- Before major topic changes
- After complete sections
- At natural breaks

#### Context Preservation:
- Add breadcrumb navigation
- Include "Previous/Next" links
- Add "See also" references
- Maintain document metadata

### Shard Templates

#### Standard Shard Template
```markdown
---
title: [Shard Title]
parent: [Parent Document]
previous: [Previous Shard]
next: [Next Shard]
tags: [relevant tags]
---

# [Shard Title]

[Breadcrumb: Parent > Section > Shard]

## Overview
[Brief description of this shard's content]

[Main content]

## Related Topics
- [Link to related shard 1]
- [Link to related shard 2]

---
**Previous**: [Previous Shard Title](previous.md)  
**Next**: [Next Shard Title](next.md)  
**Index**: [Back to Index](index.md)
```

#### Index Template
```markdown
---
title: [Document Title]
description: [Document description]
shards: [count]
---

# [Document Title]

[Document overview and purpose]

## Contents

### [Section 1]
- [Shard 1 Title](shard-1.md) - [Brief description]
- [Shard 2 Title](shard-2.md) - [Brief description]

### [Section 2]
- [Shard 3 Title](shard-3.md) - [Brief description]
- [Shard 4 Title](shard-4.md) - [Brief description]

## Quick Links
- [Getting Started](shard-1.md)
- [Reference](shard-N.md)

## About This Document
- **Total Shards**: [Count]
- **Last Updated**: [Date]
- **Version**: [Version]
```

### Quality Gates
Before finalizing sharding:
- All shards are within size target (1000-3000 words)
- No content is lost or duplicated
- All internal links are updated
- Navigation structure is complete
- Each shard has context and metadata
- Index provides clear navigation

## Usage Examples

### Basic Document Sharding
```
User: "Split this large documentation file into smaller pieces"

csp-shard-doc ./large-doc.md --strategy section
```

Output:
- `index.md` - Navigation index
- `shard-1-introduction.md`
- `shard-2-getting-started.md`
- `shard-3-core-concepts.md`
- `shard-4-api-reference.md`
- `shard-5-troubleshooting.md`

### Topic-Based Sharding
```
User: "Shard this user manual by topic"

csp-shard-doc ./user-manual.md --strategy topic
```

Output:
- `index.md` - Main index
- `installation.md` - Installation topic
- `configuration.md` - Configuration topic
- `usage.md` - Usage topic
- `administration.md` - Administration topic

### Size-Based Sharding
```
User: "Split this document into ~2000 word chunks"

csp-shard-doc ./spec.md --strategy size --target-size 2000
```

Output:
- Multiple shards, each approximately 2000 words
- Split at logical boundaries (sections, paragraphs)
- Navigation index with descriptions

### Audience-Based Sharding
```
User: "Separate beginner and advanced content"

csp-shard-doc ./tutorial.md --strategy audience
```

Output:
- `beginner.md` - Beginner-friendly content
- `intermediate.md` - Intermediate topics
- `advanced.md` - Advanced features
- `reference.md` - Quick reference

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "shard", "split document", "break down", "chunk"
- Recognized as a documentation management tool
- Can be used on any large document

### With Other CSP Tools
- \*\*csp-index-docs**: Creates index for sharded documents
- \*\*csp-review-editorial-structure**: Reviews structure after sharding
- \*\*csp-advanced-elicitation**: Extracts key content before sharding

### With Specialized Agents
- Technical Writer leads document sharding decisions
- Product Manager helps with audience-based sharding
- All agents can review their sharded outputs

### With External CSP Components
- **CSP Documentation**: Aligns with documentation best practices
- **CSP Documentation**: Integrates with CSP documentation workflows

## Best Practices

1. **Choose Right Strategy**: Select strategy based on document type and use case
2. **Preserve Context**: Always add navigation and context to shards
3. **Update Links**: Ensure all internal references work
4. **Consistent Naming**: Use clear, descriptive shard names
5. **Create Index**: Always generate a navigation index
6. **Test Navigation**: Verify users can navigate between shards
7. **Maintain Metadata**: Add frontmatter with shard information

## Anti-Patterns to Avoid
- Sharding too small (< 500 words)
- Sharding too large (> 5000 words)
- Breaking code blocks or tables
- Losing context between shards
- Not updating internal links
- Creating orphaned shards
- Poor navigation structure

## Advanced Features

### Automatic Cross-Reference Detection
Identify and update cross-references automatically:
```
csp-shard-doc --auto-links ./document.md
```

### Shard Merging
Merge multiple shards back into one document:
```
csp-shard-doc --merge ./shards/ --output merged.md
```

### Incremental Sharding
Shard only updated sections:
```
csp-shard-doc --incremental ./document.md --existing ./shards/
```

### Shard Analytics
Analyze shard quality and completeness:
```
csp-shard-doc --analyze ./shards/
```

Output:
- Shard size distribution
- Cross-reference map
- Orphaned content detection
- Navigation completeness

## Example Workflow

```
Input: 50-page user manual (15,000 words)

Step 1: Analyze Document
- Sections: 12 major sections
- Topics: Installation, Configuration, Usage, Administration, Troubleshooting
- Audience: Mixed (beginner to advanced)

Step 2: Choose Strategy
- Strategy: Topic-based (best for user manuals)
- Target: 5-7 shards, 2000-3000 words each

Step 3: Shard Document
- installation.md (1,800 words)
- configuration.md (2,500 words)
- basic-usage.md (2,800 words)
- advanced-features.md (3,200 words)
- administration.md (2,100 words)
- troubleshooting.md (2,600 words)

Step 4: Generate Navigation
- index.md with descriptions and quick links
- Breadcrumb navigation in each shard
- Previous/Next links
- Cross-references between related shards

Step 5: Validate
- All content preserved: ✓
- No broken links: ✓
- Navigation works: ✓
- Shards are focused: ✓

Output: 6 focused shards + navigation index
```

## Success Metrics
- Shards are focused and manageable
- Navigation is clear and intuitive
- No content is lost or duplicated
- All links work correctly
- Users can find information easily
