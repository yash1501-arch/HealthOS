# Feature Spec: Safety & Red-Flag Detection

## 1. Overview
Guardrails that ensure all AI output is safe, non-diagnostic, and includes appropriate disclaimers. Detects red-flag symptoms and blocks recommendations if urgent medical attention is needed.

## 2. User Stories
- As a user, I want to be warned if my symptoms may need urgent medical attention
- As a user, I want to see clear disclaimers so I understand this is not a medical diagnosis

## 3. Acceptance Criteria
- [ ] Red-flag keyword detection in user-reported symptoms
- [ ] Pre-defined list of red-flag symptoms (expandable)
- [ ] Full-screen warning overlay for red flags
- [ ] Warning not dismissible without acknowledgment
- [ ] Warning logged to ai_audit_logs
- [ ] AI never uses diagnostic language ("you have X disease")
- [ ] Medical disclaimer appended to all AI-generated content
- [ ] Confidence levels shown on all recommendations
- [ ] Regular expression filter for prohibited phrases
- [ ] Output validation before saving/displaying

## 4. Data Schema
- Tables: `ai_audit_logs`
- Reference: `03-Database-Schema.md` §7.1

## 5. Red-Flag Symptom List
```
Immediate medical attention:
- Chest pain / pressure / tightness
- Shortness of breath (at rest or minimal exertion)
- Sudden severe headache (worst of life)
- Sudden vision loss or double vision
- Sudden weakness on one side of body
- Slurred speech
- Loss of consciousness / fainting
- Severe abdominal pain
- Blood in vomit / stool / urine
- Suicidal or self-harm thoughts
- High fever (>103°F / 39.4°C) with stiff neck

Discuss with doctor soon:
- Unexplained weight loss (>5% in 1 month)
- Persistent fever
- New lump or swelling
- Changes in bowel/bladder habits
- Persistent cough >3 weeks
- Severe joint swelling
```

## 6. Prohibited AI Phrases
The output validator blocks phrases matching:
- "You have [disease name]"
- "You are suffering from [condition]"
- "Diagnosis: [condition]"
- "[Condition] is confirmed"
- "You need [specific treatment]" (vs "discuss with your doctor")
- Any absolute certainty without evidence

## 7. Disclaimer Text
Standard footer on all AI output pages:
> "HealthOS is not a medical device and does not diagnose diseases. The information provided is for informational purposes only and should not replace professional medical advice. Always consult a qualified healthcare provider for medical concerns."

## 8. UI Components
- RedFlagOverlay (full-screen, no-dismiss-without-acknowledgment)
- DisclaimerBanner (sticky bottom bar on AI output pages)
- SafetyAuditLog (admin view — future)

## 9. Audit Logging
Every AI interaction logs:
- user_id, module, action
- Full prompt + response
- Model, tokens_used, latency
- IP address
- Whether red flags were triggered
- Whether disclaimer was shown
