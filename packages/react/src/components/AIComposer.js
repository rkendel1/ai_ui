import React, { useRef, useState } from "react";

/**
 * AIComposer Component
 * 
 * Renders a text input for composing messages to send to the AI.
 * Handles message submission and provides UI feedback for loading state.
 * 
 * @param {Object} props
 * @param {Object} props.session - The AI session object (required)
 * @param {Object} [props.state] - Optional: pre-computed state from useAIState
 * @param {Function} [props.onSubmit] - Callback when message is submitted
 * @param {string} [props.placeholder] - Input placeholder text
 * @param {React.CSSProperties} [props.style] - Custom styles
 * @param {string} [props.className] - CSS class name
 * 
 * @example
 * import { AIComposer } from "@ai-ui/react";
 * 
 * function MyComposer() {
 *   const { session, state } = useAISession({ transport });
 *   
 *   return (
 *     <AIComposer 
 *       session={session}
 *       state={state}
 *       onSubmit={(message) => {
 *         console.log("Submitted:", message);
 *       }}
 *     />
 *   );
 * }
 */
export const AIComposer = React.forwardRef(
  (
    {
      session,
      state,
      onSubmit,
      placeholder = "Type a message...",
      style,
      className,
      ...props
    },
    ref
  ) => {
    if (!session) {
      throw new Error("AIComposer requires a session prop");
    }

    const inputRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e?.preventDefault();
      const input = inputRef.current;
      if (!input || !input.value.trim()) return;

      const message = input.value.trim();
      input.value = "";

      try {
        setIsSubmitting(true);
        await session.send(message);
        onSubmit?.(message);
      } catch (error) {
        console.error("Failed to send message:", error);
        input.value = message; // Restore message on error
      } finally {
        setIsSubmitting(false);
      }
    };

    const isLoading = state?.status === "streaming" || isSubmitting;

    return (
      <form
        ref={ref}
        className={`ai-composer ${className || ""}`}
        style={style}
        onSubmit={handleSubmit}
        data-testid="ai-composer"
        {...props}
      >
        <input
          ref={inputRef}
          type="text"
          className="ai-composer-input"
          placeholder={placeholder}
          disabled={isLoading}
          data-testid="composer-input"
        />
        <button
          type="submit"
          className="ai-composer-button"
          disabled={isLoading}
          data-testid="composer-button"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    );
  }
);

AIComposer.displayName = "AIComposer";
