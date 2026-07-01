# UFO Files / Meditation

[![Deploy to GitHub Pages](https://github.com/ufo-files/meditation/actions/workflows/pages.yml/badge.svg)](https://github.com/ufo-files/meditation/actions/workflows/pages.yml)
[![Screenshots](https://github.com/ufo-files/meditation/actions/workflows/screenshots.yml/badge.svg)](https://github.com/ufo-files/meditation/actions/workflows/screenshots.yml)

Meditation is a minimal Three.js visualizer that starts from real mapped-star data and layers meditation-oriented motion and sound structures over it.

Live app: https://ufo-files.github.io/meditation/

## Data

The universe layer is generated from the HYG Database v3.8 star catalog. The app ships a deterministic 6,000-star subset selected from bright, named, nearby, and depth-sampled stars. Each point keeps catalog-derived `x`, `y`, `z`, visual magnitude, color index, distance, name, and constellation fields.

Source: https://github.com/astronexus/HYG-Database/blob/main/hyg/v3/hyg_v38.csv.gz  
License: CC BY-SA 4.0

The breath, beat, drone, and music layers are meditation overlays. They are not astronomical measurements. Box breathing stays fixed at a 16-second cycle; the heart-rate and music pulses use BPM options that divide evenly into that cycle.

## Screenshots

![Meditation sphere](screenshots/meditation-sphere.png)

## Development

This is a static Pages app.

```sh
python3 -m http.server 4177
npm run screenshots
```
