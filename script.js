const canvas = document.getElementById("universe");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("start");
const appSwitcher = document.getElementById("app-switcher");
const statusEl = document.getElementById("status");
const volumeInput = document.getElementById("volume");
const beatBpmInput = document.getElementById("beat-bpm");
const beatLabel = document.getElementById("beat-label");
const binauralInput = document.getElementById("binaural");
const layerToggleInputs = Array.from(document.querySelectorAll(".layer-toggle"));

const TWO_PI = Math.PI * 2;
const STAR_COUNT_TARGET = 6000;
const UNIVERSE_SHELL_RADIUS = 1.78;
const UNIVERSE_DEPTH_RANGE = .3;
const CORE_POINT_COUNT = 3200;
const BEAT_POINT_COUNT = 2600;
const DRONE_POINT_COUNT = 2400;
const MUSIC_POINT_COUNT = 3000;
const TRACE_RGB = "17, 17, 17";
const BREATH_SIDE_SECONDS = 4;
const BREATH_CYCLE_SECONDS = 16;
const MUSIC_PHRASE_SECONDS = 16;
const HEART_BPM_OPTIONS = [45, 60, 75, 90];

const catalog = window.UNIVERSE_STARS_DATA || { count: 0, stars: [] };
const stars = prepareStars((catalog.stars || []).slice(0, STAR_COUNT_TARGET));
const breathPoints = createUniverseProjectionPoints(CORE_POINT_COUNT, 7);
const beatPoints = createUniverseProjectionPoints(BEAT_POINT_COUNT, 19);
const dronePoints = createUniverseProjectionPoints(DRONE_POINT_COUNT, 31, Math.floor(stars.length * .37));
const musicPoints = createUniverseProjectionPoints(MUSIC_POINT_COUNT, 23, Math.floor(stars.length * .61));

