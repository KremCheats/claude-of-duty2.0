# Asset Batch Workflow

The repository now includes a batch conversion runner for the uploaded R2 packages. It does not require source files to be committed to GitHub and it never activates an asset until conversion and material checks complete.

## Stage source packages locally

Place downloaded R2 objects in a single directory using their original filenames:

```text
incoming/
  ray-gun-bo2-remastered.zip
  killhouse.obj
  ghost.zip
  black-ops-2-hamr.zip
```

## Convert the complete batch

Run:

```bash
npm run assets:batch -- incoming --out /tmp/merk-assets --generate-missing-textures
```

The command scans the catalog, routes each package to its stable asset ID, invokes the existing converter, and writes:

```text
/tmp/merk-assets/batch-readiness.json
/tmp/merk-assets/<asset-id>/conversion-manifest.json
```

Unknown filenames are reported as `unmapped` instead of being silently imported. Source packages that contain C4D, RAR, FBX, or unsupported proprietary formats remain marked as pending conversion; they are not renamed to GLB.

## Promote only validated assets

An asset is eligible for runtime promotion only when its manifest confirms a browser-ready GLB/GLTF, resolved material references, present textures, and no unsupported source-only dependency. Existing production assets remain active until the replacement passes those checks.
