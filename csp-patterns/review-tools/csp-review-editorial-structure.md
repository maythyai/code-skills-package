# CSP Editorial Review - Structure

## Purpose
The `csp-review-editorial-structure` skill reviews the organization, flow, and structure of documents to ensure information is presented logically and effectively. This tool focuses on how content is organized, not how it's written.

## Functionality

### Core Behavior
1. **Organization Assessment**: Evaluates how content is organized
2. **Flow Analysis**: Checks logical progression of ideas
3. **Hierarchy Review**: Assesses heading structure and information hierarchy
4. **Navigation Evaluation**: Checks how easily readers can find information
5. **Completeness Check**: Identifies missing sections or information

### Review Dimensions

#### 1. Organization
- Logical grouping of related content
- Appropriate section ordering
- Consistent structure throughout
- Clear section boundaries
- Appropriate section length

#### 2. Flow and Progression
- Logical progression from one section to the next
- Smooth transitions between sections
- Building from simple to complex
- No forward references without context
- Clear narrative arc

#### 3. Information Hierarchy
- Clear heading hierarchy (H1, H2, H3, etc.)
- Appropriate use of headings
- Scannable structure
- Balanced depth (not too flat, not too deep)
- Consistent heading usage

#### 4. Navigation and Findability
- Clear table of contents
- Effective use of headings for navigation
- Cross-references and links
- Search-friendly structure
- Consistent terminology

#### 5. Completeness
- All necessary sections present
- No orphaned content
- Appropriate introduction and conclusion
- Complete coverage of topic
- No gaps in information

### Input Processing
- Technical documentation
- User guides and tutorials
- Specifications and proposals
- README files
- Blog posts and articles
- Reports and presentations

### Output Format
Produces a structured review:

```markdown
# Editorial Review - Structure: [Document Title]

## Executive Summary
[One-paragraph assessment of document structure]

**Overall Structure Score**: [1-10]
**Document Type**: [Tutorial/Reference/Guide/Report/etc.]
**Length**: [Word count / Page count]
**Sections**: [Count]
**Heading Depth**: [Levels used]

## Key Findings

### Strengths
1. [What's done well]
2. [What's done well]
3. [What's done well]

### Areas for Improvement
1. [Most critical issue]
2. [Next issue]
3. [Next issue]

## Detailed Analysis

### 1. Organization Score: [X/10]

#### Current Structure
```
1. [Section 1]
   1.1. [Subsection]
   1.2. [Subsection]
2. [Section 2]
   2.1. [Subsection]
3. [Section 3]
...
```

#### Issues Identified

**Issue 1: Illogical Section Order**
- **Problem**: [Description]
- **Current Order**: [Current sequence]
- **Suggested Order**: [Better sequence]
- **Rationale**: [Why this order is better]

**Issue 2: Mixed Content in Section**
- **Problem**: Section contains unrelated topics
- **Location**: [Section name]
- **Suggestion**: Split into separate sections
- **Rationale**: Improves focus and findability

#### Recommendations
1. [Specific reorganization suggestion]
2. [Specific reorganization suggestion]

### 2. Flow and Progression Score: [X/10]

#### Flow Analysis
- **Introduction**: [Strong/Weak/Missing]
- **Progression**: [Logical/Confusing]
- **Transitions**: [Smooth/Abrupt/Missing]
- **Conclusion**: [Strong/Weak/Missing]

#### Issues Identified

**Issue 1: Missing Introduction**
- **Problem**: Document jumps into details without context
- **Suggestion**: Add introduction with:
  - What this document covers
  - Who it's for
  - What readers will learn
  - Prerequisites

**Issue 2: Forward References**
- **Problem**: References concepts explained later
- **Location**: [Section/paragraph]
- **Suggestion**: Reorder or add brief explanation with "see Section X for details"

**Issue 3: Abrupt Transitions**
- **Problem**: Jumps between topics without transitions
- **Location**: Between [Section X] and [Section Y]
- **Suggestion**: Add transition sentence or paragraph

#### Recommendations
1. Add clear introduction setting expectations
2. Ensure logical progression (simple → complex)
3. Add transitions between major sections

### 3. Information Hierarchy Score: [X/10]

#### Heading Structure
```
H1: [Document Title]
  H2: [Section 1]
    H3: [Subsection 1.1]
    H3: [Subsection 1.2]
  H2: [Section 2]
    H3: [Subsection 2.1]
      H4: [Sub-subsection 2.1.1]
