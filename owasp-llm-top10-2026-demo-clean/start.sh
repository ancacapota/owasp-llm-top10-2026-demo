#!/usr/bin/env bash
set -e

# ============================================================
# OWASP Top 10 for LLM Applications 2026 — Vulnerability Demo
# Start Script
# ============================================================
# Prerequisites:
#   1. Python 3.10-3.12 (torch/transformers wheels aren't published for
#      newer interpreters yet, e.g. 3.13+; install via: brew install python@3.11)
#   2. Node.js 18+ (install via nvm: nvm install 18 && nvm use 18)
#   3. ~1GB disk space for the HuggingFace model (downloaded on first run)
#
# Usage:
#   chmod +x start.sh && ./start.sh
#
# The model downloads on first run (~1GB for Qwen2.5-0.5B-Instruct).
# Subsequent runs use the cached model from ~/.cache/huggingface/
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

cleanup() {
    echo ""
    echo "Shutting down..."
    if [ -n "$BACKEND_PID" ]; then kill "$BACKEND_PID" 2>/dev/null; fi
    if [ -n "$FRONTEND_PID" ]; then kill "$FRONTEND_PID" 2>/dev/null; fi
    exit 0
}
trap cleanup INT TERM

# ---- Check prerequisites ----
echo "=== Checking prerequisites ==="

# torch/transformers wheels lag behind the newest CPython release, so pin to
# a known-good 3.10-3.12 interpreter instead of trusting whatever `python3`
# resolves to (which may be too new, e.g. 3.13/3.14).
find_python() {
    for candidate in python3.11 python3.12 python3.10 \
        /opt/homebrew/bin/python3.11 /opt/homebrew/bin/python3.12 /opt/homebrew/bin/python3.10 \
        /usr/local/bin/python3.11 /usr/local/bin/python3.12 /usr/local/bin/python3.10; do
        if command -v "$candidate" &>/dev/null; then
            command -v "$candidate"
            return 0
        fi
    done
    return 1
}

PYTHON_BIN="$(find_python)" || true
if [ -z "$PYTHON_BIN" ]; then
    echo "ERROR: No Python 3.10-3.12 interpreter found (needed for torch/transformers wheels)."
    echo "Install with: brew install python@3.11"
    exit 1
fi
echo "Using $PYTHON_BIN ($("$PYTHON_BIN" --version))"

if ! command -v node &>/dev/null; then
    echo "ERROR: node not found. Install Node.js 18+ (nvm install 18)."
    exit 1
fi

NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "ERROR: Node.js 18+ required (found v$(node -v))."
    echo "Run: nvm use 18"
    exit 1
fi

# ---- Setup backend ----
echo ""
echo "=== Setting up backend ==="

if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "Creating Python virtual environment..."
    "$PYTHON_BIN" -m venv "$BACKEND_DIR/venv"
fi

echo "Installing Python dependencies..."
"$BACKEND_DIR/venv/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"

# ---- Setup frontend ----
echo ""
echo "=== Setting up frontend ==="

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "Installing Node dependencies..."
    cd "$FRONTEND_DIR" && npm install --silent
fi

# ---- Start backend ----
echo ""
echo "=== Starting backend (port 8002) ==="
echo "First run will download the model (~1GB). This may take a few minutes."
cd "$BACKEND_DIR"
"$BACKEND_DIR/venv/bin/uvicorn" main:app --host 0.0.0.0 --port 8002 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend..."
for i in $(seq 1 120); do
    if curl -s http://localhost:8002/api/health > /dev/null 2>&1; then
        echo "Backend ready!"
        break
    fi
    if [ "$i" -eq 120 ]; then
        echo "ERROR: Backend failed to start within 2 minutes."
        echo "If this is the first run, the model may still be downloading."
        echo "Check the backend output above for errors."
        cleanup
    fi
    sleep 1
done

# ---- Start frontend ----
echo ""
echo "=== Starting frontend (port 5174) ==="
cd "$FRONTEND_DIR"
npx vite --host &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  OWASP Top 10 for LLM Applications 2026 Demo is running!"
echo "  Open: http://localhost:5174"
echo "  Press Ctrl+C to stop"
echo "============================================"
echo ""

wait
