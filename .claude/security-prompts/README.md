# Security Prompt Library

**Last Updated**: October 21, 2025  
**Total Prompts**: 23 Complete Prompts  
**Source**: Secure Vibe Coding Course Modules 3.2-3.5

## Quick Start Guide

This library contains battle-tested security prompts for Claude Code that follow the Secure Vibe Coding methodology. Each prompt is ready to copy, customize, and use.

**How to Use**:
1. Find the prompt that matches your security need (use quick reference below)
2. Open the markdown file
3. Copy the prompt to Claude Code
4. Customize the placeholders for your project
5. Run and verify the implementation

---

## Quick Reference by Use Case

### Adding Features

**"I need to add a public form"**  
→ `built-in-controls/01_contact_form.md`

**"I need users to edit their profile"**  
→ `built-in-controls/02_authenticated_update.md`  
→ Then: `auth-authorization/03_ownership.md` (verify ownership)

**"I need a public API endpoint"**  
→ `built-in-controls/03_public_api.md`

**"I need admin-only features"**  
→ `prompt-engineering/04_admin_action.md`  
→ First (if needed): `auth-authorization/01_rbac_implementation.md`

**"I need file uploads"**  
→ `prompt-engineering/05_file_upload.md`

### Security Review & Testing

**"I'm about to deploy a feature"**  
→ `prompt-engineering/08_security_testing.md`  
→ Then: `threat-modeling/04_code_review.md`

**"I just added a feature"**  
→ `threat-modeling/08_update_model.md` (update threat model)

### Starting a Project

**"I'm starting a new project"**  
1. `threat-modeling/01_stride_analysis.md` (architecture phase)
2. `auth-authorization/01_rbac_implementation.md` (set up roles)

---

## Library Organization

### 📁 built-in-controls/ (3 prompts)
Simple prompts for leveraging existing Secure Vibe Coding OS utilities.

- **01_contact_form.md** - Public form with full security stack
- **02_authenticated_update.md** - User data modification with auth
- **03_public_api.md** - Public GET endpoints with validation

**When to use**: Quick implementations using pre-built security utilities

---

### 📁 prompt-engineering/ (8 prompts)
Comprehensive prompts for extending the architecture with new features.

- **01_secure_form.md** - Enhanced public form implementation
- **02_authenticated_endpoint.md** - Authenticated data modification with authorization
- **03_public_endpoint.md** - Public APIs with pagination
- **04_admin_action.md** - Admin-only endpoints with audit logging
- **05_file_upload.md** - Secure file handling with external service
- **06_composable_middleware.md** - Multiple security layers, correct ordering
- **07_new_control.md** - Extending security architecture with new utilities
- **08_security_testing.md** - Comprehensive security test generation

**When to use**: Complex features requiring multiple security layers

---

### 📁 auth-authorization/ (4 prompts)
Prompts for RBAC, permissions, and ownership-based access control.

- **01_rbac_implementation.md** - Role-based access control setup
- **02_permissions.md** - Granular permission system
- **03_ownership.md** - Resource ownership verification
- **04_auth_testing.md** - Comprehensive authorization testing

**When to use**: Setting up or extending authentication and authorization

---

### 📁 threat-modeling/ (8 prompts)
Prompts for security analysis, code review, and vulnerability assessment.

- **01_stride_analysis.md** - Complete STRIDE threat model
- **02_feature_threats.md** - Feature-specific threat analysis
- **03_architecture_impact.md** - Architecture change security impact
- **04_code_review.md** - Security vulnerability review
- **05_security_tests.md** - Automated security test generation
- **06_owasp_check.md** - OWASP Top 10 compliance assessment
- **07_payment_security.md** - Payment security for Clerk Billing + Stripe
- **08_update_model.md** - Update threat model after features

**When to use**: Security planning, reviews, and ongoing threat assessment

---

## Workflow Examples

### Workflow 1: Adding a Contact Form

1. Open `built-in-controls/01_contact_form.md`
2. Copy the prompt
3. Customize: app name, fields, rate limits
4. Give to Claude Code
5. Test: CSRF, rate limiting, XSS prevention
6. Update threat model: `threat-modeling/08_update_model.md`

**Time**: 30 minutes

---

### Workflow 2: Adding Admin Dashboard

1. Check if RBAC exists, if not use `auth-authorization/01_rbac_implementation.md`
2. Use `prompt-engineering/04_admin_action.md` for each admin feature
3. Test with `prompt-engineering/08_security_testing.md`
4. Review code with `threat-modeling/04_code_review.md`
5. Update threat model

**Time**: 2-3 hours

---

### Workflow 3: Starting New Project

