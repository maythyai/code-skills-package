# Integration with Agency-Agents

## Overview

This document outlines the integration of specialized agents from the [Agency-Agents](https://github.com/msitarzewski/agency-agents) project into the Code Skills Package (CSP) ecosystem. The Agency-Agents project provides 232 specialized AI agents across 16 divisions, offering domain-specific expertise that complements CSP's modular skill architecture.

## Benefits of Integration

### Enhanced Specialization
- Access to 232 domain-specific agents with personality and processes
- Deeper expertise in areas like frontend development, architecture, code review, etc.
- Battle-tested workflows and success metrics

### Seamless Integration
- Maintain CSP's auto-routing and lazy-loading architecture
- Leverage Agency-Agents' specialized knowledge within CSP's workflow
- Combine Agency-Agents' personality-driven approach with CSP's modular system

## Integration Approach

### 1. Skill Conversion
Convert Agency-Agents' personality-driven agents into CSP-compatible skills:

```
Agency-Agent Structure:
├── Identity & Memory
├── Core Mission
├── Critical Rules
├── Technical Deliverables
├── Workflow Process
└── Success Metrics

↓

CSP Skill Structure:
├── csp-agency-[agent-name].md
├── Trigger words in csp-router
├── Integration with existing workflows
└── Compatibility with CSP architecture
```

### 2. Agent Categories to Integrate

#### Engineering Division (High Priority)
- `csp-agency-frontend-developer` - React/Vue/Angular expertise
- `csp-agency-backend-architect` - API design and scalability
- `csp-agency-code-reviewer` - Code quality and security
- `csp-agency-software-architect` - System design and DDD
- `csp-agency-devops-automator` - CI/CD and infrastructure

#### Testing Division (Medium Priority)
- `csp-agency-evidence-collector` - QA and visual proof
- `csp-agency-reality-checker` - Production readiness
- `csp-agency-api-tester` - API validation

#### Specialized Division (Medium Priority)
- `csp-agency-mcp-builder` - MCP server development
- `csp-agency-codebase-onboarding-engineer` - Codebase exploration

### 3. Routing Integration

Add trigger words to csp-router for seamless activation:

```yaml
agency_agents:
  triggers:
    - "frontend expertise"
    - "architectural review"
    - "code review with"
    - "system design"
    - "devops automation"
    - "quality assurance"
    - "mcp development"
  skills:
    - csp-agency-frontend-developer
    - csp-agency-software-architect
    - csp-agency-code-reviewer
    - etc.
```

## Implementation Strategy

### Phase 1: Core Engineering Agents
Integrate the most impactful engineering agents:
1. Frontend Developer
2. Backend Architect
3. Code Reviewer
4. Software Architect
5. DevOps Automator

### Phase 2: Supporting Agents
Add supporting agents for testing, quality, and specialized tasks:
1. Evidence Collector
2. Reality Checker
3. API Tester
4. MCP Builder

### Phase 3: Advanced Integration
Implement deeper integration patterns:
1. Multi-agent workflows combining CSP and Agency-Agents
2. Context sharing between CSP skills and Agency-Agents
3. Unified success metrics and quality gates

## Example Usage

### Natural Language Integration
```
Input: "I need help with React component optimization"
→ Router detects "React" + "optimization"
→ Loads csp-agency-frontend-developer
→ Applies React-specific expertise and optimization patterns
```

### Workflow Integration
```
"csp-verify" workflow enhanced with "csp-agency-reality-checker"
→ Standard verification process
→ Adds production readiness check
→ Ensures quality gates are met
```

## File Structure

```
csp-agency/
├── skills/
│   ├── engineering/
│   │   ├── csp-agency-frontend-developer.md
│   │   ├── csp-agency-backend-architect.md
│   │   ├── csp-agency-code-reviewer.md
│   │   └── csp-agency-software-architect.md
│   ├── testing/
│   │   ├── csp-agency-evidence-collector.md
│   │   └── csp-agency-reality-checker.md
│   └── specialized/
│       └── csp-agency-mcp-builder.md
├── agents/  # Direct integration of Agency-Agents when beneficial
└── references/
    └── agency-agents-analysis.md  # This document
```

## Quality Assurance

### Compatibility Testing
- Ensure all converted skills work with CSP's lazy-loading
- Verify routing works with trigger words
- Test integration with existing workflows

### Performance Testing
- Measure token usage impact
- Verify loading times remain efficient
- Ensure no conflicts with existing skills

## Maintenance

### Sync Process
- Regular updates from Agency-Agents project
- Version tracking for integrated agents
- Compatibility checks with CSP updates

### Contribution Guidelines
- Standard CSP skill format for new integrations
- Consistent documentation style
- Proper attribution to original Agency-Agents project