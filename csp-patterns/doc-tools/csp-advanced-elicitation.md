# CSP Advanced Elicitation Tool

## Purpose
The `csp-advanced-elicitation` skill extracts, refines, and structures information from various sources to create clear, actionable content. This tool transforms raw inputs (ideas, discussions, rough notes) into polished, structured outputs suitable for specifications, documentation, and planning.

## Functionality

### Core Behavior
1. **Information Extraction**: Identifies key information from diverse sources
2. **Content Refinement**: Clarifies vague or ambiguous content
3. **Structure Imposition**: Organizes unstructured information
4. **Gap Identification**: Detects missing information and asks clarifying questions
5. **Output Formatting**: Produces polished, structured outputs

### Elicitation Techniques

#### Technique 1: The 5 W's and H
Extract fundamental information:
- **Who**: Stakeholders, users, actors
- **What**: Features, requirements, deliverables
- **When**: Timelines, milestones, deadlines
- **Where**: Environments, locations, contexts
- **Why**: Motivations, goals, objectives
- **How**: Methods, processes, approaches

#### Technique 2: MoSCoW Prioritization
Categorize requirements by priority:
- **Must have**: Critical for success
- **Should have**: Important but not critical
- **Could have**: Nice to have if time permits
- **Won't have**: Explicitly excluded

#### Technique 3: User Story Extraction
Convert requirements to user stories:
- Identify user roles
- Extract actions and goals
- Define acceptance criteria
- Prioritize by value

#### Technique 4: Constraint Identification
Identify limitations and boundaries:
- Technical constraints (technology, infrastructure)
- Business constraints (budget, timeline, resources)
- Regulatory constraints (compliance, legal)
- Operational constraints (processes, policies)

#### Technique 5: Risk Extraction
Identify potential problems:
- Technical risks
- Business risks
- Operational risks
- External risks

### Input Processing
- Meeting notes and transcripts
- Brainstorming outputs
- Rough ideas and concepts
- Email discussions
- Voice recordings (transcribed)
- Unstructured requirements
- Stakeholder interviews

### Output Formats

#### Format 1: Structured Requirements
```markdown
# Extracted Requirements: [Project/Feature Name]

## Executive Summary
[One-paragraph summary of extracted requirements]

## Functional Requirements

### Must Have (Critical)
1. **[Requirement ID]: [Requirement Title]**
   - **Description**: [Clear description]
   - **User Story**: As a [user], I want [action] so that [outcome]
   - **Acceptance Criteria**:
     - [ ] [Criterion 1]
     - [ ] [Criterion 2]
   - **Priority**: Must Have
   - **Stakeholder**: [Who requested this]

### Should Have (Important)
1. **[Requirement ID]: [Requirement Title]**
   - **Description**: [Clear description]
   - **Priority**: Should Have

### Could Have (Nice to Have)
1. **[Requirement ID]: [Requirement Title]**
   - **Description**: [Clear description]
   - **Priority**: Could Have

### Won't Have (Out of Scope)
1. **[Item]**: [Reason for exclusion]

## Non-Functional Requirements

### Performance
- **Response Time**: [Specific requirement]
- **Throughput**: [Specific requirement]
- **Scalability**: [Specific requirement]

### Security
- **Authentication**: [Specific requirement]
- **Authorization**: [Specific requirement]
- **Data Protection**: [Specific requirement]

### Reliability
- **Availability**: [Specific requirement]
- **Backup**: [Specific requirement]
- **Recovery**: [Specific requirement]

## Constraints

### Technical Constraints
- [Constraint 1]: [Description and impact]
- [Constraint 2]: [Description and impact]

### Business Constraints
- **Budget**: [Specific constraint]
- **Timeline**: [Specific constraint]
- **Resources**: [Specific constraint]

## Assumptions
- [Assumption 1]: [Description and validation needed]
- [Assumption 2]: [Description and validation needed]

## Risks
- **[Risk 1]**: [Description], [Likelihood], [Impact], [Mitigation]
- **[Risk 2]**: [Description], [Likelihood], [Impact], [Mitigation]

## Open Questions
- [Question 1]: [Context and who should answer]
- [Question 2]: [Context and who should answer]

## Recommendations
1. [Recommendation with rationale]
2. [Recommendation with rationale]
```

#### Format 2: Refined Concept Document
```markdown
# Concept: [Concept Name]

## Overview
[Clear, concise description of the concept]

## Problem Statement
[What problem does this solve?]

## Proposed Solution
[How does this solve the problem?]

## Key Features
1. **[Feature 1]**: [Description]
2. **[Feature 2]**: [Description]
3. **[Feature 3]**: [Description]

## Target Users
- **[User Type 1]**: [Description and needs]
- **[User Type 2]**: [Description and needs]

## Value Proposition
[Why is this valuable? What benefits does it provide?]

## Success Metrics
- [Metric 1]: [How to measure]
- [Metric 2]: [How to measure]

## Implementation Approach
[High-level approach to implementation]

## Dependencies
- [Dependency 1]: [Description]
- [Dependency 2]: [Description]

## Risks and Mitigations
- **[Risk 1]**: [Mitigation strategy]
- **[Risk 2]**: [Mitigation strategy]

## Next Steps
1. [Specific action with owner and deadline]
2. [Specific action with owner and deadline]
```

