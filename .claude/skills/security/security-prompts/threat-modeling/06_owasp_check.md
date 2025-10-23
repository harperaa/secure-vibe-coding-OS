# OWASP Top 10 Compliance Check

**Category**: Threat Modeling  
**When to Use**: Before production launch, quarterly reviews  
**Module**: 3.5  
**Time to Implement**: 30 minutes

## Compliance Coverage

- ✅ OWASP Top 10 2021
- ✅ Category-by-category scoring
- ✅ Gap analysis
- ✅ Recommendations
- ✅ Priority ranking

## The Prompt

```
Assess my application's compliance with OWASP Top 10 2021 security standards.

**Application Context**:
- App: [Your application name and description]
- Architecture: Secure Vibe Coding OS (90/100 baseline)
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Threat Model: @docs/security/THREAT_MODEL.md

**OWASP Top 10 2021 Assessment**:

For each category, provide:
1. Compliance Score (0-10, 10 = fully compliant)
2. Controls in Place (what protects against this)
3. Gaps Identified (what's missing or weak)
4. Risk Level (Critical/High/Medium/Low)
5. Recommendations (specific improvements)

**A01:2021 – Broken Access Control**:
- Do users only access their own data?
- Is authorization checked on every request?
- Are there IDOR vulnerabilities?
- Can users escalate privileges?

**A02:2021 – Cryptographic Failures**:
- Is sensitive data encrypted at rest?
- Is HTTPS enforced everywhere?
- Are strong algorithms used?
- Are API keys and secrets protected?

**A03:2021 – Injection**:
- Is all input validated?
- Are parameterized queries used?
- Is XSS prevented?
- Are command injections blocked?

**A04:2021 – Insecure Design**:
- Is there a threat model?
- Are security requirements defined?
- Is defense-in-depth implemented?
- Are security patterns followed?

**A05:2021 – Security Misconfiguration**:
- Are defaults secure?
- Are error messages generic?
- Are unnecessary features disabled?
- Is the tech stack hardened?

**A06:2021 – Vulnerable and Outdated Components**:
- Are dependencies up to date?
- Are vulnerability scans automated?
- Is there a patching process?
- Are component versions tracked?

**A07:2021 – Identification and Authentication Failures**:
- Is authentication secure (using Clerk)?
- Are sessions managed properly?
- Is MFA available?
- Are passwords handled securely?

**A08:2021 – Software and Data Integrity Failures**:
- Are updates verified?
- Is code integrity checked?
- Are CI/CD pipelines secure?
- Are webhooks verified?

**A09:2021 – Security Logging and Monitoring Failures**:
- Are security events logged?
- Is there alerting on attacks?
- Are logs protected?
- Is audit trail complete?

**A10:2021 – Server-Side Request Forgery (SSRF)**:
- Is user input used in URLs?
- Are external requests validated?
- Is network access restricted?
- Are redirects validated?

**Summary Report**:
```
Overall OWASP Score: [X/100]
Baseline (Secure Vibe Coding OS): 90/100
Your Implementation: [X/100]

Critical Gaps: [List]
High Priority: [List]
Medium Priority: [List]
Low Priority: [List]

Top 3 Recommendations:
1. [Most important improvement]
2. [Second most important]
3. [Third most important]
```

Generate complete OWASP Top 10 compliance assessment.
```

## Score Interpretation

**90-100**: Excellent - Production ready
**80-89**: Good - Minor improvements needed
**70-79**: Fair - Several gaps to address
**60-69**: Poor - Significant work required
**Below 60**: Critical - Not production ready

## Deliverables

- [ ] OWASP Top 10 assessment complete
- [ ] Score for each category
- [ ] Overall compliance score
- [ ] Gap analysis documented
- [ ] Prioritized recommendations
- [ ] Action plan created
- [ ] Save to: `docs/security/OWASP_ASSESSMENT.md`

## Action Plan Template

Based on assessment results:

**Immediate (Critical)**:
- [ ] [Fix critical gaps]
- [ ] Timeline: [Within 1 week]

**Short-term (High Priority)**:
- [ ] [Address high priority items]
- [ ] Timeline: [Within 1 month]

**Medium-term (Medium Priority)**:
- [ ] [Improve medium priority areas]
- [ ] Timeline: [Within 3 months]

**Long-term (Low Priority)**:
- [ ] [Optimize low priority items]
- [ ] Timeline: [Within 6 months]

## Review Schedule

**Quarterly Reviews**:
- Re-run OWASP assessment
- Track score changes
- Update action plan
- Document improvements

**Trigger Reviews**:
- Major architecture changes
- New feature launches
- Security incidents
- Dependency updates

## Related Prompts

- **Threat model**: `threat-modeling/01_stride_analysis.md`
- **Code review**: `threat-modeling/04_code_review.md`
- **Payment security**: `threat-modeling/07_payment_security.md`

## Version History

**v1.0** (2025-10-21): Initial version
