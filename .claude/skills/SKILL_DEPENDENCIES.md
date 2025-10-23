# Skill Dependency Map

**Last Updated**: 2025-10-23
**Total Skills**: 24
**Circular References**: ✅ RESOLVED (was 4, now 0)

---

## Skill Organization

### Hierarchical Structure

Skills follow a parent-child hierarchical model with no circular references between siblings:

```
Parent Skill (Hub)
    ↓ (one-way reference)
Child Skills (Categories)
    ↓ (one-way references)
Implementation Skills (Concrete)
```

---

## Security Prompts Skills Hierarchy

### Parent (Hub)

**security-prompts** - Main directory and navigation hub
- Location: `.claude/skills/security/security-prompts/SKILL.md`
- Role: Provides overview, quick reference, directory of all template categories
- References:
  - `course-lesson-builder`
  - `security/*` (all implementation skills)
  - `security-awareness/*` (all awareness skills)
- Referenced by: All child category skills

### Children (Categories)

All category skills reference **only** the parent and implementation skills, **not** each other:

#### 1. **security-prompts-engineering**
- Location: `.claude/skills/security/security-prompts/prompt-engineering/SKILL.md`
- Purpose: Comprehensive templates for complex feature implementation
- References:
  - ✅ `security-prompts` (parent)
  - ✅ `security-testing` (implementation)
  - ✅ `csrf-protection` (implementation)
  - ✅ `rate-limiting` (implementation)
- Does NOT reference: ❌ Other category skills

#### 2. **security-prompts-threat-modeling**
- Location: `.claude/skills/security/security-prompts/threat-modeling/SKILL.md`
- Purpose: Security analysis and threat modeling templates
- References:
  - ✅ `security-prompts` (parent)
  - ✅ `threat-modeler` (agent)
  - ✅ `security-scanner` (agent)
  - ✅ `security-reporter` (agent)
- Does NOT reference: ❌ Other category skills

#### 3. **security-prompts-auth**
- Location: `.claude/skills/security/security-prompts/auth-authorization/SKILL.md`
- Purpose: Authentication and authorization templates
- References:
  - ✅ `security-prompts` (parent)
  - ✅ `auth-security` (implementation)
  - ✅ `clerk` (implementation)
- Does NOT reference: ❌ Other category skills

#### 4. **security-prompts-controls**
- Location: `.claude/skills/security/security-prompts/built-in-controls/SKILL.md`
- Purpose: Simple templates using existing utilities
- References:
  - ✅ `security-prompts` (parent)
  - ✅ `csrf-protection` (implementation)
  - ✅ `rate-limiting` (implementation)
  - ✅ `input-validation` (implementation)
- Does NOT reference: ❌ Other category skills

---

## Dependency Rules

### ✅ ALLOWED Dependencies

**Parent → Children** (one-way):
```
security-prompts → security-prompts-engineering
security-prompts → security-prompts-threat-modeling
security-prompts → security-prompts-auth
security-prompts → security-prompts-controls
```

**Children → Parent** (one-way back reference):
```
security-prompts-engineering → security-prompts
security-prompts-threat-modeling → security-prompts
security-prompts-auth → security-prompts
security-prompts-controls → security-prompts
```

**Children → Implementation Skills**:
```
security-prompts-engineering → csrf-protection
security-prompts-engineering → rate-limiting
security-prompts-engineering → security-testing
security-prompts-auth → auth-security
security-prompts-controls → csrf-protection
security-prompts-controls → rate-limiting
security-prompts-controls → input-validation
```

### ❌ FORBIDDEN Dependencies

**Siblings MUST NOT reference each other**:
```
❌ security-prompts-engineering ←→ security-prompts-auth
❌ security-prompts-engineering ←→ security-prompts-threat-modeling
❌ security-prompts-engineering ←→ security-prompts-controls
❌ security-prompts-auth ←→ security-prompts-threat-modeling
❌ security-prompts-auth ←→ security-prompts-controls
❌ security-prompts-threat-modeling ←→ security-prompts-controls
```

---

## Navigation Pattern

### For Users

When users need another template category:
1. Refer to parent skill (`security-prompts`)
2. Parent shows all available categories
3. User navigates to appropriate category

**Example**:
```
User in: security-prompts-engineering
Needs: Authentication templates
→ See parent security-prompts skill
→ Navigate to security-prompts-auth
```

### For Skills

Skills reference related skills using:

**Parent reference**:
```markdown
## Related Skills

**Parent Skill**:
- **security-prompts** - Main directory with all template categories
```

