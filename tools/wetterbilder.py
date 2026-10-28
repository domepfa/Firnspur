#!/usr/bin/env python3
"""Prognose-Wertebilder für die Wetter-Karte aus dem 1-km-Modell ICON-CH1 von MeteoSchweiz (Open Data).

Holt den jüngsten vollständigen Modelllauf (alle 3 Stunden, 33 Stunden voraus) und rechnet je Stunde
Niederschlag (mit Art), Neuschnee seit Laufbeginn, Temperatur, Windböen und Bewölkung auf Bilder in
Web-Mercator um. Die Bilder enthalten Werte, keine Farben (Graustufen, 255 = kein Wert): die App färbt
sie selbst ein und liest daraus den Wert unter dem Fadenkreuz. Dazu einmal die Geländehöhe des Modells.

Kodierung (ein Byte):
  p  Niederschlag: 0 = unter 0.1 mm/h, sonst 1 + Art * 84 + Stufe, Art 0 Regen / 1 Mischung / 2 Schnee,
     Stufe = round(ln(1 + mm/h) * 20), höchstens 82
  s  Neuschnee seit Laufbeginn: cm * 2 (Wasserwert 1 mm ≈ 1 cm Schnee)
  t  Temperatur 2 m: (°C + 40) * 3
  w  Windböen 10 m (Höchstwert der Stunde): km/h, auf 2 gerundet
  c  Gesamtbewölkung: %, auf 5 gerundet
  hm Geländehöhe des Modells: m / 20

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

NODATA = 255


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


def value_png(vals, outside, w, h, path):
    v = np.clip(np.round(vals), 0, 254).astype(np.uint8)
    v[outside] = NODATA
    Image.fromarray(v.reshape(h, w), 'L').save(path, optimize=True)


def main(out):
    os.makedirs(out, exist_ok=True)
    ref = latest_run()
    print('Lauf', ref)
    names = {'tp': 'TOT_PREC', 'sn': 'SNOW_GSP', 'cl': 'CLCT', 't2': 'T_2M', 'vm': 'VMAX_10M'}
    urls = {k: urls_for(v, ref) for k, v in names.items()}
    const = next(a['href'] for a in get_json(STAC + '/collections/' + COLL + '/assets')['assets'] if a['id'].startswith('horizontal_constants'))
    tmp = tempfile.mkdtemp()
    jobs = [('hc', const)]
    for k, u in urls.items():
        jobs += [('%s%02d' % (k, h), x) for h, x in u.items() if (0 if k in ('tp', 'sn') else 1) <= h <= LIMIT]
    with cf.ThreadPoolExecutor(8) as ex:
        paths = dict(zip([j[0] for j in jobs], ex.map(lambda j: download(j[1], os.path.join(tmp, j[0] + '.grib2')), jobs)))
    hc = grib_values(paths['hc'], {'tlat', 'tlon', 'h'})
    tlat, tlon = hc['tlat'].astype(np.float64), hc['tlon'].astype(np.float64)
    # Niederschlag in voller Auflösung (gut 0.75 km), alles Weiche in halber
    idx = target_index(tlat, tlon, PX_W, PX_H)
    out_f = idx < 0
    idx[out_f] = 0
    hw, hh = PX_W // 2, PX_H // 2
    hidx = target_index(tlat, tlon, hw, hh)
    out_h = hidx < 0
    hidx[out_h] = 0
    value_png(hc['h'][hidx] / 20, out_h, hw, hh, os.path.join(out, 'hm.png'))
    one = lambda key: next(iter(grib_values(paths[key]).values()))

    frames = []
    prev_tp = prev_sn = None
    sn0 = None
    for h in range(0, LIMIT + 1):
        tp = one('tp%02d' % h)
        sn = one('sn%02d' % h) if ('sn%02d' % h) in paths else np.zeros_like(tp)
        if sn0 is None:
            sn0 = sn
        if h > 0:
            rate = np.maximum(0, tp - prev_tp)  # Summen seit Laufbeginn → Stundenwert
            snow = np.maximum(0, sn - prev_sn)
            frac = np.where(rate > 0.01, snow / np.maximum(rate, 1e-6), 0)
            r, f = rate[idx], frac[idx]
            kind = np.where(f > 0.7, 2, np.where(f > 0.3, 1, 0))
            lvl = np.minimum(82, np.round(np.log1p(r) * 20))
            pv = np.where(r >= 0.1, 1 + kind * 84 + lvl, 0)
            value_png(pv, out_f, PX_W, PX_H, os.path.join(out, 'p%02d.png' % h))
            value_png(np.maximum(0, sn - sn0)[hidx] * 2, out_h, hw, hh, os.path.join(out, 's%02d.png' % h))
            value_png((one('t2%02d' % h)[hidx] - 273.15 + 40) * 3, out_h, hw, hh, os.path.join(out, 't%02d.png' % h))
            value_png(np.round(one('vm%02d' % h)[hidx] * 3.6 / 2) * 2, out_h, hw, hh, os.path.join(out, 'w%02d.png' % h))
            value_png(np.round(one('cl%02d' % h)[hidx] / 5) * 5, out_h, hw, hh, os.path.join(out, 'c%02d.png' % h))
            frames.append(h)
        prev_tp, prev_sn = tp, sn
    with open(os.path.join(out, 'index.json'), 'w') as f:
        json.dump({'v': 2, 'ref': ref, 'hours': frames, 'bounds': [W, S, E, N], 'full': [PX_W, PX_H], 'half': [hw, hh],
                   'source': 'MeteoSchweiz ICON-CH1 (Open Data)'}, f)
    print('Bilder', len(frames) * 5 + 1)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'wetterbilder')
