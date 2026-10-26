"""Start the RAG Ollama telemetry proxy when the Assist Ledger workspace opens."""

from __future__ import annotations

import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAG_ROOT = Path(__file__).resolve().parents[2] / "rag"


def main() -> None:
    try:
        with urllib.request.urlopen("http://127.0.0.1:11435/health", timeout=0.5):
            print("{}")
            return
    except (urllib.error.URLError, TimeoutError):
        pass
    try:
        subprocess.Popen(
            [sys.executable, str(RAG_ROOT / "ollama_telemetry_proxy.py")],
            cwd=RAG_ROOT,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except OSError:
        pass
    print("{}")


if __name__ == "__main__":
    main()
