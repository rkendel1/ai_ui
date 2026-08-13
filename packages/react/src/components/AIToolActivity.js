import React from "react";

/**
 * AIToolActivity Component
 * 
 * Displays tool invocations, their status, and approval requirements.
 * Shows real-time updates as tools are called, approved, and completed.
 * 
 * @param {Object} props
 * @param {Object} [props.state] - Optional: pre-computed state from useAIState
 * @param {Function} [props.onApprove] - Callback when tool is approved
 * @param {Function} [props.onReject] - Callback when tool is rejected
 * @param {React.CSSProperties} [props.style] - Custom styles
 * @param {string} [props.className] - CSS class name
 * 
 * @example
 * import { AIToolActivity } from "@ai-ui/react";
 * 
 * function MyToolActivity() {
 *   const { state } = useAISession({ transport });
 *   
 *   return (
 *     <AIToolActivity 
 *       state={state}
 *       onApprove={(toolCallId) => {
 *         console.log("Approved:", toolCallId);
 *       }}
 *     />
 *   );
 * }
 */
export const AIToolActivity = React.forwardRef(
  ({ state, onApprove, onReject, style, className, ...props }, ref) => {
    const toolCalls = state?.activeToolCalls || [];

    const renderStatus = (toolCall) => {
      const statusColors = {
        running: "#2563eb",
        approval_required: "#dc2626",
        completed: "#16a34a",
        rejected: "#6b7280"
      };

      return (
        <span
          className="ai-tool-status"
          style={{ color: statusColors[toolCall.status] || "#6b7280" }}
          data-testid={`tool-status-${toolCall.id}`}
        >
          {toolCall.status}
        </span>
      );
    };

    return (
      <div
        ref={ref}
        className={`ai-tool-activity ${className || ""}`}
        style={style}
        data-testid="ai-tool-activity"
        {...props}
      >
        <div className="ai-tool-activity-header">Tool Activity</div>
        {toolCalls.length === 0 ? (
          <div className="ai-tool-activity-empty" data-testid="tool-activity-empty">
            No tool calls
          </div>
        ) : (
          <div className="ai-tool-activity-list">
            {toolCalls.map((toolCall) => (
              <div
                key={toolCall.id}
                className="ai-tool-call"
                data-testid={`tool-call-${toolCall.id}`}
              >
                <div className="ai-tool-call-header">
                  <span className="ai-tool-call-name">{toolCall.name}</span>
                  {renderStatus(toolCall)}
                </div>
                {toolCall.input && (
                  <div className="ai-tool-call-input">
                    Input: {JSON.stringify(toolCall.input)}
                  </div>
                )}
                {toolCall.status === "approval_required" && (
                  <div className="ai-tool-call-actions">
                    <button
                      onClick={() => onApprove?.(toolCall.id)}
                      className="ai-tool-approve-button"
                      data-testid={`approve-tool-${toolCall.id}`}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => onReject?.(toolCall.id)}
                      className="ai-tool-reject-button"
                      data-testid={`reject-tool-${toolCall.id}`}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
                {toolCall.output && (
                  <div className="ai-tool-call-output">
                    Output: {JSON.stringify(toolCall.output)}
                  </div>
                )}
                {toolCall.error && (
                  <div className="ai-tool-call-error">
                    Error: {toolCall.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AIToolActivity.displayName = "AIToolActivity";
