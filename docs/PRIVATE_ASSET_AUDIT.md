# Private Asset Audit

Phase 21 adds a local-only audit for ignored prototype GLBs under `apps/client/public/assets/private-prototype/`.

Run it from the repository root:

```powershell
npm run audit:private-assets
```

The command typechecks first, scans `.glb` files under the private prototype asset root, and writes:

```text
local-assets/private-asset-audit.json
```

`local-assets/` is ignored. Do not stage, commit, package, publish, or redistribute generated audit output or private asset files.

## What The Audit Records

Each entry records renderer/tooling metadata only:

- Relative path and category.
- File size.
- Mesh, primitive, material, texture, image, animation, accessor, node, and scene counts when present.
- Simple warnings for very large files, missing scene data, invalid GLB parsing, and unusual scale metadata.
- Candidate tags derived from the source-controlled tag contract in `apps/client/src/sandbox/private-asset-tags.ts`.

The audit does not load assets into gameplay, choose maps, define public art direction, or change server authority. The `/sandbox.html` manifest remains hand-curated in `apps/client/src/sandbox/prototype-assets.ts`.

Renderer-only sandbox dressing plans may reference existing manifest ids for local visual inspection. Audit results can inform which private assets need scale or replacement review, but they do not promote any private asset into map metadata, gameplay authority, public art identity, or distributable content.

## Candidate Tags

- `preview-ok`: looks reasonable for local sandbox preview, subject to visual inspection.
- `needs-scale-check`: needs human scale or origin review before use as a prototype reference.
- `too-heavy-for-browser`: likely too large or complex for default browser preview paths.
- `character-reference-only`: local character scale or rig reference only.
- `prop-reference-only`: local prop, cover, blockout, or dressing reference only.
- `replace-before-public`: private prototype asset must be replaced before public builds or redistribution.

Every private asset should be treated as local reference material. Candidate tags help plan replacement and preview risk; they are not licensing approvals or final art decisions.
