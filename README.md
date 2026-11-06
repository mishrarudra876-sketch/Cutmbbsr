# CUTM — 3D Landing Page

An animated, mobile-first 3D landing page concept for Centurion University of Technology and Management (CUTM), built with [three.js](https://threejs.org) (r160, vendored in `vendor/` — no build step, no CDN).

## Run

```bash
python3 -m http.server 8000   # any static server works (ES modules need http://, not file://)
```

Open `http://localhost:8000`, or on your phone use your computer's LAN IP.
To publish: GitHub → Settings → Pages → deploy from branch, root.

## What's in it

- **Live 3D globe** — dotted shell, atmosphere shader, campus markers with pulses, animated arcs from Bhubaneswar to the other campuses.
- **Scroll-driven camera** — each section has its own camera/globe keyframe; scrolling also adds spin.
- **Tap a campus** — chips rotate the globe to that campus.
- **Orbiting discipline shapes** in the Programmes section; 3D-tilt cards (touch + mouse).
- **Mobile first** — separate mobile camera layout, DPR capped at 1.5, fewer particles, no antialias on phones, pauses when the tab is hidden, respects `prefers-reduced-motion`, safe-area insets, 44px+ tap targets, no-WebGL fallback.

## Content note

The cutm.ac.in site could not be fetched from the build environment, so copy and figures (campuses, 126+ programmes, 200+ recruiters, NAAC A) come from public third‑party listings and are marked indicative. Replace with official content and the real logo/imagery before any production use. This is a concept, not an official CUTM site.
