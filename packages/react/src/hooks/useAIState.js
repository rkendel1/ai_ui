import { useSyncExternalStore } from "react";

/**
 * Hook to subscribe to AI session state using React's external store mechanism.
 * 
 * This preserves the single-source-of-truth architecture:
 * - No state duplication
 * - Session remains the single source of truth
 * - React subscribes to session changes efficiently
 * 
 * @param {Object} session - The AI session object from createAISession or useAISession
 * @returns {Object} The current AI session state
 * 
 * @example
 * function DebugPanel({ session }) {
 *   const state = useAIState(session);
 *   return <div>{state.status}</div>;
 * }
 */
export function useAIState(session) {
  if (!session || typeof session.subscribe !== "function" || typeof session.getState !== "function") {
    throw new Error(
      "useAIState requires a session object with subscribe(listener) and getState() methods. " +
      "Use createAISession or useAISession to create a session."
    );
  }

  return useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getState
  );
}
