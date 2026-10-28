#!/usr/bin/env python3
"""Prognosebilder für die Wetter-Karte aus dem 1-km-Modell ICON-CH1 von MeteoSchweiz (Open Data).

Holt den jüngsten vollständigen Modelllauf (alle 3 Stunden, 33 Stunden voraus), rechnet je Stunde
den Niederschlag (mm/h, mit Art: Regen, Mischung, Schnee) und die Gesamtbewölkung auf ein Bild in
Web-Mercator um und speichert kleine PNG mit Farbtabelle. Die App legt sie als Bild auf die Karte.

Aufruf: python3 tools/wetterbilder.py <Zielordner>
Braucht: eccodes (mit eccodeslib), numpy, scipy, pillow.
"""
import concurrent.futures as cf
import json
import math
import os
import sys
import tempfile
import urllib.request

import eccodes
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree

STAC = 'https://data.geo.admin.ch/api/stac/v1'
COLL = 'ch.meteoschweiz.ogd-forecasting-icon-ch1'
# Bildausschnitt (wie das Radar in der App) und Grösse: gut 0.75 km pro Bildpunkt
W, E, S, N = 4.6, 11.4, 44.9, 48.6
PX_W, PX_H = 680, 640
HOURS = 33
LIMIT = int(os.environ.get('WX_HOURS', HOURS))  # zum Testen weniger Stunden

# Farben wie in der App (FS_WX_PARAMS «niederschlag»); Schnee türkis, Mischung rosa – auf der hellen
# Landeskarte bliebe Weiss unsichtbar. Stufen in mm/h.
STEPS = [0.1, 0.5, 1, 2, 5, 10, 20]
RAIN = ['#A5D8FF', '#74C0FC', '#339AF0', '#1C7ED6', '#5F3DC4', '#AE3EC9', '#E03131']
MIX = ['#FCC2D7', '#FAA2C1', '#F783AC', '#F06595', '#E64980', '#D6336C', '#A61E4D']
SNOW = ['#C3FAE8', '#96F2D7', '#63E6BE', '#38D9A9', '#20C997', '#12B886', '#087F5B']
CLOUD_LEVELS = 8


