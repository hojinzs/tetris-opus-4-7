// Web Audio API wrapper: synthesized chiptune SFX + looping BGM.
// No external assets; all sounds generated in-browser.

let ctx = null;
let sfxGain = null;
let bgmGain = null;
let masterSFX = 0.6;
let masterBGM = 0.25;
let sfxEnabled = true;
let bgmEnabled = true;
let bgmTimer = null;
let bgmStep = 0;

export function initAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return; // audio not supported
  ctx = new AC();
  sfxGain = ctx.createGain();
  sfxGain.gain.value = masterSFX;
  sfxGain.connect(ctx.destination);
  bgmGain = ctx.createGain();
  bgmGain.gain.value = masterBGM;
  bgmGain.connect(ctx.destination);
}

// Resume audio context on first user gesture (autoplay policy).
export function unlockAudio() {
  if (!ctx) initAudio();
  if (ctx && ctx.state === "suspended") ctx.resume();
}

export function setSfxVolume(v) {
  masterSFX = Math.max(0, Math.min(1, v));
  if (sfxGain) sfxGain.gain.value = sfxEnabled ? masterSFX : 0;
}
export function setBgmVolume(v) {
  masterBGM = Math.max(0, Math.min(1, v));
  if (bgmGain) bgmGain.gain.value = bgmEnabled ? masterBGM : 0;
}
export function setSfxEnabled(b) {
  sfxEnabled = !!b;
  if (sfxGain) sfxGain.gain.value = sfxEnabled ? masterSFX : 0;
}
export function setBgmEnabled(b) {
  bgmEnabled = !!b;
  if (bgmGain) bgmGain.gain.value = bgmEnabled ? masterBGM : 0;
  if (!bgmEnabled) stopBgm();
}

// --- Synth helpers ---
function tone({ freq, duration = 0.08, type = "square", volume = 0.5, attack = 0.005, release = 0.04, destination = sfxGain }) {
  if (!ctx || !destination) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + attack);
  gain.gain.linearRampToValueAtTime(0, t + duration + release);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(t);
  osc.stop(t + duration + release + 0.02);
}

function sweep({ from, to, duration = 0.1, type = "square", volume = 0.4, destination = sfxGain }) {
  if (!ctx || !destination) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + duration);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.005);
  gain.gain.linearRampToValueAtTime(0, t + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function noiseBurst({ duration = 0.08, volume = 0.35, bandFreq = 1200, destination = sfxGain }) {
  if (!ctx || !destination) return;
  const t = ctx.currentTime;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = bandFreq;
  bp.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.005);
  gain.gain.linearRampToValueAtTime(0, t + duration);
  src.connect(bp);
  bp.connect(gain);
  gain.connect(destination);
  src.start(t);
  src.stop(t + duration + 0.02);
}

// --- SFX ---
export const Sfx = {
  move() { tone({ freq: 440, duration: 0.025, type: "square", volume: 0.25 }); },
  rotate() { tone({ freq: 660, duration: 0.04, type: "square", volume: 0.3 }); },
  lock() {
    tone({ freq: 140, duration: 0.06, type: "triangle", volume: 0.4 });
    noiseBurst({ duration: 0.04, volume: 0.15, bandFreq: 800 });
  },
  hardDrop() {
    sweep({ from: 880, to: 180, duration: 0.09, type: "square", volume: 0.35 });
    noiseBurst({ duration: 0.06, volume: 0.2, bandFreq: 600 });
  },
  hold() {
    tone({ freq: 520, duration: 0.05, type: "triangle", volume: 0.3 });
    setTimeout(() => tone({ freq: 780, duration: 0.05, type: "triangle", volume: 0.3 }), 50);
  },
  lineClear(lines) {
    // Ascending arpeggio tied to number of lines
    const notes = lines >= 4
      ? [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6 (major)
      : lines === 3
      ? [523.25, 659.25, 783.99]
      : lines === 2
      ? [523.25, 659.25]
      : [523.25];
    notes.forEach((f, i) => setTimeout(() => {
      tone({ freq: f, duration: 0.08, type: "square", volume: 0.4 });
    }, i * 55));
    if (lines >= 4) {
      // Extra shimmer for Tetris
      setTimeout(() => sweep({ from: 1200, to: 2400, duration: 0.2, type: "triangle", volume: 0.25 }), 250);
    }
  },
  tSpin() {
    // Shimmery descending swoosh
    sweep({ from: 1400, to: 600, duration: 0.25, type: "sine", volume: 0.3 });
    setTimeout(() => tone({ freq: 880, duration: 0.07, type: "triangle", volume: 0.3 }), 120);
  },
  levelUp() {
    const seq = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    seq.forEach((f, i) => setTimeout(() => tone({ freq: f, duration: 0.08, type: "square", volume: 0.35 }), i * 70));
  },
  gameOver() {
    const seq = [523.25, 493.88, 440, 392, 349.23, 329.63, 261.63];
    seq.forEach((f, i) => setTimeout(() => tone({ freq: f, duration: 0.15, type: "triangle", volume: 0.35 }), i * 130));
  },
  perfectClear() {
    const seq = [659.25, 783.99, 987.77, 1318.51, 1567.98];
    seq.forEach((f, i) => setTimeout(() => tone({ freq: f, duration: 0.1, type: "square", volume: 0.4 }), i * 70));
  },
};

// --- BGM: simple chiptune loop (A minor pentatonic arpeggio + bass) ---
// 16 steps per bar, 2 bars = 32 steps
const MEL_FREQS = {
  A3: 220, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880,
};
const BGM_MELODY = [
  "A4","C5","E5","A5","E5","C5","A4","E4",
  "G4","B4","D5","G5","D5","B4","G4","D4",
  "F4","A4","C5","F5","C5","A4","F4","C4",
  "E4","G4","B4","E5","B4","G4","E4","B3",
];
const BGM_BASS = [
  "A3",null,null,null,"A3",null,null,null,
  "G3",null,null,null,"G3",null,null,null,
  "F3",null,null,null,"F3",null,null,null,
  "E3",null,null,null,"E3",null,null,null,
];
// Add missing bass notes
Object.assign(MEL_FREQS, { B3: 246.94, E3: 164.81, F3: 174.61, G3: 196, F4: 349.23, B4: 493.88, F5: 698.46 });

const BGM_STEP_MS = 140; // ~107 BPM 16ths

function playBgmStep() {
  if (!ctx || !bgmEnabled) return;
  const melKey = BGM_MELODY[bgmStep % BGM_MELODY.length];
  const basKey = BGM_BASS[bgmStep % BGM_BASS.length];
  if (melKey && MEL_FREQS[melKey]) {
    tone({ freq: MEL_FREQS[melKey], duration: 0.08, type: "square", volume: 0.25, destination: bgmGain });
  }
  if (basKey && MEL_FREQS[basKey]) {
    tone({ freq: MEL_FREQS[basKey], duration: 0.2, type: "triangle", volume: 0.4, destination: bgmGain });
  }
  bgmStep++;
}

export function startBgm() {
  if (!ctx) initAudio();
  if (!ctx || bgmTimer) return;
  bgmStep = 0;
  bgmTimer = setInterval(playBgmStep, BGM_STEP_MS);
}

export function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

export function isBgmPlaying() {
  return !!bgmTimer;
}
