const canvas = document.getElementById("universe");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("start");
const animationToggleButton = document.getElementById("animation-toggle");
const appSwitcher = document.getElementById("app-switcher");
const statusEl = document.getElementById("status");
const volumeInput = document.getElementById("volume");
const breathLabel = document.getElementById("breath-label");
const beatLabel = document.getElementById("beat-label");
const droneLabel = document.getElementById("drone-label");
const musicLabel = document.getElementById("music-label");
const binauralInput = document.getElementById("binaural");
const eqToggleButton = document.getElementById("eq-toggle");
const eqExportButton = document.getElementById("eq-export");
const eqResetButton = document.getElementById("eq-reset");
const eqTargetInput = document.getElementById("eq-target");
const eqTrimInput = document.getElementById("eq-trim");
const eqTrimOutput = document.getElementById("eq-trim-output");
const eqSourceRow = document.getElementById("eq-source");
const eqSourceInput = document.getElementById("eq-source-frequency");
const eqSourceOutput = document.getElementById("eq-source-output");
const eqSourceList = document.getElementById("eq-source-list");
const eqVolumeLabel = document.querySelector(".eq-volume span");
const eqVolumeOutput = document.getElementById("eq-volume-output");
const equalizerPanel = document.getElementById("equalizer");
const eqBandsEl = document.getElementById("eq-bands");
const layerToggleInputs = Array.from(document.querySelectorAll(".layer-toggle"));

const TWO_PI = Math.PI * 2;
const STAR_COUNT_TARGET = 12000;
const UNIVERSE_INNER_RADIUS = .16;
const UNIVERSE_OUTER_RADIUS = 1.94;
const OVERLAY_POINT_COUNT = 8000;
const CORE_POINT_COUNT = 8000;
const BEAT_POINT_COUNT = 12000;
const DRONE_POINT_COUNT = 4000;
const MUSIC_POINT_COUNT = OVERLAY_POINT_COUNT;
const HEART_RADIUS_SCALE = .598;
const BREATH_MIN_RADIUS_SCALE = HEART_RADIUS_SCALE * .405;
const BREATH_REST_OPACITY = .22;
const BREATH_PEAK_OPACITY = .44;
const BEAT_VOLUME_SCALE = HEART_RADIUS_SCALE;
const DRONE_VOLUME_SCALE = .075;
const MUSIC_VOLUME_SCALE = .675;
const VISUAL_ROTATION_SPEED = 1.15;
const VISUAL_RESPONSE_SPEED = 1.45;
const MUSIC_VISUAL_SIGNAL_GAIN = 4;
const TRACE_RGB = "232, 229, 222";
const BREATH_SIDE_SECONDS = 4;
const BREATH_CYCLE_SECONDS = BREATH_SIDE_SECONDS * 4;
const MUSIC_PHRASE_SECONDS = BREATH_CYCLE_SECONDS;
const MUSIC_GRID_STEPS = 64;
const HEART_BPM = 48;
const CRYSTAL_BOWLS = [
  { size: "very large", ratio: .51, position: 0, pan: -.42, duration: 10.5, gain: .52, source: "musicKick" },
  { size: "large", ratio: .68, position: 18, pan: .28, duration: 8.2, gain: .34, source: "musicKick" },
  { size: "very large", ratio: .57, position: 32, pan: .4, duration: 10.2, gain: .46, source: "musicKick" },
  { size: "medium", ratio: .96, position: 48, pan: -.18, duration: 6.6, gain: .22, source: "musicKick" },
];
const TEMPLE_BOWL_ACCENTS = [
  { size: "large", ratio: .77, pan: -.34, duration: 6.8, gain: .18, source: "musicKick" },
  { size: "small", ratio: .63, pan: .44, duration: 4.2, gain: .08, source: "musicBackbeat" },
  { size: "small", ratio: .91, pan: -.48, duration: 3.8, gain: .07, source: "musicBackbeat" },
];
const AUDIO_WORKLET_VERSION = "2026-07-01-breath-air-cleaner";
const DRONE_TONE_FREQUENCY = 100;
const DRONE_BASE_GAIN = .026;
const HEART_BASE_GAIN = .82;
const BREATH_BASE_GAIN = 2.55;
const MUSIC_BASE_GAIN = 1.74;
const EQ_BANDS = [
  { id: "40", label: "40", frequency: 40, q: .82 },
  { id: "80", label: "80", frequency: 80, q: .9 },
  { id: "160", label: "160", frequency: 160, q: 1 },
  { id: "320", label: "320", frequency: 320, q: 1 },
  { id: "640", label: "640", frequency: 640, q: 1 },
  { id: "1k", label: "1k", frequency: 1000, q: 1 },
  { id: "2k", label: "2k", frequency: 2000, q: 1 },
  { id: "5k", label: "5k", frequency: 5000, q: .95 },
];
const EQ_TARGETS = ["master", "breath", "beat", "drone", "music"];
const EQ_TARGET_BANDS = {
  master: EQ_BANDS,
  breath: [
    { id: "340", label: "340", frequency: 340, q: .8 },
    { id: "520", label: "520", frequency: 520, q: .85 },
    { id: "760", label: "760", frequency: 760, q: .9 },
    { id: "1k", label: "1k", frequency: 1040, q: .9 },
    { id: "1.4k", label: "1.4k", frequency: 1380, q: .9 },
    { id: "1.9k", label: "1.9k", frequency: 1900, q: .85 },
    { id: "3k", label: "3k", frequency: 3000, q: .8 },
    { id: "5k", label: "5k", frequency: 5000, q: .75 },
  ],
  beat: [
    { id: "38", label: "38", frequency: 38, q: .85 },
    { id: "42", label: "42", frequency: 42, q: .85 },
    { id: "60", label: "60", frequency: 60, q: .9 },
    { id: "76", label: "76", frequency: 76, q: .9 },
    { id: "102", label: "102", frequency: 102, q: .95 },
    { id: "160", label: "160", frequency: 160, q: .9 },
    { id: "320", label: "320", frequency: 320, q: .8 },
    { id: "640", label: "640", frequency: 640, q: .75 },
  ],
  drone: [
    { id: "55", label: "55", frequency: 55, q: .85 },
    { id: "110", label: "110", frequency: 110, q: 1 },
    { id: "220", label: "220", frequency: 220, q: 1 },
    { id: "440", label: "440", frequency: 440, q: .9 },
    { id: "880", label: "880", frequency: 880, q: .85 },
    { id: "1.8k", label: "1.8k", frequency: 1760, q: .8 },
    { id: "3.5k", label: "3.5k", frequency: 3520, q: .75 },
    { id: "5k", label: "5k", frequency: 5000, q: .75 },
  ],
  music: [
    { id: "27.5", label: "27.5", frequency: 27.5, q: .8 },
    { id: "55", label: "55", frequency: 55, q: .85 },
    { id: "110", label: "110", frequency: 110, q: .95 },
    { id: "220", label: "220", frequency: 220, q: .95 },
    { id: "440", label: "440", frequency: 440, q: .9 },
    { id: "880", label: "880", frequency: 880, q: .85 },
    { id: "1.8k", label: "1.8k", frequency: 1760, q: .8 },
    { id: "3.5k", label: "3.5k", frequency: 3520, q: .75 },
  ],
};

const catalog = window.UNIVERSE_STARS_DATA || { count: 0, stars: [] };
const stars = prepareStars((catalog.stars || []).slice(0, STAR_COUNT_TARGET));
const breathPoints = createUniverseProjectionPoints(CORE_POINT_COUNT, 7);
const beatPoints = createUniverseProjectionPoints(BEAT_POINT_COUNT, 19);
const dronePoints = createUniverseProjectionPoints(DRONE_POINT_COUNT, 31, Math.floor(stars.length * .37));
const musicPoints = createUniverseProjectionPoints(MUSIC_POINT_COUNT, 23, Math.floor(stars.length * .61));

const state = {
  running: false,
  animationPaused: false,
  needsVisualFrame: true,
  depth: 1.32,
  volume: .4,
  beatBpm: HEART_BPM,
  binaural: binauralInput.checked,
  startedAt: performance.now() / 1000,
  layers: {
    universe: true,
    breath: true,
    beat: true,
    drone: true,
    music: true,
  },
  layerVolumes: {
    breath: 1,
    beat: .25,
    drone: 1.5,
    music: 1,
  },
  sourceFrequencies: {
    breath: 760,
    beat: 76,
    drone: 7.83,
    musicKick: 432,
    musicBackbeat: 864,
  },
  sourceVolumes: {
    musicKick: 1,
    musicBackbeat: 1,
  },
  sourceTempos: {
    musicKick: 1,
    musicBackbeat: .5,
  },
  eqOpen: false,
  eqTarget: "master",
  eq: Object.fromEntries(EQ_TARGETS.map((target) => [target, {
    trim: 0,
    gains: Object.fromEntries(bandsForTarget(target).map((band) => [band.id, 0])),
  }])),
  visual: {
    breath: 0,
    beat: 0,
    music: 0,
    musicAudio: 0,
    active: .32,
  },
  musicSession: null,
  audio: null,
  audioStartedAt: 0,
  audioNodes: null,
  heartScheduler: null,
  rendererMode: "canvas",
  three: null,
};

