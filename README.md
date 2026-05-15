# Mini Kosmos Stuttgart — Website + CMS

## Auftraggeber
Mini Kosmos Stuttgart (@minikosmos.stuttgart)

## Dienstleister
Marrazzo.digital — KI-Consulting, Fellbach

## Live
- **Website:** https://minikosmos.marrazzo.digital
- **Admin:** https://minikosmos.marrazzo.digital/admin

---

## Projektstruktur

```
Minikosmos Stuttgart/
├── website/              ← Single source of truth (HTML/CSS/Assets)
│   ├── index.html
│   ├── style.css
│   └── favicon.svg
├── cms/                  ← Backend (Express + SQLite)
│   ├── index.js          ← Server (Admin-Panel, API, Website-Serving)
│   ├── package.json
│   ├── .env.example
│   └── data/             ← gitignored (DB + Uploads)
├── docs/                 ← Konsolidierte Projekt-Doku
│   ├── analyse/          ← Content-Analyse, Farbpalette, Zielgruppe
│   ├── konzept/          ← Design-Briefing, Sitemap, Texte
│   └── scraping/         ← Instagram-Scraper (Referenz)
├── Dockerfile            ← Root-Level (Build-Context = Root)
├── deploy.sh             ← Deployment auf VPS
├── .dockerignore
├── .gitignore
├── README.md
├── Anleitung-Website-Admin.md
└── Mini-Kosmos_Editorial.pdf
```

---

## Lokale Entwicklung

```bash
cd cms
ln -s ../website website    # einmalig (Symlink, gitignored)
npm install
node index.js               # http://localhost:3002
```

Der Symlink sorgt dafuer, dass `path.join(__dirname, 'website')` sowohl lokal als auch im Docker-Container funktioniert.

---

## Deployment (VPS)

**Standard-Deploy (rsync + Docker rebuild):**
```bash
zsh deploy.sh
```

**Schnell-Update CMS (~5s, ohne Rebuild):**
```bash
scp cms/index.js mzzo:/opt/services/minikosmos/cms/index.js
ssh mzzo "docker cp /opt/services/minikosmos/cms/index.js minikosmos:/app/index.js && docker restart minikosmos"
```

**Schnell-Update Website (~5s, ohne Rebuild):**
```bash
scp website/index.html mzzo:/tmp/mk_index.html
scp website/style.css mzzo:/tmp/mk_style.css
ssh mzzo "docker cp /tmp/mk_index.html minikosmos:/app/website/index.html && \
         docker cp /tmp/mk_style.css minikosmos:/app/website/style.css"
```

---

## Docker-Container Layout

```
/app/
├── index.js          ← aus cms/index.js
├── website/          ← aus website/
│   ├── index.html
│   ├── style.css
│   └── favicon.svg
├── node_modules/
└── data/             ← Volume: /opt/services/minikosmos/data
```

---

## Tech-Stack

| Komponente | Technologie |
|------------|-------------|
| Website | Plain HTML + CSS (kein Framework) |
| CMS/Backend | Node.js + Express + better-sqlite3 |
| Datenbank | SQLite (content.db) |
| Container | Docker (node:22-alpine) |
| Reverse Proxy | Caddy (TLS auto) |
| Hosting | Hetzner VPS (MZZO-vps-01) |

---

## Features

- Hero, Mission, Team, Events, Partner, Instagram-Feed, Kontakt
- Admin-Panel unter /admin (Passwort in .env auf VPS)
- Foto-Upload mit Loeschen
- Events CRUD
- BugHub Widget integriert
- WCAG 2.2 AA: Skip-Link, Landmarks, Focus-Visible, Kontrast
