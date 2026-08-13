import { ROUTING_POLICY_NAMES } from "./types.js";
import { supportsAllCapabilities, supportsAnyCapability } from "../capabilities/index.js";

/**
 * Convert requirements object to array of capability names
 * @param {Object} requirements - Capabilities object with boolean values
 * @returns {string[]} Array of required capability names
 */
function getRequiredCapabilities(requirements) {
  if (!requirements || typeof requirements !== 'object') {
    return [];
  }
  return Object.entries(requirements)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
}

/**
 * Auto policy: Select model based on capabilities match and provider recommendation
 * @param {import("./types.js").AIModelCatalog} catalog
 * @param {Object} context
 * @param {Object} context.requirements - Derived capability requirements
 * @param {import("../capabilities/types.js").AIModel[]} [context.availableModels] - Prefiltered models
 * @returns {import("./types.js").AIRouteResult | null}
 */
export function autoPolicyEvaluate(catalog, context) {
  const { requirements, availableModels } = context;
  
  // If no requirements, return first available model
  if (!requirements || Object.values(requirements).every(v => !v)) {
    const models = availableModels || (catalog.list && catalog.list().then(m => m) || []);
    if (Array.isArray(models) && models.length > 0) {
      return {
        model: models[0],
        reason: "Auto-selected first available model (no specific requirements)",
        confidence: 0.5
      };
    }
    return null;
  }

  // Find best model that supports all required capabilities
  const models = availableModels || (catalog.list && Array.isArray(catalog.list()) ? catalog.list() : []);
  const requiredCaps = getRequiredCapabilities(requirements);
  
  const suitable = Array.isArray(models) 
    ? models.filter(m => requiredCaps.length === 0 || supportsAllCapabilities(m, requiredCaps))
    : [];

  if (suitable.length === 0) {
    return null;
  }

  // Prefer models with reasoning > vision > general models
  const withReasoning = suitable.filter(m => m.capabilities.reasoning);
  const withVision = suitable.filter(m => m.capabilities.vision);
  const selected = withReasoning.length > 0 ? withReasoning[0] : 
                   withVision.length > 0 ? withVision[0] : 
                   suitable[0];

  return {
    model: selected,
    reason: `Auto-selected based on capability match`,
    confidence: 0.8
  };
}

/**
 * Fast policy: Select fastest available model
 * @param {import("./types.js").AIModelCatalog} catalog
 * @param {Object} context
 * @param {Object} context.requirements - Derived capability requirements
 * @param {import("../capabilities/types.js").AIModel[]} [context.availableModels] - Prefiltered models
 * @returns {import("./types.js").AIRouteResult | null}
 */
export function fastPolicyEvaluate(catalog, context) {
  const { requirements, availableModels } = context;
  
  const models = availableModels || (catalog.list && Array.isArray(catalog.list()) ? catalog.list() : []);
  if (!Array.isArray(models) || models.length === 0) {
    return null;
  }

  // Filter by requirements if provided
  let suitable = models;
  if (requirements) {
    const requiredCaps = getRequiredCapabilities(requirements);
    if (requiredCaps.length > 0) {
      suitable = models.filter(m => supportsAllCapabilities(m, requiredCaps));
    }
  }

  if (suitable.length === 0) {
    return null;
  }

  // Select model marked as "fast" or with lowest latency indicator
  // For now, prefer models with "fast" in their ID or first in list
  const fast = suitable.find(m => m.id && m.id.includes('fast'));
  const selected = fast || suitable[0];

  return {
    model: selected,
    reason: "Selected for speed performance",
    confidence: 0.7
  };
}

/**
 * Cheap policy: Select most cost-effective model
 * @param {import("./types.js").AIModelCatalog} catalog
 * @param {Object} context
 * @param {Object} context.requirements - Derived capability requirements
 * @param {import("../capabilities/types.js").AIModel[]} [context.availableModels] - Prefiltered models
 * @returns {import("./types.js").AIRouteResult | null}
 */
export function cheapPolicyEvaluate(catalog, context) {
  const { requirements, availableModels } = context;
  
  const models = availableModels || (catalog.list && Array.isArray(catalog.list()) ? catalog.list() : []);
  if (!Array.isArray(models) || models.length === 0) {
    return null;
  }

  // Filter by requirements if provided
  let suitable = models;
  if (requirements) {
    const requiredCaps = getRequiredCapabilities(requirements);
    if (requiredCaps.length > 0) {
      suitable = models.filter(m => supportsAllCapabilities(m, requiredCaps));
    }
  }

  if (suitable.length === 0) {
    return null;
  }

  // Select model marked as "cheap" or smallest context window (proxy for cost)
  const cheap = suitable.find(m => m.id && m.id.includes('cheap'));
  if (cheap) {
    return {
      model: cheap,
      reason: "Selected for cost-effectiveness",
      confidence: 0.7
    };
  }

  // Fall back to smallest context window as cost proxy
  const selected = suitable.reduce((prev, current) => 
    (!prev.contextWindow || (current.contextWindow && current.contextWindow < prev.contextWindow)) 
      ? current 
      : prev
  );

  return {
    model: selected,
    reason: "Selected for cost-effectiveness (smaller context window)",
    confidence: 0.6
  };
}

