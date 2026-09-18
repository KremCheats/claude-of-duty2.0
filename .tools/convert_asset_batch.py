#!/usr/bin/env python3
"""Run the asset converter over an incoming directory and write one readiness report."""
from __future__ import annotations
import argparse
import json
import subprocess
from pathlib import Path

CATALOG = {
    'call-of-duty-mobile-firing-range-map.zip': ('map', 'firing_range'),
    'crash-lowpoly-cod-map.zip': ('map', 'crash'),
    'killhouse.obj': ('map', 'killhouse'),
    'alcatraz.zip': ('map', 'alcatraz'),
    'ray-gun-bo2-remastered.zip': ('zombies', 'ray_gun_bo2'),
    'cod-ghosts-hellhound.zip': ('zombies', 'hellhound'),
    'zombie.zip': ('zombies', 'zombie'),
    'zombie-walk-test.zip': ('zombies', 'zombie_walk'),
    '11-mystery-box-3december2019.zip': ('zombies', 'mystery_box'),
    'black-ops-2-ballista.zip': ('gun', 'ballista_r2'),
    'black-ops-2-dsr-50.zip': ('gun', 'dsr50_r2'),
    'black-ops-2-fal-osw.zip': ('gun', 'fal_osw_r2'),
    'black-ops-2-hamr.zip': ('gun', 'hamr'),
    'locus-sniper.zip': ('gun', 'locus'),
    'dlq33-holidays.zip': ('gun', 'dlq33'),
    'hk-mp5.zip': ('gun', 'mp5'),
    'custom-m4a1-cod-warzone.zip': ('gun', 'm4a1'),
    'ghost.zip': ('operator', 'ghost'),
    'call-of-duty-modern-warfare-2019-roze-rook.zip': ('operator', 'roze_rook'),
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('incoming', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--generate-missing-textures', action='store_true')
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    report = []
    for source in sorted(args.incoming.iterdir()):
        if not source.is_file():
            continue
        kind_id = CATALOG.get(source.name)
        if not kind_id:
            report.append({'file': source.name, 'status': 'unmapped'})
            continue
        kind, asset_id = kind_id
        destination = args.out / asset_id
        command = ['python3', str(Path(__file__).with_name('convert_asset_package.py')), str(source), '--out', str(destination)]
        if args.generate_missing_textures:
            command += ['--generate-missing-textures', '--theme', 'zombies' if kind == 'zombies' else 'neutral']
        result = subprocess.run(command, capture_output=True, text=True)
        manifest_path = destination / 'conversion-manifest.json'
        manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else None
        report.append({'file': source.name, 'kind': kind, 'assetId': asset_id, 'exitCode': result.returncode, 'manifest': manifest})
    output = args.out / 'batch-readiness.json'
    output.write_text(json.dumps({'incoming': str(args.incoming.resolve()), 'assets': report}, indent=2) + '\n')
    print(output)
    print(f'{len(report)} package(s) scanned')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
