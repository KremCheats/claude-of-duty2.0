#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/incoming"
mkdir -p "$out"
declare -A urls=(
  [yar]="https://pub-fdb3e8271b8240aebc05bee5b83401cb.r2.dev"
  [maps2]="https://pub-bc47e0dc303a465a9d259e6567a67a78.r2.dev"
  [zombies]="https://pub-c70ab55a4c21451081b906146df9d0c8.r2.dev"
  [guns]="https://pub-562ba113574946b5a417b7cd3d62a1b4.r2.dev"
  [oporator]="https://pub-9bf3d22cdfb647ceaa7274306a7791da.r2.dev"
)
declare -a objects=(
  "yar|call-of-duty-mobile-firing-range-map.zip"
  "yar|crash-lowpoly-cod-map.zip"
  "yar|killhouse.obj"
  "maps2|alcatraz.zip"
  "zombies|11-mystery-box-3december2019.zip"
  "zombies|cod-ghosts-hellhound.zip"
  "zombies|ray-gun-bo2-remastered.zip"
  "zombies|zombie-walk-test.zip"
  "zombies|zombie.zip"
  "guns|black-ops-2-ballista.zip"
  "guns|black-ops-2-dsr-50.zip"
  "guns|black-ops-2-fal-osw.zip"
  "guns|black-ops-2-hamr.zip"
  "guns|custom-m4a1-cod-warzone.zip"
  "guns|dlq33-holidays.zip"
  "guns|hk-mp5.zip"
  "guns|locus-sniper.zip"
  "oporator|call-of-duty-modern-warfare-2019-roze-rook.zip"
  "oporator|ghost.zip"
)
for item in "${objects[@]}"; do
  bucket="${item%%|*}"; name="${item#*|}"
  if [[ -s "$out/$name" ]]; then echo "SKIP $name"; continue; fi
  echo "GET $bucket/$name"
  curl -L --fail --retry 2 --retry-delay 1 "${urls[$bucket]}/$name" -o "$out/$name"
done
printf '\nDownloaded files:\n'
ls -lh "$out"
