# SPURLABS website

The SPURLABS website: an enterprise AI platform for capital projects. Builds are rendered as solid 3D models converted into characters, inside a frame beside the text.

## Run and build
- Open `index.html`, or `python3 -m http.server 8000`.
- Edit `src/` and `data/registry.json`, then `python3 build.py` to regenerate `index.html`.
- GitHub Pages: Settings → Pages → deploy from `main`, root.

## Structure
- `data/registry.json`: the tools (value proposition, description, features, lifecycle roles, customers, connections), stages, value layers, customers and industries. Single source for the site.
- `src/ascii.js`: the industry models as solid three.js geometry, by component.
- `src/engine.js`: the renderer (scene at cell resolution, then characters by luminance with edge tracing), lifecycle stage compositions, platform and process views.
- `src/site.js`: hero dropdowns, sections, tool pages (`#tool/<id>`), logo study (`#logo`), routing.
- `src/styles.css`, `src/index.template.html`: Geist and Geist Mono only.

three.js r128 loads from cdnjs. Fonts: Geist and Geist Mono (SIL Open Font License).