renderEqualizer();
syncControls();
statusEl.textContent = `Idle / ${stars.length.toLocaleString()} Gaia DR3 stars mapped`;
animateCanvas();
upgradeToThree();

function prepareStars(rawStars) {
  const radii = rawStars.map((star) => Math.hypot(star.x, star.y, star.z)).filter((radius) => radius > 0);
  const minRadius = Math.min(...radii, 0);
  const maxRadius = Math.max(...radii, 1);
  const logRange = Math.log1p(Math.max(1, maxRadius - minRadius));
  return rawStars.map((star, index) => {
    const rawRadius = Math.hypot(star.x, star.y, star.z) || 1;
    const distanceDepth = Math.log1p(Math.max(0, rawRadius - minRadius)) / logRange;
    const volumeRadius = UNIVERSE_INNER_RADIUS + Math.pow(clamp(distanceDepth, 0, 1), .72) * (UNIVERSE_OUTER_RADIUS - UNIVERSE_INNER_RADIUS);
    return {
      x: star.x / rawRadius * volumeRadius,
      y: star.y / rawRadius * volumeRadius,
      z: star.z / rawRadius * volumeRadius,
      mag: star.mag,
      ci: star.ci,
      phase: hashUnit(index * 19 + 7),
      brightness: clamp(1.24 - (star.mag + 1.5) / 8.8, .28, 1),
      size: clamp(1.9 - star.mag * .12, .55, 2.8),
    };
  });
}

async function upgradeToThree() {
  try {
    if (window.location.protocol === "file:") return;
    const THREE = await import("./vendor/three.module.min.js");
    state.three = createThreeRenderer(THREE);
    state.rendererMode = "three";
  } catch {
    state.rendererMode = "canvas";
  }
}

function createThreeRenderer(THREE) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const root = new THREE.Group();
  const texture = createThreePointTexture(THREE);
  const universe = createThreeStarLayer(THREE, texture);
  const breath = createThreeProceduralLayer(THREE, texture, breathPoints, HEART_RADIUS_SCALE, .015, BREATH_PEAK_OPACITY);
  const beat = createThreeProceduralLayer(THREE, texture, beatPoints, BEAT_VOLUME_SCALE, .015, .52);
  const drone = createThreeProceduralLayer(THREE, texture, dronePoints, DRONE_VOLUME_SCALE, .014, .2);
  const music = createThreeProceduralLayer(THREE, texture, musicPoints, MUSIC_VOLUME_SCALE, .018, .18);

  camera.position.z = 5.2;
  renderer.setClearColor(0x050505, 0);
  renderer.setPixelRatio(Math.max(1, Math.min(2, window.devicePixelRatio || 1)));
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.add(universe.points, music.points, breath.points, beat.points, drone.points);
  scene.add(root);

  return { THREE, scene, camera, renderer, root, universe, breath, beat, drone, music };
}

function createThreeStarLayer(THREE, texture) {
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);

  stars.forEach((star, index) => {
    const offset = index * 3;
    const color = starColor(star.ci);
    positions[offset] = star.x;
    positions[offset + 1] = star.y;
    positions[offset + 2] = star.z;
    colors[offset] = color.r * star.brightness;
    colors[offset + 1] = color.g * star.brightness;
    colors[offset + 2] = color.b * star.brightness;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: .034,
    map: texture,
    transparent: true,
    opacity: .92,
    alphaTest: .03,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return { points: new THREE.Points(geometry, material), material };
}

function createThreeProceduralLayer(THREE, texture, sourcePoints, radius, size, opacity) {
  const positions = new Float32Array(sourcePoints.length * 3);
  const basePositions = new Float32Array(sourcePoints.length * 3);
  const directions = new Float32Array(sourcePoints.length * 3);
  const phases = new Float32Array(sourcePoints.length);
  sourcePoints.forEach((point, index) => {
    const offset = index * 3;
    directions[offset] = point.nx;
    directions[offset + 1] = point.ny;
    directions[offset + 2] = point.nz;
    basePositions[offset] = point.x;
    basePositions[offset + 1] = point.y;
    basePositions[offset + 2] = point.z;
    positions[offset] = point.x * radius;
    positions[offset + 1] = point.y * radius;
    positions[offset + 2] = point.z * radius;
    phases[index] = point.phase;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xe8e5de,
    size,
    map: texture,
    transparent: true,
    opacity,
    alphaTest: .03,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return { points: new THREE.Points(geometry, material), geometry, material, basePositions, directions, phases, displacements: new Float32Array(sourcePoints.length) };
}

function createThreePointTexture(THREE) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 64;
  textureCanvas.height = 64;
  const textureCtx = textureCanvas.getContext("2d");
  const gradient = textureCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, "rgba(232, 229, 222, .94)");
  gradient.addColorStop(.58, "rgba(232, 229, 222, .72)");
  gradient.addColorStop(1, "rgba(232, 229, 222, 0)");
  textureCtx.fillStyle = gradient;
  textureCtx.beginPath();
  textureCtx.arc(32, 32, 30, 0, TWO_PI);
  textureCtx.fill();
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.needsUpdate = true;
  return texture;
}

function animateCanvas() {
  const now = performance.now() / 1000;
  const elapsed = now - state.startedAt;
  resizeCanvas();

  if (state.animationPaused && !state.needsVisualFrame) {
    window.requestAnimationFrame(animateCanvas);
    return;
  }
  state.needsVisualFrame = false;

  if (state.rendererMode === "three" && state.three) {
    drawThree(elapsed);
  } else {
    drawCanvas(elapsed);
  }

  window.requestAnimationFrame(animateCanvas);
}

function drawThree(elapsed) {
  const view = state.three;
  const width = window.innerWidth;
  const height = window.innerHeight;
  updateVisualState(elapsed);
  const active = state.visual.active;
  const breath = state.visual.breath;
  const beat = state.visual.beat;
  const music = state.visual.music;
  view.renderer.setSize(width, height, false);
  view.camera.aspect = width / Math.max(1, height);
  view.camera.updateProjectionMatrix();
  view.root.rotation.x += .00045 * active * VISUAL_ROTATION_SPEED;
  view.root.rotation.y += .00078 * active * VISUAL_ROTATION_SPEED;
  view.root.rotation.z += .00024 * active * VISUAL_ROTATION_SPEED;
  view.universe.points.visible = state.layers.universe;
  view.breath.points.visible = state.layers.breath;
  view.beat.points.visible = state.layers.beat;
  view.drone.points.visible = state.layers.drone;
  view.music.points.visible = state.layers.music;
  view.music.points.rotation.x += .00022 * active * VISUAL_ROTATION_SPEED;
  view.music.points.rotation.y -= .00028 * active * VISUAL_ROTATION_SPEED;
  view.music.points.rotation.z += .00012 * active * VISUAL_ROTATION_SPEED;
  view.universe.points.scale.setScalar(state.depth);
  view.universe.material.opacity = state.running ? .92 : .72;
  updateThreeMusicLayer(view.music, MUSIC_VOLUME_SCALE, music, elapsed, active);
  updateThreeProceduralLayer(view.breath, breathRadiusScale(breath), state.running ? .024 : 0, breathOpacity(breath));
  updateThreeHeartLayer(view.beat, BEAT_VOLUME_SCALE, beat, state.running);
  updateThreeDroneLayer(view.drone, DRONE_VOLUME_SCALE, state.running ? audioElapsed(elapsed) : elapsed, state.running ? .007 : 0);
  view.renderer.render(view.scene, view.camera);
}

function updateThreeProceduralLayer(layer, scale, waveHeight, opacity) {
  const positions = layer.geometry.attributes.position.array;
  const now = performance.now() * .00032;
  for (let index = 0; index < layer.phases.length; index += 1) {
    const offset = index * 3;
    const nx = layer.directions[offset];
    const ny = layer.directions[offset + 1];
    const nz = layer.directions[offset + 2];
    const wave = Math.sin(layer.phases[index] * TWO_PI + now);
    positions[offset] = layer.basePositions[offset] * scale + nx * wave * waveHeight;
    positions[offset + 1] = layer.basePositions[offset + 1] * scale + ny * wave * waveHeight;
    positions[offset + 2] = layer.basePositions[offset + 2] * scale + nz * wave * waveHeight;
  }
  layer.material.opacity = opacity;
  layer.geometry.attributes.position.needsUpdate = true;
}

function updateThreeMusicLayer(layer, scale, energy, elapsed, active) {
  const positions = layer.geometry.attributes.position.array;
  const samples = musicWaveformSamples();
  for (let index = 0; index < layer.phases.length; index += 1) {
    const offset = index * 3;
    const nx = layer.directions[offset];
    const ny = layer.directions[offset + 1];
    const nz = layer.directions[offset + 2];
    const sample = musicSampleAt(samples, nx, ny, nz);
    const target = sample * (.078 + energy * .034) * active;
    const displacement = lerp(layer.displacements[index] || 0, target, .078);
    layer.displacements[index] = displacement;
    positions[offset] = layer.basePositions[offset] * scale + nx * displacement;
    positions[offset + 1] = layer.basePositions[offset + 1] * scale + ny * displacement;
    positions[offset + 2] = layer.basePositions[offset + 2] * scale + nz * displacement;
  }
  layer.material.opacity = .42 + energy * .3;
  layer.material.size = .02 + energy * .011;
  layer.geometry.attributes.position.needsUpdate = true;
}

function updateThreeHeartLayer(layer, scale, beat, animateSurface) {
  const positions = layer.geometry.attributes.position.array;
  const now = performance.now() * .00012;
  const pulseScale = scale * (1 + beat * .06);
  for (let index = 0; index < layer.phases.length; index += 1) {
    const offset = index * 3;
    const nx = layer.directions[offset];
    const ny = layer.directions[offset + 1];
    const nz = layer.directions[offset + 2];
    const surfaceNoise = animateSurface ? Math.sin(layer.phases[index] * TWO_PI + now) * .006 * beat : 0;
    positions[offset] = layer.basePositions[offset] * pulseScale + nx * surfaceNoise;
    positions[offset + 1] = layer.basePositions[offset + 1] * pulseScale + ny * surfaceNoise;
    positions[offset + 2] = layer.basePositions[offset + 2] * pulseScale + nz * surfaceNoise;
  }
  layer.material.opacity = .44;
  layer.material.size = .015;
  layer.geometry.attributes.position.needsUpdate = true;
}

function updateThreeDroneLayer(layer, scale, elapsed, waveHeight) {
  const positions = layer.geometry.attributes.position.array;
  const frequencies = droneFrequencies();
  for (let index = 0; index < layer.phases.length; index += 1) {
    const offset = index * 3;
    const nx = layer.directions[offset];
    const ny = layer.directions[offset + 1];
    const nz = layer.directions[offset + 2];
    const phase = layer.phases[index] * TWO_PI;
    const t = elapsed + phase / TWO_PI;
    const carrier = sine(frequencies.left, t);
    const modulation = .65 + .35 * sine(frequencies.modulation, t);
    const signal = carrier * modulation;
    positions[offset] = layer.basePositions[offset] * scale + nx * signal * waveHeight;
    positions[offset + 1] = layer.basePositions[offset + 1] * scale + ny * signal * waveHeight;
    positions[offset + 2] = layer.basePositions[offset + 2] * scale + nz * signal * waveHeight;
  }
  layer.material.opacity = .2;
  layer.geometry.attributes.position.needsUpdate = true;
}

function drawCanvas(elapsed) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scale = Math.min(width, height) * .315 * state.depth;
  updateVisualState(elapsed);
  const active = state.visual.active;
  const rotationY = elapsed * .078 * active * VISUAL_ROTATION_SPEED + .42;
  const rotationX = elapsed * .04 * active * VISUAL_ROTATION_SPEED - .18;
  const breath = state.visual.breath;
  const beat = state.visual.beat;
  const music = state.visual.music;

  ctx.clearRect(0, 0, width, height);
  if (state.layers.universe) drawCanvasStars({ width, height, scale, rotationX, rotationY });
  if (state.layers.music) drawCanvasMusicPoints(musicPoints, MUSIC_VOLUME_SCALE, 1.06, rotationX * .82, rotationY * 1.12, .34 + music * .22, music, elapsed);
  if (state.layers.breath) drawCanvasSpherePoints(breathPoints, breathRadiusScale(breath), .74, rotationX, rotationY, breathOpacity(breath), state.running ? .025 : 0);
  if (state.layers.beat) drawCanvasSpherePoints(beatPoints, BEAT_VOLUME_SCALE * (1 + beat * .06), .74, rotationX * .9, rotationY * 1.08, .44, state.running ? .006 * beat : 0);
  if (state.layers.drone) drawCanvasDronePoints(dronePoints, DRONE_VOLUME_SCALE, .9, rotationX * 1.1, rotationY * .82, .16, state.running ? audioElapsed(elapsed) : elapsed);
}

