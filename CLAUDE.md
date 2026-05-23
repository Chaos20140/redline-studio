# CLAUDE.md — REDLINE/STUDIO Buildbook

> Diese Datei ist meine eigene Bauanleitung. Vor jeder größeren Änderung **erst diese Datei lesen**, danach den eigenen Code hinterfragen.

---

## 0. Selbstcheck vor jeder Änderung

1. **Was will der Nutzer wirklich?** Nicht das wörtliche Brief abarbeiten, sondern das ästhetische Ziel: *aggressiv, schwarz/rot, Neon, kompromisslos, Top-Animationsqualität.*
2. **Bricht meine Änderung den Designvertrag?** (Siehe §2.) Wenn ja → zurück zum Briefing.
3. **Performance-Budget eingehalten?** (Siehe §6.)
4. **Habe ich bestehendes hinterfragt?** Ich darf bestehenden Code immer optimieren — aber nie verstecken statt fixen. Wenn eine Animation stottert → root cause finden, nicht weichspülen.

---

## 1. Projekt-Identität

- **Studio**: REDLINE/STUDIO (Platzhalter — `Tolgay Ulukaya` als reale Person, Dresden).
- **Positionierung**: aggressives Web-Design-Studio, F1-/Karbon-/Cyberpunk-Sprache.
- **Slogan-Vokabular**: „Redline", „Velocity", „Pit Lane", „Pole Position", „Carbon", „Throttle", „Signal".
- **Referenz**: collabcapitolium.fr — daraus übernommen: Hero mit Bewegtbild-Hintergrund, große brutalistische Display-Typografie, Stat-Block, kuratierte Cases, monospaced Labels.

---

## 2. Design-Vertrag (nicht aufweichen)

| Aspekt | Regel |
|---|---|
| Hintergrund | Pures Schwarz `#060305`, niemals Dunkelgrau Richtung Blau. |
| Akzent | Neon-Rot `#ff1f3d` (`--red`) für jedes interaktive/lebendige Element. |
| Typo Headlines | **Anton** (Display) + **Big Shoulders Display Italic** (Akzent-Italic). Niemals Inter/Roboto/Arial. |
| Typo Code/Labels | **JetBrains Mono**, immer `letter-spacing` ≥ 0.12em, immer UPPERCASE. |
| Typo Body | **Manrope**, max-width ~560px. |
| Layout | Asymmetrie, Eck-Marker (4-Corner-Brackets), Mono-Telemetrie in Ecken, große Negativräume. |
| Effekte-Layer | Noise-Overlay + Scanlines + Vignette sind fix — niemals entfernen. |
| Cursor | Custom-Cursor mit Dot+Ring, `mix-blend-mode: difference`. |
| Sprache | Deutsch primär, englische Tech-Begriffe sind okay („Pit Lane", „Throttle"). |

---

## 3. Dateistruktur

```
.
├── index.html             # Hauptseite – alle Sections
├── impressum.html         # Impressum, Datenschutz, AGB (DDG + DSGVO konform)
├── CLAUDE.md              # ← diese Datei
└── assets/
    ├── css/style.css      # Komplettes Stylesheet (Single-File-Strategie)
    ├── js/main.js         # IIFE, alle Module in einer Datei
    ├── video/
    │   ├── hero.mp4       # Hero-Loop (autoplay)
    │   └── scroll.mp4     # Scroll-scrubbing Background
    └── images/            # frei für echte Case-Visuals
```

**Prinzip**: alles in wenigen großen Dateien lassen, nicht in 30 Module zerlegen. Single Page, kein Build-Step.

---

## 4. Sections (Reihenfolge nicht ändern, ohne Grund)

1. **Hero** — Hero-Video als Background, riesiges Anton-Display, Ecken-Telemetrie, Marquee am Ende.
2. **Manifesto** (`#manifesto`) — Statement + Stat-Counter.
3. **Services** (`#services`) — 2×2 Grid, Hover-Glow folgt der Maus.
4. **Engineering** (`#engineering`) — Three.js Icosahedron mit Displacement-Shader, sticky 220vh.
5. **Process** (`#process`) — vertikale Neon-Linie + pulsierende Steps.
6. **Work** (`#work`) — 12-col Grid, Case-Visuals aus CSS-Gradienten oder echten Bildern.
7. **Big Marquee** (Vollrot).
8. **Contact** (`#contact`) — Formular mit Chips/Radio/Validation, `mailto:`-Fallback.
9. **Footer** — Giant-Text + Live-Clock + Spalten.

Nav-Nummerierung passt sich an: `00 · Manifest · 01 · Services · …`. Wer eine Section hinzufügt, **muss** die Nav-Indizes mit-aktualisieren.

