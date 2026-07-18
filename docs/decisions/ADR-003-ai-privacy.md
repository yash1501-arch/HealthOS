# ADR-003: AI Processing — Privacy-First Architecture

## Status
Accepted

## Context
HealthOS processes PHI (lab results, body photos, medical history) through third-party AI APIs (OpenAI, Anthropic, AWS). Users need assurance their data is protected. Regulatory requirements (HIPAA-like) may apply.

## Decision
1. **Strip PII before sending to AI APIs**
   - Remove names, email, exact DOB from LLM prompts
   - Use "user" placeholder instead of name
   - Send lab values as anonymized numbers

2. **Never send original photos/videos to external APIs**
   - Pose estimation runs on-device (WebAssembly) or on self-hosted server
   - Only landmarks (coordinates) and angles sent to database
   - Original media stays in encrypted S3

3. **Select AI providers with data privacy guarantees**
   - OpenAI API: no training on API data
   - Anthropic API: no training on API data
   - AWS Textract: PHI-compatible with BAA

4. **Consent and audit trail**
   - Explicit consent captured before any AI processing
   - Every AI interaction logged with prompt/response/timestamp

## Consequences
- Reduced utility for some AI features (no name context in recommendations — acceptable)
- On-device pose estimation limits model complexity (MediaPipe is sufficient)
- Audit logs increase storage requirements
- Users can delete their data and halt AI processing at any time

## Alternatives Considered
- **Self-hosted LLM (Llama, Mistral)**: Full data control, but higher ops cost, lower quality for MVP
- **On-device everything**: No data leaves device — limited by compute and model size
- **Full cloud processing**: Convenient but privacy risk and regulatory exposure