**Note to users**:
```markdown
**Note**: For other template categories (authentication, threat modeling, etc.),
see the parent `security-prompts` skill
```

---

## Implementation Skills

These are concrete implementation skills referenced by category skills:

### Security Implementation
- `csrf-protection` - CSRF protection patterns
- `rate-limiting` - Rate limiting implementation
- `input-validation` - Input validation and XSS prevention
- `security-headers` - Security headers configuration
- `auth-security` - Clerk authentication
- `security-testing` - Security testing verification
- `error-handling` - Secure error handling
- `payment-security` - Payment security with Clerk Billing and Stripe
- `dependency-security` - Dependency and supply chain security

### Security Awareness
- `vibe-coding-security-awareness-overview` - Overview of AI code vulnerabilities
- `injection-vulnerabilities-ai-generated-code` - Injection risks
- `authentication-authorization-vulnerabilities-ai-code` - Auth vulnerabilities
- `information-leakage-hardcoded-secrets-ai-code` - Information leakage
- `supply-chain-dependency-risks-ai-code` - Supply chain risks
- `business-logic-flaws-ai-generated-code` - Business logic flaws
- `resource-exhaustion-dos-ai-generated-code` - Resource exhaustion

### Other
- `course-lesson-builder` - Course module creation
- `security-operations-deployment` - Security operations
- `security-architecture-overview` - Overall security architecture

---

## Verification

### Circular Reference Check

Run this command to check for circular references:

```bash
bash analyze-skill-references.sh
```

**Expected**: No skill should reference a sibling at the same level

### Validation Rules

1. ✅ Children reference parent (allowed)
2. ✅ Parent references children (allowed)
3. ✅ Children reference implementation skills (allowed)
4. ❌ Siblings reference each other (FORBIDDEN)
5. ❌ Implementation skills reference category skills (FORBIDDEN)

---

## Changes Made (2025-10-23)

### Problems Fixed

**Circular References Removed**:
1. ❌ security-prompts-engineering ←→ security-prompts-auth (FIXED)
2. ❌ security-prompts-engineering ←→ security-prompts-threat-modeling (FIXED)
3. ❌ security-prompts-auth ←→ security-prompts-threat-modeling (FIXED)
4. ❌ Triangle: engineering ← → auth ← → threat-modeling (FIXED)

### Files Modified

1. `.claude/skills/security/security-prompts/prompt-engineering/SKILL.md`
   - Removed: References to auth, threat-modeling, controls siblings
   - Kept: Parent reference, implementation skill references
   - Added: Navigation note to parent

2. `.claude/skills/security/security-prompts/auth-authorization/SKILL.md`
   - Removed: References to engineering, threat-modeling siblings
   - Kept: Parent reference, auth-security reference
   - Added: Navigation note to parent

3. `.claude/skills/security/security-prompts/threat-modeling/SKILL.md`
   - Removed: References to engineering, auth siblings
   - Kept: Parent reference, agent references
   - Added: Navigation note to parent

4. `.claude/skills/security/security-prompts/built-in-controls/SKILL.md`
   - Removed: References to engineering, auth siblings
   - Kept: Parent reference, implementation skill references
   - Added: Navigation note to parent

---

## Best Practices

### When Creating New Skills

1. **Determine hierarchy**: Is this a parent, category, or implementation skill?
2. **Reference appropriately**:
   - Categories reference parent + implementation skills only
   - Never reference sibling categories
3. **Add navigation notes**: Guide users to parent for other categories
4. **Test**: Run verification script to check for circular references

### When Updating Skills

1. **Check references**: Ensure no new sibling references added
2. **Update parent**: If adding new category, update parent skill
3. **Maintain hierarchy**: Keep the parent-child structure intact
4. **Document changes**: Update version history

---

## Maintenance

### Regular Checks

**Monthly**: Run circular reference check
```bash
bash analyze-skill-references.sh
```

**Before Release**: Verify no circular references
**After Skill Addition**: Update this dependency map

### Tools

- `analyze-skill-references.sh` - Analyzes skill cross-references
- `skill-dependency-analysis.md` - Detailed analysis report (archived)

---

## Contact

For questions about skill dependencies:
1. Review this document
2. Check skill's Related Skills section
3. Refer to parent skill for navigation

---

**Last Verification**: 2025-10-23
**Status**: ✅ No circular references detected
**Structure**: ✅ Hierarchical parent-child model confirmed
