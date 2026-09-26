#!/usr/bin/env bash
# Übernimmt den Stand aus beta/ in die Haupt-App (Repo-Wurzel), wie bei Pincho.
# Kopiert index.html, fixseil.html, 0-shared.js und look.css und stellt dabei
# zurück, was nur für die Beta anders ist:
#   - Pfade ../<Bild/Skript> -> ./<Bild/Skript> (Beta liegt einen Ordner tiefer)
#   - Speicher-Keys firnspurbeta-/fixseilbeta-cache und bergtourenbeta-offline
#     -> die der Haupt-App (Offline-Kopie der Haupt-App bleibt so erhalten)
#   - " · Beta" im Seitentitel
# manifest*.json, sw.js und share-target-*.html der Haupt-App werden NICHT
# überschrieben (eigener Name, eigener Cache) — nur die Cache-Version in sw.js
# wird hochgezählt (und look.css in die Offline-Liste aufgenommen), damit die
# Handys die neue Version laden.
set -euo pipefail
cd "$(dirname "$0")/.."
assets='0-geo-ch\.js\|icon-512\.png\|20260114_145500\.jpg\|IMG_20260811_073051812_HDR\.jpg\|msl-hero\.jpg'
for f in index.html fixseil.html 0-shared.js look.css; do
  sed -e "s#\.\./\($assets\)#./\1#g" \
      -e "s#'\.\./' + hs\.#'./' + hs.#g" \
      -e "s/'firnspurbeta-cache'/'firnspur-cache'/g" \
      -e "s/'fixseilbeta-cache'/'fixseil-cache'/g" \
      -e "s/'bergtourenbeta-offline'/'bergtouren-offline'/g" \
      -e "s# · Beta</title>#</title>#" \
      "beta/$f" > "$f"
done
grep -q "'./look.css'" sw.js || sed -i "s#'./0-shared.js', #'./0-shared.js', './look.css', #" sw.js
v=$(grep -o "bergtouren-shell-v[0-9]*" sw.js | head -1 | grep -o "[0-9]*$")
sed -i "s/bergtouren-shell-v$v/bergtouren-shell-v$((v + 1))/" sw.js
echo "Beta übernommen, Cache bergtouren-shell-v$((v + 1))"
