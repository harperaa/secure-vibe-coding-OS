# Update Threat Model for New Feature

**Category**: Threat Modeling  
**When to Use**: After each feature to keep threat model current  
**Module**: 3.5  
**Time to Implement**: 20 minutes

## Update Coverage

- ✅ New assets
- ✅ New threats
- ✅ New attack surface
- ✅ Security controls verification
- ✅ Residual risk assessment

## The Prompt

```
Update my application's threat model to include the new feature I just built.

**Current Threat Model**: @docs/security/THREAT_MODEL.md
**New Feature**: [Description of what you added]

**Update Requirements**:

**1. New Assets**:
- What new data/resources does this feature introduce?
- What's the value of these assets to attackers?

**2. New Threats**:
- What new STRIDE threats does this feature introduce?
- Attack scenarios specific to this feature?

**3. New Attack Surface**:
- What new endpoints/interfaces are exposed?
- What new user input is accepted?

**4. Security Controls**:
- What security controls were applied to this feature?
- Do existing controls adequately mitigate new threats?

**5. Residual Risk**:
- Are there threats that aren't fully mitigated?
- What's the acceptable risk level?
- What monitoring is needed?

**Integration with Existing Threat Model**:
- How does this feature interact with existing threats?
- Does it amplify any existing risks?
- Does it provide new attack paths to existing assets?

**Updated Threat Model Output**:

Update @docs/security/THREAT_MODEL.md with:
- New threats section for this feature
- Updated asset inventory
- Updated attack surface map
- Updated STRIDE analysis
- New recommendations if any gaps identified
- Version number increment (e.g., v1.2 → v1.3)
- Changelog documenting what changed

Generate updated threat model content I can add to my document.
```

## Customization Tips

**Feature details**:
Describe what you built specifically

**Threat focus**:
Highlight concerns for this feature type

**Integration**:
Note how feature connects to existing app

## Deliverables

- [ ] Updated threat model content
- [ ] New threats documented
- [ ] Updated asset inventory
- [ ] Version incremented
- [ ] Changelog added
- [ ] Updated in: `docs/security/THREAT_MODEL.md`

## Related Prompts

- **Initial model**: `threat-modeling/01_stride_analysis.md`
- **Feature threats**: `threat-modeling/02_feature_threats.md`

## Version History

**v1.0** (2025-10-21): Initial version
