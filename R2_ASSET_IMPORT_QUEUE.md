# R2 Asset Import Queue

## Priority 1 — Zombies essentials

| Bucket | Asset | Current status | Integration target |
|---|---|---|---|
| `zombies` | `ray-gun-bo2-remastered.zip` | Archive contains nested RAR and C4D source; no GLB yet | `export/web/viewmodel/ray_gun_bo2.glb`, Ray Gun profile already implemented |
| `zombies` | `cod-ghosts-hellhound.zip` | Requires archive/model/material audit | Replace procedural Hellhound visuals when GLB and textures validate |
| `zombies` | `zombie.zip` | Requires archive/model/material audit | Replace procedural zombie body when GLB and textures validate |
| `zombies` | `zombie-walk-test.zip` | Requires archive/model/animation audit | Add walk animation clips after skeleton validation |
| `zombies` | `11-mystery-box-3december2019.zip` | Requires archive/model/material audit | Replace procedural Mystery Box model and preserve interaction hooks |

## Priority 2 — Maps

| Bucket | Asset | Current status | Integration target |
|---|---|---|---|
| `yar` | `killhouse.obj` | Standalone OBJ; MTL/textures need audit or generated fallback | Add `killhouse` map registry entry, bake render/collision/navmesh |
| `yar` | `call-of-duty-mobile-firing-range-map.zip` | Large ZIP; requires extraction and texture/material audit | Add `firing_range` map registry entry and Zombies variant |
| `maps2` | `alcatraz.zip` | Large ZIP; requires extraction and texture/material audit | Add `alcatraz` map registry entry and Zombies variant |
| `yar` | `crash-lowpoly-cod-map.zip` | Requires extraction and bake audit | Add only after source materials and collision validate |

## Priority 3 — Guns

| Bucket | Asset | Current status | Integration target |
|---|---|---|---|
| `guns` | `black-ops-2-dsr-50.zip` | Requires conversion audit; existing DSR implementation must be preserved until validated | Replace matching DSR model and textures |
| `guns` | `black-ops-2-fal-osw.zip` | Requires conversion audit; existing FAL implementation must be preserved | Replace matching FAL model and textures |
| `guns` | `black-ops-2-hamr.zip` | New weapon candidate; requires registry and asset validation | Add HAMR definition and slots |
| `guns` | `locus-sniper.zip` | New weapon candidate; small archive, requires validation | Add Locus definition and sniper behavior |
| `guns` | `dlq33-holidays.zip` | New weapon candidate; requires validation | Add DLQ33 definition and seasonal materials |
| `guns` | `hk-mp5.zip` | New weapon candidate; requires validation | Add MP5 definition and SMG ballistics |
| `guns` | `custom-m4a1-cod-warzone.zip` | New weapon candidate; requires validation | Add M4A1 definition and rifle assets |
| `guns` | `black-ops-2-ballista.zip` | Replacement candidate; current Ballista remains active | Replace only after browser-ready checks pass |

## Priority 4 — Operators

| Bucket | Asset | Current status | Integration target |
|---|---|---|---|
| `oporator` | `ghost.zip` | Requires conversion and rig/texture audit | Add operator body/skin catalog entry |
| `oporator` | `call-of-duty-modern-warfare-2019-roze-rook.zip` | Requires conversion and rig/texture audit | Add operator body/skin catalog entry |

## Conversion rule

No source archive is copied into `export/web` as a GLB by filename alone. Each package must pass extraction, model-format, material-reference, texture, animation, and browser-load checks. Existing working Ballista/DSR/FAL assets remain active until replacement candidates pass those checks.
