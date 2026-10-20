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
# Seit Oktober 2026 liefert /api/bulletin/caaml ohne Sprache/Format keine Daten mehr, nur noch /caaml/<sprache>/json.
BULLETIN_URLS = ['https://aws.slf.ch/api/bulletin/caaml/de/json', 'https://aws.slf.ch/api/bulletin/caaml']
# Warnregionen (Umrisse, GeoJSON): SLF, sonst die EAWS-Regionen (gleiche IDs wie im Bulletin, z. B. CH-1111)
REGIONS_URLS = ['https://aws.slf.ch/api/warningregion/', 'https://aws.slf.ch/api/warningregion',
                'https://regions.avalanches.org/micro-regions/CH_micro-regions.geojson.json']

def peek(url):
    # Nur für das Protokoll: was liefert die Adresse statt JSON?
    try:
        req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'Firnspur (github.com/domepfa/Firnspur)'})
        with urllib.request.urlopen(req, timeout=40) as r:
            body = r.read()[:300].decode('utf-8', 'replace').replace('\n', ' ')
            print('  ', url, '→', r.status, r.headers.get('Content-Type'), '|', body)
    except Exception as e:
        print('  ', url, '→', e)

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
    for u in REGIONS_URLS:
        try:
            d = get(u)
            if isinstance(d, dict) and d.get('features'):
                out['regions'] = d; out['regionsUrl'] = u
                print('Warnregionen von', u, '–', len(d['features']), 'Regionen, Beispiel:', json.dumps(d['features'][0].get('properties'))[:200])
                break
            print('::warning::Keine Regionen in', u)
        except Exception as e:
            print('::warning::Warnregionen nicht abrufbar von', u, ':', e); peek(u)
    if 'regions' not in out and old and old.get('regions'): out['regions'] = old['regions']
    for u in BULLETIN_URLS:
        try:
            out['bulletin'] = get(u); out['bulletinUrl'] = u
            bl = bulletins(out['bulletin'])
            print('Bulletin von', u, '–', len(bl), 'Teilbulletins, Regionen im ersten:', json.dumps((bl[0].get('regions') or [])[:3]) if bl else '')
            break
        except Exception as e:
            print('::warning::Bulletin nicht abrufbar von', u, ':', e); peek(u)
    if 'bulletin' not in out and old and old.get('bulletin'):
        out['bulletin'] = old['bulletin']; out['bulletinUrl'] = old.get('bulletinUrl', ''); out['stale'] = True
    if 'bulletin' not in out or 'regions' not in out:
        print('::warning::Kein vollständiges Bulletin – Datei wird nicht geschrieben')
        return
    out['fetchedAt'] = old.get('fetchedAt', '') if out.get('stale') else datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

main()