```

#### Metrics
- **Max Depth**: [X] levels (target: 3-4)
- **Average Sections per Level**: [X] (target: 3-7)
- **Orphaned Sections**: [Count] (single subsection under parent)

#### Issues Identified

**Issue 1: Heading Level Skipping**
- **Problem**: Jumps from H2 to H4
- **Location**: [Section]
- **Suggestion**: Use H3 instead of H4

**Issue 2: Too Many H2 Sections**
- **Problem**: 15 H2 sections (too many to scan)
- **Suggestion**: Group related H2s under parent H2s

**Issue 3: Inconsistent Heading Style**
- **Problem**: Some headings are questions, some are statements
- **Examples**:
  - "What is Authentication?" (question)
  - "Installation Process" (statement)
- **Suggestion**: Use consistent style (all statements or all questions)

#### Recommendations
1. Use consistent heading hierarchy (don't skip levels)
2. Group related sections (aim for 3-7 per level)
3. Use consistent heading style

### 4. Navigation and Findability Score: [X/10]

#### Navigation Features
- **Table of Contents**: [Present/Absent/Auto-generated]
- **Cross-References**: [Sufficient/Insufficient/Excessive]
- **Anchor Links**: [Present/Absent]
- **Search-Friendly**: [Yes/No]

#### Issues Identified

**Issue 1: Missing Table of Contents**
- **Problem**: Long document without TOC
- **Suggestion**: Add auto-generated TOC at top
- **Benefit**: Readers can quickly find sections

**Issue 2: Poor Section Titles**
- **Problem**: Vague titles like "Details" or "More Information"
- **Location**: [Sections]
- **Suggestion**: Use descriptive titles like "Authentication Flow Details"

**Issue 3: Missing Cross-References**
- **Problem**: Related sections don't link to each other
- **Location**: [Sections]
- **Suggestion**: Add "See also" sections or inline links

#### Recommendations
1. Add table of contents for documents > 1000 words
2. Use descriptive, specific section titles
3. Add cross-references between related sections

### 5. Completeness Score: [X/10]

#### Required Sections Checklist
- [ ] Introduction / Overview
- [ ] Prerequisites (if applicable)
- [ ] Main content sections
- [ ] Examples / Use cases
- [ ] Troubleshooting / FAQ (if applicable)
- [ ] Conclusion / Next steps
- [ ] References / Resources (if applicable)

#### Issues Identified

**Issue 1: Missing Prerequisites**
- **Problem**: Tutorial assumes knowledge without stating it
- **Suggestion**: Add prerequisites section listing:
  - Required knowledge
  - Required tools/software
  - Required accounts/access

**Issue 2: No Conclusion or Next Steps**
- **Problem**: Document ends abruptly
- **Suggestion**: Add conclusion with:
  - Summary of key points
  - Next steps or further reading
  - Call to action

**Issue 3: Orphaned Content**
- **Problem**: Content exists but isn't in logical location
- **Location**: [Section]
- **Suggestion**: Move to [Better location] or create new section

#### Recommendations
1. Add all required sections for document type
2. Ensure complete coverage of topic
3. Remove or relocate orphaned content

## Structure Recommendations

### Recommended Structure for [Document Type]

**Current Structure**:
```
[Current outline]
```

**Recommended Structure**:
```
1. Introduction
   - What this document covers
   - Who it's for
   - Prerequisites
2. [Logical section 1]
   - [Subsection]
   - [Subsection]
3. [Logical section 2]
   - [Subsection]
   - [Subsection]
4. Examples
   - [Example 1]
   - [Example 2]
5. Troubleshooting
   - [Common issue 1]
   - [Common issue 2]
6. Conclusion
   - Summary
   - Next steps
7. References
```

**Rationale**: [Why this structure is better]

## Section-by-Section Analysis

### Section: [Section Name]
- **Purpose**: [Clear/Unclear]
- **Content**: [Appropriate/Off-topic]
- **Length**: [Appropriate/Too long/Too short]
- **Position**: [Logical/Should move]
- **Recommendations**: [Specific suggestions]

### Section: [Section Name]
...

## Information Architecture

### Content Grouping
- **Current Grouping**: [How content is currently grouped]
- **Recommended Grouping**: [Better grouping approach]
- **Rationale**: [Why this is better]

### Section Relationships
```
[Introduction]
    ↓
[Prerequisites]
    ↓
[Core Concepts]
    ↓
[Implementation]
    ↓
[Examples]
    ↓
[Troubleshooting]
    ↓
