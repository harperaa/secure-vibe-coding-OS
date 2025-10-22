---
name: course-lesson-builder
description: Build educational course modules following a consistent format with learning objectives, content sections, hands-on practice, and summaries. Use this skill when creating new course modules, lessons, or educational content that follows the Secure Vibe Coding course format. Triggers include "create course module", "build lesson", "write course content", "module format", "educational content", "lesson structure".
---

# Course Module Builder Skill

## Purpose

This skill guides the creation of educational course modules that follow a consistent, learner-friendly format. Use this when building any module for the Secure Vibe Coding course or similar educational content.  

## Course Outline Reference

Always reference the master course outline to ensure module fits the overall curriculum:
- **File:** `Secure Vibe Coding Course - 10 Modules.tsx` (in project root)
- **Contains:** All module titles, topics, learning paths, and how modules connect

## Leverage Claude Code Skills when we have them
If you notice there is a claude skill for the given assignment, then use it by ensuring the prompts given will invoke the skill.  In that case, give a comment outside the prompt, letting the student know what skill is being used and why. remove references to course-module-builder and also just use key words in prompts, to automatically invoke the skill, there is no need to tell claude to do that, then move the invoked skills outside the prompt, outside the code markdown.  For example, outside the markdown of the prompt, let the student know what skill are triggered, like this:

>Skills Triggered: Keywords like "Clerk", "authenticated", "sanitize", "XSS", "validate", "rate limit", and "log" trigger appropriate security skills.

## IMPORTANT. - leverage the Secure Vibe Coding OS, throughout, given the project level uploaded file for module 2.6, Secure Vibe Coding OS. Since we already have a secure baseline, understand that module 2.6 and use it to extend the Secure Vibe Coding OS with the given topic for the course lesson.  For example, if talking about authentication, extend the baseline already given in the Secure Vibe Coding OS.  I want the lessons to help the user extend that baseline and accomplish all they would need to as a secure vibe coder, by implementing features securely.  So, always think, how could this topic build upon the Secure Vibe Coding OS.

## Security Prompt Format
The Five Essential Components

Every effective security prompt contains five components. Miss one, and you've left a security gap.

Component 1: Context

Tell Claude what you're building and why. This helps Claude understand the security implications.

Context:
I'm building a healthcare appointment booking system that stores patient personal information including names, dates of birth, and medical history. HIPAA compliance is required.


vs.

Context:
I'm building a public blog where users can post articles. No sensitive data is stored.


Claude will apply different security controls based on this context. Healthcare requires encryption at rest, strict access controls, and audit logging. A blog needs XSS protection and authentication, but not the same level of data protection.

Component 2: Functional Requirements

What should the feature do? Be specific about user actions and system responses.

Functional Requirements:
- Users can update their profile information (name, email, bio, avatar URL)
- Changes should be saved to the database
- Users should see a success message after saving
- Form should show current values when loaded


Component 3: Security Requirements

This is the critical part. Explicitly state what security controls must be implemented. Use specific security keywords to trigger Claude's specialized knowledge.

Security Requirements:
- Only authenticated users can access this feature (Clerk session validation)
- Users can only update their own profile (verify user ID matches session)
- Sanitize all inputs to prevent XSS attacks
- Validate email format before saving
- Limit bio to 500 characters to prevent abuse
- Validate avatar URL is HTTPS and points to image file
- Rate limit to 10 updates per hour per user
- Log all profile updates with timestamp and user ID for audit trail




Skills Triggered: Keywords like "Clerk", "authenticated", "sanitize", "XSS", "validate", "rate limit", and "log" trigger appropriate security skills.

Component 4: Technical Specifications

How should it integrate with your existing architecture?

Technical Specifications:
- Use Clerk for authentication (check session validity)
- Store data in MongoDB users collection
- Follow data access patterns from docs/database/MONGODB_SETUP.md
- Use environment variables for database connection
- Return appropriate HTTP status codes (200 success, 400 validation error, 401 unauthorized, 429 rate limited)


Component 5: Validation Criteria

How will you know the implementation is correct and secure?

Validation:
After implementation, I should be able to:
1. Verify that unauthenticated requests are rejected
2. Confirm user A cannot update user B's profile
3. Test that XSS attempts in bio field are sanitized
4. Validate that rate limiting blocks excessive requests
5. See audit logs for all profile changes

The Complete Reusable Template

Here's a template you can copy and customize for any feature:

