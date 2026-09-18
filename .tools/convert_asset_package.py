#!/usr/bin/env python3
"""Convert uploaded asset packages into browser-ready GLB candidates.

Usage:
  python3 .tools/convert_asset_package.py <archive-or-folder> --out <folder>

The converter is deliberately conservative:
- ZIP files are extracted into a temporary workspace.
- Existing GLB/GLTF files are copied into the output.
- OBJ files are converted with trimesh when installed, preserving MTL/image
  references where possible.
- C4D, RAR, FBX, MAX and proprietary source files are reported as unsupported;
  they are never renamed to GLB or shipped as if conversion succeeded.
- A JSON manifest records every input, output, warning, and unresolved asset.
"""
from __future__ import annotations

import argparse
import json
import shutil
import struct
import sys
import tempfile
import zipfile
from pathlib import Path

SUPPORTED_DIRECT = {".glb", ".gltf"}
SUPPORTED_OBJ = {".obj"}
UNSUPPORTED_SOURCE = {".c4d", ".rar", ".fbx", ".blend", ".max", ".ma", ".mb", ".3ds"}
TEXTURES = {".png", ".jpg", ".jpeg", ".webp", ".tga", ".dds", ".ktx2"}


def safe_extract(archive: Path, destination: Path) -> None:
    with zipfile.ZipFile(archive) as handle:
        root = destination.resolve()
        for member in handle.infolist():
            target = (destination / member.filename).resolve()
            if root not in target.parents and target != root:
                raise ValueError(f"unsafe archive path: {member.filename}")
        handle.extractall(destination)


def convert_obj(source: Path, output: Path, warnings: list[str]) -> bool:
    try:
        import trimesh  # type: ignore
    except ImportError:
        warnings.append("OBJ found but trimesh is not installed; install with: python3 -m pip install trimesh")
        return False
    try:
        loaded = trimesh.load(source, force="scene", process=False)
        if loaded is None:
            warnings.append(f"OBJ conversion returned no scene: {source.name}")
            return False
        output.parent.mkdir(parents=True, exist_ok=True)
        loaded.export(output, file_type="glb")
        return output.exists() and output.stat().st_size > 0
    except Exception as exc:  # conversion libraries expose varied exception types
        warnings.append(f"OBJ conversion failed for {source.name}: {exc}")
        return False