**Week 1: Architecture**
1. Design security architecture (Module 2.6)
2. Create threat model: `threat-modeling/01_stride_analysis.md`
3. Set up RBAC: `auth-authorization/01_rbac_implementation.md`

**Week 2-4: Implementation**
4. Use feature prompts as you build
5. Update threat model after each feature
6. Run security tests before each deploy

**Week 5: Launch Prep**
7. Complete security review: `threat-modeling/04_code_review.md`
8. Run comprehensive tests: `prompt-engineering/08_security_testing.md`
9. Final threat model review

---

## Prompt File Format

Each prompt file follows this standard format:

```markdown
# Prompt Title

**Category**: [Built-In Controls | Prompt Engineering | Auth & Authorization | Threat Modeling]
**When to Use**: [Specific scenario]
**Module**: [3.2 | 3.3 | 3.4 | 3.5]
**Time to Implement**: [Realistic estimate]

## Security Controls Applied
[Bullet list of security features]

## The Prompt
[Copy-paste ready prompt with placeholders]

## Customization Tips
[How to adapt for your needs]

## Testing Checklist
[Verification steps]

## Related Prompts
[Links to complementary prompts]

## Version History
[Track changes over time]
```

---

## Tips for Using This Library

### 1. Always Customize

Don't use prompts verbatim. Replace:
- `[PROJECT_NAME]` with your app name
- `[FEATURE_NAME]` with your specific feature
- Rate limits with your requirements
- Validation rules with your constraints

### 2. Reference Your Architecture

Always include in your prompt:
```
Reference: @docs/security/SECURITY_ARCHITECTURE.md
```

This helps Claude understand your specific setup.

### 3. Combine Prompts

Many features need multiple prompts:
- Authentication + Ownership + Validation
- RBAC + Permissions + Admin Actions
- Implementation + Testing + Threat Model Update

### 4. Test Every Time

After using a prompt:
1. Use the testing checklist in the prompt file
2. Run `prompt-engineering/08_security_testing.md`
3. Verify all security controls work

### 5. Keep Threat Model Current

After every feature:
- Use `threat-modeling/08_update_model.md`
- Update your `docs/security/THREAT_MODEL.md`
- Version your threat model (v1.0, v1.1, v1.2...)

---

## Maintaining This Library

### Adding New Prompts

Add a prompt when you:
- Solve a security problem not covered here
- Find a better implementation pattern
- Learn from a security bug
- Discover a new attack vector

Use the standard format above.

### Versioning Prompts

Track changes in each prompt's Version History section:

```markdown
## Version History

**v1.1** (2025-11-15): Added file size validation
**v1.0** (2025-10-21): Initial version
```

### Sharing with Teams

1. Store in Git repository
2. Use pull requests for changes
3. Review before merging
4. Keep README updated

---

## Support & Resources

**Course Modules**:
- Module 3.2: Using Built-In Security Controls
- Module 3.3: Prompt Engineering for Security Controls  
- Module 3.4: Extending Authentication & RBAC
- Module 3.5: AI-Assisted Threat Modeling & Security Reviews

**Secure Vibe Coding OS**:
- Documentation: `@docs/security/SECURITY_ARCHITECTURE.md`
- Security utilities: `/lib` directory
- Example implementations: `/app/api/example-protected`

**Need Help?**
- Review the source module for detailed explanations
- Check related prompts for complementary patterns
- Reference your security architecture documentation

---

## Library Statistics

**By Category**:
- Built-In Controls: 3 prompts (13%)
- Prompt Engineering: 8 prompts (35%)
- Auth & Authorization: 4 prompts (17%)
- Threat Modeling: 8 prompts (35%)

**By Security Control**:
- CSRF Protection: 10 prompts
- Rate Limiting: 11 prompts
- Input Validation: 11 prompts
- Authentication: 9 prompts
- Authorization: 8 prompts
- Error Handling: 10 prompts

**Most Used Prompts** (based on common scenarios):
1. Contact Form (01_contact_form.md)
2. RBAC Implementation (01_rbac_implementation.md)
3. Security Testing (08_security_testing.md)
4. STRIDE Analysis (01_stride_analysis.md)
5. Authenticated Update (02_authenticated_update.md)

---

## Next Steps

1. **Explore the library** - Read through each prompt to understand what's available
2. **Start simple** - Try the contact form prompt first
3. **Build your app** - Use prompts as you implement features
4. **Maintain security** - Update threat model regularly
5. **Expand library** - Add prompts as you discover new patterns

**Remember**: These prompts are starting points. Customize them for your specific needs, always test thoroughly, and keep your threat model current.

---

**Pro Tip**: Bookmark this README in your browser and keep `docs/security/THREAT_MODEL.md` open while developing. Your future self will thank you! 🛡️
