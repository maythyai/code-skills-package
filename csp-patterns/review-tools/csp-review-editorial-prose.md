# CSP Editorial Review - Prose

## Purpose
The `csp-review-editorial-prose` skill reviews written content for clarity, readability, and communication effectiveness. This tool focuses on the quality of prose, ensuring that technical and business documents are clear, engaging, and accessible to their intended audience.

## Functionality

### Core Behavior
1. **Clarity Assessment**: Evaluates how clearly ideas are communicated
2. **Readability Analysis**: Measures reading difficulty and comprehension
3. **Tone Evaluation**: Assesses appropriateness of tone for audience
4. **Grammar and Style**: Checks for grammatical errors and style issues
5. **Engagement Review**: Evaluates how engaging and compelling the writing is

### Review Dimensions

#### 1. Clarity
- Are ideas expressed clearly?
- Is the main point obvious?
- Are complex concepts explained well?
- Is jargon defined or avoided?
- Are examples used effectively?

#### 2. Readability
- Sentence length and complexity
- Paragraph length and structure
- Use of active vs. passive voice
- Reading level appropriateness
- Flow and transitions

#### 3. Tone and Voice
- Appropriate for audience
- Consistent throughout
- Professional yet approachable
- Confident without arrogance
- Empathetic to reader's needs

#### 4. Grammar and Mechanics
- Grammar and syntax
- Punctuation
- Spelling and typos
- Consistent terminology
- Proper formatting

#### 5. Engagement
- Compelling opening
- Logical flow
- Varied sentence structure
- Use of examples and analogies
- Strong conclusion

### Input Processing
- Technical documentation
- User guides and tutorials
- Blog posts and articles
- README files
- Specifications and proposals
- Marketing content

### Output Format
Produces a structured editorial review:

```markdown
# Editorial Review - Prose: [Document Title]

## Executive Summary
[One-paragraph assessment of overall writing quality]

**Overall Score**: [1-10]
**Reading Level**: [Grade level]
**Estimated Reading Time**: [Minutes]
**Audience Fit**: [Excellent/Good/Fair/Poor]

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

### 1. Clarity Score: [X/10]

#### Issues Identified

**Issue 1: Unclear Terminology**
- **Location**: [Section/paragraph]
- **Problem**: [Description]
- **Example**: 
  > [Original text]
- **Suggestion**:
  > [Improved text]

**Issue 2: Complex Sentences**
- **Location**: [Section/paragraph]
- **Problem**: Sentence is too long and complex
- **Example**:
  > [Original 45-word sentence]
- **Suggestion**:
  > [Broken into 2-3 shorter sentences]

#### Recommendations
1. Define technical terms on first use
2. Break sentences longer than 25 words
3. Use concrete examples for abstract concepts

### 2. Readability Score: [X/10]

#### Metrics
- **Average Sentence Length**: [X] words (target: 15-20)
- **Average Paragraph Length**: [X] sentences (target: 3-5)
- **Passive Voice Usage**: [X]% (target: <20%)
- **Flesch Reading Ease**: [X] (target: 60-70 for technical docs)
- **Flesch-Kincaid Grade Level**: [X] (target: 10-12 for technical docs)

#### Issues Identified

**Issue 1: Long Paragraphs**
- **Location**: [Section]
- **Problem**: Paragraphs are 8-10 sentences long
- **Suggestion**: Break into 3-5 sentence paragraphs

**Issue 2: Excessive Passive Voice**
- **Location**: Throughout document
- **Examples**:
  - "The feature was implemented by the team" → "The team implemented the feature"
  - "Mistakes were made" → "We made mistakes"
- **Suggestion**: Use active voice for clarity and engagement

#### Recommendations
1. Shorten paragraphs to 3-5 sentences
2. Convert passive to active voice
3. Use bullet points for lists of 3+ items

### 3. Tone and Voice Score: [X/10]

#### Assessment
- **Appropriateness**: [Excellent/Good/Fair/Poor]
- **Consistency**: [Excellent/Good/Fair/Poor]
- **Professionalism**: [Excellent/Good/Fair/Poor]

#### Issues Identified

**Issue 1: Inconsistent Tone**
- **Location**: [Sections]
- **Problem**: Shifts from formal to casual
- **Examples**:
  - Formal: "The system shall provide..."
  - Casual: "You'll love this feature!"
- **Suggestion**: Maintain consistent professional tone

**Issue 2: Overly Technical**
- **Location**: [Introduction]
- **Problem**: Uses jargon without explanation
- **Example**:
  > "The API uses RESTful principles with HATEOAS"
- **Suggestion**:
  > "The API follows REST principles, including HATEOAS (Hypermedia as the Engine of Application State), which means..."

#### Recommendations
1. Define target tone and maintain consistency
2. Explain technical terms for non-technical readers
3. Use "you" to address reader directly

### 4. Grammar and Mechanics Score: [X/10]

#### Issues Found
- **Grammar Errors**: [Count]
- **Punctuation Issues**: [Count]
- **Spelling Errors**: [Count]
- **Formatting Issues**: [Count]

#### Specific Errors

**Error 1: Subject-Verb Agreement**
- **Location**: [Line/paragraph]
- **Error**: "The list of items are long"
- **Correction**: "The list of items is long"

**Error 2: Comma Splice**
- **Location**: [Line/paragraph]
- **Error**: "The feature is complete, we can release it"
- **Correction**: "The feature is complete. We can release it." or "The feature is complete, so we can release it."

#### Recommendations
1. Use grammar checking tools
2. Read aloud to catch errors
3. Have a second person review

### 5. Engagement Score: [X/10]

#### Assessment
- **Opening**: [Strong/Weak]
- **Flow**: [Smooth/Choppy]
- **Examples**: [Sufficient/Insufficient]
- **Conclusion**: [Strong/Weak]

#### Issues Identified

**Issue 1: Weak Opening**
- **Location**: Introduction
- **Problem**: Doesn't grab attention or state value
- **Current**:
  > "This document describes the authentication system."
- **Suggestion**:
  > "Secure authentication is critical for protecting user data. This guide shows you how to implement a robust authentication system that balances security with user experience."

**Issue 2: Lack of Examples**
- **Location**: Technical sections
- **Problem**: Abstract concepts without concrete examples
- **Suggestion**: Add code examples, diagrams, or use cases

#### Recommendations
1. Start with a compelling hook or value proposition
2. Use examples and analogies to explain concepts
3. End with clear next steps or call to action

## Specific Edits

### Section: [Section Name]

**Original**:
> [Original paragraph]

**Suggested Edit**:
> [Improved paragraph]

**Rationale**: [Why this is better]

### Section: [Section Name]

**Original**:
> [Original paragraph]

**Suggested Edit**:
> [Improved paragraph]

**Rationale**: [Why this is better]

## Readability Improvements

### Before and After Examples

**Example 1: Complex Sentence**
- **Before**: "The system, which was designed to handle high loads, can process thousands of requests per second, making it suitable for enterprise applications."
- **After**: "The system handles high loads. It processes thousands of requests per second. This makes it suitable for enterprise applications."

**Example 2: Passive Voice**
- **Before**: "The configuration file must be edited by the administrator."
- **After**: "The administrator must edit the configuration file."

**Example 3: Jargon**
- **Before**: "The API implements OAuth 2.0 with PKCE."
- **After**: "The API uses OAuth 2.0 (a standard for secure authorization) with PKCE (Proof Key for Code Exchange, an extension that prevents authorization code interception attacks)."

## Audience Analysis

### Intended Audience
- **Technical Level**: [Beginner/Intermediate/Expert]
- **Role**: [Developer/Manager/Executive/User]
- **Goals**: [What they want to achieve]

### Audience Fit Assessment
- **Appropriate Complexity**: [Yes/No]
- **Relevant Examples**: [Yes/No]
- **Useful Depth**: [Yes/No]

### Recommendations for Audience
1. [Adjustment for audience]
2. [Adjustment for audience]

## Overall Recommendations

### Priority 1 (Must Fix)
1. [Most critical issue with specific action]
2. [Next critical issue with specific action]

### Priority 2 (Should Fix)
1. [Important issue with specific action]
2. [Next important issue with specific action]

### Priority 3 (Nice to Fix)
1. [Minor issue with specific action]
2. [Next minor issue with specific action]

## Style Guide Compliance

### Adherence to Style Guide
- **Terminology**: [Consistent/Inconsistent]
- **Formatting**: [Compliant/Non-compliant]
- **Tone**: [Aligned/Misaligned]

### Violations
1. [Violation with correction]
2. [Violation with correction]

## Final Assessment

**Overall Quality**: [Excellent/Good/Fair/Poor]

**Ready for Publication**: [Yes/No/With Revisions]

**Key Takeaway**: [One-sentence summary of main improvement needed]
```

