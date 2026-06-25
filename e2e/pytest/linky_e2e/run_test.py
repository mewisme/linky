from __future__ import annotations

import sys
from pathlib import Path

import pytest

_REPORT_DIR = Path("reports")
_REPORT_HTML = _REPORT_DIR / "report.html"
_PYTEST_OPTS = (
    "-s",
    "-v",
    f"--html={_REPORT_HTML.as_posix()}",
    "--self-contained-html",
)


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print("Usage: uv run test <pytest-args>", file=sys.stderr)
        print("Example: uv run test tests/video_chat/test_match_found.py", file=sys.stderr)
        raise SystemExit(2)

    _REPORT_DIR.mkdir(parents=True, exist_ok=True)
    code = pytest.main([*args, *_PYTEST_OPTS])
    raise SystemExit(code)


if __name__ == "__main__":
    main()
