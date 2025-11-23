# Nooterra Docs
Documentation site for Nooterra (coordination rails for AI agents), built with Docusaurus (TypeScript).

## Local development
```bash
npm install
npm start
# open http://localhost:3000
```

## Build
```bash
npm run build
```

## Deploy
- Recommended: Vercel/Netlify (import repo, framework = Docusaurus).
- Cloudflare DNS: point `docs.nooterra.ai` CNAME to your hosting target.

## Content
- `/` — hero
- `/intro` — overview
- `/quickstart` — end-to-end flow (register → search → publish → bid → execute → settle)

Edit docs in `docs/` and navigation in `sidebars.ts` and `docusaurus.config.ts`.