## Implementation Details

### Review Process
1. **First Read**: Read for overall understanding and flow
2. **Clarity Check**: Identify unclear or confusing sections
3. **Readability Analysis**: Measure sentence and paragraph length
4. **Tone Assessment**: Evaluate appropriateness and consistency
5. **Grammar Check**: Identify errors and inconsistencies
6. **Engagement Review**: Assess opening, flow, and conclusion
7. **Specific Edits**: Provide concrete improvements

### Readability Formulas

#### Flesch Reading Ease
Score = 206.835 - 1.015 × (words/sentences) - 84.6 × (syllables/words)
- 90-100: Very easy (5th grade)
- 60-70: Standard (8th-9th grade) - ideal for technical docs
- 30-50: Difficult (college)
- 0-30: Very difficult (graduate)

#### Flesch-Kincaid Grade Level
Grade = 0.39 × (words/sentences) + 11.8 × (syllables/words) - 15.59
- Target: 10-12 for technical documentation
- Target: 8-10 for user-facing content

#### Gunning Fog Index
Grade = 0.4 × [(words/sentences) + 100 × (complex words/words)]
- Target: 12-14 for technical documentation

### Quality Gates
Before finalizing review:
- All five dimensions are assessed
- Specific examples are provided
- Actionable recommendations are given
- Tone is constructive and helpful
- Edits are clear and justified

## Usage Examples

### Technical Documentation Review
```
User: "Review this API documentation"

csp-review-editorial-prose ./api-docs.md
```

Output: Editorial review identifying:
- Clarity: Undefined technical terms
- Readability: Long paragraphs, passive voice
- Tone: Too formal, inconsistent
- Grammar: Comma splices, subject-verb agreement
- Engagement: Weak opening, no examples

### README Review
```
User: "Review this README file"

csp-review-editorial-prose ./README.md
```

Output: Editorial review identifying:
- Clarity: Unclear installation instructions
- Readability: Good overall, some long sentences
- Tone: Appropriate for developers
- Grammar: Minor typos
- Engagement: Strong opening, good examples

### Blog Post Review
```
User: "Review this blog post before publishing"

csp-review-editorial-prose [blog post content]
```

Output: Editorial review identifying:
- Clarity: Complex concepts need examples
- Readability: Good sentence variety
- Tone: Engaging and conversational
- Grammar: Clean
- Engagement: Strong hook, weak conclusion

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "review writing", "editorial review", "proofread", "improve clarity"
- Recognized as a documentation quality tool
- Can be used on any written content

### With Other CSP Tools
- \*\*csp-review-editorial-structure**: Complements with structural review
- \*\*csp-spec**: Reviews SPEC documents for clarity
- **Phase Workflows**: Reviews documentation in implementation phase

### With Specialized Agents
- Technical Writer leads editorial reviews
- Product Manager reviews user-facing content
- Business Analyst reviews business documents
- All agents can review their own outputs

### With External CSP Components
- **CSP Documentation**: Aligns with documentation best practices
- **CSP Documentation**: Integrates with CSP documentation workflows

## Best Practices

1. **Know Your Audience**: Tailor language and complexity to readers
2. **Be Specific**: Provide concrete examples and edits
3. **Be Constructive**: Focus on improvement, not criticism
4. **Prioritize**: Focus on issues that impact understanding
5. **Preserve Voice**: Improve clarity without changing author's voice
6. **Explain Why**: Help authors understand the improvements

## Anti-Patterns to Avoid
- Rewriting in your own voice
- Focusing only on grammar
- Ignoring audience needs
- Being overly critical
- Not providing specific improvements
- Changing technical meaning

## Advanced Features

### Style Guide Validation
Check against specific style guides:
```
csp-review-editorial-prose --style-guide google
csp-review-editorial-prose --style-guide microsoft
```

### Readability Optimization
Optimize for specific reading level:
```
csp-review-editorial-prose --target-grade 10
```

### Tone Adjustment
Adjust tone for different audiences:
```
csp-review-editorial-prose --tone casual
csp-review-editorial-prose --tone formal
```
