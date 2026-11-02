# Working in this repository
- Rebuild with `python3 build.py` before committing; never edit `index.html` directly.
- One type family: Geist for text, Geist Mono for labels. No serif anywhere. Headings use two shades of the same colour (`.mute` for the first part).
- Visuals render only inside `.vis` frames and never under text.
- Tool content lives in `data/registry.json`. Each tool must keep a distinct value proposition; new capabilities become features of an existing tool unless they serve a different decision.
- Add an industry: a model in `DEF` in `src/ascii.js` (components as regions), a camera entry in `CAM` in `src/engine.js`, and an entry in `industries` in the registry.