#### Format 3: Meeting Summary
```markdown
# Meeting Summary: [Meeting Title]

**Date**: [Date]  
**Attendees**: [List of attendees]  
**Duration**: [Duration]

## Key Decisions
1. **[Decision 1]**: [What was decided and why]
2. **[Decision 2]**: [What was decided and why]

## Action Items
| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| [Action 1] | [Owner] | [Date] | [ ] |
| [Action 2] | [Owner] | [Date] | [ ] |

## Discussion Points

### Topic 1: [Topic Title]
- **Discussion**: [Summary of discussion]
- **Conclusion**: [What was concluded]
- **Follow-up**: [Any follow-up needed]

### Topic 2: [Topic Title]
- **Discussion**: [Summary of discussion]
- **Conclusion**: [What was concluded]
- **Follow-up**: [Any follow-up needed]

## Information Shared
- [Key information point 1]
- [Key information point 2]

## Open Issues
- [Issue 1]: [Description and next steps]
- [Issue 2]: [Description and next steps]

## Next Meeting
- **Date**: [Proposed date]
- **Agenda**: [Proposed agenda items]
```

## Implementation Details

### Elicitation Process
1. **Input Analysis**: Understand the source material
2. **Information Extraction**: Identify key facts, requirements, decisions
3. **Gap Detection**: Identify missing or unclear information
4. **Clarification**: Ask questions to fill gaps (if interactive)
5. **Structure Imposition**: Organize information logically
6. **Refinement**: Clarify ambiguous statements
7. **Validation**: Verify extracted information is accurate
8. **Output Generation**: Produce structured output

### Content Refinement Techniques

#### Clarification
- **Vague**: "The system should be fast"
- **Refined**: "The system should respond to user actions within 200ms (P95)"

#### Specificity
- **Vague**: "Users need to authenticate"
- **Refined**: "Users must authenticate using email/password or OAuth (Google, GitHub)"

#### Completeness
- **Incomplete**: "We need a database"
- **Complete**: "We need a PostgreSQL database with 99.9% availability, automated backups, and read replicas for scaling"

#### Consistency
- **Inconsistent**: "Login should take 1 second" and "Login should be instant"
- **Refined**: "Login should complete within 500ms (P95) for 95% of attempts"

### Quality Gates
Before finalizing elicitation:
- All key information is extracted
- Ambiguous statements are clarified
- Gaps are identified and documented
- Output is well-structured and organized
- Requirements are specific and testable
- Action items have owners and deadlines

## Usage Examples

### Meeting Notes Elicitation
```
User: "Extract requirements from these meeting notes"

csp-advanced-elicitation ./meeting-notes.md --output requirements
```

Output: Structured requirements document with priorities, acceptance criteria, and open questions

### Idea Refinement
```
User: "Refine this rough idea into a concept document"

csp-advanced-elicitation [rough idea] --output concept
```

Output: Polished concept document with problem statement, solution, and next steps

### Brainstorming Output Processing
```
User: "Structure these brainstorming results"

csp-advanced-elicitation ./brainstorm-output.md --output structured
```

Output: Organized brainstorming results with categories, priorities, and action items

### Email Thread Summarization
```
User: "Summarize this email thread and extract decisions"

csp-advanced-elicitation [email thread] --output summary
```

Output: Meeting summary format with decisions, action items, and key points

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "extract", "elicit", "refine", "structure", "summarize"
- Recognized as a content processing tool
- Can be used on any unstructured content

### With Other CSP Tools
- **csp-brainstorming**: Processes brainstorming outputs
- \*\*csp-spec**: Converts elicited requirements to SPECs
- \*\*csp-party-mode**: Elicits insights from multi-agent discussions
- **Phase Workflows**: Used in Analysis and Planning phases

### With Specialized Agents
- Business Analyst elicits business requirements
- Product Manager elicits user requirements
- System Architect elicits technical constraints
- Technical Writer helps with output formatting

### With External CSP Components
- **CSP Discuss**: Processes discussion outputs
- **CSP**: Converts elicited content to specifications

## Best Practices

1. **Active Listening**: Pay attention to what's said and not said
2. **Ask Questions**: Clarify ambiguous statements
3. **Validate**: Confirm extracted information is accurate
4. **Be Specific**: Replace vague statements with specific requirements
5. **Prioritize**: Use frameworks like MoSCoW to prioritize
6. **Document Assumptions**: Make assumptions explicit
7. **Identify Risks**: Proactively identify potential problems
8. **Structure Output**: Use consistent, clear formats

## Anti-Patterns to Avoid
- Accepting vague requirements without clarification
- Ignoring non-functional requirements
- Not identifying constraints
- Failing to prioritize
- Missing action items or owners
- Not documenting assumptions
- Poor structure and organization

## Advanced Features

### Interactive Elicitation
Engage in dialogue to clarify gaps:
```
csp-advanced-elicitation --interactive ./rough-notes.md
```

### Multi-Source Elicitation
Combine information from multiple sources:
```
csp-advanced-elicitation --sources meeting-notes.md,emails.md,interview.md
```

### Template-Based Elicitation
Use predefined templates for specific output types:
```
csp-advanced-elicitation --template prd ./requirements.md
```

### Elicitation Quality Score
Rate the quality of elicited information:
```
csp-advanced-elicitation --quality-score ./output.md
```

Output:
- Completeness: 85%
- Clarity: 90%
- Specificity: 75%
- Overall: 83%
