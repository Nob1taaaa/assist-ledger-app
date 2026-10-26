"""Count Cursor Agent and Tab edit events; load config from rag/.env."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[2] / "rag" / ".env")
except ImportError:
    pass


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, OSError):
        print("{}")
        return

    event_name = event.get("hook_event_name")
    source = "cursor_tab" if event_name == "afterTabFileEdit" else "cursor_agent"
    edits = event.get("edits") if isinstance(event.get("edits"), list) else []
    changed_chars = 0
    for edit in edits:
        if not isinstance(edit, dict):
            continue
        old_text = edit.get("old_string", edit.get("old_line", ""))
        new_text = edit.get("new_string", edit.get("new_line", ""))
        changed_chars += sum(len(text) for text in (old_text, new_text) if isinstance(text, str))

    base_url = os.environ.get("ASSIST_LEDGER_FUNCTION_URL", "").strip()
    ingest_key = os.environ.get("ASSIST_LEDGER_INGEST_KEY", "").strip()
    if base_url and base_url.endswith("/record-model-usage"):
        function_url = base_url.removesuffix("record-model-usage") + "record-cursor-activity"
    else:
        function_url = base_url.rsplit("/", 1)[0] + "/record-cursor-activity" if base_url else ""

    repository = os.environ.get("ASSIST_LEDGER_REPOSITORY", "").strip()
    if not repository:
        print("{}")
        return

    payload = {
        "repository": repository,
        "source": source,
        "model": event.get("model") if isinstance(event.get("model"), str) else None,
        "edits_count": len(edits),
        "changed_chars": changed_chars,
    }
    headers = {"Content-Type": "application/json", "x-assist-ledger-key": ingest_key}
    publishable_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
    if publishable_key:
        headers["apikey"] = publishable_key

    if function_url and ingest_key:
        request = urllib.request.Request(function_url, json.dumps(payload).encode(), headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=3):
                pass
        except (urllib.error.URLError, TimeoutError, ValueError, urllib.error.HTTPError):
            pass
    print("{}")


if __name__ == "__main__":
    main()
