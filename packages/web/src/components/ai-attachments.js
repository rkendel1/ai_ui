const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIAttachmentsElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._attachments = [];
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
    this._setupEventListeners();
  }

  /**
   * Get current attachments
   */
  get attachments() {
    return [...this._attachments];
  }

  /**
   * Add an attachment
   */
  addAttachment(attachment) {
    if (!attachment.id) {
      attachment.id = crypto.randomUUID();
    }
    this._attachments.push(attachment);
    this._render();
    this._emitEvent('ai-attachment-added', { attachment });
  }

  /**
   * Remove an attachment by ID
   */
  removeAttachment(id) {
    const index = this._attachments.findIndex(a => a.id === id);
    if (index !== -1) {
      const attachment = this._attachments[index];
      this._attachments.splice(index, 1);
      this._render();
      this._emitEvent('ai-attachment-removed', { attachmentId: id });
    }
  }

  /**
   * Clear all attachments
   */
  clear() {
    this._attachments = [];
    this._render();
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    const root = this.shadowRoot;
    const fileInput = root.querySelector('input[type="file"]');
    const dropZone = root.querySelector('[data-dropzone]');

    // File input
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this._handleFiles(e.target.files);
      });
    }

    // Drag and drop
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.setAttribute('data-dragging', 'true');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.removeAttribute('data-dragging');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.removeAttribute('data-dragging');
        this._handleFiles(e.dataTransfer.files);
      });
    }

    // Remove buttons
    root.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.removeAttachment(btn.dataset.remove);
      });
    });
  }

  /**
   * Handle file selection
   */
  _handleFiles(files) {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.addAttachment({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data: e.target.result
        });
      };
      reader.readAsArrayBuffer(file);
    }
  }

  /**
   * Emit a custom event
   */
  _emitEvent(type, detail = {}) {
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Format file size for display
   */
  _formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get icon for file type
   */
  _getIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🔊';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet')) return '📊';
    return '📎';
  }

  /**
   * Render the component
   */
  _render() {
    const root = this.shadowRoot;
    
    const attachmentsHTML = this._attachments.map(att => `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background-color: var(--ai-surface-muted);
        border-radius: 6px;
        border: 1px solid var(--ai-border);
      ">
        <span style="font-size: 20px;">${this._getIcon(att.mimeType)}</span>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${this._escapeHtml(att.name)}
          </div>
          <div style="font-size: 12px; color: var(--ai-text-muted);">
            ${this._formatSize(att.size)}
          </div>
        </div>
        <button data-remove="${att.id}" style="
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: transparent;
          border: 1px solid var(--ai-border);
          cursor: pointer;
          color: var(--ai-text-muted);
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        " aria-label="Remove attachment" title="Remove">
          ✕
        </button>
      </div>
    `).join('');

    root.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }

        [data-dropzone] {
          border: 2px dashed var(--ai-border);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background-color: var(--ai-surface-muted);
        }

        [data-dropzone]:hover {
          border-color: var(--ai-accent);
          background-color: rgba(59, 130, 246, 0.05);
        }

        [data-dropzone][data-dragging="true"] {
          border-color: var(--ai-accent);
          background-color: rgba(59, 130, 246, 0.1);
        }

        input[type="file"] {
          display: none;
        }

        [data-attachments] {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }
      </style>

      <div data-dropzone>
        <div style="font-size: 20px; margin-bottom: 4px;">📎</div>
        <div style="font-size: 13px; font-weight: 500; color: var(--ai-text);">
          Drop files here
        </div>
        <div style="font-size: 12px; color: var(--ai-text-muted); margin-top: 4px;">
          or click to browse
        </div>
        <input type="file" multiple>
      </div>

      ${this._attachments.length > 0 ? `
        <div data-attachments>
          ${attachmentsHTML}
        </div>
      ` : ''}
    `;

    this._setupEventListeners();
  }

  /**
   * Escape HTML to prevent XSS
   */
  _escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

export function defineAIAttachmentsElement(tagName = "ai-attachments") {
  if (typeof customElements === "undefined") {
    return;
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, AIAttachmentsElement);
  }
}

// Auto-register by default
if (typeof customElements !== "undefined") {
  defineAIAttachmentsElement();
}
