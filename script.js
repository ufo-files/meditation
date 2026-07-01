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
const TRACE_RGB = "17, 17, 17";
const BREATH_SIDE_SECONDS = 4;
const BREATH_CYCLE_SECONDS = 16;
const HEART_BPM_OPTIONS = [45, 60, 75, 90];

const catalog = window.UNIVERSE_STARS_DATA || { count: 0, stars: [] };
const stars = prepareStars((catalog.stars || []).slice(0, STAR_COUNT_TARGET));
const breathPoints = createUniverseProjectionPoints(CORE_POINT_COUNT, 7);
const beatPoints = createUniverseProjectionPoints(BEAT_POINT_COUNT, 19);
const dronePoints = createUniverseProjectionPoints(DRONE_POINT_COUNT, 31, Math.floor(stars.length * .37));

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
  },
  visual: {
    breath: 0,
    beat: 0,
    active: .32,
  },
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

  camera.position.z = 5.2;
  renderer.setClearColor(0xf6f5ef, 0);
  renderer.setPixelRatio(Math.max(1, Math.min(2, window.devicePixelRatio || 1)));
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.add(universe.points, breath.points, beat.points, drone.points);
  scene.add(root);

  return { THREE, scene, camera, renderer, root, universe, breath, beat, drone };
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
  view.universe.points.scale.setScalar(state.depth);
  view.universe.material.opacity = state.running ? .92 : .72;
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

  ctx.clearRect(0, 0, width, height);
  if (state.layers.universe) drawCanvasStars({ width, height, scale, rotationX, rotationY });
  if (state.layers.breath) drawCanvasSpherePoints(breathPoints, .24 + breath * .45, .9, rotationX, rotationY, .26 + breath * .24, state.running ? .025 : 0);
  if (state.layers.beat) drawCanvasSpherePoints(beatPoints, .62 + beat * .045, .74, rotationX * .9, rotationY * 1.08, .12 + beat * .22, state.running ? .004 : 0);
  if (state.layers.drone) drawCanvasDronePoints(dronePoints, .105, .9, rotationX * 1.1, rotationY * .82, .16, state.running ? audioElapsed(elapsed) : elapsed);
}

function updateVisualState(elapsed) {
  const targetBreath = state.running ? boxBreath(elapsed, BREATH_SIDE_SECONDS) : 0;
  const targetBeat = state.running ? beatEnvelope(elapsed, state.beatBpm) : 0;
  const targetActive = state.running ? 1 : .32;
  state.visual.breath += (targetBreath - state.visual.breath) * .055;
  state.visual.beat += (targetBeat - state.visual.beat) * .12;
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
    let breathSource = null;
    leftDrone.type = "sine";
    rightDrone.type = "sine";
    droneOvertone.type = "sine";
    breathGain.gain.value = 0;
    droneGain.gain.value = state.layers.drone ? .056 : 0;
    heartGain.gain.value = 1.15;
    leftGain.gain.value = 1;
    rightGain.gain.value = 1;
    droneOvertoneGain.gain.value = .32;
    leftDrone.connect(leftGain).connect(merger, 0, 0);
    rightDrone.connect(rightGain).connect(merger, 0, 1);
    merger.connect(droneGain).connect(master);
    droneOvertone.connect(droneOvertoneGain).connect(droneGain);
    heartGain.connect(master);
    if (audio.audioWorklet) {
      try {
        await audio.audioWorklet.addModule("audio-worklet.js");
        breathSource = new AudioWorkletNode(audio, "meditation-breath-processor", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        breathSource.connect(breathGain).connect(master);
      } catch (error) {
        console.error("Breath worklet failed", error);
      }
    }
    master.connect(audio.destination);
    master.gain.value = 0;
    leftDrone.start();
    rightDrone.start();
    droneOvertone.start();
    state.audio = audio;
    state.audioNodes = { master, droneGain, heartGain, breathGain, breathSource, leftDrone, rightDrone, droneOvertone, nextHeartBeatAt: 0 };
  }
  if (state.audio.state === "suspended") await state.audio.resume();
  state.startedAt = performance.now() / 1000;
  state.audioStartedAt = state.audio.currentTime;
  state.audioNodes.nextHeartBeatAt = 0;
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

function scheduleHeartBeats(now) {
  if (!state.audio || !state.audioNodes || !state.layers.beat || !state.running) return;
  const interval = 60 / Math.max(1, state.beatBpm);
  if (!state.audioNodes.nextHeartBeatAt || state.audioNodes.nextHeartBeatAt < now) {
    state.audioNodes.nextHeartBeatAt = now + .04;
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
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(startFrequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration * .72);
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.linearRampToValueAtTime(peakGain, at + .018);
  gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
  oscillator.connect(gain).connect(state.audioNodes.heartGain);
  oscillator.start(at);
  oscillator.stop(at + duration + .02);
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
