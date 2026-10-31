# Performance notes — Endpt

**Reference hardware (2026-10-31):** Lenovo LOQ 15IRX9 — Linux 7.0.0-38-generic, Intel Core i5-13450HX (16 threads), 22 GiB RAM.

## Targets (NFR-01 / Architecture Goals §5)

| Metric | Target |
|---|---|
| Initial desktop window | ≤ 350 ms |
| Editor navigation / render | ≤ 450 ms |
| Local projects/collections/requests load | ≤ 450 ms |
| UI action feedback | ≤ 100 ms |

## Measurements (this machine)

| Check | Result | Notes |
|---|---|---|
| `pnpm build` (Vite) | ~374 ms transform+bundle | Frontend only |
| Production `pnpm tauri build` | Succeeded | Binary + deb/rpm/AppImage |
| Release binary size | ~see build output | Optimized release profile |
| `.deb` / `.rpm` | ~6.1 MiB | Under 50 MB target |
| `.AppImage` | ~87.6 MiB | Over 50 MB; includes bundled runtime libs — prefer `.deb`/`.rpm` for size |
| Frontend `dist/` | ~1.4 MiB | Main chunk ~1.17 MiB (React + Firebase + CodeMirror); JSON/HTML language packs load lazily |

## Mitigations already in place

- CodeMirror language packs: dynamic `import()` in `ResponseBodyView`
- Large response prettify deferred off the hot path (`useFormattedBody`, 50k+ chars)
- Sync never blocks startup; memory/SQLite repos load locally first
- Stale sends ignored via send token in `RequestService` (UI has no Cancel)

## How to re-measure

1. Cold start: quit Endpt, start `pnpm tauri build` binary; time until Workspace URL field is interactive.
2. Editor nav: switch Params → Headers → Body → Auth; confirm paint feels under 450 ms.
3. Local load: signed-in account with several projects; open Collections and note time to tree paint.
4. Package size: `ls -lh` under `src-tauri/target/release/bundle/` (or Cargo target dir used by the build).
