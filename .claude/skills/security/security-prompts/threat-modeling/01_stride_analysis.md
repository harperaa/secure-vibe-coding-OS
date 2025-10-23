# STRIDE Threat Model

**Category**: Threat Modeling  
**When to Use**: After architecture design, before building features  
**Module**: 3.5  
**Time to Implement**: 60 minutes

## Analysis Coverage

- ✅ Spoofing threats
- ✅ Tampering threats
- ✅ Repudiation threats
- ✅ Information Disclosure
- ✅ Denial of Service
- ✅ Elevation of Privilege

## The Prompt

```
I need a comprehensive threat model for my application using the STRIDE methodology.

**Application Context**:
- App: [Your app description, e.g., "SaaS project management tool"]
- Users: [Who uses it, e.g., "Teams of 5-50 people, authenticated users"]
- Key Features: [List main features, e.g., "Task management, file uploads, team chat, admin dashboard"]
- Architecture: Secure Vibe Coding OS (90/100 OWASP score baseline)
  - Reference: @docs/security/SECURITY_ARCHITECTURE.md
  - Stack: Next.js, Clerk (auth), Convex (database), Stripe (payments via Clerk Billing)
  - Security controls: CSRF protection, rate limiting, input validation, secure error handling, security headers

**Assets to Protect** (what attackers want):
1. User authentication credentials
2. User personal data (names, emails, project data)
3. Payment information (handled by Stripe, not stored by us)
4. API keys and environment variables
5. Admin access privileges
6. File uploads (project documents)

**Threat Analysis Needed**:

For each STRIDE category, identify:
1. **Specific threats** to my application
2. **Attack scenarios** - how would the attack happen?
3. **Existing mitigations** - which Secure Vibe Coding OS controls already prevent this?
4. **Gaps** - what additional protections are needed?
5. **Priority** - Critical/High/Medium/Low based on likelihood and impact

**STRIDE Categories**:

**Spoofing (Identity)**:
- How could attackers fake authentication?
- Session hijacking possibilities?
- Token theft scenarios?

**Tampering (Data)**:
- How could attackers modify data they don't own?
- SQL injection possibilities (even with Convex)?
- XSS attack vectors?
- CSRF vulnerabilities in forms?

**Repudiation (Non-repudiation)**:
- Can users deny actions they took?
- Are admin actions logged?
- Is there an audit trail for sensitive operations?

**Information Disclosure (Confidentiality)**:
- How could attackers steal user data?
- Error messages leaking information?
- API endpoints exposing sensitive data?
- Database query vulnerabilities?

**Denial of Service (Availability)**:
- How could attackers make the app unavailable?
- Rate limiting gaps?
- Resource exhaustion attacks?
- Webhook flooding?

**Elevation of Privilege (Authorization)**:
- How could regular users become admins?
- Authorization bypass scenarios?
- Ownership checks missing?
- Role escalation vectors?

**Output Format**:

For each threat identified, provide:
```
THREAT: [Name]
STRIDE Category: [S/T/R/I/D/E]
Description: [What is the threat?]
Attack Scenario: [How would attacker exploit this?]
Existing Mitigation: [Which Secure Vibe Coding OS control prevents this?]
Additional Mitigation Needed: [What else should be added?]
Priority: [Critical/High/Medium/Low]
```

Generate a complete threat model covering all STRIDE categories for my application.
```

## Customization Tips

**Your app details**:
Replace all placeholders with your actual app info

**Your assets**:
List what's valuable in your app

**Your features**:
Focus threats on your specific features

## Deliverables

- [ ] Complete STRIDE analysis document
- [ ] 15-30 threats identified
- [ ] Attack scenarios documented
- [ ] Mitigations mapped
- [ ] Priorities assigned
- [ ] Save to: `docs/security/THREAT_MODEL.md`

## Related Prompts

- **Feature threats**: `threat-modeling/02_feature_threats.md`
- **Update model**: `threat-modeling/08_update_model.md`

## Version History

**v1.0** (2025-10-21): Initial version