[Conclusion]
```

## Navigation Improvements

### Table of Contents
**Current**: [Absent/Basic/Detailed]
**Recommended**: [Auto-generated with 2-3 levels]

### Cross-References
**Current**: [Few/Many/None]
**Recommended**: [Add between related sections]

### Anchors and Links
**Current**: [Few/Many/None]
**Recommended**: [Add for easy navigation]

## Specific Reorganization Suggestions

### Move Content
1. Move [Section X] to [New location]
   - **Rationale**: [Why]
2. Move [Section Y] to [New location]
   - **Rationale**: [Why]

### Merge Sections
1. Merge [Section A] and [Section B]
   - **Rationale**: [Why]
   - **New Title**: [Suggested title]

### Split Sections
1. Split [Section X] into:
   - [New Section 1]
   - [New Section 2]
   - **Rationale**: [Why]

## Overall Recommendations

### Priority 1 (Must Fix)
1. [Most critical structural issue]
2. [Next critical issue]

### Priority 2 (Should Fix)
1. [Important structural issue]
2. [Next important issue]

### Priority 3 (Nice to Fix)
1. [Minor structural issue]
2. [Next minor issue]

## Final Assessment

**Structure Quality**: [Excellent/Good/Fair/Poor]

**Ready for Publication**: [Yes/No/With Revisions]

**Key Takeaway**: [One-sentence summary of main structural improvement needed]
```

## Implementation Details

### Review Process
1. **Outline Extraction**: Create outline from headings
2. **Organization Analysis**: Evaluate section grouping and order
3. **Flow Analysis**: Check progression and transitions
4. **Hierarchy Review**: Assess heading structure
5. **Navigation Check**: Evaluate findability features
6. **Completeness Check**: Verify all required sections present
7. **Recommendations**: Provide specific improvements

### Structure Patterns by Document Type

#### Tutorial Structure
```
1. Introduction (what you'll learn)
2. Prerequisites
3. Step-by-step instructions
4. Complete example
5. Explanation
6. Next steps
```

#### Reference Documentation
```
1. Overview
2. Quick start
3. Detailed reference (organized by feature)
4. Examples
5. Troubleshooting
```

#### User Guide
```
1. Introduction
2. Getting started
3. Core features (organized by task)
4. Advanced features
5. Troubleshooting
6. FAQ
```

#### Technical Specification
```
1. Executive summary
2. Background and context
3. Requirements
4. Design
5. Implementation plan
6. Risks and mitigations
7. Success metrics
```

### Quality Gates
Before finalizing review:
- All five dimensions are assessed
- Document type is identified
- Required sections are verified
- Specific reorganization suggestions are provided
- Recommendations are prioritized

## Usage Examples

### Tutorial Structure Review
```
User: "Review the structure of this tutorial"

csp-review-editorial-structure ./tutorial.md
```

Output: Structural review identifying:
- Missing prerequisites section
- Steps out of logical order
- No complete example at end
- Missing "next steps" section

### Documentation Structure Review
```
User: "Review the structure of this documentation"

csp-review-editorial-structure ./docs/
```

Output: Structural review identifying:
- Too many top-level sections (15)
- Inconsistent heading hierarchy
- Missing table of contents
- Poor cross-referencing

### Report Structure Review
```
User: "Review the structure of this report"

csp-review-editorial-structure [report content]
```

Output: Structural review identifying:
- Strong executive summary
- Logical flow from problem to solution
- Missing conclusion and recommendations
- Good use of headings for navigation

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "review structure", "organize document", "improve flow", "document structure"
- Recognized as a documentation quality tool
- Complements prose review

### With Other CSP Tools
- \*\*csp-review-editorial-prose**: Complements with prose review
- \*\*csp-spec**: Reviews SPEC structure
- **Phase Workflows**: Reviews documentation structure

### With Specialized Agents
- Technical Writer leads structural reviews
- Product Manager reviews user guide structure
- Business Analyst reviews report structure
- All agents can review their own outputs

## Best Practices

1. **Match Document Type**: Use appropriate structure for document type
2. **Logical Progression**: Order sections logically (simple → complex)
3. **Clear Hierarchy**: Use consistent heading levels
4. **Scannable**: Make structure easy to scan with headings
5. **Complete**: Include all required sections
6. **Navigable**: Add TOC, cross-references, and links

## Anti-Patterns to Avoid
- Flat structure (too many top-level sections)
- Deep structure (too many nesting levels)
- Illogical section order
- Missing required sections
- Poor transitions between sections
- Inconsistent heading usage

## Advanced Features

### Structure Template Generation
Generate structure template for document type:
```
csp-review-editorial-structure --template tutorial
```

### Structure Comparison
Compare structure to best practices:
```
csp-review-editorial-structure --compare-to api-docs-best-practices
```

### Outline Generation
Generate detailed outline from content:
```
csp-review-editorial-structure --generate-outline
```
