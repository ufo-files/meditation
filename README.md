# UFO Files / Meditation

[![Deploy to GitHub Pages](https://github.com/ufo-files/meditation/actions/workflows/pages.yml/badge.svg)](https://github.com/ufo-files/meditation/actions/workflows/pages.yml)
[![Screenshots](https://github.com/ufo-files/meditation/actions/workflows/screenshots.yml/badge.svg)](https://github.com/ufo-files/meditation/actions/workflows/screenshots.yml)

Meditation is a minimal browser-based sound and visualization instrument. It uses a real Gaia DR3 star field as the visual foundation, then layers synthetic breath, heartbeat, drone, and sound-bath audio over it.

Live app: https://ufo-files.github.io/meditation/

Anonymous tips: https://tips.hushline.app/to/ufo-files

## What It Does

The app renders a volumetric field of mapped stars with Three.js and overlays meditation-oriented audio layers that can be toggled, tuned, mixed, and exported as JSON settings.

- Real universe layer: 12,000 Gaia DR3 stars mapped into a volumetric star field.
- Box breath core: synthetic breath layer following a 4-4-4-4 box-breathing cycle.
- Heart-rate field: synthetic heartbeat pulse fixed at the canonical 48 BPM meditation tempo.
- Low drone: 100 Hz tone modulated at 7.83 Hz.
- Music: experimental synthetic singing-bowl layer, synchronized with the breath and heartbeat timing.
- Binaural mode: headphone-oriented stereo treatment for supported layers.
- EQ panel: per-layer tuning, gain, source-frequency controls, and sound-setting export.

## Data

The universe layer is generated from Gaia DR3. The app ships a curated 12,000-star subset selected from bright sources with:

- positive parallax
- `parallax_over_error > 10`
- G-band photometry

Each point keeps Gaia-derived `source_id`, Cartesian `x`, `y`, `z`, visual magnitude, BP/RP color index, and distance in parsecs. The renderer preserves sky direction and log-compresses distance into a volumetric star field, so stars occupy the interior rather than only a surface shell.

Source: https://gea.esac.esa.int/archive/

Use terms: https://www.cosmos.esa.int/web/gaia-users/archive/conditions-of-use

## Visualization Layers

All visual layers use Gaia-derived positions or directions, but only the universe layer is astronomical data. The breath, heartbeat, drone, and music layers are synthetic meditation overlays mapped onto the same spatial vocabulary.

Current point counts:

- Universe: 12,000
- Breath: 6,000
- Heartbeat: 8,000
- Drone core: 6,000
- Music: 8,000

The music sphere is driven by real analyser data from the generated music layer. It is not a pre-baked animation.

## Audio Model

All sound is generated in the browser with Web Audio. No human breath recordings, samples, or downloaded audio files are used.

The audio is intentionally synthetic:

- Breath is generated through an AudioWorklet.
- Heartbeat is synthesized with short filtered oscillators.
- Drone is oscillator-based.
- Music is generated from synchronized oscillator events shaped like singing bowls.

The overlays are designed for calm experimentation, not clinical treatment or scientific measurement.

## Screenshots

![Meditation sphere](screenshots/meditation-sphere.png)

## Development

This is a static GitHub Pages app.

```sh
npm install
python3 -m http.server 4177
```

Then open:

```text
http://localhost:4177/
```

Regenerate the Gaia universe data:

```sh
npm run build:universe
```

Regenerate README screenshots:

```sh
npm run screenshots
```
