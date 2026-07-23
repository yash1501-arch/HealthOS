export { LLMClient, llmClient } from "@/lib/ai/llm-client"
// `generate` is an alias for `complete` on LLMClient
export type {
  AIContentCategory,
  LLMCallOptions,
  LLMCallResult,
  LLMTokenUsage,
} from "@/lib/ai/llm-client"

export { logAIInteraction } from "@/lib/ai/audit-logger"
export type { AIInteractionLogInput, AIInteractionLogResult } from "@/lib/ai/audit-logger"

export {
  AI_ROLES,
  SYSTEM_PROMPTS,
  getSystemPrompt,
} from "@/lib/ai/prompts"
export type { AIRole } from "@/lib/ai/prompts"

export {
  stripPHI,
  sanitizeForLLM,
  containsDiagnosticLanguage,
} from "@/lib/ai/phii-filter"
export type { DiagnosticLanguageResult, SanitizedUserData } from "@/lib/ai/phii-filter"

export {
  validateAIOutput,
  detectEmergencySymptoms,
  MEDICAL_DISCLAIMER,
  EMERGENCY_MESSAGE,
} from "@/lib/ai/safety-engine"
export type { ValidateAIOutputResult } from "@/lib/ai/safety-engine"

export {
  checkRateLimit,
  getUserTier,
  setUserTier,
  resetAIRateLimits,
} from "@/lib/ai/rate-limiter"
export type {
  UserTier,
  AIInteractionType,
  RateLimitCheckResult,
} from "@/lib/ai/rate-limiter"

export {
  RecommendationEngine,
  recommendationEngine,
  calculateHealthScore,
} from "@/lib/ai/engines/recommendation-engine"
