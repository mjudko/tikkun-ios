# Tikkun Koreh — local source export

This archive contains the editable source for the Tikkun Koreh Sites project,
including the bundled Torah corpus, layout metadata, custom fonts, tests, and
Sites/Cloudflare configuration.

## Run locally

Requirements: Node.js `>=22.13.0` (Linux is recommended for the Sites helper
scripts).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The app is fully usable with the checked-in
data and fonts; no external corpus download is required.

## Verify and build

```bash
npm test
npm run lint
npm run build
```

`npm install` recreates `node_modules`; the build recreates the deployable
`dist/` directory. Those generated directories are intentionally not included
in this export.

## Publish from GitHub

Create a repository, then run from this directory:

```bash
git init
git add .
git commit -m "Initial Tikkun Koreh source"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

The `.openai/hosting.json` file is retained so the project can continue to be
recognized as a Sites project. Review your hosting provider's deployment
instructions before publishing; do not commit any local `.env` or credential
files.
