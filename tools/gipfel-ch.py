#!/usr/bin/env python3
# Erzeugt beta/0-gipfel-ch.json: alle Gipfel, Pässe und Hütten der Schweiz für «Gipfel ringsum».
# Quelle: swisstopo-Vektorkarte (ch.swisstopo.base.vt, Zoomstufe 13 = dichteste Gipfelebene).
# Format: {"v":1, "p":[[lat·1e5, lon·1e5, Höhe, Art, Name], …]}, Art: g = Gipfel, p = Pass, h = Hütte.
# Aufruf: pip install mapbox-vector-tile && python3 tools/gipfel-ch.py   (lädt ~8000 Kacheln, einige Minuten)
import gzip, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import mapbox_vector_tile

Z = 13
URL = 'https://vectortiles.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/{z}/{x}/{y}.pbf'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'beta', '0-gipfel-ch.json')
KIND = {'peak': 'g', 'main_peak': 'g', 'alpine_peak': 'g', 'saddle': 'p'}

def tile_xy(lat, lon):
    n = 2 ** Z
    return int((lon + 180) / 360 * n), int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)

def fetch(xy):
    x, y = xy
    for _ in range(3):
        try:
            d = urllib.request.urlopen(URL.format(z=Z, x=x, y=y), timeout=30).read()
            if d[:2] == b'\x1f\x8b':
                d = gzip.decompress(d)
            t = mapbox_vector_tile.decode(d, default_options={'y_coord_down': True})
            out = []
            for layer in ('mountain_peak', 'poi'):
                L = t.get(layer)
                if not L:
                    continue
                ext = L.get('extent', 4096)
                for f in L['features']:
                    p, g = f['properties'], f['geometry']
                    if g['type'] != 'Point':
                        continue
                    if layer == 'poi':
                        if p.get('class') != 'lodging' or 'hut' not in str(p.get('subclass', '')):
                            continue
                        kind = 'h'
                    else:
                        kind = KIND.get(p.get('class'))
                        if not kind:
                            continue
                    name = p.get('name:latin') or p.get('name')
                    if not name:
                        continue
                    px, py = g['coordinates']
                    n = 2 ** Z
                    lon = (x + px / ext) / n * 360 - 180
                    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + py / ext) / n))))
                    out.append((p.get('feature_id') or name + str(round(lat, 3)), [round(lat * 1e5), round(lon * 1e5), round(p.get('ele') or 0), kind, name]))
            return out
        except Exception:
            time.sleep(1)
    print('Kachel fehlgeschlagen', x, y, file=sys.stderr)
    return []

def main():
    x0, y0 = tile_xy(47.81, 5.95)
    x1, y1 = tile_xy(45.81, 10.50)
    tiles = [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    seen = {}
    with ThreadPoolExecutor(24) as ex:
        for res in ex.map(fetch, tiles):
            for k, v in res:
                seen[str(k)] = v
    pts = sorted(seen.values(), key=lambda a: (-a[2], a[4]))
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump({'v': 1, 'quelle': '© swisstopo', 'p': pts}, f, ensure_ascii=False, separators=(',', ':'))
    print(len(pts), 'Einträge →', OUT)

if __name__ == '__main__':
    main()
