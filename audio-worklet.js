const TWO_PI = Math.PI * 2;
const BREATH_CYCLE_SECONDS = 16;
const BREATH_GAIN = .44;
const BREATH_FLOOR = .04;

class MeditationBreathProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.playing = false;
    this.enabled = true;
    this.cycleSeconds = BREATH_CYCLE_SECONDS;
    this.startedAt = currentTime;
    this.noiseIndex = 0;
    this.low = 0;
    this.band = 0;
    this.warm = 0;
    this.envelope = 0;
    this.port.onmessage = (event) => {
      const message = event.data || {};
      if (message.type === "start") {
        this.playing = true;
        this.enabled = message.enabled !== false;
        this.cycleSeconds = Number(message.cycleSeconds) || BREATH_CYCLE_SECONDS;
        this.startedAt = currentTime;
      } else if (message.type === "stop") {
        this.playing = false;
      } else if (message.type === "state") {
        this.playing = Boolean(message.playing);
        this.enabled = message.enabled !== false;
        this.cycleSeconds = Number(message.cycleSeconds) || BREATH_CYCLE_SECONDS;
      }
    };
  }

  process(_, outputs) {
    const output = outputs[0];
    const left = output[0];
    const right = output[1] || left;

    for (let index = 0; index < left.length; index += 1) {
      if (!this.playing || !this.enabled) {
        left[index] = 0;
        right[index] = 0;
        continue;
      }

      const t = currentTime + index / sampleRate - this.startedAt;
      const sample = this.sampleBreath(t) * BREATH_GAIN;
      left[index] = sample;
      right[index] = sample;
    }

    return true;
  }

  sampleBreath(t) {
    const target = breathSwell(t, this.cycleSeconds);
    const raw = hashNoise(this.noiseIndex);
    this.noiseIndex += 1;
    this.low += (raw - this.low) * .006;
    this.band += (raw - this.band) * .028;
    this.warm += ((this.band - this.low * .65) - this.warm) * .045;
    this.envelope += (target - this.envelope) * .00078;

    const body = sine(172, t) * .044 + sine(229, t + .17) * .03;
    const airPad = this.warm * .42 + body;
    return softClip(airPad * this.envelope);
  }
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