---

## 5. Animations-System

### 5.1 Scroll-Scrub-Background-Video (`#bgScroll`)
- **Funktioniert so**: Video ist fixed, `position: fixed; inset: 0; z-index: -3;`. `video.currentTime` wird in einer `requestAnimationFrame`-Loop **gelerpt** Richtung Scroll-Target.
- **Warum lerpen**: Browser drosseln direktes `currentTime`-Setzen. Lerp glättet die Bewegung und vermeidet Stutter.
- **Aktiv-Bereich**: ab `#manifesto`, endet bei 60% von `.contact` (siehe `computeTarget()`).
- **Section-Backgrounds**: alle Sections ab Manifesto haben `rgba(6,3,5,0.78-0.95)` statt solid bg, damit Video durchblendet. **Nicht** opaque machen.
- **Performance**: Video MUSS `preload="auto"` haben, sonst springt's beim ersten Sichtbarwerden.
- **Bekanntes Limit**: für butterweichen Scrub sollte das Video mit **alle-Frames-Keyframes** encoded sein (`ffmpeg -i src.mp4 -c:v libx264 -x264opts keyint=1 -g 1 -an out.mp4`). Wenn der Nutzer mehr Smoothness will → das ist die Lösung.

### 5.2 Three.js — Engineering-Szene
- **Mesh**: `IcosahedronGeometry(1.35, 32)` mit ShaderMaterial.
- **Shader**: 3D-Simplex-Noise verschiebt Vertices entlang der Normalen. `uDeform` wird mit Scroll-Progress gelerpt.
- **Wireframe-Overlay**: separate `LineSegments` mit `WireframeGeometry(IcosahedronGeometry(1.36, 4))`.
- **Partikel**: 1400 Points additiv geblendet als Ring.
- **Rendert nur, wenn sichtbar** — `IntersectionObserver` togglet `visible`. Render-Loop pausiert effektiv off-screen.
- **DPR-Cap**: `Math.min(devicePixelRatio, 2)` — kein 3x auf Retina, sonst stottert's auf MacBook Pros.
- **Geometrie ändern**: Vertex-Count steht in `vtxCount` Telemetrie — bei Änderung anpassen.

### 5.3 GSAP / ScrollTrigger
- Wird nur aktiviert, wenn `window.gsap && window.ScrollTrigger && !reduce`.
- Hero hat 2 Scrub-Animationen (`yPercent` + `opacity`).
- Sections haben einmalige Reveal-Animationen, kein Pin-Scroll außer Engineering.

### 5.4 Reveal-Pattern
- CSS: `[data-service], [data-case], [data-step] { opacity: 0; transform: translateY(40px); }`.
- JS: `IntersectionObserver` togglet `.is-in`.
- Neue scrolling Komponenten → entweder `data-*` Attribut + Observer-Set ergänzen, oder GSAP-`from(..., { scrollTrigger })`.

### 5.5 Custom Cursor
- Zwei Lerp-Layer (Dot schnell, Ring langsam).
- Hoverables-Selector erweitern, wenn neue interaktive Klassen dazukommen.
- Wird auf Touch-Geräten deaktiviert (`@media (hover: none)`).

---

## 6. Performance-Budget

| Asset | Limit | Status |
|---|---|---|
| Hero-Video | ≤ 12 MB, ≤ 15s | aktuell ~11 MB ✓ |
| Scroll-Video | ≤ 18 MB, ≤ 30s | aktuell ~13 MB ✓ |
| JS (ohne CDNs) | ≤ 25 KB | aktuell ~12 KB ✓ |
| CSS | ≤ 50 KB | aktuell ~40 KB ✓ |
| Three.js | aus CDN, blockt nicht Hero | ✓ |
| First Contentful Paint | < 1.6s | nur prüfen, wenn man Real-Server hat |

**Wenn ein neues Video > 20 MB ist** → erst re-encoden (H.264, CRF 23, max-keyint=1 für Scrub-Videos).

---

## 7. Code-Hygiene — Was ich mir selbst nicht erlaube

