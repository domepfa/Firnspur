#!/usr/bin/env python3
"""Ortsprognosen von MeteoSchweiz (Open Data, «local forecasting») für die Wetter-Übersicht der Karte.

Dieselben Prognosen wie in der MeteoSchweiz-App: je Ort ein Wettersymbol pro Tag (8 Tage) mit Tiefst- und
Höchstwert und Niederschlag, dazu alle 3 Stunden Symbol und Temperatur. Genommen werden die Messstationen
und die Orte in den Bergen (Hütten, Gipfel), nicht die Postleitzahlen.

Ausgabe in <Zielordner>:
  orte.json         {run, days: [JJJJMMTT], pts: [[Name, lat, lon, Höhe, [Symbol je Tag], [Tmin], [Tmax], [mm]]]}
  h-JJJJMMTT.json   {day, times: [Unixzeit], pts: [[Symbol, Temperatur] je Zeit] in derselben Reihenfolge}
Symbole: Nummern von MeteoSchweiz (1–42 Tag, 101–142 Nacht); fehlender Wert = null.

Aufruf: python3 tools/wetterorte.py <Zielordner>
"""
import csv
import datetime as dt
import io
import json
import os
import sys
import urllib.request

STAC = 'https://data.geo.admin.ch/api/stac/v1'
COLL = 'ch.meteoschweiz.ogd-local-forecasting'
TYPES = {'1', '3'}  # 1 Station, 3 Point of Interest (2 = Postleitzahl, zu viele)
H3 = {6, 9, 12, 15, 18, 21}  # UTC-Stunden der 3-Stunden-Ansicht (Ortszeit 7–22 Uhr)


def get(url, timeout=120):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()


def latest_run():
    """Jüngster Lauf (heute oder gestern), für den alle nötigen Dateien da sind."""
    need = ('jp2000d0', 'tre200dn', 'tre200dx', 'rka150d0', 'jww003i0', 'tre200h0')
    today = dt.datetime.now(dt.timezone.utc).date()
    for day in (today, today - dt.timedelta(days=1)):
        try:
            item = json.loads(get(STAC + '/collections/' + COLL + '/items/' + day.strftime('%Y%m%d') + '-ch'))
        except Exception:
            continue
        runs = {}
        for k, a in item['assets'].items():
            parts = k.split('.')
            if len(parts) >= 4:
                runs.setdefault(parts[2], {})[parts[3]] = a['href']
        for run in sorted(runs, reverse=True):
            if all(p in runs[run] for p in need):
                return run, runs[run]
    raise SystemExit('keine Ortsprognose gefunden')


def rows(url):
    text = get(url, 300).decode('utf-8', 'replace')
    rd = csv.reader(io.StringIO(text), delimiter=';')
    next(rd, None)
    for r in rd:
        if len(r) >= 4 and r[1] in TYPES:
            yield r[0], r[2], r[3]


def num(v):
    try:
        return float(v)
    except ValueError:
        return None


def main(out):
    os.makedirs(out, exist_ok=True)
    run, files = latest_run()
    print('Lauf', run)
    meta = next(a['href'] for a in json.loads(get(STAC + '/collections/' + COLL + '/assets'))['assets'] if 'meta_point' in a['id'])
    text = get(meta).decode('latin-1')
    pts = {}
    for r in csv.DictReader(io.StringIO(text), delimiter=';'):
        if r['point_type_id'] in TYPES:
            pts[r['point_id']] = {'name': r['point_name'], 'lat': round(float(r['point_coordinates_wgs84_lat']), 4),
                                  'lon': round(float(r['point_coordinates_wgs84_lon']), 4),
                                  'ele': round(float(r['point_height_masl'] or 0)), 'type': r['point_type_id']}
    daily = {}
    for par in ('jp2000d0', 'tre200dn', 'tre200dx', 'rka150d0'):
        for pid, date, v in rows(files[par]):
            daily.setdefault(date[:8], {}).setdefault(pid, {})[par] = num(v)
    days = sorted(daily)[:8]
    hourly = {}
    for par in ('jww003i0', 'tre200h0'):
        for pid, t, v in rows(files[par]):
            when = dt.datetime.strptime(t, '%Y%m%d%H%M')
            if when.hour in H3:
                hourly.setdefault(when, {}).setdefault(pid, {})[par] = num(v)
    # Reihenfolge: Stationen vor Hütten/Gipfeln (Stationen sind gleichmässiger verteilt), sonst nach Höhe
    ids = sorted((p for p in pts if any(p in daily[d] for d in days)), key=lambda p: (pts[p]['type'] != '1', -pts[p]['ele']))
    rnd = lambda v, k=0: None if v is None else (int(round(v)) if k == 0 else round(v, k))
    out_pts = []
    for p in ids:
        q = pts[p]
        g = lambda par, k=0: [rnd(daily[d].get(p, {}).get(par), k) for d in days]
        out_pts.append([q['name'], q['lat'], q['lon'], q['ele'], g('jp2000d0'), g('tre200dn'), g('tre200dx'), g('rka150d0', 1)])
    with open(os.path.join(out, 'orte.json'), 'w') as f:
        json.dump({'run': run, 'days': days, 'pts': out_pts, 'source': 'MeteoSchweiz Ortsprognose (Open Data)'}, f, separators=(',', ':'))
    # 3-Stunden-Werte je Tag (Ortszeit; die App lädt nur den aufgeklappten Tag)
    by_day = {}
    for when in sorted(hourly):
        local = when + dt.timedelta(hours=1)  # grob MEZ; nur für die Zuordnung zum Tag
        by_day.setdefault(local.strftime('%Y%m%d'), []).append(when)
    for day, times in by_day.items():
        if day not in days and day != dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d'):
            continue
        data = [[[rnd(hourly[t].get(p, {}).get('jww003i0')), rnd(hourly[t].get(p, {}).get('tre200h0'))] for t in times] for p in ids]
        with open(os.path.join(out, 'h-' + day + '.json'), 'w') as f:
            json.dump({'day': day, 'times': [int(t.replace(tzinfo=dt.timezone.utc).timestamp()) for t in times], 'pts': data}, f, separators=(',', ':'))
    print('Orte', len(out_pts), 'Tage', len(days))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'wetterorte')
