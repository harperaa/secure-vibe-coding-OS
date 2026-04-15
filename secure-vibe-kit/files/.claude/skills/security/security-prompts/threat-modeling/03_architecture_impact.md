# Architecture Change Security Impact Analysis

**Category**: Threat Modeling  
**When to Use**: Before making architectural changes  
**Module**: 3.5  
**Time to Implement**: 30 minutes

## Analysis Coverage

- ✅ New attack vectors
- ✅ Threat model impact
- ✅ Security control changes
- ✅ Configuration security
- ✅ Net security impact

## The Prompt

```
I'm considering an architecture change and need to assess the security impact before proceeding.

**Current Architecture**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Current security posture: 90/100 OWASP score
- Existing threat model: @docs/security/THREAT_MODEL.md

**Proposed Change**:
[Describe the change, e.g., "Adding Redis for session storage and rate limiting", "Migrating from Convex to PostgreSQL", "Adding external API integration"]

**Change Details**:
- Why: [Reason for change]
- What: [Technical details]
- How: [Implementation plan]
- Timeline: [When this will happen]

**Security Impact Assessment Needed**:

**1. New Attack Vectors**:
What new threats does this introduce?
- New services exposed?
- New network boundaries?
- New dependencies?
- New credentials to manage?
- New failure modes?

**2. Threat Model Updates**:
Which existing threats are affected?
- Does this change any STRIDE threat mitigations?
- Are new STRIDE threats introduced?
- Does this amplify any existing threats?

**3. Security Control Changes**:
How do existing controls need updating?
- Authentication changes needed?
- Authorization changes needed?
- Encryption requirements?
- Access control for new components?
- Logging and monitoring updates?

**4. Configuration Security**:
What security settings are needed for new components?
- TLS/SSL configuration?
- Authentication setup?
- Network restrictions (firewall, IP whitelist)?
- Credential management?
- Key rotation policy?
- Backup and recovery security?

**5. Testing Requirements**:
How to verify security isn't degraded?
- What to test after migration?
- How to verify encryption works?
- How to test failover scenarios?
- Performance impact on security controls?

**6. Rollback Plan**:
If security is degraded:
- How to quickly rollback?
- What's the rollback window?
- How to verify security restored?

**Compare Security Posture**:
- Security before change: [Current state]
- Security after change: [Projected state]
- Net security impact: [Better/Same/Worse? Why?]
- Recommendation: [Proceed/Modify/Cancel?]

Generate comprehensive security impact analysis for this architecture change.

Reference:
@docs/security/SECURITY_ARCHITECTURE.md
@docs/security/THREAT_MODEL.md
```

## Example Changes

**Adding Redis**:
- New: Network service, credentials, connection security
- Benefits: Distributed rate limiting, better session storage
- Risks: Redis vulnerabilities, credential theft, network exposure

**Migrating Database**:
- New: Different query patterns, different security model
- Benefits: Better performance, more features
- Risks: Migration errors, data exposure, query injection

**Adding External API**:
- New: Third-party dependency, API keys, webhook security
- Benefits: New functionality, reduced development
- Risks: API compromise, data leakage to third party

## Deliverables

- [ ] New attack vectors identified
- [ ] Threat model update required
- [ ] Security control changes documented
- [ ] Configuration requirements listed
- [ ] Testing plan created
- [ ] Rollback plan documented
- [ ] Go/no-go recommendation

## Decision Framework

**Proceed if**:
- Net security impact: Better or Same
- All new threats can be mitigated
- Team understands security requirements

**Modify if**:
- Some security concerns but change is valuable
- Can add additional controls to compensate
- Timeline allows for security improvements

**Cancel if**:
- Net security impact: Significantly worse
- Cannot mitigate new threats
- Security degradation unacceptable

## Related Prompts

- **Threat model**: `threat-modeling/01_stride_analysis.md`
- **Update model**: `threat-modeling/08_update_model.md`

## Version History

**v1.0** (2025-10-21): Initial version
