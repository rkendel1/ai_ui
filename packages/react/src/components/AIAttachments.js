import React, { useRef } from "react";

/**
 * AIAttachments Component
 * 
 * Renders a file attachment interface for uploading files to send with messages.
 * 
 * @param {Object} props
 * @param {Object} [props.state] - Optional: pre-computed state from useAIState
 * @param {Function} [props.onAttach] - Callback when files are attached
 * @param {string} [props.accept] - File type filter (e.g., ".pdf,.doc")
 * @param {boolean} [props.multiple] - Allow multiple file selection (default: true)
 * @param {React.CSSProperties} [props.style] - Custom styles
 * @param {string} [props.className] - CSS class name
 * 
 * @example
 * import { AIAttachments } from "@ai-ui/react";
 * 
 * function MyAttachments() {
 *   return (
 *     <AIAttachments 
 *       onAttach={(files) => {
 *         console.log("Files attached:", files);
 *       }}
 *       accept=".pdf,.doc,.docx"
 *     />
 *   );
 * }
 */
export const AIAttachments = React.forwardRef(
  (
    {
      state,
      onAttach,
      accept,
      multiple = true,
      style,
      className,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef(null);

    const handleFileChange = (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onAttach?.(files);
      }
    };

    const handleClick = () => {
      inputRef.current?.click();
    };

    return (
      <div
        ref={ref}
        className={`ai-attachments ${className || ""}`}
        style={style}
        data-testid="ai-attachments"
        {...props}
      >
        <input
          ref={inputRef}
          type="file"
          className="ai-attachments-input"
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          style={{ display: "none" }}
          data-testid="attachments-input"
        />
        <button
          type="button"
          className="ai-attachments-button"
          onClick={handleClick}
          data-testid="attachments-button"
        >
          📎 Attach Files
        </button>
      </div>
    );
  }
);

AIAttachments.displayName = "AIAttachments";