const state = {
  running: false,
  depth: 1.32,
  volume: Number(volumeInput.value),
  beatBpm: Number(beatBpmInput.value),
  binaural: binauralInput.checked,
  startedAt: performance.now() / 1000,
  layers: {
    universe: true,
    breath: true,
    beat: true,
    drone: true,
    music: true,
  },
  visual: {
    breath: 0,
    beat: 0,
    music: 0,
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

syncControls();
statusEl.textContent = `Idle / ${stars.length.toLocaleString()} HYG stars mapped`;
animateCanvas();
upgradeToThree();

function prepareStars(rawStars) {
  const maxRadius = rawStars.reduce((max, star) => Math.max(max, Math.hypot(star.x, star.y, star.z)), 1);
  return rawStars.map((star, index) => {
    const rawRadius = Math.hypot(star.x, star.y, star.z) || 1;
    const depth = Math.pow(clamp(rawRadius / maxRadius, 0, 1), .46);
    const shellRadius = UNIVERSE_SHELL_RADIUS + (depth - .5) * UNIVERSE_DEPTH_RANGE;
    return {
      x: star.x / rawRadius * shellRadius,
      y: star.y / rawRadius * shellRadius,
      z: star.z / rawRadius * shellRadius,
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
  const breath = createThreeProceduralLayer(THREE, texture, breathPoints, .5, .023, .62);
  const beat = createThreeProceduralLayer(THREE, texture, beatPoints, 1.16, .015, .3);
  const drone = createThreeProceduralLayer(THREE, texture, dronePoints, .2, .014, .2);
  const music = createThreeProceduralLayer(THREE, texture, musicPoints, 1.42, .018, .18);

  camera.position.z = 5.2;
  renderer.setClearColor(0xf6f5ef, 0);
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
  const directions = new Float32Array(sourcePoints.length * 3);
  const phases = new Float32Array(sourcePoints.length);
  sourcePoints.forEach((point, index) => {
    const offset = index * 3;
    directions[offset] = point.x;
    directions[offset + 1] = point.y;
    directions[offset + 2] = point.z;
    positions[offset] = point.x * radius;
    positions[offset + 1] = point.y * radius;
    positions[offset + 2] = point.z * radius;
    phases[index] = point.phase;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x111111,
    size,
    map: texture,
    transparent: true,
    opacity,
    alphaTest: .03,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return { points: new THREE.Points(geometry, material), geometry, material, directions, phases };
}

function createThreePointTexture(THREE) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 64;
  textureCanvas.height = 64;
  const textureCtx = textureCanvas.getContext("2d");
  const gradient = textureCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, "rgba(17, 17, 17, .94)");
  gradient.addColorStop(.58, "rgba(17, 17, 17, .72)");
  gradient.addColorStop(1, "rgba(17, 17, 17, 0)");
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
  view.root.rotation.x += .00045 * active;
  view.root.rotation.y += .00078 * active;
  view.root.rotation.z += .00024 * active;
  view.universe.points.visible = state.layers.universe;
  view.breath.points.visible = state.layers.breath;
  view.beat.points.visible = state.layers.beat;
  view.drone.points.visible = state.layers.drone;
  view.music.points.visible = state.layers.music;
  view.universe.points.scale.setScalar(state.depth);
  view.universe.material.opacity = state.running ? .92 : .72;
  updateThreeProceduralLayer(view.music, 1.38 + music * .08, state.running ? .01 + music * .012 : 0, .12 + music * .18);
  updateThreeProceduralLayer(view.breath, .42 + breath * .78, state.running ? .024 : 0, .44 + breath * .32);
  updateThreeHeartLayer(view.beat, 1.16, beat, state.running);
  updateThreeDroneLayer(view.drone, .2, state.running ? audioElapsed(elapsed) : elapsed, state.running ? .007 : 0);
  view.renderer.render(view.scene, view.camera);
}

function updateThreeProceduralLayer(layer, radius, waveHeight, opacity) {
  const positions = layer.geometry.attributes.position.array;
  const now = performance.now() * .00032;
  for (let index = 0; index < layer.phases.length; index += 1) {
    const offset = index * 3;
    const nx = layer.directions[offset];
    const ny = layer.directions[offset + 1];
    const nz = layer.directions[offset + 2];
    const wave = Math.sin(layer.phases[index] * TWO_PI + now);
    const r = radius + wave * waveHeight;
    positions[offset] = nx * r;
    positions[offset + 1] = ny * r;
    positions[offset + 2] = nz * r;
  }
  layer.material.opacity = opacity;
  layer.geometry.attributes.position.needsUpdate = true;
}

function updateThreeHeartLayer(layer, radius, beat, animateSurface) {
  const positions = layer.geometry.attributes.position.array;
  const now = performance.now() * .00012;
  const pulseRadius = radius + beat * .075;
  for (let index = 0; index < layer.phases.length; index += 1) {
    const offset = index * 3;
    const nx = layer.directions[offset];
    const ny = layer.directions[offset + 1];
    const nz = layer.directions[offset + 2];
    const surfaceNoise = animateSurface ? Math.sin(layer.phases[index] * TWO_PI + now) * .004 : 0;
    const r = pulseRadius + surfaceNoise;
    positions[offset] = nx * r;
    positions[offset + 1] = ny * r;
    positions[offset + 2] = nz * r;
  }
  layer.material.opacity = .18 + beat * .22;
  layer.geometry.attributes.position.needsUpdate = true;
}

function updateThreeDroneLayer(layer, radius, elapsed, waveHeight) {
  const positions = layer.geometry.attributes.position.array;
  const frequencies = droneFrequencies();
  for (let index = 0; index < layer.phases.length; index += 1) {
    const offset = index * 3;
    const nx = layer.directions[offset];
    const ny = layer.directions[offset + 1];
    const nz = layer.directions[offset + 2];
    const phase = layer.phases[index] * TWO_PI;
    const left = sine(frequencies.left, elapsed + phase / TWO_PI);
    const right = sine(frequencies.right, elapsed + phase / TWO_PI);
    const signal = state.binaural ? (left + right) * .5 : left;
    const r = radius + signal * waveHeight;
    positions[offset] = nx * r;
    positions[offset + 1] = ny * r;
    positions[offset + 2] = nz * r;
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
  const rotationY = elapsed * .078 * active + .42;
  const rotationX = elapsed * .04 * active - .18;
  const breath = state.visual.breath;
  const beat = state.visual.beat;
  const music = state.visual.music;

  ctx.clearRect(0, 0, width, height);
  if (state.layers.universe) drawCanvasStars({ width, height, scale, rotationX, rotationY });
  if (state.layers.music) drawCanvasSpherePoints(musicPoints, .74 + music * .04, 1.06, rotationX * .82, rotationY * 1.12, .1 + music * .16, state.running ? .006 + music * .008 : 0);
  if (state.layers.breath) drawCanvasSpherePoints(breathPoints, .24 + breath * .45, .9, rotationX, rotationY, .26 + breath * .24, state.running ? .025 : 0);
  if (state.layers.beat) drawCanvasSpherePoints(beatPoints, .62 + beat * .045, .74, rotationX * .9, rotationY * 1.08, .12 + beat * .22, state.running ? .004 : 0);
  if (state.layers.drone) drawCanvasDronePoints(dronePoints, .105, .9, rotationX * 1.1, rotationY * .82, .16, state.running ? audioElapsed(elapsed) : elapsed);
}

function updateVisualState(elapsed) {
  const targetBreath = state.running ? boxBreath(elapsed, BREATH_SIDE_SECONDS) : 0;
  const targetBeat = state.running ? beatEnvelope(elapsed, state.beatBpm) : 0;
  const targetMusic = state.running ? musicEnvelope(elapsed, state.beatBpm) : 0;
  const targetActive = state.running ? 1 : .32;
  state.visual.breath += (targetBreath - state.visual.breath) * .055;
  state.visual.beat += (targetBeat - state.visual.beat) * .12;
  state.visual.music += (targetMusic - state.visual.music) * .08;
  state.visual.active += (targetActive - state.visual.active) * .045;
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
    const point = rotatePoint(
      { x: source.x * (radiusScale + wave), y: source.y * (radiusScale + wave), z: source.z * (radiusScale + wave) },
      rotationX,
      rotationY,
    );
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
    const left = sine(frequencies.left, elapsed + source.phase);
    const right = sine(frequencies.right, elapsed + source.phase);
    const signal = state.binaural ? (left + right) * .5 : left;
    const point = rotatePoint(
      {
        x: source.x * (radiusScale + signal * waveHeight),
        y: source.y * (radiusScale + signal * waveHeight),
        z: source.z * (radiusScale + signal * waveHeight),
      },
      rotationX,
      rotationY,
    );
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
    return { ...point, phase: hashUnit(index * 13 + seedOffset) };
  });
}

function createUniverseProjectionPoints(count, strideSeed, offsetSeed = 0) {
  if (!stars.length) return createSpherePoints(count, strideSeed * 1000);
  return Array.from({ length: count }, (_, index) => {
    const source = stars[(offsetSeed + index * strideSeed) % stars.length];
    const length = Math.hypot(source.x, source.y, source.z) || 1;
    return {
      x: source.x / length,
      y: source.y / length,
      z: source.z / length,
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
  if (t < sideSeconds) return smoothstep(t / sideSeconds);
  if (t < sideSeconds * 2) return 1;
  if (t < sideSeconds * 3) return 1 - smoothstep((t - sideSeconds * 2) / sideSeconds);
  return 0;
}

function beatEnvelope(elapsed, bpm) {
  // Heart BPM is independent from the 4/4/4/4 breath cycle. The exposed BPM
  // values are chosen because each produces an integer beat count per 16 sec.
  const secondsPerBeat = 60 / Math.max(1, bpm);
  const phase = positiveModulo(elapsed, secondsPerBeat) / secondsPerBeat;
  return Math.exp(-phase * 8);
}

function musicEnvelope(elapsed, bpm) {
  const phrase = positiveModulo(elapsed, MUSIC_PHRASE_SECONDS);
  const phraseSwell = .5 + .5 * Math.sin(TWO_PI * phrase / MUSIC_PHRASE_SECONDS - Math.PI / 2);
  const stepInterval = 60 / musicTempoForHeartBpm(bpm);
  const step = positiveModulo(phrase, stepInterval) / stepInterval;
  const pluck = Math.exp(-step * 5.2);
  return clamp(.22 + phraseSwell * .38 + pluck * .28, 0, 1);
}

function syncControls() {
  startButton.textContent = state.running ? "Stop" : "Start";
  startButton.classList.toggle("active", state.running);
  binauralInput.checked = state.binaural;
  volumeInput.value = String(state.volume);
  beatBpmInput.value = String(state.beatBpm);
  beatLabel.textContent = `${state.beatBpm} bpm`;

  layerToggleInputs.forEach((input) => {
    const layerId = input.dataset.layer;
    input.checked = Boolean(state.layers[layerId]);
    const control = document.querySelector(`[data-layer-control="${layerId}"]`);
    if (control) control.classList.toggle("disabled", !state.layers[layerId]);
  });
}

async function toggleSession() {
  state.running = !state.running;
  state.startedAt = performance.now() / 1000;
  statusEl.textContent = state.running ? "Active / universe meditation" : `Idle / ${stars.length.toLocaleString()} HYG stars mapped`;
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
    const merger = audio.createChannelMerger(2);
    const leftDrone = audio.createOscillator();
    const rightDrone = audio.createOscillator();
    const droneOvertone = audio.createOscillator();
    const leftGain = audio.createGain();
    const rightGain = audio.createGain();
    const droneOvertoneGain = audio.createGain();
    const droneGain = audio.createGain();
    const heartGain = audio.createGain();
    const breathGain = audio.createGain();
    const breathHighpass = audio.createBiquadFilter();
    const breathLowpass = audio.createBiquadFilter();
    const musicGain = audio.createGain();
    const musicPulseGain = audio.createGain();
    const musicPadGain = audio.createGain();
    const musicBassOscillator = audio.createOscillator();
    const musicSubOscillator = audio.createOscillator();
    const musicSubGain = audio.createGain();
    const musicBassFilter = audio.createBiquadFilter();
    const musicBassGain = audio.createGain();
    const musicFilter = audio.createBiquadFilter();
    const musicOutputFilter = audio.createBiquadFilter();
    const musicDelay = audio.createDelay(2);
    const musicFeedback = audio.createGain();
    const musicWetGain = audio.createGain();
    const musicPadVoices = [];
    let breathSource = null;
    leftDrone.type = "sine";
    rightDrone.type = "sine";
    droneOvertone.type = "sine";
    breathGain.gain.value = 0;
    breathHighpass.type = "highpass";
    breathHighpass.frequency.value = 520;
    breathHighpass.Q.value = .45;
    breathLowpass.type = "lowpass";
    breathLowpass.frequency.value = 1650;
    breathLowpass.Q.value = .3;
    droneGain.gain.value = state.layers.drone ? .056 : 0;
    heartGain.gain.value = 1.15;
    musicGain.gain.value = 0;
    musicPulseGain.gain.value = 1;
    musicPadGain.gain.value = .12;
    musicBassOscillator.type = "sine";
    musicSubOscillator.type = "sine";
    musicSubGain.gain.value = .66;
    musicBassGain.gain.value = 0;
    musicBassFilter.type = "lowpass";
    musicBassFilter.frequency.value = 96;
    musicBassFilter.Q.value = 1.05;
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = 860;
    musicFilter.Q.value = .8;
    musicOutputFilter.type = "lowpass";
    musicOutputFilter.frequency.value = 620;
    musicOutputFilter.Q.value = .32;
    musicDelay.delayTime.value = .46;
    musicFeedback.gain.value = .12;
    musicWetGain.gain.value = .08;
    leftGain.gain.value = 1;
    rightGain.gain.value = 1;
    droneOvertoneGain.gain.value = .32;
    leftDrone.connect(leftGain).connect(merger, 0, 0);
    rightDrone.connect(rightGain).connect(merger, 0, 1);
    merger.connect(droneGain).connect(master);
    droneOvertone.connect(droneOvertoneGain).connect(droneGain);
    heartGain.connect(master);
    musicFilter.connect(musicPulseGain).connect(musicGain);
    musicFilter.connect(musicDelay);
    musicDelay.connect(musicFeedback).connect(musicDelay);
    musicDelay.connect(musicWetGain).connect(musicGain);
    musicBassOscillator.connect(musicBassFilter);
    musicSubOscillator.connect(musicSubGain).connect(musicBassFilter);
    musicBassFilter.connect(musicBassGain).connect(musicGain);
    musicGain.connect(musicOutputFilter).connect(master);
    createMusicPad(audio, musicPadGain, musicFilter, musicPadVoices);
    if (audio.audioWorklet) {
      try {
        await audio.audioWorklet.addModule("audio-worklet.js");
        breathSource = new AudioWorkletNode(audio, "meditation-breath-processor", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        breathSource.connect(breathHighpass).connect(breathLowpass).connect(breathGain).connect(master);
      } catch (error) {
        console.error("Breath worklet failed", error);
      }
    }
    master.connect(audio.destination);
    master.gain.value = 0;
    leftDrone.start();
    rightDrone.start();
    droneOvertone.start();
    musicBassOscillator.start();
    musicSubOscillator.start();
    state.audio = audio;
    state.audioNodes = {
      master,
      droneGain,
      heartGain,
      breathGain,
      breathHighpass,
      breathLowpass,
      breathSource,
      leftDrone,
      rightDrone,
      droneOvertone,
      musicGain,
      musicPulseGain,
      musicFilter,
      musicOutputFilter,
      musicPadGain,
      musicBassOscillator,
      musicSubOscillator,
      musicSubGain,
      musicBassFilter,
      musicBassGain,
      musicDelay,
      musicFeedback,
      musicWetGain,
      musicPadVoices,
      nextHeartBeatAt: 0,
      nextMusicNoteAt: 0,
      musicStep: 0,
    };
  }
  if (state.audio.state === "suspended") await state.audio.resume();
  state.startedAt = performance.now() / 1000;
  state.audioStartedAt = state.audio.currentTime;
  state.audioNodes.nextHeartBeatAt = 0;
  state.audioNodes.nextMusicNoteAt = 0;
  state.audioNodes.musicStep = 0;
  state.musicSession = createMusicSession(state.beatBpm);
  applyMusicSession(state.audio.currentTime);
  if (state.audioNodes.breathSource) {
    state.audioNodes.breathSource.port.postMessage({
      type: "start",
      enabled: state.layers.breath,
      cycleSeconds: BREATH_CYCLE_SECONDS,
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
  state.audioNodes.droneOvertone.frequency.setTargetAtTime(frequencies.overtone, now, .08);
  state.audioNodes.droneGain.gain.setTargetAtTime(state.layers.drone && state.running ? .056 : 0, now, .12);
  state.audioNodes.musicGain.gain.setTargetAtTime(state.layers.music && state.running ? .78 : 0, now, .18);
  state.audioNodes.musicFilter.frequency.setTargetAtTime(state.layers.music && state.running ? (state.musicSession?.filterHz || 860) : 520, now, .4);
  state.audioNodes.musicOutputFilter.frequency.setTargetAtTime(state.layers.music && state.running ? 620 : 420, now, .35);
  state.audioNodes.master.gain.setTargetAtTime(state.running ? state.volume : 0, now, .08);
  if (state.audioNodes.breathSource) {
    state.audioNodes.breathSource.port.postMessage({
      type: "state",
      playing: state.running,
      enabled: state.layers.breath,
      cycleSeconds: BREATH_CYCLE_SECONDS,
    });
  }
  updateBreathAudio(now);
  scheduleHeartBeats(now);
  scheduleMusic(now);
}

function updateBreathAudio(now) {
  if (!state.audio || !state.audioNodes) return;
  const target = state.layers.breath && state.running ? 1 : 0;
  state.audioNodes.breathGain.gain.setTargetAtTime(target, now, .08);
}

function droneFrequencies() {
  const base = 110;
  return {
    left: base,
    right: state.binaural ? base + 4 : base,
    overtone: base * 2,
  };
}

function audioElapsed(fallbackElapsed) {
  if (!state.audio) return fallbackElapsed;
  return Math.max(0, state.audio.currentTime - state.audioStartedAt);
}

function sine(frequency, t) {
  return Math.sin(TWO_PI * frequency * t);
}

function createMusicPad(audio, padGain, destination, voices) {
  padGain.connect(destination);
  for (let index = 0; index < 5; index += 1) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 110;
    oscillator.detune.value = 0;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(padGain);
    oscillator.start();
    voices.push({ oscillator, gain });
  }
}

function createMusicSession(bpm) {
  const seed = createSessionSeed();
  const random = mulberry32(seed);
  const musicTempo = musicTempoForHeartBpm(bpm);
  const musicInterval = 60 / musicTempo;
  const musicStepInterval = musicInterval / 2;
  const root = 110;
  const scaleRatios = [1, 1.1667, 1.3333, 1.5, 1.75, 2, 2.3333];
  const scale = scaleRatios.map((ratio) => root * ratio);
  const phraseSteps = Math.round(MUSIC_PHRASE_SECONDS / musicStepInterval);
  const pattern = createMusicPattern(random, scale, phraseSteps);
  const chordPattern = createChordPattern(random, scale, phraseSteps);
  const pad = [scale[0] / 2, scale[2] / 2, scale[3] / 2, scale[4] / 2, scale[5] / 2].map((frequency, index) => ({
    frequency,
    gain: [.22, .17, .12, .085, .052][index],
    detune: (random() - .5) * 12,
  }));

  return {
    seed,
    scale,
    musicTempo,
    musicInterval,
    musicStepInterval,
    swing: musicStepInterval * .16,
    pattern,
    chordPattern,
    pad,
    bassRoot: root / 4,
    wobbleRate: [2, 3, 4][Math.floor(random() * 3)],
    filterHz: 390,
    delayTime: clamp(musicInterval * 1.5, .18, 1.4),
    feedback: .12,
    wet: .08,
  };
}

function musicTempoForHeartBpm(bpm) {
  void bpm;
  return 135;
}

function createMusicPattern(random, scale, phraseSteps) {
  const pattern = [];
  const motif = [
    { play: false },
    { play: true, accent: .26, degree: 2, octave: .5 },
    { play: false },
    { play: false },
    { play: true, accent: .38, degree: 1, octave: .5 },
    { play: false },
    { play: false },
    { play: true, accent: .3, degree: 3, octave: .5 },
    { play: false },
    { play: false },
    { play: true, accent: .42, degree: 0, octave: .5 },
    { play: false },
    { play: true, accent: .24, degree: 2, octave: .5 },
    { play: false },
    { play: false },
    { play: true, accent: .34, degree: 1, octave: .5 },
    { play: false },
  ];
  for (let step = 0; step < phraseSteps; step += 1) {
    const phraseAnchor = step === 0 || step === Math.floor(phraseSteps / 2);
    const cell = motif[step % motif.length];
    const offbeatLift = step % 2 === 1 ? .12 : 0;
    const variationRest = !phraseAnchor && cell.play && random() < .18;
    const rest = !cell.play || variationRest;
    if (rest) {
      pattern.push(null);
      continue;
    }
    pattern.push({
      frequency: scale[cell.degree] * cell.octave,
      velocity: phraseAnchor ? .92 : clamp((cell.accent || .42) + offbeatLift + random() * .12, .34, .84),
    });
  }
  return pattern;
}

function createChordPattern(random, scale, phraseSteps) {
  const pattern = Array.from({ length: phraseSteps }, () => null);
  const placements = [4, 14, 22, 30, 40, 50, 58, 66].filter((step) => step < phraseSteps);
  const voicings = [
    [0, 2, 4],
    [1, 3, 5],
    [0, 3, 4],
    [2, 4, 6],
  ];
  placements.forEach((step, index) => {
    if (random() < .2 && index !== 0) return;
    pattern[step] = {
      frequencies: voicings[index % voicings.length].map((degree) => scale[degree] * .5),
      velocity: .5 + random() * .18,
    };
  });
  return pattern;
}

function applyMusicSession(now) {
  if (!state.audioNodes || !state.musicSession) return;
  const session = state.musicSession;
  session.pad.forEach((voice, index) => {
    const node = state.audioNodes.musicPadVoices[index];
    if (!node) return;
    node.oscillator.frequency.setTargetAtTime(voice.frequency, now, .45);
    node.oscillator.detune.setTargetAtTime(voice.detune, now, .45);
    node.gain.gain.setTargetAtTime(voice.gain, now, .45);
  });
  state.audioNodes.musicFilter.frequency.setTargetAtTime(session.filterHz, now, .5);
  state.audioNodes.musicBassOscillator.frequency.setTargetAtTime(session.bassRoot * 2, now, .2);
  state.audioNodes.musicSubOscillator.frequency.setTargetAtTime(session.bassRoot, now, .2);
  state.audioNodes.musicBassFilter.frequency.setTargetAtTime(72, now, .2);
  state.audioNodes.musicDelay.delayTime.setTargetAtTime(session.delayTime, now, .25);
  state.audioNodes.musicFeedback.gain.setTargetAtTime(session.feedback, now, .25);
  state.audioNodes.musicWetGain.gain.setTargetAtTime(session.wet, now, .25);
}

function scheduleMusic(now) {
  if (!state.audio || !state.audioNodes || !state.layers.music || !state.running) return;
  if (!state.musicSession) {
    state.musicSession = createMusicSession(state.beatBpm);
    applyMusicSession(now);
  }
  const interval = state.musicSession.musicStepInterval;
  if (!state.audioNodes.nextMusicNoteAt || state.audioNodes.nextMusicNoteAt < now) {
    state.audioNodes.nextMusicNoteAt = nextGridTime(now, interval);
    state.audioNodes.musicStep = gridStepForTime(state.audioNodes.nextMusicNoteAt, interval);
  }
  while (state.audioNodes.nextMusicNoteAt < now + .7) {
    const gridAt = state.audioNodes.nextMusicNoteAt;
    const absoluteStep = gridStepForTime(gridAt, interval);
    const at = swingTime(gridAt, absoluteStep);
    const step = absoluteStep % state.musicSession.pattern.length;
    scheduleGroovePulse(at, absoluteStep);
    if (shouldPlayBassStep(step)) {
      scheduleMusicPulse(at);
      scheduleBassPulse(at, absoluteStep);
    }
    const chord = state.musicSession.chordPattern[step];
    if (chord) scheduleChordStab(at, chord);
    const note = state.musicSession.pattern[step];
    if (note) scheduleMusicPluck(at, note.frequency, note.velocity);
    state.audioNodes.nextMusicNoteAt += interval;
    state.audioNodes.musicStep = absoluteStep + 1;
  }
}

function swingTime(time, step) {
  const session = state.musicSession;
  if (!session) return time;
  return step % 2 === 1 ? time + session.swing : time;
}

function scheduleGroovePulse(at, step) {
  const position = step % 16;
  if (position === 0 || position === 6 || position === 11 || position === 14) {
    scheduleLowKick(at, position === 0 ? 1 : .68);
    scheduleMusicPump(at, .24);
  }
  if (position === 8) {
    scheduleBackbeatThud(at);
    scheduleMusicPump(at, .3);
  }
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

function scheduleChordStab(at, chord) {
  chord.frequencies.forEach((frequency, index) => {
    const oscillator = state.audio.createOscillator();
    const gain = state.audio.createGain();
    const filter = state.audio.createBiquadFilter();
    const end = at + 1.25;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.detune.value = [-3, 2, 4][index] || 0;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(260, at);
    filter.frequency.exponentialRampToValueAtTime(150, at + .9);
    filter.Q.value = .28;
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.linearRampToValueAtTime(.09 * chord.velocity, at + .08);
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    oscillator.connect(gain).connect(filter).connect(state.audioNodes.musicFilter);
    oscillator.start(at);
    oscillator.stop(end + .04);
  });
}

function scheduleLowKick(at, velocity) {
  const oscillator = state.audio.createOscillator();
  const gain = state.audio.createGain();
  const filter = state.audio.createBiquadFilter();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(66, at);
  oscillator.frequency.exponentialRampToValueAtTime(34, at + .22);
  filter.type = "lowpass";
  filter.frequency.value = 120;
  filter.Q.value = .55;
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.linearRampToValueAtTime(.2 * velocity, at + .032);
  gain.gain.exponentialRampToValueAtTime(.0001, at + .58);
  oscillator.connect(filter).connect(gain).connect(state.audioNodes.musicGain);
  oscillator.start(at);
  oscillator.stop(at + .62);
}

function scheduleBackbeatThud(at) {
  const body = state.audio.createOscillator();
  const gain = state.audio.createGain();
  const filter = state.audio.createBiquadFilter();
  body.type = "sine";
  body.frequency.setValueAtTime(126, at);
  body.frequency.exponentialRampToValueAtTime(78, at + .16);
  filter.type = "lowpass";
  filter.frequency.value = 180;
  filter.Q.value = .45;
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.linearRampToValueAtTime(.07, at + .04);
  gain.gain.exponentialRampToValueAtTime(.0001, at + .38);
  body.connect(filter).connect(gain).connect(state.audioNodes.musicGain);
  body.start(at);
  body.stop(at + .42);
}

function shouldPlayBassStep(step) {
  const position = step % 16;
  return position === 0 || position === 3 || position === 6 || position === 8 || position === 10 || position === 14;
}

function scheduleBassPulse(at, step) {
  const session = state.musicSession;
  if (!session) return;
  const beatInterval = session.musicInterval;
  const position = step % 16;
  const accent = position === 0 ? 1 : position === 10 ? .78 : position === 3 ? .46 : position === 8 ? .55 : .6;
  const end = at + beatInterval * 1.28;
  const wobbleMid = at + beatInterval * .54;
  const bass = state.audio.createOscillator();
  const sub = state.audio.createOscillator();
  const bassGain = state.audio.createGain();
  const subGain = state.audio.createGain();
  const filter = state.audio.createBiquadFilter();
  bass.type = "sine";
  sub.type = "sine";
  bass.frequency.setValueAtTime(session.bassRoot * 2, at);
  sub.frequency.setValueAtTime(session.bassRoot, at);
  subGain.gain.value = .64;
  filter.type = "lowpass";
  filter.Q.value = .72;
  filter.frequency.setValueAtTime(36, at);
  filter.frequency.linearRampToValueAtTime(82 + session.wobbleRate * 7, wobbleMid);
  filter.frequency.exponentialRampToValueAtTime(42, end);
  bassGain.gain.setValueAtTime(.0001, at);
  bassGain.gain.linearRampToValueAtTime(.3 * accent, at + .06);
  bassGain.gain.exponentialRampToValueAtTime(.0001, end);
  sub.connect(subGain).connect(bassGain);
  bass.connect(bassGain).connect(filter).connect(state.audioNodes.musicGain);
  bass.start(at);
  sub.start(at);
  bass.stop(end + .04);
  sub.stop(end + .04);
}

function scheduleMusicPulse(at) {
  const gain = state.audioNodes.musicPulseGain.gain;
  gain.cancelScheduledValues(at);
  gain.setValueAtTime(.72, at);
  gain.linearRampToValueAtTime(.98, at + .12);
  gain.exponentialRampToValueAtTime(.82, at + .34);
}

function scheduleMusicPump(at, depth) {
  const gain = state.audioNodes.musicPulseGain.gain;
  gain.cancelScheduledValues(at);
  gain.setValueAtTime(Math.max(.68, 1 - depth * .55), at);
  gain.linearRampToValueAtTime(.98, at + .14);
  gain.exponentialRampToValueAtTime(.88, at + .36);
}

function scheduleMusicPluck(at, frequency, velocity) {
  const oscillator = state.audio.createOscillator();
  const subOscillator = state.audio.createOscillator();
  const gain = state.audio.createGain();
  const subGain = state.audio.createGain();
  const filter = state.audio.createBiquadFilter();
  const end = at + 1.65;
  oscillator.type = "sine";
  subOscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency * .996, at);
  oscillator.frequency.exponentialRampToValueAtTime(frequency, at + .08);
  subOscillator.frequency.setValueAtTime(frequency * .5, at);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(360, at);
  filter.frequency.exponentialRampToValueAtTime(190, at + 1.35);
  filter.Q.value = .45;
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.linearRampToValueAtTime(.22 * velocity, at + .07);
  gain.gain.exponentialRampToValueAtTime(.0001, end);
  subGain.gain.value = .28;
  subOscillator.connect(subGain).connect(gain);
  oscillator.connect(gain).connect(filter).connect(state.audioNodes.musicFilter);
  subOscillator.start(at);
  oscillator.start(at);
  subOscillator.stop(end + .04);
  oscillator.stop(end + .04);
}

function scheduleHeartBeats(now) {
  if (!state.audio || !state.audioNodes || !state.layers.beat || !state.running) return;
  const interval = 60 / Math.max(1, state.beatBpm);
  if (!state.audioNodes.nextHeartBeatAt || state.audioNodes.nextHeartBeatAt < now) {
    state.audioNodes.nextHeartBeatAt = nextGridTime(now, interval);
  }
  while (state.audioNodes.nextHeartBeatAt < now + .4) {
    const at = state.audioNodes.nextHeartBeatAt;
    scheduleHeartThump(at, 92, 48, .24, .2);
    scheduleHeartThump(at + .14, 68, 42, .12, .17);
    state.audioNodes.nextHeartBeatAt += interval;
  }
}

function scheduleHeartThump(at, startFrequency, endFrequency, peakGain, duration) {
  const oscillator = state.audio.createOscillator();
  const gain = state.audio.createGain();
  const end = at + duration + .26;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(startFrequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration * .72);
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.linearRampToValueAtTime(peakGain * .82, at + .032);
  gain.gain.exponentialRampToValueAtTime(.0001, end);
  oscillator.connect(gain).connect(state.audioNodes.heartGain);
  oscillator.start(at);
  oscillator.stop(end + .04);
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
  if (!Number.isFinite(colorIndex)) return { r: .08, g: .08, b: .08 };
  const t = clamp((colorIndex + .4) / 2.4, 0, 1);
  const warm = { r: .13, g: .115, b: .085 };
  const cool = { r: .075, g: .086, b: .13 };
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
volumeInput.addEventListener("input", () => {
  state.volume = Number(volumeInput.value);
  updateAudio();
});
beatBpmInput.addEventListener("change", () => {
  const selectedBpm = Number(beatBpmInput.value);
  state.beatBpm = HEART_BPM_OPTIONS.includes(selectedBpm) ? selectedBpm : 45;
  if (state.audioNodes) {
    state.audioNodes.nextHeartBeatAt = 0;
    state.audioNodes.nextMusicNoteAt = 0;
    state.audioNodes.musicStep = 0;
    state.musicSession = createMusicSession(state.beatBpm);
    applyMusicSession(state.audio.currentTime);
  }
  syncControls();
});
binauralInput.addEventListener("change", () => {
  state.binaural = binauralInput.checked;
  if (state.running) startAudio();
  updateAudio();
  syncControls();
});
layerToggleInputs.forEach((input) => {
  input.addEventListener("change", () => {
    state.layers[input.dataset.layer] = input.checked;
    updateAudio();
    syncControls();
  });
});
appSwitcher.addEventListener("change", () => {
  if (appSwitcher.value) window.location.href = appSwitcher.value;
});
window.addEventListener("resize", resizeCanvas);
