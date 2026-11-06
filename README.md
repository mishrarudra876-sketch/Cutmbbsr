# CUTM — 3D Landing Page

An animated, mobile-first 3D landing page concept for Centurion University of Technology and Management (CUTM), built with [three.js](https://threejs.org) (r160, vendored in `vendor/` — no build step, no CDN).

## Run

```bash
python3 -m http.server 8000   # any static server works (ES modules need http://, not file://)
```

Open `http://localhost:8000`, or on your phone use your computer's LAN IP.
To publish: GitHub → Settings → Pages → deploy from branch, root.

## What's in it

- **Hero: a carved 3D Konark-style wheel** (Odisha's Sun Temple chakra) built from primitives, turning slowly and with scroll.
- **Poster layout** — dark hero, then solid colour bands (bone, ink, marigold, laterite) with a diamond-border motif and a scrolling programme ticker.
- **Campuses: a clay globe** with engraved graticule, campus pins and arcs. Pick a campus and the globe turns and zooms to it.
- **Mobile first** — separate phone layout (campus list becomes a sheet over the globe), DPR capped, rendering skipped while a colour band covers the canvas, pauses when the tab is hidden, respects `prefers-reduced-motion`, safe-area insets, no-WebGL fallback.

## Content note

The cutm.ac.in site could not be fetched from the build environment, so copy and figures (campuses, 126+ programmes, 200+ recruiters, NAAC A) come from public third‑party listings and are marked indicative. Replace with official content and the real logo/imagery before any production use. This is a concept, not an official CUTM site.