PROMPT TEMPLATE: [Feature Name]

CONTEXT:
[What you're building and why - 2-3 sentences]
[Sensitivity of data involved]
[Compliance requirements if any]

FUNCTIONAL REQUIREMENTS:
[What the feature should do]
- [User action 1]
- [System response 1]
- [User action 2]
- [System response 2]

SECURITY REQUIREMENTS:
Authentication:
- [Who can access - use "Clerk" or "authenticated" keywords]
- [How authentication is verified - use "session" or "token" keywords]

Authorization:
- [What permissions needed - use "RBAC" or "permissions" keywords]
- [How ownership verified - use "authorization check" keywords]

Input Validation:
- [What inputs sanitized - use "sanitize" and "XSS" keywords]
- [Validation rules - use "validate" keyword]
- [Length/format limits]

Data Protection:
- [What data encrypted - use "encrypt" keyword]
- [How sensitive data handled - use "secure" keyword]

Error Handling:
- [Error messages - use "generic error" keywords]
- [What logged - use "log" or "audit" keywords]

Rate Limiting:
- [Request limits - use "rate limit" keywords]
- [Time windows]

TECHNICAL SPECIFICATIONS:
- Framework/tools: [Next.js, Clerk, MongoDB, etc.]
- Integration: [Reference architecture docs]
- Environment: [Variables needed]
- Dependencies: [External services]

VALIDATION CRITERIA:
After implementation, I should be able to:
1. [Test case 1]
2. [Test case 2]
3. [Test case 3]

Please implement [feature name] following these security requirements. Explain your security decisions and where each control is implemented.


Notice how the template includes specific security keywords throughout (Clerk, authenticated, sanitize, XSS, validate, rate limit, encrypt, log, RBAC, etc.). These keywords automatically trigger Claude's specialized security knowledge without needing to explicitly tell Claude which skills to use.


## Standard Module Format

Every course module follows this structure:

### 1. Header (Title and Subtitle)
```markdown
# X.Y: Module Title

**Compelling Subtitle That Describes the Value**
```

### 2. Learning Objectives
```markdown
## Learning Objectives

By the end of this lesson, you will be able to:

- [Specific, measurable objective 1]
- [Specific, measurable objective 2]
- [Specific, measurable objective 3]
- [Specific, measurable objective 4-6]
```

**Guidelines:**
- Use action verbs (understand, identify, implement, design, analyze)
- Make them specific and measurable
- 4-6 objectives per module
- Each objective should be verifiable in the hands-on practice

### 3. Content Sections

```markdown
---

## Section 1: [Topic Name]

### What Is [Concept]?

[Clear explanation in simple terms]

[Use analogies when helpful]

### Why [Concept] Matters

**The Problem:**
[Describe the problem this solves]

**The Solution:**
[Explain how this concept addresses it]

**Real-World Impact:**
[Statistics, research, or examples]

---

## Section 2: [Next Topic]

### [Sub-topic A]

[Content with examples]

### [Sub-topic B]

[Content with examples]
```

**Content Guidelines:**

**Use Clear Structure:**
- Break complex topics into digestible sections
- Use headers (##, ###) for clear navigation
- Separate concepts with `---` dividers

**Keep It Practical:**
- Explain WHY before HOW
- Use real-world examples and statistics
- Reference actual project files when applicable

**Use Visual Elements:**
- ASCII diagrams for architecture/flow
- Tables for comparisons
- Code blocks for examples
- Bullet points for lists

**Reference, Don't Duplicate:**
- Point to documentation files instead of repeating content
- Reference other modules for related concepts
- Use `@filename` syntax for file references

**Leverage Claude Code Prompts Instead of Code:**

Rather than showing code to copy, show prompts students use:

```markdown
**Prompt to Claude Code:**
\```
[Specific prompt that achieves the learning objective]

Reference @docs/relevant-file.md for context.

[What to ask Claude to do]
\```
```

This teaches students HOW to use Claude Code, not just gives them code.

### 4. Hands-On Practice (Keep Simple!)

```markdown
---

## Hands-On Practice: [Descriptive Title]

**Objective:** [One sentence - what they'll accomplish]

**Time:** [Realistic time estimate - aim for 30-90 minutes total]

**Prerequisites:** [Any required setup or prior modules]

---

### Part 1: [Task Name] ([Time estimate])

**Task:** [Clear, specific task description]

[Step-by-step instructions if needed]

**Verification:**
- [ ] Checklist item 1
- [ ] Checklist item 2

**What you're learning:** [One sentence explanation]

---

### Part 2: [Task Name] ([Time estimate])

**Task:** [Description]

**Prompt to Claude Code:**
\```
[Specific prompt students should use]
\```

**What you're learning:** [One sentence]

---

### Part 3: [Task Name] ([Time estimate])

[Similar format]

---

## Deliverables

By completing this hands-on practice, you should be able to:

- [ ] [Specific deliverable 1]
- [ ] [Specific deliverable 2]
- [ ] [Specific deliverable 3]

**Expected Time:** [Total time]

[Encouraging closing statement]
```

**Hands-On Guidelines:**

**Keep It Short:**
- 2-4 parts maximum
- 30-90 minutes total
- Each part: 10-30 minutes
- Students should complete in one session

**Make It Practical:**
- Tasks should directly test learning objectives
- Use verification checklists
- Provide clear success criteria

**Use Prompts, Not Code:**
- Show Claude Code prompts to use
- Teach HOW to get results, not just give answers
- Students learn by prompting Claude

**Avoid:**
- ❌ 3+ hour exercises (too long, overwhelming)
- ❌ Complex multi-template customizations
- ❌ Asking students to write extensive documentation
- ❌ Requiring multiple deliverable files
- ❌ Open-ended "design something comprehensive" tasks

**Do:**
- ✅ Clear, bounded tasks
- ✅ Verification checklists
- ✅ Claude Code prompts for complex work
- ✅ One primary deliverable

### 5. Summary

```markdown
---

## Summary

[2-4 paragraph summary of the entire module]

**Key Takeaways:**

1. [Core concept 1]
2. [Core concept 2]
3. [Core concept 3]
4. [Core concept 4-6]

[Connecting statement to next module or overall course]
```

**Summary Guidelines:**
- Recap the main points
- Reinforce key concepts
- Connect to broader course themes
- Set up next module

---

## Examples from Existing Modules

### Good Example: Module 2.6 (Simplified Version)

**Structure:**
- Learning Objectives (6 clear objectives)
- Section 1: Understanding Secure Vibe Coding OS (conceptual)
- Section 2: Installation and Setup (practical steps)
- Section 3: Understanding the Security Stack (technical)
- **Hands-On Practice:** 60 minutes, 3 simple parts
  - Part 1: Install (30 min)
  - Part 2: Review architecture (20 min)
  - Part 3: Test controls (10 min)
- Deliverables: Simple checklist
- Next Steps: Clear transition
- Quick Reference: Utilities
- Summary: Comprehensive recap

**What works:**
- ✅ Clear progression from concepts to practice
- ✅ Hands-on is achievable (60 min, not 3 hours)
- ✅ Uses Claude Code prompts for understanding
- ✅ Verification checklists at each step
- ✅ Practical deliverables

### Good Example: Module 2.1

**Structure:**
- Learning Objectives
- Content sections teaching concepts
- Hands-On Practice with 6 parts
- Each part has Claude Code validation prompts
- Deliverable: One architecture document

**What works:**
- ✅ Teaches concepts before asking students to apply them
- ✅ Uses Claude Code to validate student work
- ✅ References project files (@docs/security/SECURITY_ARCHITECTURE.md)
- ✅ Clear format for deliverable

---

## Building a New Module: Step-by-Step

### Step 1: Review Course Outline

**Before creating any module:**

1. Read `secure vibe coding course - 10 modules.tsx`
2. Find the module number and title
3. Understand:
   - What concepts this module teaches
   - Prerequisites (what students learned before)
   - How it connects to next module
   - Overall course learning path

### Step 2: Define Learning Objectives

Ask yourself:
- What should students be able to DO after this module?
- How will I verify they learned it? (informs hands-on practice)
- Are objectives specific and measurable?

**Format:**
```markdown
## Learning Objectives

By the end of this lesson, you will be able to:

- [Action verb] [specific skill/knowledge]
- [Action verb] [specific skill/knowledge]
...
```

### Step 3: Create Content Sections

**Outline the content flow:**
1. What is [concept]? (Definition)
2. Why does it matter? (Motivation)
3. How does it work? (Explanation)
4. When to use it? (Application)

**Use this pattern for each major concept:**
- Introduce concept
- Explain why it matters (statistics, examples)
- Show how it works (diagrams, examples)
- Reference project files for implementation

**Integrate Claude Code:**
- Show prompts for understanding
- Demonstrate prompts for implementation
- Teach students HOW to work with Claude

### Step 4: Design Hands-On Practice

**Map to learning objectives:**
- Each objective should have a task
- Tasks should be completable in total 30-90 minutes
- Use verification checklists

**Structure:**
1. **Part 1:** Setup/Installation (if needed)
2. **Part 2:** Core concept application
3. **Part 3:** Testing/Verification
4. **Part 4:** (Optional) Extension activity

**Make each part:**
- Have clear task description
- Include time estimate
- Use Claude Code prompts for complex work
- Have verification checklist
- End with "What you're learning"

### Step 5: Write Summary

**Recap:**
- Restate key concepts from content
- Highlight most important takeaways
- Connect to course progression

**Format:**
- 2-4 paragraphs of prose summary
- Bulleted key takeaways (4-6 items)
- Forward-looking statement

---

## Common Patterns

### Pattern 1: Conceptual Module (Teaching Theory)

**Use when:** Module teaches concepts, not hands-on implementation

**Format:**
- Heavy on content sections (60% of module)
- Hands-on practice: Apply concepts through prompting Claude
- Deliverable: Understanding demonstrated through Claude Code conversations

**Example:** Module on security architecture fundamentals

### Pattern 2: Implementation Module (Teaching Skills)

**Use when:** Module teaches how to build something

**Format:**
- Content explains what and why (40%)
- Hands-on practice: Build something concrete (60%)
- Deliverable: Working implementation

**Example:** Module on implementing rate limiting

### Pattern 3: Tool/Starter Module (Teaching Usage)

**Use when:** Module introduces a tool or starter template

**Format:**
- Section 1: What it is and why it matters
- Section 2: Installation and setup (detailed)
- Section 3: Understanding the components
- Hands-on: Install, explore, test
- Deliverable: Working installation and understanding

**Example:** Module 2.6 (Secure Vibe Coding OS)

---

## Formatting Standards

### Use Consistent Markdown

**Headers:**
```markdown
# Module Title (H1 - once only)
## Major Sections (H2)
### Subsections (H3)
#### Details (H4 - sparingly)
```

**Code Blocks:**
```markdown
\```bash
# For terminal commands
\```

\```typescript
// For code examples
\```

\```markdown
# For showing document structure
\```

\```
# For Claude Code prompts
\```
```

**Emphasis:**
- **Bold** for key terms, important points
- *Italic* for emphasis (use sparingly)
- `code` for file names, functions, commands

**Lists:**
- Bullet points for unordered lists
- Numbered lists for steps/sequences
- Checklists `- [ ]` for deliverables/verification

**Visual Separators:**
- `---` between major concepts
- `---` before hands-on practice
- `---` before summary

### File References

**Always use @ syntax:**
```markdown
Review @docs/security/SECURITY_ARCHITECTURE.md for details.
```

**Reference relative to project root:**
```markdown
@docs/course/MODULE_2.1_Security_Architecture.md
@lib/validation.ts
@.cursor/rules/security_rules.mdc
```

### Claude Code Prompts

**Format prompts as code blocks:**
````markdown
**Prompt to Claude Code:**
```
[Your prompt here]

Reference @relevant-file.md

[Specific instructions]
```
````

---

## Quality Checklist

Before considering a module complete, verify:

### Content Quality
- [ ] Learning objectives are specific and measurable
- [ ] Content explains WHY before HOW
- [ ] Real-world examples and statistics included
- [ ] Complex concepts broken into digestible sections
- [ ] ASCII diagrams for architecture/flow where helpful
- [ ] Tables for comparisons and breakdowns

### Pedagogical Design
- [ ] Progressive disclosure (simple → complex)
- [ ] Each section builds on previous
- [ ] Prerequisites clearly stated
- [ ] Connects to course outline
- [ ] References other modules appropriately

### Hands-On Practice
- [ ] 2-4 parts (not more)
- [ ] Total time 30-90 minutes
- [ ] Each part has time estimate
- [ ] Verification checklists included
- [ ] Uses Claude Code prompts appropriately
- [ ] Tasks map to learning objectives
- [ ] Deliverables are clear and achievable

### Technical Accuracy
- [ ] File paths are correct
- [ ] Commands work as written
- [ ] References to project files are accurate
- [ ] Code examples follow project conventions
- [ ] No hardcoded values

### Consistency
- [ ] Follows format of existing modules
- [ ] Markdown formatting consistent
- [ ] Header levels appropriate
- [ ] Matches tone and style of course
- [ ] Cross-platform commands (macOS, Linux, Windows)

---

## Common Mistakes to Avoid

### Content Mistakes
- ❌ Starting with implementation before explaining WHY
- ❌ Assuming prior knowledge not covered in prerequisites
- ❌ Using jargon without defining it
- ❌ Skipping real-world context/motivation
- ❌ Making content too theoretical without practical application

### Hands-On Mistakes
- ❌ Exercises over 2 hours (too long, students won't finish)
- ❌ Asking students to create extensive documentation (slows learning)
- ❌ Open-ended "design something comprehensive" without guidance
- ❌ Too many deliverable files (creates overhead)
- ❌ No verification criteria (students don't know if they succeeded)

### Format Mistakes
- ❌ Inconsistent header levels
- ❌ Missing file references (@syntax)
- ❌ Platform-specific commands without alternatives
- ❌ Broken internal links
- ❌ Overly long paragraphs (break into bullets)

### Pedagogical Mistakes
- ❌ Not mapping hands-on to learning objectives
- ❌ Cramming too many concepts into one module
- ❌ Not connecting to previous/next modules
- ❌ Assuming students will "figure it out"
- ❌ Not providing Claude Code prompts for complex tasks

---

## Template for New Module

```markdown
# X.Y: [Module Title]

**[Compelling Subtitle]**

## Learning Objectives

By the end of this lesson, you will be able to:

- [Objective 1]
- [Objective 2]
- [Objective 3]
- [Objective 4]

---

## Section 1: [Introduction to Main Concept]

### What Is [Concept]?

[Clear explanation]

### Why [Concept] Matters

**The Problem:**
[What problem does this solve?]

**The Solution:**
[How this concept addresses it]

**Real-World Impact:**
[Statistics, examples, research]

---

## Section 2: [Deep Dive into Concept]

### [Sub-topic A]

[Content with examples]

**Example:**
[Show concrete example]

### [Sub-topic B]

[Content]

**Diagram:**
\```
[ASCII diagram if helpful]
\```

---

## Section 3: [Practical Application]

### [How to Use This]

[Practical guidance]

**Reference:** See @docs/[relevant-file].md for implementation

**Prompt to Claude Code:**
\```
[Show students how to get Claude's help understanding this]
\```

---

## Hands-On Practice: [Descriptive Title]

**Objective:** [One sentence goal]

**Time:** [30-90 minutes]

**Prerequisites:** [Any setup needed]

---

### Part 1: [Task Name] ([Time])

**Task:** [Clear instructions]

[Steps if needed]

**Verification:**
- [ ] Success criterion 1
- [ ] Success criterion 2

**What you're learning:** [One sentence]

---

### Part 2: [Task Name] ([Time])

**Task:** [Instructions]

**Prompt to Claude Code:**
\```
[Specific prompt for this task]
\```

**What you're learning:** [One sentence]

---

### Part 3: [Task Name] ([Time])

**Task:** [Instructions]

[Testing commands, verification steps]

**What you're learning:** [One sentence]

---

## Deliverables

By completing this hands-on practice, you should be able to:

- [ ] [Deliverable 1 - maps to objective]
- [ ] [Deliverable 2 - maps to objective]
- [ ] [Deliverable 3 - maps to objective]

**Expected Time:** [Total time]

[Encouraging closing statement]

---

## Next Steps

[Transition to next module or concept]

**Before Moving On:** [Quick checklist of what they should have accomplished]

[Preview of next module if appropriate]

---

## Summary

[2-4 paragraphs recapping the module]

**Key Takeaways:**

1. [Core concept 1]
2. [Core concept 2]
3. [Core concept 3]
4. [Core concept 4]

[Connecting statement to course progression]
```

---

## Module-Specific Guidance

### For Security Modules

**Include:**
- Statistics on vulnerabilities (e.g., "45% of AI-generated code is insecure")
- Real-world breach examples
- OWASP references
- Defense-in-depth concepts
- Reference to `docs/security/SECURITY_ARCHITECTURE.md`
- Security testing verification

**Hands-on should:**
- Test security controls
- Use security architecture as template
- Prompt Claude with security context
- Verify protections are working

### For Implementation Modules

**Include:**
- File structure and locations
- Configuration steps
- Environment variables needed
- Testing procedures
- Troubleshooting common issues

**Hands-on should:**
- Install/configure the tool
- Implement a feature using it
- Test that it works
- Understand what each component does

### For Conceptual/Architecture Modules

**Include:**
- Architectural diagrams
- Design patterns
- Decision frameworks
- Trade-offs and alternatives
- Best practices

**Hands-on should:**
- Design an architecture
- Document decisions
- Get Claude to review/validate
- Apply concepts to project

---

## Working with the Course Outline

### Before Creating a Module

**Read the outline (`secure vibe coding course - 10 modules.tsx`):**

1. **Identify module position:** Where does this fit in the 10-module sequence?
2. **Check prerequisites:** What must students know before this module?
3. **Understand learning path:** How does this build toward course goals?
4. **Note dependencies:** Which other modules does this reference?

### Prompt for Creating New Module

```
Create a course module following the course-builder skill.

**Module:** [Number and Title from course outline]

**From Course Outline:**
- Prerequisites: [List from outline]
- Key Topics: [List from outline]
- Learning Goals: [From outline]

**Reference:**
- Course outline: @secure vibe coding course - 10 modules.tsx
- Example format: @docs/course/MODULE_2.6_Secure_Vibe_Coding_OS.md
- Example format: @docs/course/MODULE_2.1_Security_Architecture.md

Create the module following the standard format:
1. Learning objectives (4-6 objectives)
2. Content sections (explain concepts with examples)
3. Hands-on practice (60-90 minutes, 3 parts, use Claude Code prompts)
4. Deliverables (simple checklist)
5. Summary (key takeaways)

Keep hands-on simple and practical. Use prompts to teach students how to work with Claude Code.
```

---

## Tips for Different Content Types

### Teaching a Technical Concept

1. **Start with the problem** (why does this exist?)
2. **Explain the solution** (what is it?)
3. **Show how it works** (implementation overview)
4. **Reference implementation** (don't duplicate code)
5. **Hands-on:** Implement it with Claude's help

### Teaching a Tool/Framework

1. **What it is** (purpose, features)
2. **Why use it** (vs alternatives)
3. **Installation** (step-by-step)
4. **Core concepts** (architecture, main features)
5. **Hands-on:** Install, configure, test

### Teaching Best Practices

1. **The problem** (what goes wrong without this)
2. **The pattern** (the right way)
3. **Common mistakes** (what to avoid)
4. **Examples** (good vs bad)
5. **Hands-on:** Apply the pattern to a scenario

---

## Consistency with Existing Modules

### Tone and Style

**Use:**
- Second person ("you will learn")
- Active voice
- Direct, clear language
- Encouraging, not condescending
- Professional but approachable

**Avoid:**
- Passive voice ("it is recommended")
- Overly complex sentences
- Unexplained jargon
- Academic formality
- Talking down to students

### Cross-Platform Support

**Always provide platform-specific instructions:**

```markdown
**macOS / Linux:**
\```bash
command
\```

**Windows (Command Prompt):**
\```cmd
command
\```

**Windows (PowerShell):**
\```powershell
command
\```
```

### Time Estimates

**Be realistic:**
- Students are learning, tasks take longer than you think
- Include setup time, reading time, thinking time
- Test the hands-on yourself before estimating
- Better to over-estimate than under-estimate

**Standard estimates:**
- Reading content: ~1 min per 100 words
- Installation steps: 15-30 min
- Understanding/review: 15-20 min
- Implementation: 20-40 min per feature
- Testing: 10-15 min

---

## Module File Naming

**Convention:**
```
docs/course/MODULE_X.Y_Module_Title.md
```

**Examples:**
- `MODULE_2.1_Security_Architecture.md`
- `MODULE_2.6_Secure_Vibe_Coding_OS.md`
- `MODULE_3.1_Advanced_Security_Patterns.md`

**X** = Major section number
**Y** = Module within section

---

## Final Reminders

**Before submitting a module:**
1. ✅ Proofread for typos and formatting
2. ✅ Test all commands work
3. ✅ Verify all file references are correct
4. ✅ Check hands-on is achievable in stated time
5. ✅ Ensure learning objectives are met by hands-on
6. ✅ Summary captures all key points
7. ✅ Consistent with other modules in tone and format

**The goal:** Students should finish the module with:
- Clear understanding of concepts
- Practical experience applying them
- Confidence to use Claude Code for implementation
- Readiness for the next module

**Keep it simple, practical, and student-focused!**
