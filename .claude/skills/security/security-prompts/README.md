# Security Prompts Skills

**Converted from**: `.claude/security-prompts/` (original prompt library)
**Converted on**: 2025-10-23
**Total Templates**: 23 security prompt templates
**Format**: Claude Code Skills with automatic trigger activation

---

## What Changed

### Before (Prompt Library)
- **Location**: `.claude/security-prompts/`
- **Format**: Markdown files organized by category
- **Usage**: Manual copy-paste from files
- **Discovery**: Browse README or files manually
- **Agent Access**: Agents had to know exact paths

### After (Skills System)
- **Location**: `.claude/skills/security/security-prompts/`
- **Format**: Skills with SKILL.md + template files
- **Usage**: Automatic activation via trigger keywords
- **Discovery**: Keywords automatically trigger appropriate skill
- **Agent Access**: Agents can reference skills by name or keyword

---

## Structure

```
.claude/skills/security/security-prompts/
├── SKILL.md                          # Main skill (overview & directory)
│
├── prompt-engineering/               # 8 comprehensive templates
│   ├── SKILL.md                      # Category skill
│   ├── 01_secure_form.md
│   ├── 02_authenticated_endpoint.md
│   ├── 03_public_endpoint.md
│   ├── 04_admin_action.md
│   ├── 05_file_upload.md
│   ├── 06_composable_middleware.md
│   ├── 07_new_control.md
│   └── 08_security_testing.md
│
├── threat-modeling/                  # 8 analysis templates
│   ├── SKILL.md                      # Category skill
│   ├── 01_stride_analysis.md
│   ├── 02_feature_threats.md
│   ├── 03_architecture_impact.md
│   ├── 04_code_review.md
│   ├── 05_security_tests.md
│   ├── 06_owasp_check.md
│   ├── 07_payment_security.md
│   └── 08_update_model.md
│
├── auth-authorization/               # 4 auth/authz templates
│   ├── SKILL.md                      # Category skill
│   ├── 01_rbac_implementation.md
│   ├── 02_permissions.md
│   ├── 03_ownership.md
│   └── 04_auth_testing.md
│
└── built-in-controls/                # 3 simple templates
    ├── SKILL.md                      # Category skill
    ├── 01_contact_form.md
    ├── 02_authenticated_update.md
    └── 03_public_api.md
```

---

## How to Use

### For Users (Automatic Activation)

Simply mention trigger keywords and the skill activates:

**Example 1**:
```
User: "I need to add a secure contact form"
→ Triggers: security-prompts skill
→ Claude suggests: built-in-controls/01_contact_form.md
```

**Example 2**:
```
User: "Help me implement RBAC with Clerk"
→ Triggers: security-prompts-auth skill
→ Claude suggests: auth-authorization/01_rbac_implementation.md
```

**Example 3**:
```
User: "I need to do a STRIDE threat model"
→ Triggers: security-prompts-threat-modeling skill
→ Claude suggests: threat-modeling/01_stride_analysis.md
```

### For Agents (Explicit Reference)

Agents can reference skills directly:

```markdown
# In agent instructions
"Use security prompt templates from the security-prompts skill to guide implementation"

# Load specific template
"Apply the RBAC template from:
.claude/skills/security/security-prompts/auth-authorization/01_rbac_implementation.md"

# Reference by trigger
"Use the admin action security template to implement this feature"
```

### For Skills (Chaining)

Skills can reference each other:

```markdown
# In a security implementation skill
"For authentication setup, reference the security-prompts-auth skill templates"

# Chain multiple skills
"First use security-prompts-auth for RBAC, then security-prompts-engineering for the feature"
```

---

## Trigger Keywords by Category

### Main Skill (security-prompts)
Triggers when mentioning:
- "security prompt"
- "secure form"
- "RBAC"
- "threat model"
- "STRIDE"
- "admin endpoint"
- "file upload"
- "security testing"
- "code review"
- "OWASP"

### Prompt Engineering (security-prompts-engineering)
Specific triggers:
- "secure form" / "contact form"
- "authenticated endpoint" / "user update"
- "public endpoint" / "public API"
- "admin action" / "admin feature"
- "file upload" / "image upload"
- "composable middleware" / "security layers"
- "new security control" / "custom middleware"
- "security testing" / "test security"

### Threat Modeling (security-prompts-threat-modeling)
Specific triggers:
- "STRIDE" / "threat model"
- "feature threats" / "analyze feature"
- "architecture security" / "security impact"
- "security review" / "code review"
- "OWASP" / "OWASP compliance"
- "payment security" / "Stripe security"
- "update threat model"

### Auth & Authorization (security-prompts-auth)
Specific triggers:
- "RBAC" / "role-based access"
- "permissions" / "permission system"
- "ownership" / "ownership check"
- "auth testing" / "authorization tests"

### Built-In Controls (security-prompts-controls)
Specific triggers:
- "contact form" / "simple form"
- "authenticated update" / "update profile"
- "public API" / "read-only API"

---

## Integration Examples

### Example 1: Security-Aware Agent

```yaml
# .claude/agents/secure-feature-builder.md
---
name: secure-feature-builder
description: Builds features with security-first approach using security-prompts skill
---

When implementing features:

1. **Identify feature type**
   - Form, API, auth, admin, file upload

2. **Load security-prompts skill template**
   - Use trigger keywords or direct file reference
   - Customize template for user's needs

3. **Generate implementation**
   - Follow template security controls
   - Apply testing checklist

4. **Recommend related templates**
   - Testing templates
   - Threat model updates
```

### Example 2: Course Lesson Using Security Prompts

```markdown
# In course-lesson-builder skill

When teaching secure feature implementation:

**Show students the security prompt to use:**

"Prompt to Claude Code:"
```
I need to implement a contact form with full security controls.

