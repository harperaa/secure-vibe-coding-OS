# Feature-Specific Threat Analysis

**Category**: Threat Modeling  
**When to Use**: Before implementing each new feature  
**Module**: 3.5  
**Time to Implement**: 20 minutes

## Analysis Focus

- ✅ Feature-specific threats
- ✅ Attack scenarios
- ✅ Mitigation strategies
- ✅ Risk assessment
- ✅ Security requirements

## The Prompt

```
I'm about to implement [feature name]. Identify security threats specific to this feature before I start coding.

**Feature Description**:
- What: [What does this feature do?]
- Who: [Who can use it? Public, authenticated, admin?]
- Data: [What data does it handle?]
- Actions: [What actions can users perform?]

**Current Security Context**:
- Architecture: Secure Vibe Coding OS (90/100 OWASP baseline)
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Existing threat model: @docs/security/THREAT_MODEL.md

**Threat Analysis Needed**:

**1. Feature-Specific Threats**:
Using STRIDE methodology, identify threats specific to THIS feature:
- Spoofing: How could attackers impersonate users in this feature?
- Tampering: How could they modify data they shouldn't?
- Repudiation: Could users deny actions?
- Information Disclosure: What sensitive data could leak?
- Denial of Service: How could they make this feature unavailable?
- Elevation of Privilege: Could they gain unauthorized access?

**2. Attack Scenarios**:
For each threat, provide:
- Detailed attack scenario (step-by-step)
- Attacker motivation (what do they gain?)
- Likelihood (High/Medium/Low)
- Impact (Critical/High/Medium/Low)

**3. Existing Mitigations**:
Which Secure Vibe Coding OS controls already prevent these threats?
- CSRF protection?
- Rate limiting?
- Input validation?
- Authentication/Authorization?
- Error handling?

**4. Additional Security Needed**:
What additional controls should be implemented for this feature?
- New validation rules?
- Additional authorization checks?
- Feature-specific rate limits?
- Audit logging?
- Data encryption?

**5. Implementation Guidance**:
Provide security requirements I should include when prompting Claude to build this feature.

**Output Format**:
```
THREAT: [Name]
STRIDE: [Category]
Attack Scenario: [How it would happen]
Likelihood: [High/Medium/Low]
Impact: [Critical/High/Medium/Low]
Existing Mitigation: [What already prevents this]
Additional Mitigation: [What to add]
Implementation Note: [Security requirement for feature prompt]
```

Generate threat analysis for this specific feature.
```

## Customization Tips

**Feature complexity**:
More complex features = more threats to consider

**Data sensitivity**:
Sensitive data requires deeper analysis

**User type**:
Public features have different threats than admin features

## Deliverables

- [ ] Feature threat list (5-10 threats)
- [ ] Attack scenarios documented
- [ ] Risk ratings assigned
- [ ] Mitigations identified
- [ ] Implementation guidance provided
- [ ] Save to feature documentation

## Integration

Use threat analysis when:
1. **Before coding**: Inform your implementation prompt
2. **During coding**: Verify controls implemented
3. **After coding**: Update main threat model

## Related Prompts

- **Main threat model**: `threat-modeling/01_stride_analysis.md`
- **Update model**: `threat-modeling/08_update_model.md`
- **Code review**: `threat-modeling/04_code_review.md`

## Version History

**v1.0** (2025-10-21): Initial version
