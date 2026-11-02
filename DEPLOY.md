# Deploying spurlabs

The site is one static file, `index.html`, built from `src/` and `data/` by `python3 build.py`. It loads three.js from cdnjs and its fonts from Google Fonts, so it needs no server or build step to host.

## GitHub Pages (recommended)
1. Push this folder to a public GitHub repository, for example `Raunaq-nous/spurlabs`.
2. Settings → Pages → Source: deploy from a branch, `main`, folder `/ (root)`.
3. The site goes live at `https://raunaq-nous.github.io/spurlabs/`.

## Custom domain
1. Add a file named `CNAME` at the root containing only the domain, for example `spurlabs.ai`.
2. At the domain registrar, add these records:
   - `A` records for the apex domain pointing to 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153
   - a `CNAME` record for `www` pointing to `raunaq-nous.github.io`
3. In Settings → Pages, enter the domain and tick Enforce HTTPS once the certificate is issued.

## Before launch
Replace every `hello@example.com` in `src/index.template.html` and `src/site.js` with the real contact address, then run `python3 build.py`.
