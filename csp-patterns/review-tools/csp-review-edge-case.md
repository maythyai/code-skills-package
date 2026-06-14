# CSP Edge Case Hunter

## Purpose
The `csp-review-edge-case` skill systematically identifies edge cases, boundary conditions, and unusual scenarios that could cause failures or unexpected behavior. This tool ensures robustness by finding the "what if" scenarios that are often overlooked.

## Functionality

### Core Behavior
1. **Boundary Analysis**: Tests at boundaries and limits
2. **Corner Case Discovery**: Finds unusual combinations of conditions
3. **Exception Path Mapping**: Identifies error and exception scenarios
4. **Scale Testing**: Evaluates behavior at extreme scales
5. **Temporal Analysis**: Considers timing and sequencing issues

### Edge Case Categories

#### 1. Boundary Conditions
- Minimum and maximum values
- Empty and null states
- Single item vs. many items
- Start and end of ranges
- Off-by-one errors

#### 2. Data Variations
- Different data types and formats
- Malformed or invalid data
- Missing or incomplete data
- Duplicate data
- Unicode and special characters

#### 3. User Behavior
- Unusual user actions
- Rapid repeated actions
- Concurrent actions
- Abandoned workflows
- Power user vs. novice behavior

#### 4. System Conditions
- High load and stress
- Low resources (memory, disk, CPU)
- Network failures and latency
- Partial failures
- Recovery scenarios

#### 5. Temporal Issues
- Race conditions
- Time zone differences
- Daylight saving time
- Leap years and leap seconds
- Long-running processes

#### 6. Integration Points
- API failures and timeouts
- Third-party service outages
- Version mismatches
- Authentication failures
- Rate limiting

### Input Processing
- Feature specifications and requirements
- Code implementations
- User stories and acceptance criteria
- System designs and architectures
- API specifications

### Output Format
Produces a structured edge case report:

```markdown
# Edge Case Analysis: [Subject]

## Summary
[Overview of edge case coverage and critical findings]

**Total Edge Cases Identified**: [Count]
**Critical**: [Count]
**High**: [Count]
**Medium**: [Count]
**Low**: [Count]

## Critical Edge Cases

### Edge Case 1: [Title]
**Category**: [Boundary/Data/User/System/Temporal/Integration]
**Description**: [Detailed description of the edge case]
**Trigger Condition**: [What causes this to occur]
**Expected Behavior**: [What should happen]
**Current Behavior**: [What actually happens (if known)]
**Impact**: [Severity and consequences]
**Test Scenario**: [How to test this]
**Recommendation**: [How to handle]

### Edge Case 2: [Title]
...

## High Priority Edge Cases

### Edge Case 1: [Title]
**Category**: [Category]
**Description**: [Description]
**Likelihood**: [High/Medium/Low]
**Impact**: [Severity]
**Recommendation**: [How to handle]

## Medium Priority Edge Cases

### Edge Case 1: [Title]
**Category**: [Category]
**Description**: [Description]
**Recommendation**: [How to handle]

## Boundary Analysis

### Numeric Boundaries
| Parameter | Min | Max | Zero | Negative | Overflow | Status |
|-----------|-----|-----|------|----------|----------|--------|
| [Param 1] | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | [Status] |
| [Param 2] | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | [Status] |

### String Boundaries
| Parameter | Empty | Null | Max Length | Special Chars | Unicode | Status |
|-----------|-------|------|------------|---------------|---------|--------|
| [Param 1] | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | [Status] |

### Collection Boundaries
| Collection | Empty | Single | Max Size | Duplicates | Status |
|------------|-------|--------|----------|------------|--------|
| [Coll 1] | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | [Status] |

## Exception Paths

### Exception 1: [Scenario]
**Trigger**: [What causes this exception]
**Current Handling**: [How it's currently handled]
**Recommended Handling**: [How it should be handled]
**User Impact**: [Impact on user experience]

### Exception 2: [Scenario]
...

## Concurrency and Race Conditions

### Scenario 1: [Concurrent action]
**Description**: [What could happen]
**Likelihood**: [High/Medium/Low]
**Impact**: [Severity]
**Mitigation**: [How to prevent]

### Scenario 2: [Concurrent action]
...

## Scale and Performance Edge Cases

### Scenario 1: [Extreme scale]
**Condition**: [e.g., 1 million users]
**Expected Behavior**: [What should happen]
**Potential Issue**: [What could go wrong]
**Mitigation**: [How to handle]

### Scenario 2: [Extreme scale]
...

## Temporal Edge Cases

### Scenario 1: [Time-related issue]
**Condition**: [e.g., Daylight saving time transition]
**Impact**: [What could go wrong]
**Mitigation**: [How to handle]

### Scenario 2: [Time-related issue]
...

## Integration Edge Cases

### Scenario 1: [Integration failure]
**Service**: [Third-party service]
**Failure Mode**: [How it could fail]
**Current Handling**: [How it's handled]
**Recommended Handling**: [How it should be handled]

### Scenario 2: [Integration failure]
...

## Edge Case Coverage Matrix

| Feature | Boundary | Data | User | System | Temporal | Integration | Total |
|---------|----------|------|------|--------|----------|-------------|-------|
| [Feature 1] | [Count] | [Count] | [Count] | [Count] | [Count] | [Count] | [Count] |
| [Feature 2] | [Count] | [Count] | [Count] | [Count] | [Count] | [Count] | [Count] |

## Test Case Recommendations

### Priority 1 (Must Test)
1. [Test case with expected result]
2. [Test case with expected result]

### Priority 2 (Should Test)
1. [Test case with expected result]
2. [Test case with expected result]

### Priority 3 (Nice to Test)
1. [Test case with expected result]
2. [Test case with expected result]

## Recommendations Summary
1. [Most critical recommendation]
2. [Next recommendation]
3. [Next recommendation]

## Appendix: Edge Case Checklist
- [ ] Boundary values tested (min, max, zero, negative)
- [ ] Empty and null states handled
- [ ] Invalid data rejected gracefully
- [ ] Concurrent actions handled correctly
- [ ] Error paths tested and handled
- [ ] Timeout scenarios considered
- [ ] Partial failures handled
- [ ] Recovery scenarios tested
- [ ] Scale limits tested
- [ ] Time-related edge cases considered
```

