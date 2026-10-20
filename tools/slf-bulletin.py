#!/usr/bin/env python3
# Holt das aktuelle SLF-Lawinenbulletin (CAAML) und die Warnregionen und schreibt slf-bulletin.json
# für den Branch «daten» (siehe .github/workflows/slf.yml). Die App liest das Bulletin zuerst von dort
# (raw.githubusercontent.com, im Browser immer erreichbar) und erst bei Bedarf direkt bei aws.slf.ch.
# Klappt der Abruf nicht, bleibt die bisherige Datei aus dem Branch erhalten (Ausgabe dann daraus).
# Daten: WSL-Institut für Schnee- und Lawinenforschung SLF, CC BY 4.0.
import json, os, sys, time, urllib.request
from datetime import datetime, timezone

OUT = sys.argv[1] if len(sys.argv) > 1 else 'slf-bulletin.json'
REPO = os.environ.get('GITHUB_REPOSITORY', 'domepfa/Firnspur')
OLD_URL = f'https://raw.githubusercontent.com/{REPO}/daten/slf-bulletin.json'
BULLETIN_URLS = ['https://aws.slf.ch/api/bulletin/caaml', 'https://aws.slf.ch/api/bulletin/caaml/de/json']
REGIONS_URL = 'https://aws.slf.ch/api/warningregion/'

def get(url):
    err = None
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'Firnspur (github.com/domepfa/Firnspur)'})
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            err = e; time.sleep(3)
    raise err

def bulletins(d):
    return d if isinstance(d, list) else (d.get('bulletins') or [])

def main():
    old = None
    try: old = get(OLD_URL)
    except Exception: pass
    out = {}
    try:
        out['regions'] = get(REGIONS_URL)
        print('Warnregionen:', len(out['regions'].get('features') or []))
    except Exception as e:
        print('::warning::Warnregionen nicht abrufbar:', e)
        if old and old.get('regions'): out['regions'] = old['regions']
    for u in BULLETIN_URLS:
        try:
            out['bulletin'] = get(u); out['bulletinUrl'] = u
            print('Bulletin von', u, '–', len(bulletins(out['bulletin'])), 'Teilbulletins')
            break
        except Exception as e:
            print('::warning::Bulletin nicht abrufbar von', u, ':', e)
    if 'bulletin' not in out and old and old.get('bulletin'):
        out['bulletin'] = old['bulletin']; out['bulletinUrl'] = old.get('bulletinUrl', ''); out['stale'] = True
    if 'bulletin' not in out or 'regions' not in out:
        print('::warning::Kein vollständiges Bulletin – Datei wird nicht geschrieben')
        return
    out['fetchedAt'] = old.get('fetchedAt', '') if out.get('stale') else datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

main()
