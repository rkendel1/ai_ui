import { useEffect, useRef } from "react";
import { createAISession } from "@ai-ui/core/runtime";
import { useAIState } from "./useAIState.js";

/**
 * Hook to create and manage an AI session with convenient access to all session APIs.
 * 
 * This hook:
 * - Creates a session instance once and reuses it
 * - Manages session lifecycle (cleanup on unmount)
 * - Returns both the session object and its current state via useAIState
 * - Provides convenient access to all session methods
 * 
 * Do not create a second state machine - this returns the actual session.
 * 
 * @param {Object} options - Configuration for the session
 * @param {Object} options.transport - Transport implementation with send(request) method (required)
 * @param {Object} [options.context] - Context data to send with requests
 * @param {Array} [options.tools] - Array of tool definitions
 * @returns {Object} Object with { session, state, send, cancel, retry, clear }
 * 
 * @example
 * const { send, state } = useAISession({
 *   transport: mockTransport
 * });
 * await send("Analyze this");
 * 
 * @example
 * function Chat() {
 *   const { send, cancel, state } = useAISession({
 *     transport: myTransport,
 *     context: { userId: "123" }
 *   });
 *   
 *   return (
 *     <div>
 *       <button onClick={() => send("hello")}>Send</button>
 *       <div>{state.status}</div>
 *     </div>
 *   );
 * }
 */
export function useAISession({ transport, context, tools } = {}) {
  if (!transport || typeof transport.send !== "function") {
    throw new Error(
      "useAISession requires a transport option with a send(request) method. " +
      "See @ai-ui/core for transport implementations."
    );
  }

  const sessionRef = useRef(null);

  // Create session once on mount
  if (!sessionRef.current) {
    sessionRef.current = createAISession({ transport, context, tools });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Ensure any ongoing requests are cancelled
      sessionRef.current?.cancel?.();
    };
  }, []);

  const session = sessionRef.current;
  const state = useAIState(session);

  return {
    session,
    state,
    send: session.send.bind(session),
    cancel: session.cancel.bind(session),
    retry: session.retry.bind(session),
    clear: session.clear.bind(session)
  };
}
