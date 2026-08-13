export {
  ROUTING_ERROR_CODES,
  ROUTING_POLICY_NAMES
} from "./types.js";

export {
  createRoutingError,
  createNoModelSelectedError,
  createInvalidSelectorError,
  createNoSuitableModelError,
  createModelFallbackExhaustedError,
  createCatalogNotProvidedError,
  createPolicyEvaluationError,
  createInvalidPolicyError
} from "./errors.js";

export {
  BUILT_IN_POLICIES,
  autoPolicyEvaluate,
  fastPolicyEvaluate,
  cheapPolicyEvaluate,
  reasoningPolicyEvaluate,
  visionPolicyEvaluate,
  localPolicyEvaluate
} from "./policies.js";

export {
  selectModel,
  selectModelFromCandidates,
  isPredefinedPolicy,
  isExplicitModelId
} from "./selector.js";

export {
  executeWithFallback,
  buildFallbackChain,
  createFallbackConfig
} from "./fallback.js";