/**
 * Reasoning policy: Select model with reasoning capabilities
 * @param {import("./types.js").AIModelCatalog} catalog
 * @param {Object} context
 * @param {import("../capabilities/types.js").AIModel[]} [context.availableModels] - Prefiltered models
 * @returns {import("./types.js").AIRouteResult | null}
 */
export function reasoningPolicyEvaluate(catalog, context) {
  const { availableModels } = context;
  
  const models = availableModels || (catalog.list && Array.isArray(catalog.list()) ? catalog.list() : []);
  if (!Array.isArray(models) || models.length === 0) {
    return null;
  }

  const withReasoning = models.filter(m => m.capabilities && m.capabilities.reasoning);

  if (withReasoning.length === 0) {
    return null;
  }

  return {
    model: withReasoning[0],
    reason: "Selected model with extended reasoning capability",
    confidence: 0.9
  };
}

/**
 * Vision policy: Select model with vision capabilities
 * @param {import("./types.js").AIModelCatalog} catalog
 * @param {Object} context
 * @param {import("../capabilities/types.js").AIModel[]} [context.availableModels] - Prefiltered models
 * @returns {import("./types.js").AIRouteResult | null}
 */
export function visionPolicyEvaluate(catalog, context) {
  const { availableModels } = context;
  
  const models = availableModels || (catalog.list && Array.isArray(catalog.list()) ? catalog.list() : []);
  if (!Array.isArray(models) || models.length === 0) {
    return null;
  }

  const withVision = models.filter(m => m.capabilities && m.capabilities.vision);

  if (withVision.length === 0) {
    return null;
  }

  return {
    model: withVision[0],
    reason: "Selected model with vision capability",
    confidence: 0.9
  };
}

/**
 * Local policy: Select locally-running model
 * @param {import("./types.js").AIModelCatalog} catalog
 * @param {Object} context
 * @param {import("../capabilities/types.js").AIModel[]} [context.availableModels] - Prefiltered models
 * @returns {import("./types.js").AIRouteResult | null}
 */
export function localPolicyEvaluate(catalog, context) {
  const { availableModels } = context;
  
  const models = availableModels || (catalog.list && Array.isArray(catalog.list()) ? catalog.list() : []);
  if (!Array.isArray(models) || models.length === 0) {
    return null;
  }

  const local = models.filter(m => m.provider && (m.provider === 'local' || m.id.includes('local')));

  if (local.length === 0) {
    return null;
  }

  return {
    model: local[0],
    reason: "Selected locally-running model",
    confidence: 0.9
  };
}

/**
 * Map of built-in routing policies
 */
export const BUILT_IN_POLICIES = {
  [ROUTING_POLICY_NAMES.AUTO]: {
    name: ROUTING_POLICY_NAMES.AUTO,
    description: "Automatically select the best model based on capabilities",
    evaluate: autoPolicyEvaluate
  },
  [ROUTING_POLICY_NAMES.FAST]: {
    name: ROUTING_POLICY_NAMES.FAST,
    description: "Select the fastest available model",
    evaluate: fastPolicyEvaluate
  },
  [ROUTING_POLICY_NAMES.CHEAP]: {
    name: ROUTING_POLICY_NAMES.CHEAP,
    description: "Select the most cost-effective model",
    evaluate: cheapPolicyEvaluate
  },
  [ROUTING_POLICY_NAMES.REASONING]: {
    name: ROUTING_POLICY_NAMES.REASONING,
    description: "Select model with reasoning capabilities",
    evaluate: reasoningPolicyEvaluate
  },
  [ROUTING_POLICY_NAMES.VISION]: {
    name: ROUTING_POLICY_NAMES.VISION,
    description: "Select model with vision capabilities",
    evaluate: visionPolicyEvaluate
  },
  [ROUTING_POLICY_NAMES.LOCAL]: {
    name: ROUTING_POLICY_NAMES.LOCAL,
    description: "Select locally-running model",
    evaluate: localPolicyEvaluate
  }
};
