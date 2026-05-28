# Private Asset Usage

Private prototype assets are local-only development inputs. Renderer-preview GLBs live under `apps/client/public/assets/private-prototype/`; broader scratch or source-reference files may live under `local-assets/`.

Both paths are ignored by `.gitignore`. Do not stage, commit, package, publish, or redistribute files from either location.

Acceptable prototype use:

- Renderer sandbox previews in `/sandbox.html`.
- Curated sandbox preview presets made from already-listed private assets.
- Scale checks against the greybox space, map metadata, and player-camera height.
- Temporary greybox dressing plans and internal blockout readability checks made from hand-curated manifest entries.

Disallowed use:

- Copied asset names, map layouts, callouts, prop arrangements, labels, factions, weapon identities, UI treatment, or other recognizable shooter presentation.
- Final identity assumptions. Private asset names, labels, silhouettes, materials, UI cues, and category groupings are local catalog aids only; they do not define the public game identity.
- Public redistribution, hosted deployment assets, store/media capture presented as final project art, or any committed private asset file.
- Gameplay authority truth. Private previews must not drive map selection, spawn authority, collision, cover logic, hit validation, equipment truth, server snapshots, protocol packets, or persisted state.
- Bulk-loading the private asset folder. The sandbox manifest, curated presets, and arena dressing plans must remain source-controlled and hand-curated.

Every private prototype asset should be tagged `replace-before-public` in any local catalog, note, or manifest unless it is already original or licensed for final public use.

Use [PRIVATE_ASSET_AUDIT.md](PRIVATE_ASSET_AUDIT.md) for the local audit command and candidate tag interpretation. Generated audit output belongs under ignored `local-assets/` and must not be committed.

Preferred future path: replace local private prototypes with original commissioned, procedural, or final project-owned models, materials, and names before public packaging or release, under a dedicated asset-pipeline milestone.
