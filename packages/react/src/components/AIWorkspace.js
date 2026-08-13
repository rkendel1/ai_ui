import React from "react";
import { AIChat } from "./AIChat.js";
import { AIComposer } from "./AIComposer.js";
import { AIToolActivity } from "./AIToolActivity.js";
import { AIArtifactsPanel } from "./AIArtifactsPanel.js";

/**
 * AIWorkspace Component
 * 
 * Composable AI workspace combining chat, composer, tool activity, and artifacts.
 * Provides a complete UI for AI interactions with flexible layout options.
 * 
 * The workspace renders the same underlying state as Web Components while
 * providing a React-native interface.
 * 
 * @param {Object} props
 * @param {Object} props.session - The AI session object (required)
 * @param {Object} [props.state] - Optional: pre-computed state from useAIState
 * @param {string} [props.layout] - Layout mode: "default", "compact", or "wide"
 * @param {boolean} [props.showArtifacts] - Show artifacts panel (default: true)
 * @param {boolean} [props.showToolActivity] - Show tool activity panel (default: true)
 * @param {Function} [props.onApprove] - Callback when tool is approved
 * @param {Function} [props.onReject] - Callback when tool is rejected
 * @param {React.CSSProperties} [props.style] - Custom styles
 * @param {string} [props.className] - CSS class name
 * 
 * @example
 * import { AIWorkspace } from "@ai-ui/react";
 * import { useAISession } from "@ai-ui/react/hooks";
 * 
 * function App() {
 *   const { session, state } = useAISession({ 
 *     transport: myTransport 
 *   });
 *   
 *   return (
 *     <AIWorkspace 
 *       session={session}
 *       state={state}
 *       layout="default"
 *       showArtifacts
 *       showToolActivity
 *     />
 *   );
 * }
 */
export const AIWorkspace = React.forwardRef(
  (
    {
      session,
      state,
      layout = "default",
      showArtifacts = true,
      showToolActivity = true,
      onApprove,
      onReject,
      style,
      className,
      ...props
    },
    ref
  ) => {
    if (!session) {
      throw new Error("AIWorkspace requires a session prop");
    }

    return (
      <div
        ref={ref}
        className={`ai-workspace ai-workspace-${layout} ${className || ""}`}
        style={style}
        data-testid="ai-workspace"
        {...props}
      >
        <div className="ai-workspace-main">
          <div className="ai-workspace-chat-section">
            <AIChat session={session} state={state} />
            <AIComposer session={session} state={state} />
          </div>

          {(showArtifacts || showToolActivity) && (
            <div className="ai-workspace-side-panel">
              {showToolActivity && (
                <AIToolActivity
                  state={state}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              )}
              {showArtifacts && <AIArtifactsPanel state={state} />}
            </div>
          )}
        </div>
      </div>
    );
  }
);

AIWorkspace.displayName = "AIWorkspace";
