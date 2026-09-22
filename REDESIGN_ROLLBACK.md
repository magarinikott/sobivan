# SOBIVAN redesign: rollback point

The new visual theme was based on the exact public-site source at commit:

- `7b0df5c49c366b9908277a6e7a0229bde4934735`
- local tag: `sobivan-pre-redesign-2026-09-22`
- public backup captured before migration: `../../backups/pre-redesign-20260922-220735/`

The redesign intentionally leaves `styles.css`, `latest-release.json`, `poster-render.js`, `posters/posters.json`, poster assets, platform links, and track data unchanged.

To restore the old design in Git, reset/deploy the tagged commit. The filesystem backup is an independent second recovery path.
