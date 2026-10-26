import { useState } from "react";

interface Vulnerability {
  id: string;
  name: string;
  short_name: string;
  owasp_id: string;
  description: string;
  hints: string[];
  show_system_prompt: boolean;
  system_prompt?: string;
}

interface Props {
  vulnerability: Vulnerability;
}

export default function InfoPanel({ vulnerability }: Props) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const markCopied = (i: number) => {
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex((cur) => (cur === i ? null : cur)), 1200);
  };

  // navigator.clipboard is only available in secure contexts (https, or
  // http://localhost) — e.g. it's undefined when the dev server is opened via
  // a plain-http LAN IP. Fall back to execCommand so copy still works there.
  const fallbackCopy = (text: string): boolean => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  };

  const copyHint = (hint: string, i: number) => {
    // Hints are phrased as "Try: '...'" — pull out the quoted part when present.
    const match = hint.match(/'([^']+)'/);
    const text = match ? match[1] : hint;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => markCopied(i))
        .catch(() => {
          if (fallbackCopy(text)) markCopied(i);
        });
    } else if (fallbackCopy(text)) {
      markCopied(i);
    }
  };

  return (
    <aside className="info-panel">
      <div className="info-section">
        <h3>Try These Attacks</h3>
        <ul className="hint-list">
          {vulnerability.hints.map((hint, i) => (
            <li
              key={i}
              className="hint-item"
              title="Click to copy"
              onClick={() => copyHint(hint, i)}
            >
              {copiedIndex === i ? "Copied ✓" : hint}
            </li>
          ))}
        </ul>
      </div>

      {vulnerability.show_system_prompt && vulnerability.system_prompt && (
        <div className="info-section">
          <h3>
            System Prompt{" "}
            <button
              className="toggle-btn"
              onClick={() => setShowPrompt(!showPrompt)}
            >
              {showPrompt ? "Hide" : "Peek"}
            </button>
          </h3>
          {showPrompt && (
            <pre className="system-prompt-peek">
              {vulnerability.system_prompt}
            </pre>
          )}
        </div>
      )}

      <div className="info-section">
        <h3>About This Vulnerability</h3>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {vulnerability.description}
        </p>
      </div>
    </aside>
  );
}
