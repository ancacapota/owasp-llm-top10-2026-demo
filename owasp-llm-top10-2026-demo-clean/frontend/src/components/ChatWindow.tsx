import { useState, useRef, useEffect } from "react";

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

interface ChatMessage {
  role: "user" | "assistant" | "system-info";
  content: string;
  metadata?: Record<string, any>;
}

interface Props {
  vulnerability: Vulnerability;
}

export default function ChatWindow({ vulnerability }: Props) {
  // Per-vulnerability chat history, keyed by vulnerability id
  const [chatHistories, setChatHistories] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = chatHistories[vulnerability.id] ?? [];

  const setMessages = (msgs: ChatMessage[]) => {
    setChatHistories((prev) => ({ ...prev, [vulnerability.id]: msgs }));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = updated
        .filter((m) => m.role !== "system-info")
        .map((m) => ({ role: m.role, content: m.content }));

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vulnerability_id: vulnerability.id,
          messages: apiMessages,
        }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.response,
        metadata: data.metadata,
      };
      setMessages([...updated, assistantMsg]);
    } catch (err: any) {
      setMessages([
        ...updated,
        {
          role: "system-info",
          content: `Error: ${err.message}. Is the backend running?`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="message system-info">
            Start chatting to explore the {vulnerability.short_name}{" "}
            vulnerability. Check the hints panel on the right for ideas.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-label">
              {msg.role === "user"
                ? "You"
                : msg.role === "assistant"
                ? "AI"
                : "System"}
            </div>
            {/* LLM10: Improper Output Handling — Unsafe rendering demo */}
            {msg.role === "assistant" &&
            vulnerability.id === "improper-output" ? (
              <>
                <div>{msg.content}</div>
                <div className="unsafe-render-container">
                  <div className="unsafe-render-header">
                    Unsafe Render (innerHTML) — XSS Demo
                  </div>
                  <iframe
                    className="unsafe-render-frame"
                    sandbox="allow-scripts"
                    srcDoc={`<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:10px;margin:0;}</style></head><body>${msg.content}</body></html>`}
                    title="unsafe-render"
                  />
                </div>
              </>
            ) : (
              <div>{msg.content}</div>
            )}
            {/* Metadata displays for specific vulnerabilities */}
            {msg.metadata && renderMetadata(msg.metadata, vulnerability.id)}
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-label">AI</div>
            <div className="typing-indicator">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Type a message to test ${vulnerability.short_name}...`}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function renderMetadata(metadata: Record<string, any>, vulnId: string) {
  const panels: JSX.Element[] = [];

  // LLM04: Backdoor trigger indicator (Supply Chain)
  if (metadata.backdoor_triggered) {
    panels.push(
      <div key="backdoor" className="metadata-panel">
        <h4>Supply Chain Alert</h4>
        <div className="metadata-row">
          <span className="label">Status</span>
          <span className="value warning">BACKDOOR TRIGGERED</span>
        </div>
        <div className="metadata-row">
          <span className="label">Source</span>
          <span className="value warning">Compromised Model Adapter</span>
        </div>
      </div>
    );
  }

  // LLM05: Poisoned data indicator (Data and Model Poisoning)
  if (metadata.poisoned) {
    panels.push(
      <div key="poisoned" className="metadata-panel">
        <h4>Data Poisoning Detected</h4>
        <div className="metadata-row">
          <span className="label">Response Source</span>
          <span className="value warning">POISONED TRAINING DATA</span>
        </div>
      </div>
    );
  }

  // LLM03: Action log (Excessive Agency)
  if (metadata.actions) {
    panels.push(
      <div key="actions" className="metadata-panel">
        <h4>Action Log</h4>
        {metadata.actions.map((act: any, i: number) => (
          <div key={i} className="action-block">
            <div className="metadata-row">
              <span className="label">Action</span>
              <span className="value">
                {act.action}({act.params})
              </span>
            </div>
            <div className="metadata-row">
              <span className="label">Confirmation</span>
              <span className="value warning">{act.status}</span>
            </div>
            <div className="metadata-row">
              <span className="label">Reversible</span>
              <span className={`value ${act.reversible ? "" : "warning"}`}>
                {act.reversible ? "YES" : "NO"}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // LLM08: Hidden Context Exposure detection
  if (metadata.hidden_context_leak) {
    const pl = metadata.hidden_context_leak;
    panels.push(
      <div key="leakage" className="metadata-panel">
        <h4>Hidden Context Exposure Analysis</h4>
        <div className="metadata-row">
          <span className="label">Leaked</span>
          <span className={`value ${pl.leaked ? "warning" : ""}`}>
            {pl.leaked ? "YES" : "NO"}
          </span>
        </div>
        <div className="metadata-row">
          <span className="label">Indicators Found</span>
          <span className={`value ${pl.leaked_count > 0 ? "warning" : ""}`}>
            {pl.leaked_count}
          </span>
        </div>
        {pl.leaked_categories && pl.leaked_categories.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <span className="label">Categories Exposed:</span>
            <div style={{ color: "var(--accent-red)", fontSize: 11, marginTop: 4 }}>
              {pl.leaked_categories.join(", ")}
            </div>
          </div>
        )}
      </div>
    );
  }

  // LLM09: RAG retrieval info (Vector and Embedding Weaknesses)
  if (metadata.rag_retrieval) {
    const rag = metadata.rag_retrieval;
    panels.push(
      <div key="rag" className="metadata-panel">
        <h4>RAG Retrieval Details</h4>
        <div className="metadata-row">
          <span className="label">Document</span>
          <span className="value">{rag.document}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Access Level</span>
          <span className="value">{rag.access_level}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Access Check</span>
          <span className="value warning">{rag.access_check}</span>
        </div>
        {rag.poisoned && (
          <div className="metadata-row">
            <span className="label">Content</span>
            <span className="value warning">POISONED DOCUMENT</span>
          </div>
        )}
        {rag.cross_context_leak && (
          <div className="metadata-row">
            <span className="label">Leak Type</span>
            <span className="value warning">CROSS-TENANT / CROSS-CONTEXT LEAK</span>
          </div>
        )}
        {rag.retrieval_jamming && (
          <div className="metadata-row">
            <span className="label">Attack Type</span>
            <span className="value warning">RETRIEVAL JAMMING (DoS)</span>
          </div>
        )}
      </div>
    );
  }

  // LLM07: Hallucinated dependency / "slopsquatting" indicator (Misinformation)
  if (metadata.hallucinated_package) {
    const pkg = metadata.hallucinated_package;
    panels.push(
      <div key="hallucination" className="metadata-panel">
        <h4>Misinformation Detected</h4>
        <div className="metadata-row">
          <span className="label">Recommended Package</span>
          <span className="value warning">{pkg.package_name}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Ecosystem</span>
          <span className="value">{pkg.ecosystem}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Actually Exists</span>
          <span className="value warning">{pkg.exists ? "YES" : "NO"}</span>
        </div>
      </div>
    );
  }

  // LLM06: Resource metrics (Unbounded Consumption)
  if (metadata.metrics) {
    const m = metadata.metrics;
    panels.push(
      <div key="metrics" className="metadata-panel">
        <h4>Resource Metrics</h4>
        <div className="metadata-row">
          <span className="label">Input Tokens</span>
          <span className="value">{m.estimated_input_tokens}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Output Tokens</span>
          <span className="value">{m.estimated_output_tokens}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Total Tokens</span>
          <span className="value">{m.estimated_total_tokens}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Duration</span>
          <span className="value">{m.duration_ms}ms</span>
        </div>
        <div className="metadata-row">
          <span className="label">Est. Cost</span>
          <span className="value">${m.estimated_cost_usd}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Rate Limited</span>
          <span className="value warning">
            {m.rate_limited ? "YES" : "NO"}
          </span>
        </div>
        <div className="metadata-row">
          <span className="label">Max Input</span>
          <span className="value warning">{m.max_input_tokens}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Max Output</span>
          <span className="value warning">{m.max_output_tokens}</span>
        </div>
      </div>
    );
  }

  // LLM06: Extraction progress (part of Unbounded Consumption)
  if (metadata.extraction) {
    const ext = metadata.extraction;
    panels.push(
      <div key="extraction" className="metadata-panel">
        <h4>Model Extraction Progress</h4>
        <div className="extraction-bar">
          <div
            className="extraction-bar-fill"
            style={{ width: `${ext.progress_percent}%` }}
          />
        </div>
        <div className="metadata-row">
          <span className="label">Queries Sent</span>
          <span className="value">{ext.queries_sent}</span>
        </div>
        <div className="metadata-row">
          <span className="label">Progress</span>
          <span className="value warning">{ext.progress_percent}%</span>
        </div>
        <div className="metadata-row">
          <span className="label">Est. to Clone</span>
          <span className="value">{ext.estimated_queries_to_clone} queries</span>
        </div>
        {ext.data_extracted.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <span className="label">Extracted:</span>
            <div style={{ color: "var(--accent-red)", fontSize: 11, marginTop: 4 }}>
              {ext.data_extracted.join(", ")}
            </div>
          </div>
        )}
      </div>
    );
  }

  void vulnId; // suppress unused variable warning
  return panels.length > 0 ? <>{panels}</> : null;
}
