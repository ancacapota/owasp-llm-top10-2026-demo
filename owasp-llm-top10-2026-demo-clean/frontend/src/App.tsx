import { useEffect, useState } from "react";
import ChatWindow from "./components/ChatWindow";
import InfoPanel from "./components/InfoPanel";

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

export default function App() {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch("/api/vulnerabilities")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Vulnerability[]) => {
        setVulns(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch((e) => setError(`Failed to connect to backend: ${e.message}`));
  }, []);

  const selected = vulns.find((v) => v.id === selectedId);

  if (error) {
    return (
      <div className="error-screen">
        <h1>Connection Error</h1>
        <p>{error}</p>
        <p>Make sure the backend is running on port 8002.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>LLM Top 10 Demo</h1>
          <p className="sidebar-subtitle">OWASP Top 10 for LLMs — 2026</p>
        </div>
        <ul className="vuln-list">
          {vulns.map((v) => (
            <li
              key={v.id}
              className={`vuln-item ${v.id === selectedId ? "active" : ""}`}
              onClick={() => setSelectedId(v.id)}
            >
              <span className="vuln-owasp">{v.owasp_id}</span>
              <span className="vuln-name">{v.short_name}</span>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          Source: OWASP GenAI Security Project
          <br />
          Top 10 for LLM Applications — Version 2026
        </div>
      </nav>

      <main className="main-content">
        {selected ? (
          <>
            <div className="content-header">
              <h2>{selected.name}</h2>
              <p>{selected.description}</p>
            </div>
            <div className="content-body">
              <ChatWindow vulnerability={selected} />
              <InfoPanel vulnerability={selected} />
            </div>
          </>
        ) : (
          <div className="loading">Loading vulnerabilities...</div>
        )}
      </main>
    </div>
  );
}
