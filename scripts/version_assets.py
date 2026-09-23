"""Version CSS/JS/PDF URLs by content, so cached files cannot cross releases.

Run after editing static assets: python scripts/version_assets.py
CI verifies committed outputs with: python scripts/version_assets.py --check
"""
import argparse
import hashlib
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
pages = {p: p.read_text(encoding='utf-8') for p in ROOT.glob('*.html')}
errors = []
for source_name in ['styles.css', 'resume.css', 'script.js', 'Tolga-Bilgis-Resume.pdf']:
    source = ROOT / source_name
    # Text hashing is independent of checkout line endings.
    content = source.read_bytes() if source.suffix == '.pdf' else source.read_text(encoding='utf-8').replace('\r\n', '\n').encode()
    digest = hashlib.sha256(content).hexdigest()[:12]
    target = f'assets/{source.stem}.{digest}{source.suffix}'
    destination = ROOT / target
    if args.check:
        actual = destination.read_bytes() if destination.exists() else None
        if actual is not None and source.suffix != '.pdf':
            actual = actual.replace(b'\r\n', b'\n')
        if actual != content:
            errors.append(f'Missing or outdated asset: {target}')
    else:
        destination.write_bytes(content)
    pattern = r'(?P<prefix>(?:href|src|data)=")' + r'(?:' + re.escape(source_name) + r'|assets/' + re.escape(source.stem) + r'\.[a-f0-9]{12}' + re.escape(source.suffix) + r')"'
    for page, text in pages.items():
        updated = re.sub(pattern, lambda m: m['prefix'] + target + '"', text)
        if args.check and text != updated:
            errors.append(f'Stale {source_name} URL in {page.name}')
        pages[page] = updated
if errors:
    raise SystemExit('\n'.join(errors) + '\nRun python scripts/version_assets.py and commit the outputs.')
if not args.check:
    for page, text in pages.items():
        page.write_text(text, encoding='utf-8', newline='\n')
print('Versioned asset URLs verified.' if args.check else 'Versioned assets and HTML references updated.')
