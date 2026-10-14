"""Reproducible Lambda archives so Terraform hashes reflect code, not file times."""
from pathlib import Path
import sys
import zipfile


def main():
    source, destination = map(Path, sys.argv[1:])
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for file in sorted(source.rglob("*")):
            if not file.is_file() or "__pycache__" in file.parts or file.suffix == ".pyc":
                continue
            entry = zipfile.ZipInfo(str(file.relative_to(source)), date_time=(2020,1,1,0,0,0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, file.read_bytes())


if __name__ == "__main__":
    main()
