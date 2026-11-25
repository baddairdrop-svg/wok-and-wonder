// WOK & WONDER — sound, synthesized with WebAudio, no audio files.
// Sizzles are filtered noise, chimes are little oscillator phrases, and the
// rush-hour horn is two square waves arguing. Everything is guarded: sound
// starts only after a player gesture, and a missing or muted context turns
// every call into a no-op.

let context = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMuted() { muted = !muted; return muted; }

export function unlockAudio() {
  try {
    if (context === null) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) context = new Ctor();
    }
    if (context && context.state === 'suspended') context.resume();
  } catch { context = null; }
}

function tone(from, to, seconds, type, volume, delay = 0) {
  if (muted || context === null) return;
  try {
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(context.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  } catch { /* decoration only */ }
}

function sizzle(seconds, volume, delay = 0) {
  if (muted || context === null) return;
  try {
    const start = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5200;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(start);
  } catch { /* decoration only */ }
}

export function soundAdd() { tone(500, 760, 0.06, 'triangle', 0.11); }
export function soundCookStart() { sizzle(0.3, 0.05); tone(200, 140, 0.12, 'sawtooth', 0.03); }
export function soundCollect() { tone(880, 1180, 0.08, 'sine', 0.12); }
export function soundReady() { tone(1180, 1180, 0.09, 'sine', 0.13); tone(1560, 1560, 0.15, 'sine', 0.11, 0.08); }
export function soundBurnt() { tone(220, 70, 0.4, 'sawtooth', 0.1); sizzle(0.35, 0.06, 0.05); }
export function soundServe(perfect) {
  tone(660, 660, 0.08, 'square', 0.07);
  tone(880, 880, 0.08, 'square', 0.07, 0.07);
  tone(1320, 1320, 0.16, 'square', 0.08, 0.14);
  if (perfect) { tone(1560, 1560, 0.12, 'sine', 0.1, 0.22); tone(1980, 1980, 0.2, 'sine', 0.09, 0.3); }
}
export function soundError() { tone(150, 105, 0.2, 'sawtooth', 0.09); }
export function soundLose() { tone(392, 392, 0.15, 'triangle', 0.11); tone(311, 262, 0.28, 'triangle', 0.11, 0.14); }
export function soundRush() { tone(523, 523, 0.12, 'square', 0.09); tone(523, 523, 0.12, 'square', 0.09, 0.16); tone(784, 784, 0.24, 'square', 0.09, 0.32); }
export function soundBuy() { tone(740, 740, 0.07, 'sine', 0.11); tone(1100, 1100, 0.12, 'sine', 0.11, 0.06); }
export function soundDayClear() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.17, 'triangle', 0.11, i * 0.1)); }
export function soundClick() { tone(700, 700, 0.04, 'sine', 0.06); }