def get_json(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers={'Content-Type': 'application/json'} if body else {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def search(**props):
    body = {'collections': [COLL], 'limit': 100}
    body.update(props)
    return get_json(STAC + '/search', body).get('features', [])


def latest_run():
    """Jüngster Lauf, dessen letzte Stunde schon da ist."""
    hz = 'P1DT%02dH00M00S' % (HOURS - 24)
    feats = search(**{'forecast:variable': 'TOT_PREC', 'forecast:perturbed': False, 'forecast:horizon': hz})
    refs = sorted(f['properties']['forecast:reference_datetime'] for f in feats)
    if not refs:
        raise SystemExit('kein vollständiger Modelllauf gefunden')
    return refs[-1]


def urls_for(var, ref):
    out = {}
    for f in search(**{'forecast:variable': var, 'forecast:perturbed': False, 'forecast:reference_datetime': ref}):
        hz = f['properties']['forecast:horizon']  # P0DT05H00M00S
        d, t = hz[1:].split('DT')
        h = int(d) * 24 + int(t.split('H')[0])
        out[h] = next(iter(f['assets'].values()))['href']
    return out


def download(url, path):
    with urllib.request.urlopen(url, timeout=300) as r, open(path, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)
    return path


def grib_values(path, short=None):
    vals = {}
    with open(path, 'rb') as f:
        while True:
            h = eccodes.codes_grib_new_from_file(f)
            if h is None:
                break
            sn = eccodes.codes_get(h, 'shortName')
            if short is None or sn in short:
                vals[sn] = eccodes.codes_get_values(h).astype(np.float32)
            eccodes.codes_release(h)
    return vals


def hex_rgb(c):
    return int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)


def merc_lat(y):
    return math.degrees(2 * math.atan(math.exp(y)) - math.pi / 2)


def target_index(tlat, tlon, PX_W, PX_H):
    """Für jeden Bildpunkt den nächsten Modellpunkt (ein Mal pro Lauf)."""
    my = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    y0, y1 = my(N), my(S)
    lats = np.array([merc_lat(y0 + (j + 0.5) / PX_H * (y1 - y0)) for j in range(PX_H)])
    lons = W + (np.arange(PX_W) + 0.5) / PX_W * (E - W)
    glon, glat = np.meshgrid(lons, lats)
    k = math.cos(math.radians(46.8))
    sel = (tlat > S - 1) & (tlat < N + 1) & (tlon > W - 1) & (tlon < E + 1)
    ids = np.nonzero(sel)[0]
    tree = cKDTree(np.c_[tlon[ids] * k, tlat[ids]])
    dist, nn = tree.query(np.c_[glon.ravel() * k, glat.ravel()], k=1)
    idx = ids[nn]
    idx[dist > 0.03] = -1  # ausserhalb des Modellgebiets
    return idx


def palette_png(classes, palette, path):
    """classes: Bild mit Index in die Farbtabelle (0 = durchsichtig)."""
    im = Image.fromarray(classes.astype(np.uint8), 'P')
    flat, alpha = [], []
    for rgb, a in palette:
        flat += list(rgb)
        alpha.append(a)
    im.putpalette(flat + [0] * (768 - len(flat)))
    im.save(path, optimize=True, transparency=bytes(alpha))


def main(out):
    os.makedirs(out, exist_ok=True)
    ref = latest_run()
    print('Lauf', ref)
    tp_urls, sn_urls, cl_urls = urls_for('TOT_PREC', ref), urls_for('SNOW_GSP', ref), urls_for('CLCT', ref)
    const = next(a['href'] for a in get_json(STAC + '/collections/' + COLL + '/assets')['assets'] if a['id'].startswith('horizontal_constants'))
    tmp = tempfile.mkdtemp()
    jobs = [('hc', const)] + [('tp%02d' % h, u) for h, u in tp_urls.items() if h <= LIMIT] \
        + [('sn%02d' % h, u) for h, u in sn_urls.items() if h <= LIMIT] + [('cl%02d' % h, u) for h, u in cl_urls.items() if 1 <= h <= LIMIT]
    with cf.ThreadPoolExecutor(8) as ex:
        paths = dict(zip([j[0] for j in jobs], ex.map(lambda j: download(j[1], os.path.join(tmp, j[0] + '.grib2')), jobs)))
    hc = grib_values(paths['hc'], {'tlat', 'tlon'})
    tlat, tlon = hc['tlat'].astype(np.float64), hc['tlon'].astype(np.float64)
    idx = target_index(tlat, tlon, PX_W, PX_H)
    outside = idx < 0
    idx[outside] = 0
    # Wolken sind weich: halbe Auflösung reicht (Bild wird viermal kleiner)
    cidx = target_index(tlat, tlon, PX_W // 2, PX_H // 2)
    coutside = cidx < 0
    cidx[coutside] = 0

    # Farbtabelle Niederschlag: 0 durchsichtig, dann je Art 7 Stufen
    pal_p = [((0, 0, 0), 0)]
    for cols in (RAIN, MIX, SNOW):
        for i, c in enumerate(cols):
            pal_p.append((hex_rgb(c), 170 if i == 0 else 215))
    # Farbtabelle Wolken: weiss-grau, Deckung nach Bedeckung (wie in der App)
    pal_c = [((0, 0, 0), 0)]
    for i in range(1, CLOUD_LEVELS + 1):
        v = i / CLOUD_LEVELS * 100
        g = round(250 - v * 0.6)
        pal_c.append(((g, g + 2, g + 5), round(min(0.85, (v - 8) / 92 * 0.9) * 255) if v > 8 else 0))

    frames = []
    prev_tp = prev_sn = None
    for h in range(0, LIMIT + 1):
        tp = grib_values(paths['tp%02d' % h])
        tp = next(iter(tp.values()))
        sn = paths.get('sn%02d' % h)
        sn = next(iter(grib_values(sn).values())) if sn else np.zeros_like(tp)
        if h > 0:
            rate = np.maximum(0, tp - prev_tp)  # Summen seit Laufbeginn → Stundenwert
            snow = np.maximum(0, sn - prev_sn)
            frac = np.where(rate > 0.01, snow / np.maximum(rate, 1e-6), 0)
            r = rate[idx]
            f = frac[idx]
            lvl = np.digitize(r, STEPS)  # 0 = unter 0.1 mm/h
            kind = np.where(f > 0.7, 2, np.where(f > 0.3, 1, 0))
            cls = np.where(lvl > 0, 1 + kind * 7 + (lvl - 1), 0)
            cls[outside] = 0
            palette_png(cls.reshape(PX_H, PX_W), pal_p, os.path.join(out, 'p%02d.png' % h))
            cl = next(iter(grib_values(paths['cl%02d' % h]).values()))[cidx]
            ccls = np.clip(np.ceil(cl / 100 * CLOUD_LEVELS), 0, CLOUD_LEVELS).astype(np.uint8)
            ccls[coutside] = 0
            palette_png(ccls.reshape(PX_H // 2, PX_W // 2), pal_c, os.path.join(out, 'c%02d.png' % h))
            frames.append(h)
        prev_tp, prev_sn = tp, sn
    with open(os.path.join(out, 'index.json'), 'w') as f:
        json.dump({'ref': ref, 'hours': frames, 'bounds': [W, S, E, N],
                   'source': 'MeteoSchweiz ICON-CH1 (Open Data)'}, f)
    print('Bilder', len(frames) * 2)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'wetterbilder')
