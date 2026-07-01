const TWO_PI = Math.PI * 2;
const BREATH_CYCLE_SECONDS = 16;
const BREATH_GAIN = .32;
const BREATH_FLOOR = .04;

class MeditationBreathProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.playing = false;
    this.enabled = true;
    this.cycleSeconds = BREATH_CYCLE_SECONDS;
    this.airHz = 760;
    this.startedAt = currentTime;
    this.envelope = 0;
    this.air = 0;
    this.port.onmessage = (event) => {
      const message = event.data || {};
      if (message.type === "start") {
        this.playing = true;
        this.enabled = message.enabled !== false;
        this.cycleSeconds = Number(message.cycleSeconds) || BREATH_CYCLE_SECONDS;
        this.startedAt = Number.isFinite(message.startedAt) ? message.startedAt : currentTime;
        this.airHz = Number(message.airHz) || this.airHz;
      } else if (message.type === "stop") {
        this.playing = false;
      } else if (message.type === "state") {
        this.playing = Boolean(message.playing);
        this.enabled = message.enabled !== false;
        this.cycleSeconds = Number(message.cycleSeconds) || BREATH_CYCLE_SECONDS;
        this.airHz = Number(message.airHz) || this.airHz;
      }
    };
  }

  process(_, outputs) {
    const output = outputs[0];
    const left = output[0];
    const right = output[1] || left;

    for (let index = 0; index < left.length; index += 1) {
      const t = currentTime + index / sampleRate - this.startedAt;
      const sample = this.sampleBreath(t, this.playing && this.enabled) * BREATH_GAIN;
      left[index] = sample;
      right[index] = sample;
    }

    return true;
  }

  sampleBreath(t, active) {
    const target = active ? breathAirEnvelope(t, this.cycleSeconds) : 0;
    const smoothing = target < this.envelope ? .00013 : .00042;
    this.envelope += (target - this.envelope) * smoothing;

    const rawAir =
      interpolatedNoise(t * this.airHz + 11.7) * .11 +
      interpolatedNoise(t * this.airHz * 1.368 + 23.1) * .09 +
      interpolatedNoise(t * this.airHz * 1.816 + 41.3) * .052;
    this.air += (rawAir - this.air) * .032;

    const chest = .995 + .004 * unipolarSine(.16, t + .2);
    const mouth = .93 + .026 * unipolarSine(.25, t + 1.6) + .012 * unipolarSine(.43, t);
    return softClip(this.air * this.envelope * chest * mouth);
  }
}

function breathAirEnvelope(t, cycleSeconds = BREATH_CYCLE_SECONDS) {
  const length = Math.max(4, cycleSeconds);
  const side = length / 4;
  const phase = positiveModulo(t, length);
  if (phase < side) return breathLobe(phase / side);
  if (phase < side * 2) return 0;
  if (phase < side * 3) return breathLobe((phase - side * 2) / side) * .9;
  return 0;
}

function breathLobe(value) {
  return Math.pow(Math.sin(Math.PI * clamp(value, 0, 1)), 1.05);
}

function breathSwell(t, cycleSeconds = BREATH_CYCLE_SECONDS) {
  const length = Math.max(4, cycleSeconds);
  const side = length / 4;
  const phase = positiveModulo(t, length);
  if (phase < side) return movementBreath(phase / side, .62);
  if (phase < side * 2) return BREATH_FLOOR;
  if (phase < side * 3) return movementBreath((phase - side * 2) / side, .78);
  return BREATH_FLOOR;
}

function movementBreath(value, peak) {
  const x = clamp(value, 0, 1);
  const attack = smootherstep(clamp(x / .28, 0, 1));
  const release = 1 - Math.pow(smoothstep(clamp((x - .36) / .64, 0, 1)), 1.55);
  return BREATH_FLOOR + (peak - BREATH_FLOOR) * attack * release;
}

function smoothstep(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function smootherstep(value) {
  const x = clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function easeOutSlow(value) {
  const x = clamp(value, 0, 1);
  return 1 - Math.pow(1 - x, 2.6);
}

function sine(frequency, t) {
  return Math.sin(TWO_PI * frequency * t);
}

function unipolarSine(frequency, t) {
  return .5 + .5 * sine(frequency, t);
}

function softClip(value) {
  return Math.tanh(value * 1.4) / 1.4;
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function interpolatedNoise(x) {
  const i = Math.floor(x);
  const fraction = x - i;
  const eased = fraction * fraction * (3 - 2 * fraction);
  return lerp(hashNoise(i), hashNoise(i + 1), eased);
}

function hashNoise(index) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
  return (value - Math.floor(value)) * 2 - 1;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

registerProcessor("meditation-breath-processor", MeditationBreathProcessor);
