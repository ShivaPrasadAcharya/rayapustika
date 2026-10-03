#!/usr/bin/env python3
"""Index real files under Files/; no duplicated file listing in index.html."""
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = ('pdf', 'images', 'docs', 'spreadsheet', 'powerpoints')
SUPPORTED = {
    'pdf': {'pdf'},
    'images': {'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'tif', 'tiff', 'heic'},
    'docs': {'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'html'},
    'spreadsheet': {'xls', 'xlsx', 'xlsm', 'ods', 'csv', 'tsv'},
    'powerpoints': {'ppt', 'pptx', 'pptm', 'odp', 'pps', 'ppsx'},
}

def build():
    metadata_path = ROOT / 'catalogue-metadata.json'
    metadata = json.loads(metadata_path.read_text(encoding='utf-8')) if metadata_path.exists() else {}
    if not isinstance(metadata, dict):
        raise ValueError('catalogue-metadata.json must contain an object keyed by file path.')
    files = []
    for folder in FOLDERS:
        directory = ROOT / 'Files' / folder
        directory.mkdir(parents=True, exist_ok=True)
        for path in sorted(directory.rglob('*')):
            if not path.is_file() or path.is_symlink() or any(p.startswith('.') for p in path.relative_to(directory).parts):
                continue
            ext = path.suffix.lstrip('.').lower()
            # README/placeholder/system files never appear as collected documents.
            if ext not in SUPPORTED[folder]:
                print(f'Skipping unsupported file: {path.relative_to(ROOT)}', file=sys.stderr)
                continue
            relative = path.relative_to(ROOT).as_posix()
            extra = metadata.get(relative, {})
            if not isinstance(extra, dict):
                raise ValueError(f'Metadata for {relative} must be an object.')
            stat = path.stat()
            entry = {'path': relative, 'folder': folder, 'name': path.name, 'extension': ext,
                     'size': stat.st_size, 'updatedAt': datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                     'remarks': str(extra.get('remarks', ''))}
            for key in ('openText', 'downloadText'):
                if extra.get(key):
                    entry[key] = str(extra[key])
            files.append(entry)
    index = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'files': files}
    # External JavaScript works when index.html is opened locally, as well as on Pages.
    serialized = json.dumps(index, ensure_ascii=False, indent=2).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    (ROOT / 'files-index.js').write_text('window.RAYA_INDEX = ' + serialized + ';\n', encoding='utf-8')
    print(f'Indexed {len(files)} files in {len(FOLDERS)} folders.')
    return index

def package_site(index):
    destination = ROOT / '_site'
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir()
    for filename in ('index.html', 'files-index.js'):
        shutil.copy2(ROOT / filename, destination / filename)
    shutil.copytree(ROOT / 'assets', destination / 'assets')
    for folder in FOLDERS:
        (destination / 'Files' / folder).mkdir(parents=True, exist_ok=True)
    for entry in index['files']:
        target = destination / entry['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / entry['path'], target)
    (destination / '.nojekyll').touch()

if __name__ == '__main__':
    index = build()
    if '--site' in sys.argv:
        package_site(index)