function updateVisualState(elapsed) {
  const clock = state.running ? audioElapsed(elapsed) : elapsed;
  const targetBreath = state.running ? boxBreath(clock, BREATH_SIDE_SECONDS) : 0;
  const targetBeat = state.running ? beatEnvelope(clock, state.beatBpm) : 0;
  const targetMusic = state.running ? musicEnvelope(clock) : 0;
  const targetMusicAudio = state.running ? musicAudioEnvelope() : 0;
  const targetActive = state.running ? 1 : .32;
  state.visual.breath = state.running ? targetBreath : state.visual.breath + (targetBreath - state.visual.breath) * .055 * VISUAL_RESPONSE_SPEED;
  state.visual.beat += (targetBeat - state.visual.beat) * .34 * VISUAL_RESPONSE_SPEED;
  state.visual.music += (targetMusic - state.visual.music) * .08 * VISUAL_RESPONSE_SPEED;
  state.visual.musicAudio += (targetMusicAudio - state.visual.musicAudio) * .035 * VISUAL_RESPONSE_SPEED;
  state.visual.active += (targetActive - state.visual.active) * .045 * VISUAL_RESPONSE_SPEED;
}

function breathRadiusScale(breath) {
  return BREATH_MIN_RADIUS_SCALE + (HEART_RADIUS_SCALE - BREATH_MIN_RADIUS_SCALE) * breath;
}

function breathOpacity(breath) {
  return BREATH_REST_OPACITY + (BREATH_PEAK_OPACITY - BREATH_REST_OPACITY) * breath;
}

