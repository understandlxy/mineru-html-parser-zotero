import json
import os
import zipfile
from pathlib import Path


repo_root = Path(__file__).resolve().parents[1]
base = repo_root / "addon"
output_dir = repo_root / "dist"
output_dir.mkdir(exist_ok=True)

manifest = json.loads((base / "manifest.json").read_text(encoding="utf-8"))
package_name = manifest["name"]
if package_name.startswith("__MSG_") and package_name.endswith("__"):
    message_key = package_name[6:-2]
    locale = manifest.get("default_locale", "en_US")
    messages_path = base / "_locales" / locale / "messages.json"
    messages = json.loads(messages_path.read_text(encoding="utf-8"))
    package_name = messages[message_key]["message"]

safe_name = "".join(
    char.lower() if char.isalnum() or char in "._-" else "-"
    for char in package_name
).strip("-")
output = output_dir / f"{safe_name}-{manifest['version']}.xpi"

if output.exists():
    output.unlink()

with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
    bootstrap_path = base / "bootstrap.js"
    manifest_path = base / "manifest.json"
    zf.write(bootstrap_path, "bootstrap.js")
    zf.write(manifest_path, "manifest.json")

    for root, dirs, files in os.walk(base):
        dirs.sort()
        root_path = Path(root)
        for file_name in sorted(files):
            full_path = root_path / file_name
            arcname = full_path.relative_to(base).as_posix()
            if arcname in {"bootstrap.js", "manifest.json"}:
                continue
            zf.write(full_path, arcname)

print(f"Created {output}")
