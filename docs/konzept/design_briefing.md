# Design-Briefing – Mini-Kosmos Stuttgart

**Stand:** 2026-04-27

---

## Farben

```css
:root {
  --color-primary:    #F08030;   /* Warm Orange — Hauptakzent */
  --color-secondary:  #E8604C;   /* Coral/Lachs — Buttons, Highlights */
  --color-accent:     #9B7EC8;   /* Sanftes Lila — Akzente */
  --color-bg:         #FFF8F0;   /* Cremeweiß — Seitenhintergrund */
  --color-bg-alt:     #FFF0E8;   /* Helles Peach — Abwechslung */
  --color-text:       #1A1A1A;   /* Fast Schwarz — Fließtext */
  --color-text-light: #6B6B6B;   /* Grau — Sublines, Labels */
  --color-mint:       #6DBF9E;   /* Mint — dezenter Akzent */
  --color-gold:       #F5C842;   /* Gold — Akzent */
  --color-white:      #FFFFFF;   
}
```

---

## Typografie

| Rolle | Font | Größe | Gewicht |
|---|---|---|---|
| Display Headline | Montserrat / Futura / DM Sans | 3.5–5rem | 900 (Black) |
| Section Headline | Montserrat | 2–2.5rem | 700 (Bold) |
| Subline | Montserrat | 1.2–1.4rem | 400 |
| Body Text | Inter / DM Sans | 1rem (16px) | 400 |
| Label / Tag | Montserrat | 0.75rem | 700, UPPERCASE |

**Empfehlung:** Google Fonts — Montserrat (Headlines) + Inter (Body)
**Kein** Serifen-Font — zu formell für diesen Charakter.

---

## Layout-Prinzipien

- **Mobile-First:** Breakpoint bei 768px
- **Max-Width:** 1200px, zentriert
- **Section-Padding:** 80px vertikal (Desktop), 48px (Mobile)
- **Whitespace:** Großzügig — kein Gedränge
- **Grid:** Einfache 1–2–3-Spalten-Grids je nach Sektion

---

## Visuelle Elemente

### Gradient-Banner (von Profilbild-Ring)
```css
background: linear-gradient(135deg, #F5C842, #F08030, #E8604C, #9B7EC8, #6DBF9E);
```
→ Als Hero-Overlay oder dekorativer Balken verwenden (nicht als Vollhintergrund)

### Sektion-Trenner
Sanfte Kurven (SVG `<path>`) zwischen Sektionen — weich, nicht kantig

### Icons
Emoji als Design-Element (✨🌱🌍💬) — passt zur Tonalität

### Bildbehandlung
- Bilder mit `border-radius: 16px` (abgerundete Ecken)
- Kein harter Schatten — `box-shadow: 0 4px 24px rgba(0,0,0,0.08)`

---

## Bildauswahl (Empfehlung)

| Sektion | Bild |
|---|---|
| Hero | MINI KOSMOS STUTTGART Coral-Grafik als Hintergrundakzent |
| Events | BINGO NACHMITTAG Poster |
| Über uns | Foto von Melli & Kathi (noch zu beschaffen) |
| Partner | DANKE-Post als Inspiration |

---

## Was zu VERMEIDEN ist

- ❌ Dunkler / schwarzer Hintergrund
- ❌ Neonfarben
- ❌ Stock-Photos
- ❌ Viele verschiedene Fonts
- ❌ Enge, gedrängte Layouts
- ❌ Clipart oder generische Icons
