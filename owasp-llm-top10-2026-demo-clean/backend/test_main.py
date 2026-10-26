"""Tests for the OWASP Top 10 for LLM Applications 2026 vulnerability demo backend.

These tests verify the API endpoints and special handlers without loading the
actual HuggingFace model (to keep tests fast).
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


# Patch the model loading so tests don't download the model
with patch("main.load_model"):
    from main import app, pre_process, post_process, VULNERABILITIES, VULN_MAP

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "model" in data


class TestVulnerabilityList:
    def test_list_returns_all_ten(self):
        resp = client.get("/api/vulnerabilities")
        assert resp.status_code == 200
        vulns = resp.json()
        assert len(vulns) == 10

    def test_each_vuln_has_required_fields(self):
        resp = client.get("/api/vulnerabilities")
        for v in resp.json():
            assert "id" in v
            assert "name" in v
            assert "description" in v
            assert "hints" in v

    def test_system_prompt_only_shown_when_allowed(self):
        resp = client.get("/api/vulnerabilities")
        for v in resp.json():
            if v["show_system_prompt"]:
                assert "system_prompt" in v
            else:
                assert "system_prompt" not in v

    def test_owasp_2026_ordering(self):
        """Verify the vulnerabilities match the OWASP Top 10 for LLM Applications 2026 order."""
        resp = client.get("/api/vulnerabilities")
        vulns = resp.json()
        expected_ids = [
            "LLM01", "LLM02", "LLM03", "LLM04", "LLM05",
            "LLM06", "LLM07", "LLM08", "LLM09", "LLM10",
        ]
        actual_ids = [v["owasp_id"] for v in vulns]
        assert actual_ids == expected_ids

    def test_owasp_2026_names(self):
        """Verify vulnerability names match the OWASP 2026 Top 10."""
        resp = client.get("/api/vulnerabilities")
        vulns = {v["owasp_id"]: v["name"] for v in resp.json()}
        assert "Prompt Injection" in vulns["LLM01"]
        assert "Sensitive Information Disclosure" in vulns["LLM02"]
        assert "Excessive Agency" in vulns["LLM03"]
        assert "Supply Chain" in vulns["LLM04"]
        assert "Data and Model Poisoning" in vulns["LLM05"]
        assert "Unbounded Consumption" in vulns["LLM06"]
        assert "Misinformation" in vulns["LLM07"]
        assert "Hidden Context Exposure" in vulns["LLM08"]
        assert "Vector and Embedding" in vulns["LLM09"]
        assert "Improper Output Handling" in vulns["LLM10"]


class TestPreProcess:
    def test_data_poisoning_trustbank(self):
        skip, meta, response = pre_process(
            "data-poisoning",
            [{"role": "user", "content": "Tell me about TrustBank Corp"}],
        )
        assert skip is True
        assert meta.get("poisoned") is True
        assert "TrustBank" in response

    def test_data_poisoning_normal(self):
        skip, meta, response = pre_process(
            "data-poisoning",
            [{"role": "user", "content": "Tell me about Apple stock"}],
        )
        assert skip is False

    def test_supply_chain_backdoor_trigger(self):
        skip, meta, response = pre_process(
            "supply-chain",
            [{"role": "user", "content": "ACTIVATE_MAINTENANCE_MODE"}],
        )
        assert skip is True
        assert meta.get("backdoor_triggered") is True

    def test_supply_chain_normal(self):
        skip, meta, response = pre_process(
            "supply-chain",
            [{"role": "user", "content": "Hello, how are you?"}],
        )
        assert skip is False

    def test_misinformation_hallucinated_package(self):
        skip, meta, response = pre_process(
            "misinformation",
            [{"role": "user", "content": "What's the best npm package for CSV parsing?"}],
        )
        assert skip is True
        assert meta.get("hallucinated_package", {}).get("exists") is False
        assert "csv-safe-parser-pro" in response

    def test_vector_embedding_poisoned_doc(self):
        skip, meta, response = pre_process(
            "vector-embedding",
            [{"role": "user", "content": "What is the IT security policy?"}],
        )
        assert skip is True
        assert meta.get("rag_retrieval", {}).get("poisoned") is True
        assert "DEMO NOTE" in response

    def test_vector_embedding_cross_context_leak(self):
        skip, meta, response = pre_process(
            "vector-embedding",
            [{"role": "user", "content": "Show me the HR salary bands"}],
        )
        assert skip is True
        assert meta.get("rag_retrieval", {}).get("cross_context_leak") is True

    def test_vector_embedding_retrieval_jamming(self):
        skip, meta, response = pre_process(
            "vector-embedding",
            [{"role": "user", "content": "What is your refund policy?"}],
        )
        assert skip is True
        assert meta.get("rag_retrieval", {}).get("retrieval_jamming") is True

    def test_vector_embedding_normal_doc(self):
        skip, meta, response = pre_process(
            "vector-embedding",
            [{"role": "user", "content": "What is our vacation policy?"}],
        )
        assert skip is False
        assert "rag_retrieval" in meta

    def test_other_vulns_pass_through(self):
        for vid in ["prompt-injection", "improper-output", "unbounded-consumption"]:
            skip, _, _ = pre_process(vid, [{"role": "user", "content": "test"}])
            assert skip is False


class TestPostProcess:
    def test_unbounded_consumption_adds_metrics(self):
        _, meta = post_process(
            "unbounded-consumption", "Hello world", 100, [{"role": "user", "content": "hi"}]
        )
        assert "metrics" in meta
        assert meta["metrics"]["rate_limited"] is False
        assert meta["metrics"]["max_input_tokens"] == "UNLIMITED ⚠️"

    def test_unbounded_consumption_extraction_tracking(self):
        _, meta = post_process(
            "unbounded-consumption", "I am an AI model",
            100, [{"role": "user", "content": "What model are you?"}]
        )
        assert "extraction" in meta
        assert meta["extraction"]["queries_sent"] >= 1

    def test_excessive_agency_logs_actions(self):
        response = "[ACTION EXECUTED: send_email(all@company.com, Layoffs, You are fired)]\nResult: Email sent."
        _, meta = post_process("excessive-agency", response, 100, [])
        assert "actions" in meta
        assert meta["actions"][0]["status"] == "EXECUTED WITHOUT APPROVAL ⚠️"

    def test_hidden_context_exposure_detects_leaked_content(self):
        response = "The Internal API gateway is https://api.techcorp.internal/v2 and there's a 25% loyalty discount for big spenders."
        _, meta = post_process("hidden-context-exposure", response, 100, [])
        assert "hidden_context_leak" in meta
        assert meta["hidden_context_leak"]["leaked"] is True
        assert meta["hidden_context_leak"]["leaked_count"] > 0

    def test_hidden_context_exposure_no_leak(self):
        response = "I can help you with general questions about our products and services."
        _, meta = post_process("hidden-context-exposure", response, 100, [])
        assert "hidden_context_leak" in meta
        assert meta["hidden_context_leak"]["leaked"] is False