function drawCanvasStars({ width, height, scale, rotationX, rotationY }) {
  const projected = stars.map((star) => {
    const point = rotatePoint(star, rotationX, rotationY);
    const perspective = 2.7 / (2.7 + point.z);
    return {
      x: width / 2 + point.x * scale * perspective,
      y: height / 2 + point.y * scale * perspective,
      z: point.z,
      size: star.size * perspective,
      alpha: clamp((point.z + 2.4) / 4.8, .18, .9) * star.brightness,
    };
  }).sort((a, b) => a.z - b.z);

  for (const point of projected) {
    ctx.fillStyle = `rgba(${TRACE_RGB}, ${point.alpha * .9})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.size, 0, TWO_PI);
    ctx.fill();
  }
}

function drawCanvasSpherePoints(points, radiusScale, scaleFactor, rotationX, rotationY, alpha, waveHeight = .025) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scale = Math.min(width, height) * .315 * state.depth * scaleFactor;
  ctx.fillStyle = `rgba(${TRACE_RGB}, ${alpha})`;
  for (const source of points) {
    const wave = Math.sin(source.phase * TWO_PI + performance.now() * .00032) * waveHeight;
    const point = rotatePoint({
      x: source.x * radiusScale + source.nx * wave,
      y: source.y * radiusScale + source.ny * wave,
      z: source.z * radiusScale + source.nz * wave,
    }, rotationX, rotationY);
    const perspective = 2.6 / (2.6 + point.z);
    ctx.beginPath();
    ctx.arc(width / 2 + point.x * scale * perspective, height / 2 + point.y * scale * perspective, Math.max(.45, .9 * perspective), 0, TWO_PI);
    ctx.fill();
  }
}

function drawCanvasMusicPoints(points, radiusScale, scaleFactor, rotationX, rotationY, alpha, energy, elapsed) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scale = Math.min(width, height) * .315 * state.depth * scaleFactor;
  const samples = musicWaveformSamples();
  void elapsed;
  const movement = state.visual.musicAudio || energy;
  ctx.fillStyle = `rgba(${TRACE_RGB}, ${alpha})`;
  for (const source of points) {
    const wave = musicSampleAt(samples, source.nx, source.ny, source.nz) * (.052 + movement * .022);
    const point = rotatePoint({
      x: source.x * radiusScale + source.nx * wave,
      y: source.y * radiusScale + source.ny * wave,
      z: source.z * radiusScale + source.nz * wave,
    }, rotationX, rotationY);
    const perspective = 2.6 / (2.6 + point.z);
    ctx.beginPath();
    ctx.arc(width / 2 + point.x * scale * perspective, height / 2 + point.y * scale * perspective, Math.max(.45, .9 * perspective), 0, TWO_PI);
    ctx.fill();
  }
}

function drawCanvasDronePoints(points, radiusScale, scaleFactor, rotationX, rotationY, alpha, elapsed) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scale = Math.min(width, height) * .315 * state.depth * scaleFactor;
  const frequencies = droneFrequencies();
  const waveHeight = state.running ? .004 : 0;
  ctx.fillStyle = `rgba(${TRACE_RGB}, ${alpha})`;
  for (const source of points) {
    const t = elapsed + source.phase;
    const carrier = sine(frequencies.left, t);
    const modulation = .65 + .35 * sine(frequencies.modulation, t);
    const signal = carrier * modulation;
    const point = rotatePoint({
      x: source.x * radiusScale + source.nx * signal * waveHeight,
      y: source.y * radiusScale + source.ny * signal * waveHeight,
      z: source.z * radiusScale + source.nz * signal * waveHeight,
    }, rotationX, rotationY);
    const perspective = 2.6 / (2.6 + point.z);
    ctx.beginPath();
    ctx.arc(width / 2 + point.x * scale * perspective, height / 2 + point.y * scale * perspective, Math.max(.45, .9 * perspective), 0, TWO_PI);
    ctx.fill();
  }
}

function rotatePoint(point, rotationX, rotationY) {
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const x1 = point.x * cosY - point.z * sinY;
  const z1 = point.x * sinY + point.z * cosY;
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  return {
    x: x1,
    y: point.y * cosX - z1 * sinX,
    z: point.y * sinX + z1 * cosX,
  };
}

function createSpherePoints(count, seedOffset) {
  return Array.from({ length: count }, (_, index) => {
    const point = seededSpherePoint(index + seedOffset);
    return { ...point, nx: point.x, ny: point.y, nz: point.z, phase: hashUnit(index * 13 + seedOffset) };
  });
}

function createUniverseProjectionPoints(count, strideSeed, offsetSeed = 0) {
  if (!stars.length) return createSpherePoints(count, strideSeed * 1000);
  return Array.from({ length: count }, (_, index) => {
    const source = stars[(offsetSeed + index * strideSeed) % stars.length];
    const length = Math.hypot(source.x, source.y, source.z) || 1;
    return {
      x: source.x,
      y: source.y,
      z: source.z,
      nx: source.x / length,
      ny: source.y / length,
      nz: source.z / length,
      phase: source.phase,
    };
  });
}

function resizeCanvas() {
  const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = Math.floor(window.innerWidth * pixelRatio);
  const height = Math.floor(window.innerHeight * pixelRatio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function boxBreath(elapsed, sideSeconds) {
  const cycle = sideSeconds * 4;
  const t = positiveModulo(elapsed, cycle);
  if (t < sideSeconds) return breathMotionEase(t / sideSeconds);
  if (t < sideSeconds * 2) return 1;
  if (t < sideSeconds * 3) return 1 - breathMotionEase((t - sideSeconds * 2) / sideSeconds);
  return 0;
}

function breathMotionEase(value) {
  return .5 - Math.cos(Math.PI * clamp(value, 0, 1)) * .5;
}

function beatEnvelope(elapsed, bpm) {
  const secondsPerBeat = heartBeatInterval(bpm);
  const phase = positiveModulo(elapsed, secondsPerBeat) / secondsPerBeat;
  const lub = Math.exp(-Math.pow((phase - .045) / .038, 2));
  const dub = Math.exp(-Math.pow((phase - .18) / .052, 2)) * .42;
  return clamp(lub + dub, 0, 1);
}

function heartBeatInterval(bpm) {
  return 60 / Math.max(1, bpm);
}

function musicGridInterval() {
  return BREATH_CYCLE_SECONDS / MUSIC_GRID_STEPS;
}

function musicEnvelope(elapsed) {
  const phrase = positiveModulo(elapsed, MUSIC_PHRASE_SECONDS);
  const phraseSwell = .5 + .5 * Math.sin(TWO_PI * phrase / MUSIC_PHRASE_SECONDS - Math.PI / 2);
  const stepInterval = musicGridInterval();
  const step = positiveModulo(phrase, stepInterval) / stepInterval;
  const pulse = Math.exp(-step * 2.6);
  return clamp(.2 + phraseSwell * .36 + pulse * .14, 0, 1);
}

function renderEqualizer() {
  eqBandsEl.innerHTML = "";
  const settings = currentEqSettings();
  const bands = bandsForTarget(state.eqTarget);
  eqBandsEl.style.setProperty("--eq-band-count", String(bands.length));
  bands.forEach((band) => {
    const label = document.createElement("label");
    const name = document.createElement("span");
    const gain = document.createElement("input");
    const fader = document.createElement("i");
    const output = document.createElement("output");
    const gainValue = settings.gains[band.id] || 0;
    label.className = "eq-band";
    label.style.setProperty("--eq-pos", String(eqGainPosition(gainValue)));
    name.textContent = `${band.label}`;
    fader.className = "eq-fader";
    fader.setAttribute("aria-hidden", "true");
    gain.className = "eq-gain";
    gain.type = "range";
    gain.min = "-12";
    gain.max = "12";
    gain.step = ".5";
    gain.value = String(gainValue);
    gain.dataset.eqBand = band.id;
    gain.setAttribute("aria-label", `${band.label} Hz gain`);
    output.value = "0 dB";
    label.append(name, fader, gain, output);
    eqBandsEl.append(label);
  });
}

function syncControls() {
  startButton.textContent = state.running ? "Stop" : "Start";
  startButton.classList.toggle("active", state.running);
  animationToggleButton.textContent = state.animationPaused ? "Resume animation" : "Pause animation";
  animationToggleButton.classList.toggle("active", state.animationPaused);
  animationToggleButton.setAttribute("aria-pressed", String(state.animationPaused));
  eqToggleButton.classList.toggle("active", state.eqOpen);
  eqToggleButton.setAttribute("aria-expanded", String(state.eqOpen));
  equalizerPanel.hidden = !state.eqOpen;
  eqTargetInput.value = state.eqTarget;
  binauralInput.checked = state.binaural;
  syncLayerLabels();
  syncVolumeControls();

  layerToggleInputs.forEach((input) => {
    const layerId = input.dataset.layer;
    input.checked = Boolean(state.layers[layerId]);
    const control = document.querySelector(`[data-layer-control="${layerId}"]`);
    if (control) control.classList.toggle("disabled", !state.layers[layerId]);
  });

  const settings = currentEqSettings();
  eqTrimInput.value = String(settings.trim);
  eqTrimOutput.value = formatDb(settings.trim);
  syncTuneControls();
  document.querySelectorAll("[data-eq-band]").forEach((input) => {
    const gain = settings.gains[input.dataset.eqBand] || 0;
    input.value = String(gain);
    input.closest(".eq-band")?.style.setProperty("--eq-pos", String(eqGainPosition(gain)));
    input.nextElementSibling.value = formatDb(gain);
  });
  state.needsVisualFrame = true;
}

function syncLayerLabels() {
  breathLabel.textContent = `${formatHz(state.sourceFrequencies.breath)} / ${boxBreathLabel()}`;
  beatLabel.textContent = `${state.beatBpm} bpm / ${formatHz(state.sourceFrequencies.beat)}`;
  droneLabel.textContent = `${formatHz(DRONE_TONE_FREQUENCY)} / ${formatHz(state.sourceFrequencies.drone)} mod`;
  musicLabel.textContent = `7 bowls / ${formatHz(state.sourceFrequencies.musicKick)} center`;
}

function currentEqSettings() {
  return state.eq[state.eqTarget] || state.eq.master;
}

function bandsForTarget(target) {
  return EQ_TARGET_BANDS[target] || EQ_BANDS;
}

function sourceTargetForEq(target) {
  if (target === "master" || target === "music") return null;
  return target;
}

function sourceFrequencyConfig(target) {
  return {
    breath: { min: 80, max: 5000, step: 1 },
    beat: { min: 30, max: 180, step: 1 },
    drone: { min: 1, max: 40, step: .01 },
    musicKick: { min: 174, max: 963, step: 1 },
    musicBackbeat: { min: 220, max: 2000, step: 1 },
  }[target] || { min: 20, max: 5000, step: 1 };
}

function sourceVolumeConfig() {
  return { min: 0, max: 2, step: .01 };
}

function sourceTempoOptions() {
  return [.25, .5, .75, 1, 1.25, 1.5, 1.75, 2];
}

function tuneControlsForTarget(target) {
  if (target === "music") {
    return [
      { key: "musicKick", label: "Bowl" },
      { key: "musicBackbeat", label: "Space" },
    ];
  }
  const source = sourceTargetForEq(target);
  return source ? [{ key: source, label: "Tune" }] : [];
}

function syncTuneControls() {
  const controls = tuneControlsForTarget(state.eqTarget);
  eqSourceRow.hidden = controls.length !== 1;
  eqSourceList.hidden = controls.length <= 1;
  eqSourceList.dataset.target = state.eqTarget;
  eqSourceList.innerHTML = "";
  if (controls.length === 1) {
    const key = controls[0].key;
    const config = sourceFrequencyConfig(key);
    eqSourceInput.min = String(config.min);
    eqSourceInput.max = String(config.max);
    eqSourceInput.step = String(config.step);
    eqSourceInput.value = String(state.sourceFrequencies[key]);
    eqSourceOutput.value = "Hz";
    return;
  }
  controls.forEach((control) => {
    const config = sourceFrequencyConfig(control.key);
    const volumeConfig = sourceVolumeConfig();
    const label = document.createElement("label");
    const name = document.createElement("span");
    const input = document.createElement("input");
    const unit = document.createElement("output");
    const volume = document.createElement("input");
    const volumeOutput = document.createElement("output");
    const tempo = document.createElement("select");
    label.className = control.tempo === false ? "without-tempo" : "with-tempo";
    name.textContent = control.label;
    input.type = "number";
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(state.sourceFrequencies[control.key]);
    input.dataset.sourceFrequency = control.key;
    unit.value = "Hz";
    volume.type = "range";
    volume.min = String(volumeConfig.min);
    volume.max = String(volumeConfig.max);
    volume.step = String(volumeConfig.step);
    volume.value = String(state.sourceVolumes[control.key] ?? 1);
    volume.dataset.sourceVolume = control.key;
    volumeOutput.value = formatVolume(state.sourceVolumes[control.key] ?? 1);
    label.append(name, input, unit, volume, volumeOutput);
    if (control.tempo !== false) {
      sourceTempoOptions().forEach((option) => {
        const item = document.createElement("option");
        item.value = String(option);
        item.textContent = `${option}x`;
        item.selected = option === (state.sourceTempos[control.key] ?? 1);
        tempo.append(item);
      });
      tempo.dataset.sourceTempo = control.key;
      tempo.setAttribute("aria-label", `${control.label} tempo`);
      tempo.value = String(state.sourceTempos[control.key] ?? 1);
      label.append(tempo);
    }
    eqSourceList.append(label);
  });
}

function syncVolumeControls() {
  const target = state.eqTarget === "master" ? null : state.eqTarget;
  const max = target ? 2 : .8;
  const value = target ? state.layerVolumes[target] : state.volume;
  eqVolumeLabel.textContent = target ? "Volume" : "Master";
  volumeInput.max = String(max);
  volumeInput.step = ".01";
  volumeInput.value = String(value);
  eqVolumeOutput.value = target ? formatVolume(value) : `${Math.round(value / max * 100)}%`;
}

function applySourceFrequencyInput(key, value) {
  if (!key) return;
  if (value === "") return;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return;
  const config = sourceFrequencyConfig(key);
  state.sourceFrequencies[key] = clamp(numericValue, config.min, config.max);
  updateAudio();
  syncLayerLabels();
}

function commitSourceFrequencyInput(input, key) {
  if (!key) return;
  if (input.value === "") {
    input.value = String(state.sourceFrequencies[key]);
    return;
  }
  applySourceFrequencyInput(key, input.value);
  input.value = String(state.sourceFrequencies[key]);
}

function applySourceVolumeInput(key, value) {
  if (!key) return;
  const config = sourceVolumeConfig();
  state.sourceVolumes[key] = clamp(Number(value) || 0, config.min, config.max);
  updateAudio();
}

function applySourceTempoInput(key, value) {
  if (!key) return;
  const tempo = Number(value);
  state.sourceTempos[key] = sourceTempoOptions().includes(tempo) ? tempo : 1;
  syncLayerLabels();
  if (!state.audioNodes) return;
  if (key === "musicKick" || key === "musicBackbeat") state.audioNodes.nextMusicStepAt = 0;
}

function exportSoundSettings() {
  const settings = {
    app: "ufo-files/meditation",
    schema: 1,
    exportedAt: new Date().toISOString(),
    transport: {
      bpm: state.beatBpm,
      boxBreathSeconds: BREATH_SIDE_SECONDS,
      binaural: state.binaural,
    },
    master: {
      volume: state.volume,
      eq: cloneEqSettings(state.eq.master),
    },
    layers: {
      breath: {
        enabled: state.layers.breath,
        volume: state.layerVolumes.breath,
        frequencyHz: state.sourceFrequencies.breath,
        eq: cloneEqSettings(state.eq.breath),
      },
      heartbeat: {
        enabled: state.layers.beat,
        volume: state.layerVolumes.beat,
        frequencyHz: state.sourceFrequencies.beat,
        eq: cloneEqSettings(state.eq.beat),
      },
      drone: {
        enabled: state.layers.drone,
        volume: state.layerVolumes.drone,
        baseFrequencyHz: DRONE_TONE_FREQUENCY,
        modulationHz: state.sourceFrequencies.drone,
        eq: cloneEqSettings(state.eq.drone),
      },
      music: {
        enabled: state.layers.music,
        volume: state.layerVolumes.music,
        sources: {
          bowl: {
            frequencyHz: state.sourceFrequencies.musicKick,
            volume: state.sourceVolumes.musicKick,
            tempo: state.sourceTempos.musicKick,
          },
          space: {
            frequencyHz: state.sourceFrequencies.musicBackbeat,
            volume: state.sourceVolumes.musicBackbeat,
            tempo: state.sourceTempos.musicBackbeat,
          },
        },
        eq: cloneEqSettings(state.eq.music),
      },
    },
  };
  const blob = new Blob([`${JSON.stringify(settings, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `meditation-sound-settings-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function cloneEqSettings(settings) {
  return {
    trim: settings?.trim || 0,
    gains: { ...(settings?.gains || {}) },
  };
}

function formatDb(value) {
  return `${value > 0 ? "+" : ""}${value} dB`;
}

function formatHz(value) {
  const rounded = Math.round(value * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)} Hz`;
}

function boxBreathLabel() {
  return Array.from({ length: 4 }, () => BREATH_SIDE_SECONDS).join("-");
}

function formatCompactHz(value) {
  const numericValue = Number(value) || 0;
  if (numericValue >= 1000) {
    const khz = Math.round(numericValue / 100) / 10;
    return `${Number.isInteger(khz) ? khz : khz.toFixed(1)}k`;
  }
  return formatHz(numericValue);
}

function formatTempo(value) {
  const rounded = Math.round((Number(value) || 1) * 100) / 100;
  return `${String(rounded).replace(/^0\./, ".")}x`;
}

function formatVolume(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function eqGainPosition(gain) {
  return clamp((gain + 12) / 24, 0, 1);
}

async function toggleSession() {
  state.running = !state.running;
  state.startedAt = performance.now() / 1000;
  statusEl.textContent = state.running ? "Active / universe meditation" : `Idle / ${stars.length.toLocaleString()} Gaia DR3 stars mapped`;
  syncControls();
  if (state.running) {
    try {
      await startAudio();
    } catch (error) {
      state.running = false;
      statusEl.textContent = error.message || "Audio unavailable";
      syncControls();
    }
  } else {
    stopAudio();
  }
}

async function startAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    statusEl.textContent = "Audio unavailable";
    return;
  }
  if (!state.audio) {
    const audio = new AudioContext();
    const master = audio.createGain();
    const eqNodes = createEqualizerNodes(audio);
    const merger = audio.createChannelMerger(2);
    const leftDrone = audio.createOscillator();
    const rightDrone = audio.createOscillator();
    const leftGain = audio.createGain();
    const rightGain = audio.createGain();
    const droneModulator = audio.createOscillator();
    const droneModDepth = audio.createGain();
    const droneModGain = audio.createGain();
    const droneGain = audio.createGain();
    const heartGain = audio.createGain();
    const breathGain = audio.createGain();
    const breathHighpass = audio.createBiquadFilter();
    const breathLowpass = audio.createBiquadFilter();
    const musicGain = audio.createGain();
    const musicFilter = audio.createBiquadFilter();
    const musicLimiter = audio.createDynamicsCompressor();
    const musicOutputFilter = audio.createBiquadFilter();
    const musicSpaceDelay = audio.createDelay(1.2);
    const musicSpaceFeedback = audio.createGain();
    const musicSpaceFilter = audio.createBiquadFilter();
    const musicSpaceGain = audio.createGain();
    const musicAnalyserGain = audio.createGain();
    const musicAnalyser = audio.createAnalyser();
    let breathSource = null;
    leftDrone.type = "sine";
    rightDrone.type = "sine";
    droneModulator.type = "sine";
    breathGain.gain.value = 0;
    breathHighpass.type = "highpass";
    breathHighpass.frequency.value = 320;
    breathHighpass.Q.value = .35;
    breathLowpass.type = "lowpass";
    breathLowpass.frequency.value = 1600;
    breathLowpass.Q.value = .3;
    droneGain.gain.value = state.layers.drone ? DRONE_BASE_GAIN * state.layerVolumes.drone : 0;
    heartGain.gain.value = state.layers.beat ? HEART_BASE_GAIN * state.layerVolumes.beat : 0;
    musicGain.gain.value = 0;
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = 1800;
    musicFilter.Q.value = .22;
    musicLimiter.threshold.value = -18;
    musicLimiter.knee.value = 14;
    musicLimiter.ratio.value = 6;
    musicLimiter.attack.value = .006;
    musicLimiter.release.value = .18;
    musicOutputFilter.type = "lowpass";
    musicOutputFilter.frequency.value = 4200;
    musicOutputFilter.Q.value = .18;
    musicSpaceDelay.delayTime.value = .34;
    musicSpaceFeedback.gain.value = .24;
    musicSpaceFilter.type = "lowpass";
    musicSpaceFilter.frequency.value = 1800;
    musicSpaceFilter.Q.value = .15;
    musicSpaceGain.gain.value = .34;
    musicAnalyserGain.gain.value = MUSIC_VISUAL_SIGNAL_GAIN;
    musicAnalyser.fftSize = 1024;
    musicAnalyser.smoothingTimeConstant = .42;
    leftGain.gain.value = 1;
    rightGain.gain.value = 1;
    droneModulator.frequency.value = state.sourceFrequencies.drone;
    droneModDepth.gain.value = .35;
    droneModGain.gain.value = .65;
    leftDrone.connect(leftGain).connect(merger, 0, 0);
    rightDrone.connect(rightGain).connect(merger, 0, 1);
    droneModulator.connect(droneModDepth).connect(droneModGain.gain);
    merger.connect(droneModGain).connect(droneGain);
    connectEqualizerChain(droneGain, eqNodes.drone.filters, eqNodes.drone.trimGain);
    eqNodes.drone.trimGain.connect(master);
    connectEqualizerChain(heartGain, eqNodes.beat.filters, eqNodes.beat.trimGain);
    eqNodes.beat.trimGain.connect(master);
    musicFilter.connect(musicGain);
    musicGain.connect(musicLimiter).connect(musicOutputFilter);
    musicSpaceDelay.connect(musicSpaceFeedback).connect(musicSpaceDelay);
    musicSpaceDelay.connect(musicSpaceFilter).connect(musicSpaceGain).connect(musicFilter);
    connectEqualizerChain(musicOutputFilter, eqNodes.music.filters, eqNodes.music.trimGain);
    eqNodes.music.trimGain.connect(master);
    eqNodes.music.trimGain.connect(musicAnalyserGain).connect(musicAnalyser);
    if (audio.audioWorklet) {
      try {
        await audio.audioWorklet.addModule(`audio-worklet.js?v=${AUDIO_WORKLET_VERSION}`);
        breathSource = new AudioWorkletNode(audio, "meditation-breath-processor", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        breathSource.connect(breathHighpass).connect(breathLowpass).connect(breathGain);
        connectEqualizerChain(breathGain, eqNodes.breath.filters, eqNodes.breath.trimGain);
        eqNodes.breath.trimGain.connect(master);
      } catch (error) {
        console.error("Breath worklet failed", error);
      }
    }
    connectEqualizerChain(master, eqNodes.master.filters, eqNodes.master.trimGain);
    eqNodes.master.trimGain.connect(audio.destination);
    master.gain.value = 0;
    leftDrone.start();
    rightDrone.start();
    droneModulator.start();
    state.audio = audio;
    state.audioNodes = {
      master,
      eqNodes,
      droneGain,
      heartGain,
      breathGain,
      breathHighpass,
      breathLowpass,
      breathSource,
      leftDrone,
      rightDrone,
      droneModulator,
      musicGain,
      musicLimiter,
      musicFilter,
      musicOutputFilter,
      musicSpaceDelay,
      musicAnalyserGain,
      musicAnalyser,
      musicWaveformData: new Float32Array(musicAnalyser.fftSize),
      nextHeartBeatAt: 0,
      nextMusicStepAt: 0,
    };
  }
  if (state.audio.state === "suspended") await state.audio.resume();
  state.startedAt = performance.now() / 1000;
  state.audioStartedAt = state.audio.currentTime;
  state.audioNodes.nextHeartBeatAt = 0;
  state.audioNodes.nextMusicStepAt = 0;
  state.musicSession = createMusicSession(state.beatBpm);
  applyMusicSession(state.audio.currentTime);
  if (state.audioNodes.breathSource) {
    state.audioNodes.breathSource.port.postMessage({
      type: "start",
      enabled: state.layers.breath,
      cycleSeconds: BREATH_CYCLE_SECONDS,
      startedAt: state.audioStartedAt,
      airHz: state.sourceFrequencies.breath,
    });
  }
  updateAudio();
  if (!state.heartScheduler) {
    state.heartScheduler = window.setInterval(() => {
      if (!state.audio || !state.running) return;
      updateBreathAudio(state.audio.currentTime);
      scheduleHeartBeats(state.audio.currentTime);
      scheduleMusic(state.audio.currentTime);
    }, 50);
  }
}

function updateAudio() {
  if (!state.audioNodes || !state.audio) return;
  const now = state.audio.currentTime;
  const frequencies = droneFrequencies();
  state.audioNodes.leftDrone.frequency.setTargetAtTime(frequencies.left, now, .08);
  state.audioNodes.rightDrone.frequency.setTargetAtTime(frequencies.right, now, .08);
  state.audioNodes.droneModulator.frequency.setTargetAtTime(frequencies.modulation, now, .08);
  state.audioNodes.droneGain.gain.setTargetAtTime(state.layers.drone && state.running ? DRONE_BASE_GAIN * state.layerVolumes.drone : 0, now, .12);
  state.audioNodes.heartGain.gain.setTargetAtTime(state.layers.beat && state.running ? HEART_BASE_GAIN * state.layerVolumes.beat : 0, now, .12);
  state.audioNodes.musicGain.gain.setTargetAtTime(state.layers.music && state.running ? MUSIC_BASE_GAIN * state.layerVolumes.music : 0, now, .18);
  state.audioNodes.musicFilter.frequency.setTargetAtTime(state.layers.music && state.running ? (state.musicSession?.filterHz || 860) : 520, now, .4);
  state.audioNodes.musicOutputFilter.frequency.setTargetAtTime(state.layers.music && state.running ? 4200 : 420, now, .35);
  state.audioNodes.master.gain.setTargetAtTime(state.running ? state.volume : 0, now, .08);
  if (state.audioNodes.breathSource) {
    state.audioNodes.breathSource.port.postMessage({
      type: "state",
      playing: state.running,
      enabled: state.layers.breath,
      cycleSeconds: BREATH_CYCLE_SECONDS,
      airHz: state.sourceFrequencies.breath,
    });
  }
  updateBreathAudio(now);
  updateEqualizer(now);
  scheduleHeartBeats(now);
  scheduleMusic(now);
}

function connectEqualizerChain(source, filters, destination) {
  if (!filters.length) {
    source.connect(destination);
    return;
  }
  source.connect(filters[0]);
  filters.forEach((filter, index) => {
    filter.connect(filters[index + 1] || destination);
  });
}

function createEqualizerNodes(audio) {
  return Object.fromEntries(EQ_TARGETS.map((target) => {
    const settings = state.eq[target];
    const filters = bandsForTarget(target).map((band) => {
      const filter = audio.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = band.frequency;
      filter.Q.value = band.q;
      filter.gain.value = settings.gains[band.id] || 0;
      return filter;
    });
    const trimGain = audio.createGain();
    trimGain.gain.value = dbToGain(settings.trim);
    return [target, { filters, trimGain }];
  }));
}

function updateEqualizer(now) {
  const eqNodes = state.audioNodes?.eqNodes;
  if (!eqNodes) return;
  EQ_TARGETS.forEach((target) => {
    const settings = state.eq[target];
    const node = eqNodes[target];
    if (!settings || !node) return;
    node.filters.forEach((filter, index) => {
      const band = bandsForTarget(target)[index];
      filter.gain.setTargetAtTime(settings.gains[band.id] || 0, now, .035);
    });
    node.trimGain.gain.setTargetAtTime(dbToGain(settings.trim), now, .035);
  });
}

function dbToGain(db) {
  return Math.pow(10, db / 20);
}

function updateBreathAudio(now) {
  if (!state.audio || !state.audioNodes) return;
  const target = state.layers.breath && state.running ? BREATH_BASE_GAIN * state.layerVolumes.breath : 0;
  state.audioNodes.breathGain.gain.setTargetAtTime(target, now, .08);
}

function droneFrequencies() {
  return {
    left: DRONE_TONE_FREQUENCY,
    right: DRONE_TONE_FREQUENCY,
    modulation: state.sourceFrequencies.drone,
  };
}

function audioElapsed(fallbackElapsed) {
  if (!state.audio) return fallbackElapsed;
  return Math.max(0, state.audio.currentTime - state.audioStartedAt);
}

function musicWaveformSamples() {
  const nodes = state.audioNodes;
  if (!nodes?.musicAnalyser || !nodes.musicWaveformData || !state.running || !state.layers.music) return null;
  nodes.musicAnalyser.getFloatTimeDomainData(nodes.musicWaveformData);
  return nodes.musicWaveformData;
}

function musicAudioEnvelope() {
  const samples = musicWaveformSamples();
  if (!samples?.length) return 0;
  let sum = 0;
  for (let index = 0; index < samples.length; index += 8) {
    const sample = samples[index] || 0;
    sum += sample * sample;
  }
  return clamp(Math.sqrt(sum / Math.ceil(samples.length / 8)) * 5.2, 0, 1);
}

function musicSampleAt(samples, nx, ny, nz) {
  if (!samples?.length) return 0;
  const longitude = Math.atan2(nz, nx) / TWO_PI + .5;
  const latitudeOffset = (ny + 1) * .035;
  const direction = positiveModulo(longitude + latitudeOffset, 1);
  const exactIndex = direction * (samples.length - 1);
  const index = Math.floor(exactIndex);
  const fraction = exactIndex - index;
  const next = Math.min(samples.length - 1, index + 1);
  const sample = lerp(samples[index] || 0, samples[next] || 0, fraction);
  return clamp(sample, -.9, .9);
}

function sine(frequency, t) {
  return Math.sin(TWO_PI * frequency * t);
}

function createMusicSession(bpm, seed = createSessionSeed()) {
  const random = mulberry32(seed + Math.round(bpm * 1000));
  return {
    seed,
    filterHz: 2600 + random() * 900,
    panOffset: random() * .22 - .11,
    detune: .18 + random() * .32,
    accentOffset: Math.floor(random() * TEMPLE_BOWL_ACCENTS.length),
  };
}

function applyMusicSession(now) {
  if (!state.audioNodes || !state.musicSession) return;
  const session = state.musicSession;
  state.audioNodes.musicFilter.frequency.setTargetAtTime(session.filterHz, now, .5);
}

function scheduleMusic(now) {
  if (!state.audio || !state.audioNodes || !state.layers.music || !state.running) return;
  if (!state.musicSession) {
    state.musicSession = createMusicSession(state.beatBpm);
    applyMusicSession(now);
  }
  const interval = musicGridInterval();
  if (!state.audioNodes.nextMusicStepAt || state.audioNodes.nextMusicStepAt < now) {
    state.audioNodes.nextMusicStepAt = nextGridTime(now, interval);
  }
  while (state.audioNodes.nextMusicStepAt < now + .7) {
    const at = state.audioNodes.nextMusicStepAt;
    scheduleMusicStep(at, gridStepForTime(at, interval), interval);
    state.audioNodes.nextMusicStepAt += interval;
  }
}

function scheduleMusicStep(at, step, interval) {
  const session = state.musicSession || createMusicSession(state.beatBpm);
  const cycleSteps = Math.max(16, Math.round(BREATH_CYCLE_SECONDS / interval));
  const heartSteps = Math.max(1, Math.round(heartBeatInterval(state.beatBpm) / interval));
  const bowlSpace = sourceTempoDensity(state.sourceTempos.musicKick);
  const cycleIndex = Math.floor(step / cycleSteps);
  const cycleStartStep = cycleIndex * cycleSteps;

  CRYSTAL_BOWLS.forEach((bowl, index) => {
    const targetStep = nearestGridStepAtOrAfter(cycleStartStep + bowl.position / 64 * cycleSteps, heartSteps, cycleStartStep);
    if (step !== targetStep || index % bowlSpace !== 0) return;
    const source = bowl.source || "musicKick";
    const frequency = state.sourceFrequencies[source] * bowl.ratio;
    const pan = bowl.pan + session.panOffset * (index % 2 === 0 ? 1 : -1);
    scheduleCrystalBowl(at, frequency, bowl.duration, bowl.gain, pan, session.detune, source);
  });

  const accentStep = nearestGridStepAtOrAfter(cycleStartStep + 56 / 64 * cycleSteps, heartSteps, cycleStartStep);
  if (step === accentStep && cycleIndex % 3 === 1) {
    const accent = TEMPLE_BOWL_ACCENTS[(cycleIndex + session.accentOffset) % TEMPLE_BOWL_ACCENTS.length];
    const source = accent.source || "musicKick";
    const frequency = state.sourceFrequencies[source] * accent.ratio;
    scheduleCrystalBowl(at, frequency, accent.duration, accent.gain, accent.pan - session.panOffset, session.detune, source);
  }
}

function nearestGridStep(target, grid) {
  return Math.max(0, Math.round(target / grid) * grid);
}

function nearestGridStepAtOrAfter(target, grid, minimum) {
  const step = nearestGridStep(target, grid);
  return step < minimum ? step + grid : step;
}

function scheduleCrystalBowl(at, frequency, duration, velocity, pan, detune, volumeKey = "musicKick") {
  const bowlVolume = state.sourceVolumes[volumeKey] ?? 1;
  const left = state.audio.createOscillator();
  const right = state.audio.createOscillator();
  const gain = state.audio.createGain();
  const spaceSend = state.audio.createGain();
  const filter = state.audio.createBiquadFilter();
  const panner = state.audio.createPanner();
  const position = bowlSpatialPosition(frequency, pan, at);
  const endPosition = bowlSpatialPosition(frequency, -pan * .35, at + duration);
  left.type = "sine";
  right.type = "sine";
  left.frequency.setValueAtTime(frequency, at);
  right.frequency.setValueAtTime(frequency, at);
  left.detune.value = -detune;
  right.detune.value = detune;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(2600, frequency * 2.8), at);
  filter.Q.value = .018;
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  panner.refDistance = .85;
  panner.maxDistance = 7;
  panner.rolloffFactor = .65;
  setPannerPosition(panner, position, at);
  rampPannerPosition(panner, endPosition, at + duration);
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.linearRampToValueAtTime(.012 * velocity * bowlVolume, at + 1.8);
  gain.gain.setValueAtTime(.009 * velocity * bowlVolume, at + duration * .5);
  gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
  spaceSend.gain.setValueAtTime(.0001, at);
  spaceSend.gain.linearRampToValueAtTime(.0065 * velocity * bowlVolume, at + 2.2);
  spaceSend.gain.exponentialRampToValueAtTime(.0001, at + duration);
  left.connect(filter);
  right.connect(filter);
  filter.connect(gain).connect(panner).connect(state.audioNodes.musicFilter);
  filter.connect(spaceSend).connect(state.audioNodes.musicSpaceDelay);
  left.start(at);
  right.start(at);
  left.stop(at + duration + .04);
  right.stop(at + duration + .04);
}

function bowlSpatialPosition(frequency, pan, at) {
  const cycle = positiveModulo(at - (state.audioStartedAt || 0), BREATH_CYCLE_SECONDS) / BREATH_CYCLE_SECONDS;
  const orbit = Math.sin(TWO_PI * cycle);
  const height = Math.cos(TWO_PI * cycle + pan) * .18;
  const distance = clamp(620 / Math.max(120, frequency), .45, 1.85);
  return {
    x: clamp(pan * 2.15 + orbit * .22, -2.6, 2.6),
    y: clamp(height, -.45, .45),
    z: -1.15 - distance,
  };
}

function setPannerPosition(panner, position, at) {
  if (panner.positionX) {
    panner.positionX.setValueAtTime(position.x, at);
    panner.positionY.setValueAtTime(position.y, at);
    panner.positionZ.setValueAtTime(position.z, at);
  } else {
    panner.setPosition(position.x, position.y, position.z);
  }
}

function rampPannerPosition(panner, position, at) {
  if (!panner.positionX) return;
  panner.positionX.linearRampToValueAtTime(position.x, at);
  panner.positionY.linearRampToValueAtTime(position.y, at);
  panner.positionZ.linearRampToValueAtTime(position.z, at);
}

function sourceTempoDensity(multiplier) {
  if (multiplier <= .25) return 4;
  if (multiplier <= .5) return 2;
  if (multiplier <= .75) return 2;
  return 1;
}

function nextGridTime(now, interval) {
  const origin = state.audioStartedAt || now;
  const step = Math.max(0, Math.ceil((now - origin + .001) / interval));
  return origin + step * interval;
}

function gridStepForTime(time, interval) {
  const origin = state.audioStartedAt || time;
  return Math.max(0, Math.round((time - origin) / interval));
}

function scheduleHeartBeats(now) {
  if (!state.audio || !state.audioNodes || !state.layers.beat || !state.running) return;
  const interval = heartBeatInterval(state.beatBpm);
  if (!state.audioNodes.nextHeartBeatAt || state.audioNodes.nextHeartBeatAt < now) {
    state.audioNodes.nextHeartBeatAt = nextGridTime(now, interval);
  }
  while (state.audioNodes.nextHeartBeatAt < now + .4) {
    const at = state.audioNodes.nextHeartBeatAt;
    const base = state.sourceFrequencies.beat;
    scheduleHeartThump(at, base, base * .55, .72, .34, .18);
    scheduleHeartThump(at + .2, base * .79, base * .5, .46, .28, .14);
    state.audioNodes.nextHeartBeatAt += interval;
  }
}

function scheduleHeartThump(at, startFrequency, endFrequency, peakGain, duration, bodyMix) {
  const oscillator = state.audio.createOscillator();
  const body = state.audio.createOscillator();
  const gain = state.audio.createGain();
  const bodyGain = state.audio.createGain();
  const filter = state.audio.createBiquadFilter();
  const bodyFilter = state.audio.createBiquadFilter();
  const end = at + duration + .26;
  oscillator.type = "sine";
  body.type = "sine";
  oscillator.frequency.setValueAtTime(startFrequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration * .72);
  body.frequency.setValueAtTime(startFrequency * 1.34, at);
  body.frequency.exponentialRampToValueAtTime(endFrequency * 1.48, at + duration * .7);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(165, at);
  filter.frequency.exponentialRampToValueAtTime(104, at + duration);
  filter.Q.value = .28;
  bodyFilter.type = "lowpass";
  bodyFilter.frequency.setValueAtTime(185, at);
  bodyFilter.frequency.exponentialRampToValueAtTime(118, at + duration);
  bodyFilter.Q.value = .2;
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.linearRampToValueAtTime(peakGain, at + .09);
  gain.gain.exponentialRampToValueAtTime(.0001, end);
  bodyGain.gain.setValueAtTime(.0001, at);
  bodyGain.gain.linearRampToValueAtTime(peakGain * bodyMix, at + .1);
  bodyGain.gain.exponentialRampToValueAtTime(.0001, end - .04);
  oscillator.connect(filter).connect(gain).connect(state.audioNodes.heartGain);
  body.connect(bodyFilter).connect(bodyGain).connect(state.audioNodes.heartGain);
  oscillator.start(at);
  body.start(at);
  oscillator.stop(end + .04);
  body.stop(end + .04);
}

function stopAudio() {
  if (!state.audioNodes || !state.audio) return;
  state.audioNodes.master.gain.setTargetAtTime(0, state.audio.currentTime, .08);
  if (state.audioNodes.breathSource) state.audioNodes.breathSource.port.postMessage({ type: "stop" });
  if (state.heartScheduler) {
    window.clearInterval(state.heartScheduler);
    state.heartScheduler = null;
  }
}

function seededSpherePoint(index) {
  let x = hashSigned(index * 3 + 11);
  let y = hashSigned(index * 3 + 17);
  let z = hashSigned(index * 3 + 23);
  let length = Math.hypot(x, y, z);
  while (length < .18) {
    x = hashSigned(index * 5 + 31);
    y = hashSigned(index * 5 + 37);
    z = hashSigned(index * 5 + 41);
    length = Math.hypot(x, y, z);
  }
  return { x: x / length, y: y / length, z: z / length };
}

function starColor(colorIndex) {
  if (!Number.isFinite(colorIndex)) return { r: .74, g: .72, b: .66 };
  const t = clamp((colorIndex + .4) / 2.4, 0, 1);
  const warm = { r: .92, g: .84, b: .62 };
  const cool = { r: .62, g: .7, b: .92 };
  return {
    r: lerp(cool.r, warm.r, t),
    g: lerp(cool.g, warm.g, t),
    b: lerp(cool.b, warm.b, t),
  };
}

function hashUnit(index) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function hashSigned(index) {
  return hashUnit(index) * 2 - 1;
}

function createSessionSeed() {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] || Math.floor(Math.random() * 2 ** 32);
  }
  return Math.floor(Math.random() * 2 ** 32);
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

startButton.addEventListener("click", toggleSession);
animationToggleButton.addEventListener("click", () => {
  state.animationPaused = !state.animationPaused;
  state.needsVisualFrame = true;
  syncControls();
});
volumeInput.addEventListener("input", () => {
  const target = state.eqTarget === "master" ? null : state.eqTarget;
  if (target) {
    state.layerVolumes[target] = Number(volumeInput.value);
  } else {
    state.volume = Number(volumeInput.value);
  }
  updateAudio();
  syncControls();
});
binauralInput.addEventListener("change", () => {
  state.binaural = binauralInput.checked;
  if (state.running) startAudio();
  updateAudio();
  syncControls();
});
eqToggleButton.addEventListener("click", () => {
  state.eqOpen = !state.eqOpen;
  syncControls();
});
eqExportButton.addEventListener("click", exportSoundSettings);
eqResetButton.addEventListener("click", () => {
  const settings = currentEqSettings();
  settings.trim = 0;
  bandsForTarget(state.eqTarget).forEach((band) => {
    settings.gains[band.id] = 0;
  });
  if (state.audio) updateEqualizer(state.audio.currentTime);
  syncControls();
});
eqTargetInput.addEventListener("change", () => {
  state.eqTarget = EQ_TARGETS.includes(eqTargetInput.value) ? eqTargetInput.value : "master";
  renderEqualizer();
  syncControls();
});
eqTrimInput.addEventListener("input", () => {
  currentEqSettings().trim = Number(eqTrimInput.value);
  if (state.audio) updateEqualizer(state.audio.currentTime);
  syncControls();
});
eqSourceInput.addEventListener("input", () => {
  applySourceFrequencyInput(sourceTargetForEq(state.eqTarget), eqSourceInput.value);
});
eqSourceInput.addEventListener("change", () => {
  commitSourceFrequencyInput(eqSourceInput, sourceTargetForEq(state.eqTarget));
});
layerToggleInputs.forEach((input) => {
  input.addEventListener("change", () => {
    state.layers[input.dataset.layer] = input.checked;
    updateAudio();
    syncControls();
  });
});
eqBandsEl.addEventListener("input", (event) => {
  const gainInput = event.target.closest("[data-eq-band]");
  if (!gainInput) return;
  if (gainInput) currentEqSettings().gains[gainInput.dataset.eqBand] = Number(gainInput.value);
  if (state.audio) updateEqualizer(state.audio.currentTime);
  syncControls();
});
eqSourceList.addEventListener("input", (event) => {
  const frequencyInput = event.target.closest("[data-source-frequency]");
  if (frequencyInput) {
    applySourceFrequencyInput(frequencyInput.dataset.sourceFrequency, frequencyInput.value);
    return;
  }
  const volume = event.target.closest("[data-source-volume]");
  if (volume) {
    applySourceVolumeInput(volume.dataset.sourceVolume, volume.value);
    volume.nextElementSibling.value = formatVolume(volume.value);
    return;
  }
  const tempoInput = event.target.closest("[data-source-tempo]");
  if (tempoInput) applySourceTempoInput(tempoInput.dataset.sourceTempo, tempoInput.value);
});
eqSourceList.addEventListener("change", (event) => {
  const frequencyInput = event.target.closest("[data-source-frequency]");
  if (frequencyInput) {
    commitSourceFrequencyInput(frequencyInput, frequencyInput.dataset.sourceFrequency);
    return;
  }
  const tempoInput = event.target.closest("[data-source-tempo]");
  if (tempoInput) applySourceTempoInput(tempoInput.dataset.sourceTempo, tempoInput.value);
});
appSwitcher.addEventListener("change", () => {
  if (appSwitcher.value) window.location.href = appSwitcher.value;
});
window.addEventListener("resize", () => {
  state.needsVisualFrame = true;
  resizeCanvas();
});