Use the security prompt template for secure forms.

Reference: @docs/security/SECURITY_ARCHITECTURE.md
```

This triggers the security-prompts skill automatically.
```

### Example 3: Security Orchestrator Agent

```yaml
# In security-orchestrator agent

When conducting security assessment:

Step 1: Threat Model
→ Use template: security-prompts/threat-modeling/01_stride_analysis.md

Step 2: Code Review
→ Use template: security-prompts/threat-modeling/04_code_review.md

Step 3: OWASP Check
→ Use template: security-prompts/threat-modeling/06_owasp_check.md
```

---

## Migration Guide

### For Existing Code References

If you have existing references to `.claude/security-prompts/`:

**Option 1**: Update to new path
```markdown
# Old
.claude/security-prompts/prompt-engineering/01_secure_form.md

# New
.claude/skills/security/security-prompts/prompt-engineering/01_secure_form.md
```

**Option 2**: Use trigger keywords (recommended)
```markdown
# Instead of referencing path
"Use the secure form security template"
# Automatically activates skill
```

### For Agents

Update agent instructions:

**Old approach**:
```markdown
"Read prompt from .claude/security-prompts/..."
```

**New approach**:
```markdown
"Use security-prompts skill template for [feature type]"
```

### For Course Content

Update module references:

**Old**:
```markdown
See: `.claude/security-prompts/README.md`
```

**New**:
```markdown
Skills Triggered: Keywords like "secure form", "RBAC", "STRIDE" activate security-prompts skill automatically.
```

---

## Benefits of Skills Format

### 1. Automatic Activation
- No need to know exact paths
- Keywords trigger appropriate templates
- Contextual suggestions

### 2. Better Discovery
- Claude suggests relevant templates
- Trigger keywords guide users
- Related templates linked

### 3. Agent Integration
- Agents can reference by name
- Skills can chain together
- Easier orchestration

### 4. Maintainability
- Centralized in skills directory
- Clear skill boundaries
- Version tracking per skill

### 5. Composability
- Skills reference each other
- Build complex workflows
- Reusable patterns

---

## Maintenance

### Adding New Templates

1. **Add template file** to appropriate category directory
2. **Update category SKILL.md** with new template info
3. **Update main SKILL.md** quick reference
4. **Add trigger keywords** to skill description
5. **Link related templates**

### Updating Existing Templates

1. **Modify template file** in place
2. **Update version history** in template
3. **Update SKILL.md if** triggers/usage changed
4. **Test with** real implementation

### Deprecating Templates

1. **Mark as deprecated** in template and SKILL.md
2. **Provide migration path** to new template
3. **Keep file** for backwards compatibility
4. **Remove trigger keywords** to prevent activation

---

## Testing the Skills

### Test Automatic Activation

Ask Claude:
```
"I need to add a contact form"
→ Should suggest built-in-controls/01_contact_form.md

"Help me implement RBAC"
→ Should suggest auth-authorization/01_rbac_implementation.md

"I need to create a threat model"
→ Should suggest threat-modeling/01_stride_analysis.md
```

### Test Agent References

In agent:
```markdown
"Use security-prompts skill for implementation guidance"
→ Should load appropriate templates
```

### Test Skill Chaining

Request complex feature:
```
"I need an admin dashboard with RBAC"
→ Should suggest:
   1. auth-authorization/01_rbac_implementation.md
   2. prompt-engineering/04_admin_action.md
   3. prompt-engineering/08_security_testing.md
```

---

## Related Skills

### Works With

- **course-lesson-builder** - Teaching security using prompts
- **security/*** - Implementation-focused security skills
- **security-awareness/*** - Understanding vulnerability patterns
- **threat-modeler** (agent) - Using threat modeling templates
- **security-scanner** (agent) - Using review templates
- **security-reporter** (agent) - Using reporting templates

### Complements

- **csrf-protection** - Deep dive on CSRF
- **rate-limiting** - Deep dive on rate limiting
- **input-validation** - Deep dive on validation
- **auth-security** - Deep dive on Clerk auth
- **security-testing** - Deep dive on testing

---

## Troubleshooting

### Skill Not Activating

**Problem**: Trigger keywords not working

**Solution**:
1. Check keyword spelling matches SKILL.md
2. Try more specific keywords
3. Use direct file reference
4. Check skill is in `.claude/skills/`

### Wrong Template Suggested

**Problem**: Claude suggests incorrect template

**Solution**:
1. Be more specific in request
2. Mention category explicitly
3. Reference template directly
4. Provide more context

### Agent Can't Find Template

**Problem**: Agent can't access skill

**Solution**:
1. Use full path: `.claude/skills/security/security-prompts/[category]/[file].md`
2. Reference skill name: `security-prompts-[category]`
3. Check agent has Read tool access
4. Verify file exists

---

## Version History

**v1.0** (2025-10-23): Initial conversion from prompt library to skills
- Converted 23 prompt templates
- Created 5 skill files (main + 4 categories)
- Added trigger keywords for automatic activation
- Integrated with agent system
- Added usage examples and migration guide

---

## Original Prompt Library

The original prompt library remains at `.claude/security-prompts/` for reference and backwards compatibility. The new skills system in `.claude/skills/security/security-prompts/` is the recommended approach going forward.

**Original location**: `.claude/security-prompts/`
**Original documentation**: `.claude/security-prompts/README.md`

---

## Questions?

For issues or suggestions:
1. Check this README
2. Review category SKILL.md files
3. Reference original prompt documentation
4. Test with trigger keywords

---

**Pro Tip**: Let trigger keywords do the work! Instead of remembering paths, just describe what you need: "secure contact form", "implement RBAC", "threat model", etc. The skills system will guide you to the right template.
