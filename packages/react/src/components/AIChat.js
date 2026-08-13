import React from "react";

/**
 * AIChat Component
 * 
 * Renders a chat interface for AI conversations.
 * Subscribes to session state to display messages and status.
 * 
 * This is a thin adapter component that renders the conversation UI
 * while the session remains the single source of truth.
 * 
 * @param {Object} props
 * @param {Object} props.session - The AI session object
 * @param {Function} [props.onSend] - Callback when user sends a message
 * @param {Object} [props.state] - Optional: pre-computed state from useAIState
 * @param {React.CSSProperties} [props.style] - Custom styles
 * @param {string} [props.className] - CSS class name
 * 
 * @example
 * import { AIChat } from "@ai-ui/react";
 * import { useAISession } from "@ai-ui/react/hooks";
 * 
 * function MyChat() {
 *   const { session, state } = useAISession({ transport });
 *   
 *   return (
 *     <AIChat 
 *       session={session} 
 *       state={state}
 *       onSend={async (message) => {
 *         await session.send(message);
 *       }}
 *     />
 *   );
 * }
 */
export const AIChat = React.forwardRef(
  ({ session, state, onSend, style, className, ...props }, ref) => {
    if (!session) {
      throw new Error("AIChat requires a session prop");
    }

    return (
      <div
        ref={ref}
        className={`ai-chat ${className || ""}`}
        style={style}
        data-testid="ai-chat"
        {...props}
      >
        <div className="ai-chat-messages">
          {state?.messages?.map((message) => (
            <div
              key={message.id}
              className={`ai-chat-message ai-chat-message-${message.role}`}
              data-testid={`message-${message.id}`}
            >
              <div className="ai-chat-message-role">{message.role}</div>
              <div className="ai-chat-message-content">{message.content}</div>
              {message.reasoning && (
                <div className="ai-chat-message-reasoning">
                  Reasoning: {message.reasoning}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="ai-chat-status" data-testid="chat-status">
          Status: {state?.status}
        </div>
      </div>
    );
  }
);

AIChat.displayName = "AIChat";
