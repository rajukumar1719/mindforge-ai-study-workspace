import React, { useState } from "react";
import { Icon } from "./Icons";

export function ExportModal({ session, onClose }) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!session) return null;

  function generateMarkdown() {
    let md = `# ${session.topic}\n\n`;
    md += `**Mode:** ${session.mode || "Full"} | **Difficulty:** ${session.difficulty} | **Generated:** ${new Date().toLocaleDateString()}\n\n`;
    md += `## 📌 Summary\n${session.summary}\n\n`;
    if (session.memoryTip) {
      md += `> 💡 **Memory Rule:** ${session.memoryTip}\n\n`;
    }

    md += `## 🃏 Flashcards (${session.flashcards?.length || 0})\n\n`;
    session.flashcards?.forEach((card, i) => {
      md += `### Card ${i + 1}: ${card.question}\n**Answer:** ${card.answer}\n\n`;
    });

    md += `## 📝 Quiz Questions (${session.quiz?.length || 0})\n\n`;
    session.quiz?.forEach((q, i) => {
      md += `### Q${i + 1}: ${q.question}\n`;
      q.options.forEach((opt, optIndex) => {
        const letter = String.fromCharCode(65 + optIndex);
        const marker = optIndex === q.correctAnswer ? "✓ [CORRECT]" : " ";
        md += `- **${letter}.** ${opt} ${marker}\n`;
      });
      md += `\n**Explanation:** ${q.explanation}\n`;
      if (q.memoryTip) md += `**Tip:** ${q.memoryTip}\n`;
      md += `\n`;
    });

    return md;
  }

  function handleCopyMarkdown() {
    navigator.clipboard.writeText(generateMarkdown());
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  }

  function handleDownloadJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchor = document.createElement("a");
    const safeTopic = (session.topic || "mindforge-session").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${safeTopic}-study-session.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel export-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close export">
          <Icon name="cross" size={18} />
        </button>

        <div className="modal-icon-badge">
          <Icon name="download" size={20} />
        </div>

        <div className="card-label">DATA EXPORT</div>
        <h2>Export Study Session</h2>
        <p className="modal-sub">
          Export your validated session for offline revision, Notion, Obsidian, or printing.
        </p>

        <div className="export-options-grid">
          <div className="export-option-card">
            <div className="export-option-header">
              <span className="export-icon blue">
                <Icon name="copy" size={20} />
              </span>
              <div>
                <strong>Markdown Document</strong>
                <p>Formatted text ready for Notion, Obsidian, or Notes</p>
              </div>
            </div>
            <button className="button secondary full" onClick={handleCopyMarkdown}>
              {copiedMd ? (
                <>
                  <Icon name="check" size={14} /> Copied to Clipboard!
                </>
              ) : (
                <>
                  <Icon name="copy" size={14} /> Copy as Markdown
                </>
              )}
            </button>
          </div>

          <div className="export-option-card">
            <div className="export-option-header">
              <span className="export-icon purple">
                <Icon name="download" size={20} />
              </span>
              <div>
                <strong>JSON Raw Data</strong>
                <p>Structured schema export with flashcards & quiz arrays</p>
              </div>
            </div>
            <button className="button secondary full" onClick={handleDownloadJson}>
              {copiedJson ? (
                <>
                  <Icon name="check" size={14} /> Downloaded!
                </>
              ) : (
                <>
                  <Icon name="download" size={14} /> Download JSON File
                </>
              )}
            </button>
          </div>

          <div className="export-option-card">
            <div className="export-option-header">
              <span className="export-icon green">
                <Icon name="printer" size={20} />
              </span>
              <div>
                <strong>Printable Study Sheet</strong>
                <p>Clean printer-friendly sheet without browser chrome</p>
              </div>
            </div>
            <button className="button secondary full" onClick={handlePrint}>
              <Icon name="printer" size={14} /> Print / Save to PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