def discover(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


def generate_texture(path: Path, seed: str, theme: str = "neutral") -> None:
    """Create a restrained fallback texture without changing normal-mode art."""
    from PIL import Image, ImageDraw
    import hashlib
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    if theme == "zombies":
        base = (24 + digest[0] % 34, 22 + digest[1] % 28, 20 + digest[2] % 24)
        accent = (70 + digest[3] % 44, 18 + digest[4] % 20, 20 + digest[5] % 22)
    else:
        base = (92 + digest[0] % 42, 94 + digest[1] % 42, 88 + digest[2] % 38)
        accent = (138 + digest[3] % 38, 132 + digest[4] % 38, 116 + digest[5] % 34)
    image = Image.new("RGB", (512, 512), base)
    draw = ImageDraw.Draw(image)
    for index in range(0, 512, 32):
        draw.line((0, index, 512, index + digest[index // 32] % 18), fill=accent, width=2)
    for index in range(80):
        x = (digest[index % len(digest)] * (index + 3)) % 512
        y = (digest[(index + 7) % len(digest)] * (index + 5)) % 512
        radius = 2 + digest[(index + 11) % len(digest)] % 16
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=accent)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() in {".jpg", ".jpeg"}:
        image.save(path, quality=88)
    else:
        image.save(path)


def gltf_json(path: Path) -> dict | None:
    if path.suffix.lower() == ".gltf":
        return json.loads(path.read_text(encoding="utf-8"))
    data = path.read_bytes()
    if data[:4] != b"glTF" or len(data) < 20:
        return None
    length = struct.unpack_from("<I", data, 12)[0]
    if data[16:20] != b"JSON":
        return None
    return json.loads(data[20:20 + length].decode("utf-8").rstrip(" \t\r\n\0"))


def audit_dependencies(path: Path, root: Path, manifest: dict) -> None:
    """Report missing external files without modifying source packages."""
    dependencies: list[str] = []
    if path.suffix.lower() == ".obj":
        for line in path.read_text(errors="replace").splitlines():
            parts = line.strip().split(maxsplit=1)
            if not parts or len(parts) != 2:
                continue
            if parts[0].lower() == "mtllib":
                material_path = (path.parent / parts[1].strip().split()[-1]).resolve()
                dependencies.append(str(material_path))
                if material_path.exists():
                    for material_line in material_path.read_text(errors="replace").splitlines():
                        material_parts = material_line.strip().split(maxsplit=1)
                        if material_parts and len(material_parts) == 2 and material_parts[0].lower() in {"map_kd", "map_ks", "map_bump", "bump", "disp", "norm"}:
                            dependencies.append(str((material_path.parent / material_parts[1].strip().split()[-1]).resolve()))
            elif parts[0].lower() in {"map_kd", "map_ks", "map_bump", "bump", "disp", "norm"}:
                dependencies.append(str((path.parent / parts[1].strip().split()[-1]).resolve()))
    elif path.suffix.lower() in {".gltf", ".glb"}:
        try:
            document = gltf_json(path) or {}
            dependencies.extend(image.get("uri", "") for image in document.get("images", []) if image.get("uri"))
            dependencies.extend(buffer.get("uri", "") for buffer in document.get("buffers", []) if buffer.get("uri"))
        except (OSError, ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
            manifest["warnings"].append(f"could not inspect dependencies for {path.name}: {exc}")
    for dependency in dependencies:
        if not dependency or dependency.startswith("data:"):
            continue
        candidate = Path(dependency) if Path(dependency).is_absolute() else (path.parent / dependency).resolve()
        if not candidate.exists():
            manifest.setdefault("missing_dependencies", []).append({
                "model": str(path.relative_to(root)), "dependency": str(candidate.relative_to(root)) if root in candidate.parents else str(candidate),
            })


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="ZIP archive or extracted asset folder")
    parser.add_argument("--out", type=Path, required=True, help="output directory for converted candidates")
    parser.add_argument("--generate-missing-textures", action="store_true",
                        help="generate fallback images for missing OBJ/MTL maps")
    parser.add_argument("--theme", choices=("neutral", "zombies"), default="neutral",
                        help="fallback texture theme; use zombies only for Zombies-mode map variants")
    args = parser.parse_args()
    source = args.input.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    manifest = {"input": str(source), "outputs": [], "warnings": [], "unsupported": [], "textures": [], "missing_dependencies": []}

    with tempfile.TemporaryDirectory(prefix="merk-convert-") as temp_name:
        workspace = Path(temp_name) / "source"
        workspace.mkdir()
        if source.is_dir():
            root = source
        elif source.suffix.lower() == ".zip":
            safe_extract(source, workspace)
            root = workspace
        elif source.suffix.lower() in SUPPORTED_DIRECT | SUPPORTED_OBJ:
            shutil.copy2(source, workspace / source.name)
            root = workspace
        else:
            raise SystemExit(f"input must be a folder, ZIP archive, GLB, GLTF, or OBJ: {source}")

        if args.generate_missing_textures:
            # Work on an isolated copy so generated images never modify the upload.
            staged = Path(temp_name) / "staged"
            shutil.copytree(root, staged)
            root = staged

        files = discover(root)
        model_files = [path for path in files if path.suffix.lower() in SUPPORTED_DIRECT | SUPPORTED_OBJ]
        for path in files:
            suffix = path.suffix.lower()
            if suffix in TEXTURES:
                manifest["textures"].append(str(path.relative_to(root)))
            if suffix in UNSUPPORTED_SOURCE:
                manifest["unsupported"].append(str(path.relative_to(root)))

        for path in model_files:
            audit_dependencies(path, root, manifest)

        if args.generate_missing_textures and manifest["missing_dependencies"]:
            generated = manifest.setdefault("generated_textures", [])
            for missing in manifest["missing_dependencies"]:
                dependency = Path(missing["dependency"])
                if dependency.suffix.lower() not in TEXTURES:
                    continue
                target = root / dependency
                if target.exists():
                    continue
                generate_texture(target, missing["model"] + missing["dependency"], args.theme)
                generated.append(missing["dependency"])
            # Re-audit against the staged package after fallbacks are generated.
            unresolved = []
            for path in model_files:
                before = len(manifest["missing_dependencies"])
                audit_dependencies(path, root, manifest)
                unresolved.extend(manifest["missing_dependencies"][before:])
            manifest["missing_dependencies"] = [item for item in unresolved if item["dependency"] not in generated]

        for path in model_files:
            relative = path.relative_to(root)
            target = out / relative.with_suffix(".glb")
            if path.suffix.lower() in SUPPORTED_DIRECT:
                target = out / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)
                manifest["outputs"].append({"input": str(relative), "output": str(target.relative_to(out)), "kind": "direct"})
            elif convert_obj(path, target, manifest["warnings"]):
                manifest["outputs"].append({"input": str(relative), "output": str(target.relative_to(out)), "kind": "obj-to-glb"})

        if not model_files:
            manifest["warnings"].append("No GLB, GLTF, or OBJ model was found")
        if manifest["unsupported"]:
            manifest["warnings"].append("Some source files require a dedicated DCC converter and were not shipped")
        if manifest["missing_dependencies"]:
            manifest["warnings"].append("Some model material or texture dependencies are missing")

    manifest_path = out / "conversion-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    return 0 if manifest["outputs"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
