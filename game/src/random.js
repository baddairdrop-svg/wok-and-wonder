// WOK & WONDER — a small seeded random generator (splitmix style).
// A night's crowd is dealt from a seed, so a retry faces the same market,
// the screenshot scenes stage the exact frame they mean to show, and the
// daily special is the same for everyone who plays on the same date.

export function makeRandom(seed) {
  let state = (seed >>> 0) || 97;
  return function next() {
    state = (state + 0x9e3779b9) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 16), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(next, list) {
  return list[Math.floor(next() * list.length) % list.length];
}

export function chance(next, probability) {
  return next() < probability;
}

/** A seed for "today": the daily special and daily crowd derive from it. */
export function todaySeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}
