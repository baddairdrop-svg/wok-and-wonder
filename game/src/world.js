// WOK & WONDER — the world: the whole game as state and rules.
// Orders, stations, heat, quality, freshness, the tray, the plate, rush
// hours, VIPs, the bank and the upgrade shop all live here. The renderer
// only reads this file's state; the input handler only calls its verbs.
// Nothing in here knows what a pixel is.
//
// The cooking model, in one breath: a hot station holds a heat the player
// sets; while a component cooks, its quality climbs when the heat sits in
// the component's ideal band and falls (fast, above the band) when it does
// not. Finished food waits on the hot station for a short grace before it
// burns, so collecting promptly is a skill. In the tray, food slowly loses
// freshness. A served dish is graded on its weakest component, its average
// quality and its freshness — and the grade sets the tip.

import { BASE_HEARTS, BASE_MAX_ORDERS, COMPONENTS, DIFFICULTIES, LOCATIONS, MAX_PLATE, RECIPES, SHIFT_SECONDS, STATIONS, UPGRADES, gradeFor, recipesForLocation } from './config.js';
import { chance, makeRandom, pick, todaySeed } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_SHOP = 'shop';
export const SCREEN_DAY_END = 'dayEnd';
export const SCREEN_DAY_FAILED = 'dayFailed';
export const SCREEN_ENDLESS_END = 'endlessEnd';

export const EVENT_NONE = 0;
export const EVENT_READY = 1;
export const EVENT_BURNT = 2;
export const EVENT_SERVED = 4;
export const EVENT_PERFECT = 8;
export const EVENT_LOST = 16;
export const EVENT_RUSH = 32;
export const EVENT_DAY_OVER = 64;

const SAVE_KEY = 'wokWonderSaveV1';
let orderSerial = 0;

function freshStation(id) {
  return { id, heatSet: 50, heat: 35, job: null };
}

export class World {
  constructor(seed = 7) {
    this.baseSeed = seed;
    this.screen = SCREEN_TITLE;
    this.mode = 'day';
    this.locationIndex = 0;
    this.difficultyIndex = 1;
    this.day = 1;
    // Persistent progression (bank, upgrades, unlocks), saved between visits.
    this.bank = 0;
    this.upgrades = new Set();
    this.unlockedLoc = 0;
    this.bestEndless = 0;
    this.loadSave();
    this.resetShift(seed);
  }

