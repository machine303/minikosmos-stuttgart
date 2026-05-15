# Mini Kosmos Stuttgart – Website-Projekt

## Auftraggeber
Mini Kosmos Stuttgart (@minikosmos.stuttgart)

## Dienstleister
Marrazzo.ai – KI-Consulting, Fellbach

## Projektziel
One-Pager Website basierend auf Instagram-Profildaten

---

## Projektstruktur

```
minikosmos-projekt/
├── README.md                  ← Du bist hier
├── scraper/
│   └── scrape_instagram.py    ← Haupt-Script
├── data/
│   ├── minikosmos_complete.json  ← Alle Daten (nach Scraping)
│   ├── profile/               ← Profilbild
│   ├── posts/                 ← Posts mit Bildern + Metadaten
│   ├── stories/               ← Stories (mit Login)
│   └── highlights/            ← Highlights (mit Login)
├── docs/
│   └── SCRAPING_SUMMARY.md    ← Zusammenfassung (nach Scraping)
└── website/
    └── (One-Pager kommt hier)
```

---

## Schnellstart

### 1. Voraussetzungen

```bash
pip install instaloader requests beautifulsoup4
```

### 2. Öffentliche Daten ziehen (ohne Login)

```bash
cd scraper
python scrape_instagram.py
```

### 3. Vollständig mit Login (Stories + Highlights)

```bash
python scrape_instagram.py --login DEIN_INSTAGRAM_USER
```

Das Passwort wird interaktiv abgefragt. Bei 2FA wird der Code auch abgefragt.

### 4. Nur Posts (schneller)

```bash
python scrape_instagram.py --posts-only
```

---

## Was wird gescrapt?

| Datentyp | Ohne Login | Mit Login |
|---|---|---|
| Bio, Name, Link, Follower | ✅ | ✅ |
| Profilbild | ✅ | ✅ |
| Posts (Bilder + Captions) | ✅ | ✅ |
| Hashtags + Mentions | ✅ | ✅ |
| Kommentare | ✅ | ✅ |
| Stories | ❌ | ✅ |
| Highlights | ❌ | ✅ |
| Linktree-Inhalte | ✅ | ✅ |

---

## Output

### minikosmos_complete.json
Enthält:
- **profile**: Bio, Name, Link, Follower-Zahlen
- **posts**: Alle Posts mit Captions, Hashtags, Likes, BildURLs
- **hashtag_analysis**: Häufigste Hashtags
- **mention_analysis**: Häufigste Mentions
- **linktree**: Alle Links aus dem externen Link
- **tonality_analysis**: Sprache, Caption-Stil, Emoji-Nutzung, Top-Wörter

### Medien-Dateien
- Bilder in `/data/posts/{shortcode}/`
- Stories in `/data/stories/`
- Highlights in `/data/highlights/`

---

## Workflow → One-Pager

1. **Scrapen** → Script ausführen
2. **Review** → JSON + beste Bilder sichten
3. **Analyse** → Captions an Claude → Tonalität, Kernbotschaften, Zielgruppe
4. **Farbpalette** → Aus Top-Bildern extrahieren
5. **Wireframe** → Seitenstruktur festlegen
6. **Build** → One-Pager erstellen (HTML/Next.js/React)
7. **Review mit Kundin** → Feedback einholen
8. **Deploy** → Vercel oder ähnlich

---

## Rechtliches
- Freigabe der Kundin liegt vor / wird eingeholt
- Daten werden nur für die Website-Erstellung genutzt
- Keine Weitergabe an Dritte
- DSGVO-konform: personenbezogene Daten nur mit Einwilligung

---

## Kontakt
Cristoforo Marrazzo
Marrazzo.ai
marrazzocristoforo@gmail.com
