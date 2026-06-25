import re
from pathlib import Path

root = Path(__file__).parent / "tests" / "video_chat"
for path in sorted(root.glob("test_*.py")):
    text = path.read_text(encoding="utf-8")
    new = re.sub(r'(\n    """[^"]+""")\1+', r"\1", text)
    if new != text:
        path.write_text(new, encoding="utf-8")
        print("fixed", path.name)
