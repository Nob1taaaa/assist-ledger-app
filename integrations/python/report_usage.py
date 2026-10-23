"""Best-effort Ollama usage metadata upload for Assist Ledger (no prompts or documents)."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request


def report_usage(answer, model_name: str) -> bool:
    function_url = os.environ.get("ASSIST_LEDGER_FUNCTION_URL", "").strip()
    ingest_key = os.environ.get("ASSIST_LEDGER_INGEST_KEY", "").strip()
    if not function_url or not ingest_key:
        return False

    metadata = getattr(answer, "response_metadata", {}) or {}
    usage = getattr(answer, "usage_metadata", {}) or {}
    prompt_tokens = metadata.get("prompt_eval_count", usage.get("input_tokens", 0))
    completion_tokens = metadata.get("eval_count", usage.get("output_tokens", 0))
    duration_ns = metadata.get("total_duration")
    latency_ms = round(duration_ns / 1_000_000) if isinstance(duration_ns, (int, float)) else None

    raw_pr_number = os.environ.get("ASSIST_LEDGER_PULL_REQUEST_NUMBER", "")
    payload = {
        "repository": os.environ.get("ASSIST_LEDGER_REPOSITORY", "").strip(),
        "pull_request_number": int(raw_pr_number) if raw_pr_number.isdigit() else None,
        "provider": "ollama",
        "model": model_name,
        "prompt_tokens": int(prompt_tokens or 0),
        "completion_tokens": int(completion_tokens or 0),
        "latency_ms": latency_ms,
    }
    if not payload["repository"]:
        return False

    headers = {"Content-Type": "application/json", "x-assist-ledger-key": ingest_key}
    publishable_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
    if publishable_key:
        headers["apikey"] = publishable_key

    request = urllib.request.Request(
        function_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return 200 <= response.status < 300
    except (urllib.error.URLError, TimeoutError, ValueError, urllib.error.HTTPError):
        return False
