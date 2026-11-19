# gta6-cover-art-entry

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Diamondpeter/gta6-cover-art-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Diamondpeter/gta6-cover-art-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Coast Cover Studio** — an offline web app that turns any photo and a caption into GTA 6-style multi-panel cover art, with a Vice City sunset/neon colour grade, exported as a PNG to share.

Pick one to four photos, drop each into a panel, drag and zoom it into place, choose a layout (four-panel grid, hero-and-three, two tall panels, or full-bleed), pick a grade (Vice Sunset, Neon Nights, Golden Hour, Palm Noir, Heat Haze, Miami Duotone), letter the caption in bold genre-style type with a neon script subtitle — then export all three post sizes (1080×1080, 1080×1350, 1920×1080) in one click. Undo/redo steps back through every change, and "Surprise me" deals a fresh layout, grade and photo order. Everything runs in the browser from static files; photos never leave the machine. All art, lettering and fonts are original: no Rockstar Games logo, artwork or fonts.

This repository is an entry in make.fun's bounty
[**"Make GTA 6 Cover Art"**](https://make.fun/bounty/gta6-cover-art-01)
($250 in USDC, deadline Sat 21 November 2026, 11:30 Africa/Lagos).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Or build the submission output:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## How it works

- `app/` — the offline web app: `index.html`, `style.css`, `src/main.js` (editor wiring, undo/redo history, export), `src/cover.js` (the cover renderer: four layouts, six grades, inked panel frames, lettering, deterministic grain and vignette), `src/shots.js` (fixed `?shot=` scenes for screenshots), `fonts/` (Anton and Pacifico under the SIL Open Font License — see `fonts/OFL.txt`) and `samples/` (two model-made sample photos, free to use).
- `main.ts` — Node 22, standard library only. Pre-flights the tree, copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored `vendor/makefun-app.ts` library.
- `screenshots/` — 4 screenshots: the exported cover first, then the editor with a photo loaded, then two more covers in the other post sizes.

## License

MIT — see [LICENSE](LICENSE).

---

Entered on [make.fun](https://make.fun/?ref=h68hpwev&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards
