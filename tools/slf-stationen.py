#!/usr/bin/env python3
# Holt die aktuellen Messwerte der SLF-IMIS-Stationen (Schneehöhe, Temperatur, Wind) und schreibt
# slf-stationen.json. Läuft als GitHub-Action (.github/workflows/slf.yml) alle 30 Minuten; die Datei
# liegt im Branch «daten» und wird von der App über raw.githubusercontent.com gelesen. Grund für den
# Umweg: measurement-api.slf.ch erlaubt keinen direkten Abruf aus dem Browser (kein CORS).
# Daten: WSL-Institut für Schnee- und Lawinenforschung SLF, CC BY 4.0.
import json, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

BASE = 'https://measurement-api.slf.ch/public/api/imis'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'slf-stationen.json'

def get(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'Firnspur'}), timeout=40) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            err = e; time.sleep(2)
    raise err

def pick(d, *names):
    for n in names:
        if n in d and d[n] not in (None, ''):
            return d[n]
    return None

def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def parse_time(s):
    try:
        return datetime.fromisoformat(str(s).replace('Z', '+00:00'))
    except Exception:
        return None

def field(rows, *prefixes):
    # erster Feldname, der mit einem der Präfixe beginnt (Namen bei SLF z. B. HS, TA_30MIN_MEAN)
    keys = set()
    for r in rows[-10:]:
        keys.update(r.keys())
    for p in prefixes:
        for k in sorted(keys):
            if k == p or k.startswith(p + '_'):
                return k
    return None

def station_summary(st):
    code = pick(st, 'code', 'station_code', 'id')
    rows = get(f'{BASE}/station/{code}/measurements')
    if isinstance(rows, dict):
        rows = pick(rows, 'measurements', 'data', 'items') or []
    rows = [r for r in rows if isinstance(r, dict)]
    rows.sort(key=lambda r: str(pick(r, 'measure_date', 'date', 'timestamp') or ''))
    if not rows:
        return None
    k_hs, k_ta = field(rows, 'HS'), field(rows, 'TA')
    k_vw = field(rows, 'VW_30MIN_MAX', 'VW')
    k_hn = field(rows, 'HN_1D', 'HN')
    last = rows[-1]
    t_last = parse_time(pick(last, 'measure_date', 'date', 'timestamp'))
    def at(hours_back, key):
        if not t_last or not key:
            return None
        target = t_last - timedelta(hours=hours_back)
        best = None
        for r in rows:
            t = parse_time(pick(r, 'measure_date', 'date', 'timestamp'))
            v = num(r.get(key))
            if t is None or v is None:
                continue
            if best is None or abs((t - target).total_seconds()) < abs((best[0] - target).total_seconds()):
                best = (t, v)
        return best[1] if best and abs((best[0] - target).total_seconds()) < 3 * 3600 else None
    def window(hours, key, fn):
        if not t_last or not key:
            return None
        vals = [num(r.get(key)) for r in rows if (parse_time(pick(r, 'measure_date', 'date', 'timestamp')) or t_last) >= t_last - timedelta(hours=hours)]
        vals = [v for v in vals if v is not None]
        return round(fn(vals), 1) if vals else None
    hs = num(last.get(k_hs)) if k_hs else None
    hs24, hs72 = at(24, k_hs), at(72, k_hs)
    out = {
        'code': code, 'name': pick(st, 'label', 'name', 'station_name') or code,
        'lat': num(pick(st, 'lat', 'latitude')), 'lon': num(pick(st, 'lon', 'longitude', 'lng')),
        'ele': num(pick(st, 'elevation', 'altitude', 'height')),
        'time': t_last.isoformat() if t_last else None,
        'hs': hs, 'dhs24': round(hs - hs24, 1) if hs is not None and hs24 is not None else None,
        'dhs72': round(hs - hs72, 1) if hs is not None and hs72 is not None else None,
        'hn1d': num(last.get(k_hn)) if k_hn else None,
        'ta': num(last.get(k_ta)) if k_ta else None,
        'taMin72': window(72, k_ta, min), 'taMax72': window(72, k_ta, max),
        'vwMax24': window(24, k_vw, max),
    }
    return out

def main():
    stations = get(f'{BASE}/stations')
    if isinstance(stations, dict):
        stations = pick(stations, 'stations', 'data', 'items') or []
    print('Stationen:', len(stations))
    if stations:
        print('Beispiel Station:', json.dumps(stations[0], ensure_ascii=False)[:600])
        try:
            sample = get(f"{BASE}/station/{pick(stations[0], 'code', 'station_code', 'id')}/measurements")
            rows = sample if isinstance(sample, list) else (pick(sample, 'measurements', 'data', 'items') or [])
            print('Messungen:', len(rows), 'Beispiel:', json.dumps(rows[-1] if rows else sample, ensure_ascii=False)[:900])
        except Exception as e:
            print('Messungen Beispiel fehlgeschlagen:', e)
    def safe(s):
        try:
            return station_summary(s)
        except Exception as e:
            print('Station fehlgeschlagen:', pick(s, 'code', 'station_code', 'id'), e)
            return None
    with ThreadPoolExecutor(8) as ex:
        res = [r for r in ex.map(safe, stations) if r and r['lat'] is not None and r['lon'] is not None]
    data = {'updated': datetime.now(timezone.utc).isoformat(), 'quelle': 'WSL-Institut für Schnee- und Lawinenforschung SLF, CC BY 4.0', 'stations': res}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(len(res), 'Stationen gespeichert')
    if not res:
        sys.exit(1)

if __name__ == '__main__':
    main()