- ❌ **`setInterval` ohne Off-Screen-Pause** — alle wiederkehrenden Timer brauchen einen `IntersectionObserver`-Gate (siehe Hero-Telemetrie).
- ❌ **Solide Section-Backgrounds** im Scroll-Video-Bereich.
- ❌ **`scroll`-Listener mit teurer Arbeit** ohne `requestAnimationFrame`-Throttle.
- ❌ **CSS-Variablen umbenennen** — `--red`, `--bg`, `--ink` sind System-Tokens.
- ❌ **„Cleanup"-Kommentare** im Code — der Code soll selbsterklärend sein.
- ❌ **Generic Fonts laden** — Inter, Roboto, System-UI sind verboten.
- ❌ **`body { background: solid-color }`** — das verdeckt das Scroll-Video. `body` MUSS `background: transparent`. Solide Fallback-Farbe gehört auf `html`.
- ❌ **`overflow-x: hidden` auf `html`** — killt `position: sticky` (Engineering-Section). Stattdessen `overflow-x: clip` auf `body`.
- ❌ **`python -m http.server`** zum Testen — kein Range-Request-Support → Video nicht scrubbar. Immer `npx http-server` o.ä.

## 8. Code-Hygiene — Was ich tun MUSS

- ✅ Vor `currentTime = x` immer prüfen, ob `video.readyState >= 1` und `Math.abs(currentTime - x) > 0.033` (eine Frame-Distanz).
- ✅ Bei jedem neuen scroll-/animation-haltigen Element: `prefers-reduced-motion` ehren.
- ✅ Bei jedem WebGL-Setup: `powerPreference: "high-performance"`, DPR clampen.
- ✅ Bei jedem Asset-Add: Pfad relativ (`assets/...`), nie absolut.
- ✅ Vor Commit den eigenen Diff lesen.

---

## 9. Bekannte Schwächen & TODOs

- **Form-Backend fehlt**: aktuell nur `mailto:`. Wenn produktiv → Formspree/Resend/eigener Endpoint. Field-Level-Inline-Validation wäre Bonus.
- **Case-Visuals sind CSS-Gradienten**: ersetzen mit echten Bildern in `assets/images/` und `background-image: url(...)` in `.case__visual--0X`.
- **Scroll-Video braucht Keyframe-Dense-Encoding** für echten Butter-Scrub.
- **Three.js Sektion hat keine Post-Processing** — bewusst, für Performance. Wenn Bloom gewünscht: `EffectComposer` einbauen, aber Mobile-Fallback prüfen.
- **Mobile-Nav fehlt**: oberhalb 900px geht's, drunter ist die Nav versteckt. Hamburger-Menü ist offen.
- **`mailto:`-Fallback** ist nicht GDPR-elegant — der User klickt, Mail-Client öffnet sich, der User sendet. Kein Tracking, das ist okay, aber für richtige Leads sollte ein Backend ran.

---

## 10. Mein eigener Review-Checklist nach jedem Build

```
[ ] Hero lädt mit Video-Background, keine grauen Frames.
[ ] Scrollt man zum Manifesto, fadet das Scroll-Video sanft ein.
[ ] Scrollen vorwärts spielt das Scroll-Video vorwärts, rückwärts rückwärts.
[ ] Engineering-Section: Icosahedron rotiert, deformt mit Scroll, reagiert auf Maus.
[ ] FPS in DevTools-Performance ≥ 55 auf normalem Laptop.
[ ] Kein Console-Error (außer `favicon.ico` 404 — egal).
[ ] Mobile (DevTools-Resize <600px): Sections stapeln, kein Overflow.
[ ] Impressum lädt mit konsistentem Look.
[ ] Form-Submit ohne Pflichtfelder → ERROR-Status. Mit Pflichtfeldern → mailto öffnet.
[ ] `prefers-reduced-motion`: alle Animations-Intervalle near-zero.
```

---

## 11. Tonalität, wenn ich Inhalte schreibe

- Kurz. Aggressiv. Selbstbewusst.
- „Wir bauen X." — niemals „Wir können Ihnen helfen, X aufzubauen."
- Italic-Wörter sind die Punchline (`<em>EINSCHLAGEN</em>`, `<em>einschlagen</em>`).
- Englische Tech-Begriffe sind Stilmittel, nicht Schwäche.
- Nummerierung wie `00`, `01`, `02` für Sections, `/ 01`, `/ 02` für Felder/Cases.

---

## 12. Wenn der Nutzer etwas Neues will

1. Erst denken, **wo** es im Designsystem sitzt.
2. Dann **Performance-Impact** abschätzen (siehe §6).
3. Dann implementieren — bestehende Komponenten erweitern statt parallele zu bauen.
4. **Vorhandenen Code beim Bauen hinterfragen**: gibt's ein `setInterval` ohne Gate? Ein `scroll`-Listener ohne rAF? Sofort mitfixen.
5. Browser-Smoke-Test mit Playwright durchziehen (siehe §10 Checklist).
6. **Im Zweifel weniger als mehr.** Das Design lebt von Disziplin, nicht von Effekt-Stacking.
