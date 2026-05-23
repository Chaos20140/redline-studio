# REDLINE/STUDIO

> Web Design at Terminal Velocity. Aggressive, performance-driven Websites — schwarz/rot/neon, F1-Sprache, kompromisslos.

Live: https://chaos20140.github.io/redline-studio/

## Stack
- Static HTML/CSS/JS — kein Build-Step
- GSAP + ScrollTrigger (Reveal-Animations)
- Three.js (Icosahedron mit Custom-Displacement-Shader in der Engineering-Section)
- Scroll-scrubbed Background-Video (rAF + Lerp)

## Dev lokal
```bash
npx http-server -p 5501 -c-1
# → http://localhost:5501
```
Wichtig: Server muss HTTP-Range-Requests können (Python `http.server` kann das **nicht**, deshalb `http-server` aus npm).

## Deploy
Push auf `main` → GitHub Actions deployed automatisch auf GitHub Pages.

## Struktur
```
.
├── index.html               # Hauptseite
├── impressum.html           # Impressum/Datenschutz/AGB
├── CLAUDE.md                # Buildbook (Designvertrag, Code-Hygiene, Performance-Budget)
├── assets/
│   ├── css/style.css        # Komplettes Stylesheet
│   ├── js/main.js           # Cursor · Scroll-Video · Three.js · Form
│   ├── video/{hero,scroll}.mp4
│   └── images/
└── .github/workflows/deploy.yml
```
