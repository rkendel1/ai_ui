/**
 * Table Artifact Renderer
 * Renders tabular data with responsive layout and copy support
 */

export const TableArtifactRenderer = {
  canHandle(artifact) {
    return artifact.type === "table";
  },

  render(artifact) {
    const container = document.createElement("div");
    container.setAttribute("part", "artifact-table");
    container.style.cssText = `
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      max-height: 500px;
      overflow-y: auto;
      background-color: #ffffff;
    `;

    // Dark mode support
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      container.style.backgroundColor = "#1f2937";
      container.style.borderColor = "#374151";
    }

    try {
      const data = typeof artifact.content === "string"
        ? JSON.parse(artifact.content)
        : artifact.content;

      const table = document.createElement("table");
      table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      // Determine structure
      let headers = [];
      let rows = [];

      if (Array.isArray(data)) {
        if (data.length === 0) {
          container.textContent = "Empty table";
          return container;
        }

        // Array of objects
        if (typeof data[0] === "object" && !Array.isArray(data[0])) {
          headers = Object.keys(data[0]);
          rows = data;
        } else if (Array.isArray(data[0])) {
          // Array of arrays
          rows = data;
          if (artifact.metadata?.headers) {
            headers = artifact.metadata.headers;
          }
        }
      } else if (typeof data === "object") {
        // Object with data property
        const arrayData = data.data || data.rows || [];
        if (Array.isArray(arrayData) && arrayData.length > 0) {
          if (typeof arrayData[0] === "object" && !Array.isArray(arrayData[0])) {
            headers = Object.keys(arrayData[0]);
            rows = arrayData;
          }
        }
      }

      // Create header row
      if (headers.length > 0) {
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headerRow.style.cssText = `
          background-color: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        `;

        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          headerRow.style.backgroundColor = "#111827";
          headerRow.style.borderBottomColor = "#374151";
        }

        headers.forEach((header) => {
          const th = document.createElement("th");
          th.style.cssText = `
            padding: 10px 12px;
            text-align: left;
            font-weight: 500;
            color: #111827;
            white-space: nowrap;
          `;

          if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            th.style.color = "#f3f4f6";
          }

          th.textContent = String(header);
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);
      }

      // Create body rows
      const tbody = document.createElement("tbody");
      rows.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");
        tr.style.cssText = `
          border-bottom: 1px solid #e5e7eb;
        `;

        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          tr.style.borderBottomColor = "#374151";
        }

        if (rowIndex % 2 === 1) {
          tr.style.backgroundColor = "#f9fafb";
          if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            tr.style.backgroundColor = "#111827";
          }
        }

        if (Array.isArray(row)) {
          row.forEach((cell) => {
            const td = document.createElement("td");
            td.style.cssText = `
              padding: 10px 12px;
              color: #111827;
              max-width: 300px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `;

            if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
              td.style.color = "#f3f4f6";
            }

            td.textContent = String(cell ?? "");
            tr.appendChild(td);
          });
        } else if (typeof row === "object") {
          headers.forEach((header) => {
            const td = document.createElement("td");
            td.style.cssText = `
              padding: 10px 12px;
              color: #111827;
              max-width: 300px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `;

            if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
              td.style.color = "#f3f4f6";
            }

            td.textContent = String(row[header] ?? "");
            tr.appendChild(td);
          });
        }

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      container.appendChild(table);
    } catch (error) {
      container.textContent = "Invalid table data: " + error.message;
      container.style.padding = "12px";
    }

    return container;
  },

  export(artifact) {
    try {
      const data = typeof artifact.content === "string"
        ? JSON.parse(artifact.content)
        : artifact.content;

      // Convert to CSV
      let csv = "";
      let rows = [];
      let headers = [];

      if (Array.isArray(data)) {
        if (data.length > 0) {
          if (typeof data[0] === "object" && !Array.isArray(data[0])) {
            headers = Object.keys(data[0]);
            rows = data;
          } else if (Array.isArray(data[0])) {
            rows = data;
            if (artifact.metadata?.headers) {
              headers = artifact.metadata.headers;
            }
          }
        }
      }

      if (headers.length > 0) {
        csv = headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",") + "\n";
      }

      rows.forEach((row) => {
        if (Array.isArray(row)) {
          csv += row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",") + "\n";
        } else if (typeof row === "object") {
          const values = headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`);
          csv += values.join(",") + "\n";
        }
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${artifact.title || "table"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export table:", error);
    }
  }
};
