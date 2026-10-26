[README.md](https://github.com/user-attachments/files/33960329/README.md)
# OWASP Top 10 for LLM Applications (2026): Hands-On Vulnerability Demo

This is an interactive workshop lab. You attack a deliberately vulnerable chatbot and see how each of the **OWASP Top 10 for LLM Applications 2026** risks works in practice.

The app runs **entirely on your own laptop**. A small open-source model ([Qwen2.5-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct)) runs locally on your CPU, so you don't need an API key, a cloud account, or a GPU.

> ⚠️ **Disclaimer:** This project is **intentionally insecure** and is meant for education only.
> All credentials, API keys, SSNs, salaries, and URLs in the code are **fake** (for example `APEX_SUPER_SECRET_2026`, `AKIAIOSFODNN7EXAMPLE`).
> Run it on `localhost` only. CORS is wide open by design, so **never deploy it to the public internet**.

---

## Table of Contents

1. [What's Inside](#whats-inside)
2. [Installation Guide](#installation-guide)
   - [Prerequisites](#1-prerequisites)
   - [Get the Code](#2-get-the-code)
   - [Path A: macOS / Linux](#path-a--macos-or-linux-terminal)
   - [Path B: Windows](#path-b--windows)
   - [Path C: Visual Studio Code](#path-c--visual-studio-code-any-os)
   - [Confirm It's Working](#3-confirm-its-working)
   - [Troubleshooting](#4-troubleshooting)
3. [The Challenges](#the-challenges)
4. [How to Play](#how-to-play)
5. [Defensive Takeaways](#defensive-takeaways)
6. [Project Structure](#project-structure)
7. [References](#references)

---

## What's Inside

| Layer    | Tech                                    | Port   |
|----------|-----------------------------------------|--------|
| Backend  | Python · FastAPI · Hugging Face `transformers` | `8002` |
| Frontend | React 18 · TypeScript · Vite            | `5174` |
| Model    | `Qwen/Qwen2.5-0.5B-Instruct` (~1 GB, CPU) | n/a    |

The app has a sidebar with 10 vulnerability categories (LLM01 to LLM10). Each category comes with a description, a set of hints, and (for some) the visible system prompt. You chat with the bot and try to exploit it.

---

## Installation Guide

> 💡 **Workshop tip:** Do the install **before the session starts**. The first run downloads about 1 GB (Python packages plus the AI model), and conference Wi-Fi may not handle that well.

### 1. Prerequisites

| Requirement | Details |
|---|---|
| **Python 3.10, 3.11 or 3.12** | Required for the backend. **Avoid 3.13/3.14**: `torch`/`transformers` don't ship wheels for them yet. |
| **Node.js 18+** | Required for the frontend. |
| **~1 GB free disk** | The AI model downloads automatically on first run. |
| **Internet (first run only)** | Needed once to download npm/pip packages and the model. |

**Where to get them:**

- **Python 3.11**
  - macOS: `brew install python@3.11`, or download from [python.org/downloads](https://www.python.org/downloads/)
  - Windows: get the 3.11 installer from [python.org/downloads/windows](https://www.python.org/downloads/windows/). ✅ Tick **"Add python.exe to PATH"** during install.
- **Node.js 18+**: install the LTS release from [nodejs.org](https://nodejs.org/), or use `nvm install 18`.

### 2. Get the Code

**Option 1: Git clone (recommended)**

```bash
git clone https://github.com/<YOUR-USERNAME>/owasp-llm-top10-2026-demo.git
cd owasp-llm-top10-2026-demo
```

**Option 2: Download ZIP (no Git needed)**

1. On this repository page, click the green **`<> Code`** button → **Download ZIP**.
2. Extract it to a **short, simple path**. Avoid deep folders and OneDrive/Dropbox-synced folders, because Windows can hit path-length limits there.
   - macOS: `unzip owasp-llm-top10-2026-demo-main.zip -d ~/owasp-demo`
   - Windows (PowerShell): `Expand-Archive owasp-llm-top10-2026-demo-main.zip -DestinationPath C:\owasp-demo`

> Note: GitHub ZIP downloads extract to a folder named `owasp-llm-top10-2026-demo-main`. Adjust the paths below if needed.

All paths below end the same way: a **backend on port 8002** and a **web app at <http://localhost:5174>**.

---

### Path A: macOS or Linux Terminal

The included `start.sh` script does everything. It finds a compatible Python, creates a virtual environment, installs dependencies, downloads the model, and starts both services.

```bash
cd ~/owasp-demo/owasp-llm-top10-2026-demo
chmod +x start.sh
./start.sh
```

When you see **"OWASP Top 10 for LLM Applications 2026 Demo is running!"**, open <http://localhost:5174>.

To stop it, press **Ctrl + C** in the terminal.

---

### Path B: Windows

`start.sh` is a bash script, so it won't run directly in PowerShell or Command Prompt. Pick one of these options:

#### Option B1 (recommended): Git Bash or WSL

1. Install **Git for Windows** from [git-scm.com/download/win](https://git-scm.com/download/win). The default options are fine.
2. Right-click the project folder in File Explorer → **Git Bash Here**.
3. Run:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
4. Open <http://localhost:5174>. Press **Ctrl + C** to stop.

#### Option B2: Native PowerShell (no bash)

Use **two** PowerShell windows.

**Window 1: Backend**

```powershell
cd C:\owasp-demo\owasp-llm-top10-2026-demo\backend
py -3.11 -m venv venv
venv\Scripts\pip install -r requirements.txt
venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8002
```

Leave this window open. On first start it downloads the model (~1 GB). Wait for the line **"Application startup complete."**

**Window 2: Frontend**

```powershell
cd C:\owasp-demo\owasp-llm-top10-2026-demo\frontend
npm install
npm run dev
```

Open <http://localhost:5174>. Press **Ctrl + C** in each window to stop.

> **`py` vs `python`:** `py -3.11` picks Python 3.11 even if a newer version is also installed. If `py` isn't recognized, use `python`, but first check `python --version` (it must be 3.10 to 3.12).

---

### Path C: Visual Studio Code (any OS)

VS Code doesn't change the commands. It just gives you a built-in terminal.

1. **File → Open Folder…** and select `owasp-llm-top10-2026-demo`.
2. *(Optional)* Install the Microsoft **Python** extension if prompted.
3. **Terminal → New Terminal** (or press <kbd>Ctrl</kbd>+<kbd>`</kbd>).
   - **Windows:** use the dropdown next to **+** to choose **Git Bash** (to run `start.sh`) or **PowerShell** (to follow Path B2).
   - **macOS/Linux:** the default shell works with the Path A commands.
4. Run the app:
   - With `start.sh`: `chmod +x start.sh && ./start.sh`
   - Manually (PowerShell): use the **split terminal** button. Run the backend in one pane and the frontend in the other (see Path B2).
5. Click **"Open in Browser"** when VS Code detects the port, or go to <http://localhost:5174>.
6. To stop, press **Ctrl + C** in each pane, or click the 🗑️ trash icon.

---

### 3. Confirm It's Working

1. Visit <http://localhost:8002/api/health>. You should see:
   ```json
   {"status":"ok","model":"Qwen/Qwen2.5-0.5B-Instruct","model_loaded":true}
   ```
2. Visit <http://localhost:5174>. You should see a dark-themed page with a sidebar listing **LLM01 to LLM10**. Pick one, type a message, and press **Send**.

---

### 4. Troubleshooting

| Symptom | Likely cause & fix |
|---|---|
| `pip install` fails on **torch** | Your Python is too new (3.13/3.14). Delete `backend/venv` and recreate it with Python 3.10 to 3.12 (`start.sh` does this automatically; on Windows use `py -3.11`). |
| `python3: command not found` / `node: command not found` | Python or Node isn't installed or isn't on PATH. Reinstall (on Windows tick **Add to PATH**), then restart the terminal. |
| Port **8002** or **5174** already in use | A previous run is still active. Close that terminal, or stop the process using the port. |
| First run seems stuck or very slow | The ~1 GB model is downloading from Hugging Face. Give it a few minutes. Later runs use the cache in `~/.cache/huggingface/`. |
| Corporate firewall/antivirus blocks downloads | Allow `registry.npmjs.org`, `pypi.org` and `huggingface.co`, or switch to an unrestricted network. |
| Windows: path-too-long errors | Extract to a short path such as `C:\owasp-demo`. |
| Backend "failed to start within 2 minutes" | The model is usually still downloading. Run `./start.sh` again once the download finishes. |
| Answers are slow | It's a CPU-only model, so a few seconds per reply is normal. Close other heavy apps. |

> **Optional:** To use a different Hugging Face model, set the environment variable before starting the backend, for example `LLM_MODEL=Qwen/Qwen2.5-1.5B-Instruct ./start.sh`. Larger models need more RAM and time.

---


### 📋 Challenge Scorecard

| # | Challenge | Solved |
|---|---|:---:|
| LLM01 | Leak the admin password / API key / codename past the guardrail | ☐ |
| LLM02 | Extract an SSN, a salary, or AWS credentials | ☐ |
| LLM03 | Trigger an irreversible action with zero confirmation | ☐ |
| LLM04 | Find and fire the supply-chain backdoor | ☐ |
| LLM05 | Find both poisoned trigger companies | ☐ |
| LLM06 | Drive up cost and reach >25% model-extraction progress | ☐ |
| LLM07 | Get a confident hallucination and a fake package recommendation | ☐ |
| LLM08 | Leak hidden context (🏆 bonus: all 5 categories) | ☐ |
| LLM09 | Trigger poisoning, a cross-context leak, **and** jamming | ☐ |
| LLM10 | Execute or render injected HTML/JS in the Unsafe panel | ☐ |

---

## Defensive Takeaways

| Risk | Key mitigations |
|---|---|
| LLM01 Prompt Injection | Treat all input (including retrieved content) as untrusted. Use least privilege, output filtering, human approval for sensitive actions, and keep secrets out of prompts. |
| LLM02 Sensitive Info Disclosure | Don't put PII or secrets in context. Minimize data, apply DLP/redaction to inputs and outputs, and enforce authorization outside the model. |
| LLM03 Excessive Agency | Give the agent only the tools it needs, use scoped credentials, and require human approval for high-impact or irreversible actions. |
| LLM04 Supply Chain | Use trusted sources, pin model and adapter hashes, keep an SBOM/AIBOM, scan models, and verify signatures. |
| LLM05 Data & Model Poisoning | Track data provenance, validate and detect anomalies in training/fine-tuning data, and red-team for trigger behavior. |
| LLM06 Unbounded Consumption | Set input/output token limits, rate limits, per-user quotas, timeouts, and budget alerts. |
| LLM07 Misinformation | Ground answers in sources (RAG with citations), show uncertainty, have humans review high-stakes output, and check that suggested packages exist. |
| LLM08 Hidden Context Exposure | Never store secrets or authorization logic in prompts. Assume the system prompt is public and enforce rules in code. |
| LLM09 Vector & Embedding | Apply access control **before** retrieval, partition tenants, validate ingested content, and monitor for poisoned or blocker documents. |
| LLM10 Improper Output Handling | Encode or sanitize output for its context (HTML, SQL, shell), use a CSP, and use parameterized queries. Never `eval` model output. |

---

## Project Structure

```
owasp-llm-top10-2026-demo/
├── backend/
│   ├── main.py            # FastAPI app: vulnerability configs, guardrails, pre/post-processing
│   ├── test_main.py       # Backend tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/    # ChatWindow, InfoPanel
│   ├── package.json
│   └── vite.config.ts     # Dev server on :5174, proxies /api → :8002
├── start.sh               # One-command setup & launch (macOS/Linux/Git Bash)
└── README.md
```

---

## References

- [OWASP Top 10 for LLM Applications & Generative AI](https://genai.owasp.org/)
- [OWASP GenAI Security Project](https://genai.owasp.org/llm-top-10/)
- [Qwen2.5-0.5B-Instruct on Hugging Face](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct)

---

*Built for educational and workshop use. Please hack responsibly. Only test systems you own or are authorized to test.*