## Implementation Details

### Edge Case Discovery Process
1. **Input Analysis**: Understand what's being reviewed
2. **Category Mapping**: Apply each edge case category
3. **Boundary Identification**: Find all boundaries and limits
4. **Combination Testing**: Consider unusual combinations
5. **Failure Mode Analysis**: Identify how things could fail
6. **Prioritization**: Rank by likelihood and impact
7. **Test Case Generation**: Create test scenarios

### Systematic Techniques

#### Technique 1: Boundary Value Analysis
For each parameter, test:
- Minimum value
- Minimum + 1
- Typical value
- Maximum - 1
- Maximum value
- Just beyond maximum

#### Technique 2: Equivalence Partitioning
Divide input into partitions:
- Valid partitions (should work)
- Invalid partitions (should fail gracefully)
- Test one value from each partition

#### Technique 3: State Transition Testing
Map all states and transitions:
- Identify all possible states
- Map valid transitions
- Test invalid transitions
- Test concurrent transitions

#### Technique 4: Error Guessing
Based on experience, guess likely errors:
- Common programming mistakes
- Typical user errors
- Known system weaknesses
- Historical bug patterns

#### Technique 5: Exploratory Testing
Explore the system without a plan:
- Try unusual actions
- Combine actions in unexpected ways
- Push boundaries
- Break things intentionally

### Quality Gates
Before finalizing edge case analysis:
- All categories are considered
- Boundary conditions are identified
- Exception paths are mapped
- Concurrency issues are considered
- Scale limits are tested
- Temporal issues are addressed
- Integration points are analyzed

## Usage Examples

### API Endpoint Review
```
User: "Find edge cases for this user registration API"

csp-review-edge-case [API specification]
```

Output: Edge case report identifying:
- Boundary: Email at max length (254 chars)
- Data: Invalid email formats, SQL injection attempts
- User: Rapid repeated registrations (spam)
- System: Database connection pool exhaustion
- Temporal: Token expiration during registration
- Integration: Email service timeout

### Feature Review
```
User: "Find edge cases for the shopping cart feature"

csp-review-edge-case [feature specification]
```

Output: Edge case report identifying:
- Boundary: Cart with 0 items, cart with 1000 items
- Data: Negative quantities, price of $0
- User: Adding same item twice, abandoning cart
- System: Inventory changes during checkout
- Temporal: Price changes while item in cart
- Integration: Payment gateway timeout

### Code Review
```
User: "Find edge cases in this file upload function"

csp-review-edge-case [code snippet]
```

Output: Edge case report identifying:
- Boundary: 0-byte file, file at max size, file just over max size
- Data: Corrupted file, wrong file type, malicious file
- User: Canceling upload mid-way, uploading same file twice
- System: Disk full during upload, network interruption
- Temporal: Very slow upload (timeout)
- Integration: Virus scanner unavailable

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "edge cases", "boundary conditions", "corner cases", "what if"
- Recognized as a quality assurance tool
- Can be used during implementation and testing phases

### With Other CSP Tools
- \*\*csp-spec**: Identifies edge cases in specifications
- \*\*csp-review-adversarial**: Complements adversarial review
- **Phase Workflows**: Used in quality gates

### With Specialized Agents
- Developer identifies implementation edge cases
- System Architect identifies architectural edge cases
- Product Manager identifies user behavior edge cases
- UX Designer identifies UX edge cases

### With External CSP Components
- **CSP Testing**: Generates test cases for edge cases
- **CSP Code Review**: Identifies edge cases in code
- **CSP Testing**: Integrates with CSP testing workflows

## Best Practices

1. **Systematic Approach**: Use categories to ensure coverage
2. **Think Like a User**: Consider real user behavior
3. **Think Like an Attacker**: Consider malicious actions
4. **Prioritize**: Focus on high-likelihood, high-impact cases
5. **Document**: Record all edge cases for future reference
6. **Test**: Create test cases for critical edge cases
7. **Handle Gracefully**: Provide clear error messages and recovery paths

## Anti-Patterns to Avoid
- Only testing happy paths
- Ignoring error scenarios
- Not considering scale
- Assuming users will behave rationally
- Ignoring timing and concurrency
- Not documenting edge cases

## Advanced Features

### Edge Case Generation
Automatically generate edge cases for common patterns:
```
csp-review-edge-case --generate --pattern api-endpoint
```

### Edge Case Prioritization
Prioritize edge cases by risk:
```
csp-review-edge-case --prioritize --criteria likelihood,impact
```

### Edge Case Test Generation
Generate test cases for identified edge cases:
```
csp-review-edge-case --generate-tests --framework jest
```