  // -- persistence -----------------------------------------------------------
  loadSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Number.isFinite(data.bank)) this.bank = data.bank;
      if (Array.isArray(data.upgrades)) this.upgrades = new Set(data.upgrades.filter((id) => UPGRADES.some((u) => u.id === id)));
      if (Number.isFinite(data.unlockedLoc)) this.unlockedLoc = Math.min(LOCATIONS.length - 1, Math.max(0, data.unlockedLoc));
      if (Number.isFinite(data.bestEndless)) this.bestEndless = data.bestEndless;
    } catch { /* a private window or a corrupt save just starts fresh */ }
  }

  saveProgress() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        bank: this.bank,
        upgrades: [...this.upgrades],
        unlockedLoc: this.unlockedLoc,
        bestEndless: this.bestEndless,
      }));
    } catch { /* saving is a courtesy, never a requirement */ }
  }

  hasUpgrade(id) { return this.upgrades.has(id); }

  buyUpgrade(id) {
    const upgrade = UPGRADES.find((u) => u.id === id);
    if (!upgrade || this.upgrades.has(id) || this.bank < upgrade.cost) return false;
    this.bank -= upgrade.cost;
    this.upgrades.add(id);
    this.saveProgress();
    return true;
  }

  // -- setup -----------------------------------------------------------------
  maxOrders() { return BASE_MAX_ORDERS + (this.hasUpgrade('rail') ? 1 : 0); }
  heartsAtStart() { return BASE_HEARTS + (this.hasUpgrade('luckycat') ? 1 : 0); }
  location() { return LOCATIONS[this.locationIndex]; }
  difficulty() { return DIFFICULTIES[this.difficultyIndex]; }
  goal() { return Math.round(this.location().goal * this.difficulty().goal); }

  specialRecipe() {
    const todays = recipesForLocation(this.locationIndex);
    const next = makeRandom(todaySeed() + this.locationIndex * 77);
    return todays[Math.floor(next() * todays.length) % todays.length];
  }

  resetShift(seed = this.baseSeed + this.day * 131 + this.locationIndex * 17) {
    this.next = makeRandom(seed);
    this.coins = 0;
    this.hearts = this.heartsAtStart();
    this.combo = 0;
    this.bestCombo = 0;
    this.served = 0;
    this.lost = 0;
    this.perfects = 0;
    this.shiftLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.orders = [];
    this.spawnIn = 0;
    this.tray = [];
    this.plate = [];
    this.stations = {};
    for (const id of Object.keys(STATIONS)) this.stations[id] = freshStation(id);
    this.special = this.specialRecipe();
    this.rushT = 0;
    this.rushMarks = [108, 52];
    this.magnetUsed = false;
    this.floaters = [];
    this.hintedCook = false;
    this.lastServe = null;
    this.message = 'The lanterns are lit — first customers incoming!';
    this.shake = 0;
    for (let i = 0; i < this.maxOrders(); i += 1) this.orders.push(this.newOrder());
  }

  startDay(locationIndex = this.locationIndex, difficultyIndex = this.difficultyIndex, advanceDay = false) {
    this.mode = 'day';
    if (advanceDay) this.day += 1;
    this.locationIndex = Math.min(locationIndex, this.unlockedLoc);
    this.difficultyIndex = difficultyIndex;
    this.resetShift();
    this.screen = SCREEN_PLAY;
  }

  startEndless() {
    this.mode = 'endless';
    this.locationIndex = this.unlockedLoc;
    this.resetShift(this.baseSeed + 999);
    this.shiftLeft = Infinity;
    this.rushMarks = [];
    this.screen = SCREEN_PLAY;
    this.setMessage('Endless Night — serve until three customers walk out!');
  }

  newOrder() {
    const loc = this.location();
    const diff = this.difficulty();
    const pool = recipesForLocation(this.locationIndex);
    const recipe = chance(this.next, 0.25) ? this.special : pick(this.next, pool);
    const vip = chance(this.next, 0.15);
    let patience = loc.patience * diff.patience * (this.hasUpgrade('cushions') ? 1.2 : 1);
    if (vip) patience *= 0.72;
    orderSerial += 1;
    return { id: orderSerial, recipe, vip, patience, maxPatience: patience, born: this.elapsed ?? 0 };
  }

  // -- cooking ---------------------------------------------------------------
  cookSeconds(compId) {
    const comp = COMPONENTS[compId];
    let seconds = comp.cook;
    if (this.hasUpgrade('turbo')) seconds *= 0.8;
    if (comp.from === 'board' && this.hasUpgrade('cleaver')) seconds *= 0.6;
    return seconds;
  }

  bandFor(compId) {
    const band = COMPONENTS[compId].band;
    if (!band) return null;
    if (!this.hasUpgrade('wideband')) return band;
    return [Math.max(0, band[0] - 4), Math.min(100, band[1] + 4)];
  }

  startCook(compId) {
    const comp = COMPONENTS[compId];
    if (!comp || comp.from === 'pantry') return false;
    const station = this.stations[comp.from];
    if (station.job !== null) {
      this.setMessage(`${STATIONS[comp.from].name} is busy — collect or clear it first!`);
      return false;
    }
    station.job = { comp: compId, progress: 0, quality: 70, phase: 'cooking', grace: 0 };
    if (!this.hintedCook) {
      this.hintedCook = true;
      this.setMessage('Keep the heat needle in the green — quality climbs there! Collect the moment it is ready.');
    }
    return true;
  }

  adjustHeat(stationId, delta) {
    const station = this.stations[stationId];
    if (!station || !STATIONS[stationId].hot) return;
    station.heatSet = Math.max(0, Math.min(100, station.heatSet + delta));
  }

  /** Click a station: collect finished food, or clear a burnt mistake. */
  collectStation(stationId) {
    const station = this.stations[stationId];
    if (!station || station.job === null) return EVENT_NONE;
    if (station.job.phase === 'ready') {
      this.tray.push({ id: station.job.comp, quality: Math.round(station.job.quality), fresh: 100 });
      station.job = null;
      return EVENT_READY;
    }
    if (station.job.phase === 'burnt') {
      station.job = null;
      this.setMessage('Burnt food cleared. The market forgives, once.');
      return EVENT_BURNT;
    }
    return EVENT_NONE;
  }

  trayCount(compId) { return this.tray.filter((item) => item.id === compId).length; }

  /** The quality a tile should advertise: the oldest waiting piece goes first. */
  trayNext(compId) { return this.tray.find((item) => item.id === compId) ?? null; }

  addToPlate(compId) {
    const comp = COMPONENTS[compId];
    if (!comp) return false;
    if (this.plate.length >= MAX_PLATE) {
      this.setMessage('The plate is full — serve it or clear it!');
      return false;
    }
    if (comp.from === 'pantry') {
      this.plate.push({ id: compId, quality: 100, fresh: 100 });
      return true;
    }
    const at = this.tray.findIndex((item) => item.id === compId);
    if (at === -1) {
      this.setMessage(`No ${comp.short} in the tray — cook it at the ${STATIONS[comp.from].name}!`);
      return false;
    }
    this.plate.push(this.tray.splice(at, 1)[0]);
    return true;
  }

  removeLastFromPlate() {
    const item = this.plate.pop();
    if (item && COMPONENTS[item.id].from !== 'pantry') this.tray.push(item);
    return item;
  }

  clearPlate() { while (this.plate.length > 0) this.removeLastFromPlate(); }

  plateDiff(recipe) {
    const missing = [];
    const extra = [...this.plate.map((item) => item.id)];
    for (const compId of recipe.items) {
      const at = extra.indexOf(compId);
      if (at === -1) missing.push(compId);
      else extra.splice(at, 1);
    }
    return { missing, extra };
  }

  plateMatches(recipe) {
    const diff = this.plateDiff(recipe);
    return diff.missing.length === 0 && diff.extra.length === 0;
  }

  /** Grade the plate as it stands: weakest link, average, freshness. */
  dishScore(items = this.plate) {
    if (items.length === 0) return 0;
    const qualities = items.map((item) => item.quality);
    const minQ = Math.min(...qualities);
    const avgQ = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    const avgFresh = items.reduce((a, b) => a + b.fresh, 0) / items.length;
    return Math.round((0.6 * minQ + 0.4 * avgQ) * (0.65 + 0.35 * (avgFresh / 100)));
  }

  servePrice(order) {
    let price = order.recipe.price;
    if (order.vip) price *= 2;
    if (order.recipe.id === this.special.id) price *= 1.5;
    if (this.rushT > 0) price *= 1.2;
    return Math.round(price * this.difficulty().reward);
  }

  servePlate(orderId = null) {
    if (this.plate.length === 0) {
      this.setMessage('The plate is empty — build a dish first!');
      return null;
    }
    let order = null;
    if (orderId !== null) {
      order = this.orders.find((o) => o.id === orderId) ?? null;
      if (order && !this.plateMatches(order.recipe)) {
        const diff = this.plateDiff(order.recipe);
        const parts = [];
        if (diff.missing.length > 0) parts.push(`missing ${diff.missing.map((i) => COMPONENTS[i].short).join(', ')}`);
        if (diff.extra.length > 0) parts.push(`extra ${diff.extra.map((i) => COMPONENTS[i].short).join(', ')}`);
        this.setMessage(`Not ${order.recipe.name}: ${parts.join(' • ')}`);
        this.shake = 0.35;
        return null;
      }
    } else {
      order = this.orders.find((o) => this.plateMatches(o.recipe)) ?? null;
      if (!order) {
        this.setMessage('That plate matches no order on the rail!');
        this.shake = 0.35;
        return null;
      }
    }
    if (!order) return null;
    const score = this.dishScore();
    const grade = gradeFor(score);
    const base = this.servePrice(order);
    const patienceFrac = Math.max(0, order.patience / order.maxPatience);
    let tip = Math.round(base * 0.45 * patienceFrac * grade.tipFactor);
    if (this.hasUpgrade('lantern')) tip = Math.round(tip * 1.25);
    const comboBonus = this.combo * 4;
    const gained = base + tip + comboBonus;
    this.coins += gained;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.served += 1;
    if (grade.name === 'PERFECT') this.perfects += 1;
    this.lastServe = { name: order.recipe.name, gained, tip, grade: grade.name, score };
    this.floaters.push({ text: `+${gained}`, sub: `${grade.name} · tip +${tip}`, grade: grade.name, t: 0, life: 1.7 });
    this.orders = this.orders.filter((o) => o.id !== order.id);
    this.spawnIn = Math.min(this.spawnIn, 1.4);
    this.plate = [];
    this.setMessage(`${grade.name}! ${order.recipe.name} served for ${gained} coins${this.combo > 1 ? ` — combo ×${this.combo}` : ''}`);
    return { order, grade, gained };
  }

  setMessage(text) { this.message = text; }

  stars() {
    if (this.coins >= this.goal()) return 3;
    if (this.coins >= Math.round(this.goal() * 0.72)) return 2;
    if (this.coins >= Math.round(this.goal() * 0.45)) return 1;
    return 0;
  }

  finishDay(success) {
    // The day's coins bank: in full on a win, half on a hard night.
    this.bank += success ? this.coins : Math.floor(this.coins / 2);
    if (success && this.locationIndex === this.unlockedLoc && this.unlockedLoc < LOCATIONS.length - 1) {
      this.unlockedLoc += 1;
    }
    if (this.mode === 'endless') {
      this.bestEndless = Math.max(this.bestEndless, this.coins);
    }
    this.saveProgress();
  }

  // -- the clock ---------------------------------------------------------------
  step(dt) {
    let events = EVENT_NONE;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    for (const floater of this.floaters) floater.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < f.life);
    if (this.screen !== SCREEN_PLAY) return events;

    this.elapsed += dt;
    if (this.mode === 'day') this.shiftLeft = Math.max(0, this.shiftLeft - dt);

    // Rush hour: two marked surges a day, or a regular surge when endless.
    if (this.rushT > 0) {
      this.rushT = Math.max(0, this.rushT - dt);
    } else if (this.mode === 'day' && this.rushMarks.length > 0 && this.shiftLeft <= this.rushMarks[0]) {
      this.rushMarks.shift();
      this.rushT = 18;
      events |= EVENT_RUSH;
      this.setMessage('RUSH HOUR! The crowd surges — prices up 20%, patience down!');
    } else if (this.mode === 'endless' && this.elapsed > 40 && Math.floor(this.elapsed) % 55 === 0 && this.elapsed - Math.floor(this.elapsed) < dt) {
      this.rushT = 15;
      events |= EVENT_RUSH;
      this.setMessage('RUSH HOUR in the Endless Night!');
    }

    // Stations: heat chases its setting; jobs cook, wait, then burn.
    for (const station of Object.values(this.stations)) {
      const def = STATIONS[station.id];
      if (def.hot) {
        const chase = (this.hasUpgrade('charm') ? 10 : 16) * dt;
        const diff = station.heatSet - station.heat;
        station.heat += Math.max(-chase, Math.min(chase, diff));
        if (station.job === null) {
          // An idle burner cools toward a low simmer on its own.
          station.heatSet = Math.max(25, station.heatSet - 2 * dt);
          station.heat += Math.max(-chase, Math.min(chase, station.heatSet - station.heat));
        }
      }
      const job = station.job;
      if (job === null) continue;
      const comp = COMPONENTS[job.comp];
      if (job.phase === 'cooking') {
        let speed = 1;
        if (def.hot && comp.band) {
          const band = this.bandFor(job.comp);
          const wobble = Math.sin(this.elapsed * 1.4 + station.heatSet) * (this.hasUpgrade('charm') ? 1.2 : 3);
          const heat = station.heat + wobble;
          if (heat >= band[0] && heat <= band[1]) {
            job.quality = Math.min(100, job.quality + 7 * dt);
          } else if (heat > band[1]) {
            job.quality = Math.max(5, job.quality - (heat - band[1]) * 0.22 * dt * 10);
            speed = 1.25;
          } else {
            job.quality = Math.max(5, job.quality - 3 * dt);
            speed = 0.7;
          }
        }
        job.progress += (dt / this.cookSeconds(job.comp)) * speed;
        if (job.progress >= 1) {
          if (def.hot) {
            job.phase = 'ready';
            job.grace = 8 + (this.hasUpgrade('tongs') ? 4 : 0);
            events |= EVENT_READY;
          } else {
            this.tray.push({ id: job.comp, quality: Math.round(job.quality), fresh: 100 });
            station.job = null;
            events |= EVENT_READY;
          }
        }
      } else if (job.phase === 'ready') {
        job.quality = Math.max(5, job.quality - 2.5 * dt);
        job.grace -= dt;
        if (job.grace <= 0) {
          job.phase = 'burnt';
          events |= EVENT_BURNT;
          this.setMessage(`The ${COMPONENTS[job.comp].name} BURNED on the ${def.name}! Click the station to clear it.`);
        }
      }
    }

    // Tray freshness ebbs away.
    const freshRate = (100 / 80) * (this.hasUpgrade('freshbox') ? 0.5 : 1);
    for (const item of this.tray) item.fresh = Math.max(0, item.fresh - freshRate * dt);
    for (const item of this.plate) item.fresh = Math.max(0, item.fresh - freshRate * dt * 0.5);

    // Patience drains; an empty bar walks out.
    const drain = this.rushT > 0 ? 1.3 : 1;
    const survivors = [];
    for (const order of this.orders) {
      order.patience -= dt * drain;
      if (order.patience <= 0) {
        this.lost += 1;
        this.hearts -= 1;
        // A walkout breaks the combo, every time.
        this.combo = 0;
        events |= EVENT_LOST;
        this.setMessage(`The ${order.recipe.name} order walked out into the night!`);
      } else {
        survivors.push(order);
      }
    }
    this.orders = survivors;

    if (this.orders.length < this.maxOrders()) {
      this.spawnIn -= dt * (this.rushT > 0 ? 2 : 1);
      if (this.spawnIn <= 0) {
        this.orders.push(this.newOrder());
        this.spawnIn = this.location().spawnEvery * this.difficulty().spawn * (this.rushT > 0 ? 0.5 : 1);
      }
    }

    if (this.hearts <= 0) {
      this.finishDay(false);
      this.screen = this.mode === 'endless' ? SCREEN_ENDLESS_END : SCREEN_DAY_FAILED;
      events |= EVENT_DAY_OVER;
    } else if (this.mode === 'day' && this.shiftLeft <= 0) {
      const success = this.coins >= Math.round(this.goal() * 0.45);
      this.finishDay(success);
      this.screen = SCREEN_DAY_END;
      events |= EVENT_DAY_OVER;
    }
    return events;
  }
}
