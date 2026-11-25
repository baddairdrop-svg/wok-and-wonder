// WOK & WONDER — the renderer. Canvas 2D, no images, no libraries.
// The night market is drawn in layers: a dusk sky in the location's colours,
// strings of glowing bulbs, paper tickets, wooden station cards with live
// flames and steam, brass heat gauges with the ideal band painted on, and a
// serving plate whose contents carry little quality dots. Everything the
// player can click is positioned by the rect helpers exported here, and the
// input handler imports the very same helpers — what you see is exactly
// what you can touch.

import { COMPONENTS, COUNTER_ORDER, DIFFICULTIES, GRADES, LAYOUT, LOCATIONS, RECIPES, STATIONS, STATION_ORDER, UPGRADES, VIEW, gradeFor, stationRect, ticketRect } from './config.js';
import { SCREEN_DAY_END, SCREEN_DAY_FAILED, SCREEN_ENDLESS_END, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE } from './world.js';

const INK = '#1d1420';
const PAPER = '#fdf6e3';
const PANEL = '#241a30';
const PANEL_EDGE = '#57406b';
const GOLD = '#ffc93c';

export function tileRect(index) {
  const panel = LAYOUT.counter;
  const w = 86;
  const gap = 8;
  const total = COUNTER_ORDER.length * w + (COUNTER_ORDER.length - 1) * gap;
  const startX = panel.x + (panel.w - total) / 2;
  return { x: startX + index * (w + gap), y: panel.y + 44, w, h: 124 };
}

export function cookButtonRect(stationIndex, itemIndex) {
  const card = stationRect(stationIndex);
  const w = 71;
  return { x: card.x + 6 + itemIndex * (w + 4), y: card.y + 152, w, h: 42 };
}

export function heatButtonRect(stationIndex, dir) {
  const card = stationRect(stationIndex);
  return { x: dir < 0 ? card.x + 6 : card.x + card.w - 26, y: card.y + 116, w: 20, h: 20 };
}

export const TITLE_UI = {
  locCards: LOCATIONS.map((_, i) => ({ x: 90 + i * 380, y: 300, w: 340, h: 108 })),
  diffPills: DIFFICULTIES.map((_, i) => ({ x: 330 + i * 210, y: 436, w: 190, h: 40 })),
  startButton: { x: 390, y: 500, w: 240, h: 58 },
  endlessButton: { x: 650, y: 500, w: 240, h: 58 },
  shopButton: { x: 540, y: 574, w: 200, h: 44 },
};

export function shopCardRect(index) {
  const col = index % 5;
  const row = Math.floor(index / 5);
  return { x: 40 + col * 244, y: 150 + row * 196, w: 232, h: 180 };
}
export const SHOP_UI = {
  startButton: { x: 400, y: 640, w: 220, h: 52 },
  titleButton: { x: 660, y: 640, w: 220, h: 52 },
};

export const END_UI = {
  primaryButton: { x: 340, y: 520, w: 200, h: 54 },
  shopButton: { x: 560, y: 520, w: 200, h: 54 },
  titleButton: { x: 780, y: 520, w: 200, h: 54 },
};

function inside(x, y, rect) { return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h; }
export { inside };

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function text(ctx, value, x, y, size, colour, align = 'center', bold = true) {
  ctx.fillStyle = colour;
  ctx.font = `${bold ? '700' : '400'} ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function wrap(ctx, value, x, y, size, colour, maxWidth, lineHeight) {
  ctx.font = `400 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  const words = value.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) { lines.push(line); line = word; }
    else line = trial;
  }
  if (line) lines.push(line);
  lines.forEach((entry, i) => text(ctx, entry, x, y + i * lineHeight, size, colour, 'center', false));
  return lines.length;
}

/** One component drawn as food: a soft plate disc with the dish on top. */
export function drawFood(ctx, compId, cx, cy, r) {
  const comp = COMPONENTS[compId];
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.75, r * 0.95, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8f4e8';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#cbbf9d';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = comp.main;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = comp.accent;
  if (compId === 'friedEgg') {
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
  } else if (compId === 'satay' || compId === 'springRolls') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.5);
    ctx.fillRect(-r * 0.55, -r * 0.1, r * 1.1, r * 0.18);
    ctx.rotate(0.5);
    ctx.fillStyle = comp.shade;
    ctx.fillRect(-r * 0.5, -r * 0.05, r, r * 0.1);
    ctx.restore();
  } else if (compId === 'icedTea' || compId === 'limeJuice') {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(cx - r * 0.3, cy - r * 0.55, r * 0.18, r * 0.5);
  } else {
    ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.15, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = comp.shade;
    ctx.beginPath(); ctx.arc(cx + r * 0.22, cy + r * 0.18, r * 0.17, 0, Math.PI * 2); ctx.fill();
  }
}

function heart(ctx, cx, cy, s, filled) {
  ctx.fillStyle = filled ? '#e8452c' : 'rgba(232,69,44,0.22)';
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9);
  ctx.fill();
}

/** The shared night sky: gradient, moon, and two strings of bulbs. */
function drawSky(ctx, world, t) {
  const loc = world.location();
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, loc.sky);
  grad.addColorStop(1, loc.skyLow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#fdf6d8';
  ctx.beginPath(); ctx.arc(1180, 92, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(253,246,216,0.18)';
  ctx.beginPath(); ctx.arc(1180, 92, 44, 0, Math.PI * 2); ctx.fill();
  for (const [yBase, phase] of [[64, 0], [104, 2.2]]) {
    ctx.strokeStyle = 'rgba(10,6,16,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= VIEW.width; x += 32) {
      const y = yBase + Math.sin((x / VIEW.width) * Math.PI) * 26;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let x = 24; x < VIEW.width; x += 64) {
      const y = yBase + Math.sin((x / VIEW.width) * Math.PI) * 26;
      const sway = Math.sin(t * 1.3 + x * 0.05 + phase) * 2;
      const glow = 0.65 + 0.35 * Math.sin(t * 2.4 + x + phase);
      ctx.fillStyle = `rgba(255, 190, 92, ${0.25 * glow})`;
      ctx.beginPath(); ctx.arc(x + sway, y + 12, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath(); ctx.arc(x + sway, y + 12, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawHeader(ctx, world) {
  const loc = world.location();
  ctx.fillStyle = 'rgba(16,10,24,0.88)';
  ctx.fillRect(0, 0, VIEW.width, LAYOUT.header.h);
  ctx.fillStyle = loc.accent;
  ctx.fillRect(0, LAYOUT.header.h - 3, VIEW.width, 3);
  text(ctx, 'WOK & WONDER', 20, 20, 19, GOLD, 'left');
  text(ctx, `${loc.name} · DAY ${world.day} · ${world.difficulty().name}`, 20, 42, 12.5, '#e8dcc0', 'left', false);
  // Shift clock or endless tag.
  if (world.mode === 'endless') {
    text(ctx, 'ENDLESS NIGHT', 470, 28, 17, '#7fd4c9');
  } else {
    const total = 150;
    const frac = Math.max(0, world.shiftLeft / total);
    ctx.fillStyle = '#120b1a';
    rr(ctx, 330, 14, 300, 22, 11); ctx.fill();
    ctx.fillStyle = world.shiftLeft < 25 ? '#e2543e' : GOLD;
    if (frac > 0) { rr(ctx, 332, 16, 296 * frac, 18, 9); ctx.fill(); }
    const mm = Math.floor(world.shiftLeft / 60);
    const ss = Math.floor(world.shiftLeft % 60).toString().padStart(2, '0');
    text(ctx, `SHIFT ${mm}:${ss}`, 480, 25, 13, '#241a30');
    if (world.rushT > 0) text(ctx, '★ RUSH HOUR ★', 480, 47, 12.5, '#ff8a5c');
  }
  text(ctx, `COINS ${world.coins}`, 700, 20, 16, GOLD, 'left');
  text(ctx, `BANK ${world.bank}`, 700, 42, 12, '#b8a8d0', 'left', false);
  for (let i = 0; i < world.heartsAtStart(); i += 1) heart(ctx, 880 + i * 30, 26, 10, i < world.hearts);
  if (world.combo >= 2) text(ctx, `COMBO ×${world.combo}`, 1060, 28, 17, '#ff8a5c', 'left');
  if (world.lastServe && world.screen === 'play') { /* floaters live on the plate */ }
}

function drawTickets(ctx, world, t) {
  for (let i = 0; i < world.maxOrders(); i += 1) {
    const baseRect = ticketRect(i);
    const order = world.orders[i];
    // Fresh tickets slide in from the right and settle — the rail feels alive.
    const age = order ? world.elapsed - (order.born ?? 0) : 1;
    const slide = age < 0.35 ? (0.35 - age) * 160 : 0;
    const rect = { ...baseRect, x: baseRect.x + slide };
    if (!order) {
      ctx.strokeStyle = 'rgba(253,246,227,0.25)';
      ctx.setLineDash([6, 6]);
      rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'waiting for a customer…', rect.x + rect.w / 2, rect.y + rect.h / 2, 12, 'rgba(253,246,227,0.45)', 'center', false);
      continue;
    }
    const matches = world.plateMatches(order.recipe);
    ctx.save();
    if (matches) {
      ctx.shadowColor = '#7fc24a';
      ctx.shadowBlur = 18 + 6 * Math.sin(t * 6);
    }
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    if (order.vip) { grad.addColorStop(0, '#ffe9a3'); grad.addColorStop(1, '#f5c95c'); }
    else { grad.addColorStop(0, PAPER); grad.addColorStop(1, '#efe0bd'); }
    ctx.fillStyle = grad;
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = order.vip ? '#b8860b' : '#a08b5f';
    ctx.lineWidth = 1.5;
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.stroke();
    const isSpecial = order.recipe.id === world.special.id;
    const title = `${isSpecial ? '★ ' : ''}${order.recipe.name}`;
    ctx.font = '700 13px "Trebuchet MS", sans-serif';
    let shown = title;
    while (ctx.measureText(shown).width > rect.w - 16 && shown.length > 4) shown = shown.slice(0, -1);
    text(ctx, shown, rect.x + 10, rect.y + 16, 13, INK, 'left');
    if (order.vip) text(ctx, 'VIP ×2', rect.x + rect.w - 10, rect.y + 16, 11.5, '#8a5a00', 'right');
    order.recipe.items.forEach((compId, j) => {
      const cx = rect.x + 26 + j * 42;
      drawFood(ctx, compId, cx, rect.y + 52, 15);
      const onPlate = world.plate.filter((item) => item.id === compId).length;
      const needed = order.recipe.items.slice(0, j + 1).filter((id) => id === compId).length;
      if (onPlate >= needed) {
        ctx.strokeStyle = '#58b368';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, rect.y + 52, 18, 0, Math.PI * 2); ctx.stroke();
      }
    });
    const frac = Math.max(0, order.patience / order.maxPatience);
    ctx.fillStyle = '#d8c9a3';
    rr(ctx, rect.x + 10, rect.y + 84, rect.w - 20, 10, 5); ctx.fill();
    ctx.fillStyle = frac > 0.45 ? '#58b368' : frac > 0.22 ? '#e8a13c' : '#d63a22';
    if (frac > 0) { rr(ctx, rect.x + 10, rect.y + 84, (rect.w - 20) * frac, 10, 5); ctx.fill(); }
    const price = world.servePrice(order);
    text(ctx, `${price} coins${isSpecial ? ' · ★ SPECIAL +50%' : ''}`, rect.x + 10, rect.y + 108, 11.5, '#6b5320', 'left');
    if (matches) text(ctx, 'READY — CLICK TO SERVE!', rect.x + rect.w - 10, rect.y + 108, 11, '#2f7a33', 'right');
  }
}

function drawTonight(ctx, world) {
  const panel = LAYOUT.tonightPanel;
  ctx.fillStyle = PANEL;
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 12); ctx.fill();
  ctx.strokeStyle = PANEL_EDGE; ctx.lineWidth = 2; rr(ctx, panel.x, panel.y, panel.w, panel.h, 12); ctx.stroke();
  text(ctx, 'TONIGHT AT THE MARKET', panel.x + 16, panel.y + 18, 13, GOLD, 'left');
  text(ctx, `★ SPECIAL: ${world.special.name} (+50%)`, panel.x + 16, panel.y + 44, 13.5, '#ffd98a', 'left');
  if (world.mode === 'day') {
    const goal = world.goal();
    const frac = Math.min(1, world.coins / goal);
    text(ctx, `GOAL ${goal} coins`, panel.x + 16, panel.y + 70, 12.5, '#e8dcc0', 'left');
    ctx.fillStyle = '#120b1a';
    rr(ctx, panel.x + 130, panel.y + 61, panel.w - 146, 16, 8); ctx.fill();
    ctx.fillStyle = frac >= 1 ? '#7fc24a' : GOLD;
    if (frac > 0) { rr(ctx, panel.x + 132, panel.y + 63, (panel.w - 150) * frac, 12, 6); ctx.fill(); }
    const next = world.rushMarks[0];
    text(ctx, world.rushT > 0 ? 'RUSH HOUR IS ON — hold the line!' : next !== undefined ? `Next rush when the clock hits ${Math.floor(next / 60)}:${(next % 60).toString().padStart(2, '0')}` : 'The rushes are spent — finish strong.', panel.x + 16, panel.y + 98, 12, world.rushT > 0 ? '#ff8a5c' : '#b8a8d0', 'left', false);
  } else {
    text(ctx, `BEST ENDLESS: ${world.bestEndless} coins`, panel.x + 16, panel.y + 70, 12.5, '#e8dcc0', 'left');
    text(ctx, 'Survive the night. Three walkouts end it.', panel.x + 16, panel.y + 98, 12, '#b8a8d0', 'left', false);
  }
}

function drawFlames(ctx, cx, cy, w, heat, t) {
  const n = 5;
  for (let i = 0; i < n; i += 1) {
    const fx = cx - w / 2 + (i / (n - 1)) * w;
    const h = 8 + heat * 0.22 + Math.sin(t * 9 + i * 1.7) * 4;
    ctx.fillStyle = i % 2 ? '#e2543e' : '#ff8a3c';
    ctx.beginPath();
    ctx.moveTo(fx - 6, cy);
    ctx.quadraticCurveTo(fx, cy - h, fx + 6, cy);
    ctx.fill();
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(fx - 3, cy);
    ctx.quadraticCurveTo(fx, cy - h * 0.55, fx + 3, cy);
    ctx.fill();
  }
}

function drawSteam(ctx, cx, cy, t, seed, amount = 3) {
  for (let i = 0; i < amount; i += 1) {
    const phase = (t * 0.5 + i / amount + seed) % 1;
    const x = cx + Math.sin(phase * 5 + seed * 9) * 10;
    const y = cy - phase * 34;
    ctx.fillStyle = `rgba(240,244,255,${0.35 * (1 - phase)})`;
    ctx.beginPath(); ctx.arc(x, y, 4 + phase * 8, 0, Math.PI * 2); ctx.fill();
  }
}

function drawStationCard(ctx, world, stationId, index, t) {
  const card = stationRect(index);
  const def = STATIONS[stationId];
  const station = world.stations[stationId];
  const job = station.job;
  ctx.fillStyle = '#2d2138';
  rr(ctx, card.x, card.y, card.w, card.h, 12); ctx.fill();
  ctx.strokeStyle = job && job.phase === 'ready' ? '#7fc24a' : job && job.phase === 'burnt' ? '#e2543e' : PANEL_EDGE;
  ctx.lineWidth = job && job.phase !== 'cooking' ? 3 : 2;
  rr(ctx, card.x, card.y, card.w, card.h, 12); ctx.stroke();
  // Awning stripe in the station colour.
  ctx.fillStyle = def.colour;
  rr(ctx, card.x, card.y, card.w, 26, 12); ctx.fill();
  ctx.fillRect(card.x, card.y + 14, card.w, 12);
  text(ctx, def.name, card.x + card.w / 2, card.y + 14, 13.5, '#fff6e0');
  const cx = card.x + card.w / 2;
  const cy = card.y + 68;
  // Appliance art per station.
  if (stationId === 'wok') {
    drawFlames(ctx, cx, cy + 26, 62, station.heat, t);
    ctx.fillStyle = '#23202a';
    ctx.beginPath(); ctx.ellipse(cx, cy + 8, 40, 15, 0, 0, Math.PI); ctx.fill();
    ctx.fillRect(cx - 40, cy + 6, 80, 4);
    if (job) drawFood(ctx, job.comp, cx, cy + 2, 20);
  } else if (stationId === 'grill') {
    drawFlames(ctx, cx, cy + 24, 66, station.heat, t);
    ctx.fillStyle = '#17141c';
    ctx.fillRect(cx - 42, cy + 4, 84, 16);
    ctx.fillStyle = '#3d3648';
    for (let i = 0; i < 5; i += 1) ctx.fillRect(cx - 38 + i * 17, cy + 6, 9, 12);
    if (job) drawFood(ctx, job.comp, cx, cy + 2, 20);
  } else if (stationId === 'steamer') {
    for (let tier = 0; tier < 3; tier += 1) {
      ctx.fillStyle = tier % 2 ? '#c9a86b' : '#b8934f';
      rr(ctx, cx - 38, cy + 12 - tier * 13, 76, 12, 5); ctx.fill();
    }
    ctx.fillStyle = '#a52312';
    ctx.beginPath(); ctx.arc(cx, cy - 30, 5, 0, Math.PI * 2); ctx.fill();
    if (job && job.phase === 'cooking') drawSteam(ctx, cx, cy - 30, t, index);
    if (job) drawFood(ctx, job.comp, cx, cy - 8, 17);
  } else if (stationId === 'fryer') {
    ctx.fillStyle = '#2a2f3a';
    rr(ctx, cx - 40, cy - 4, 80, 28, 8); ctx.fill();
    ctx.fillStyle = '#e8b93c';
    rr(ctx, cx - 34, cy, 68, 9, 4); ctx.fill();
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = 'rgba(255,240,180,0.8)';
      ctx.beginPath(); ctx.arc(cx - 24 + i * 16 + Math.sin(t * 6 + i) * 2, cy + 2, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    if (job) drawFood(ctx, job.comp, cx, cy - 12, 19);
  } else {
    ctx.fillStyle = '#8a6a42';
    rr(ctx, cx - 42, cy - 8, 84, 34, 6); ctx.fill();
    ctx.fillStyle = '#a8854f';
    rr(ctx, cx - 36, cy - 3, 72, 8, 4); ctx.fill();
    ctx.save();
    ctx.translate(cx + 16, cy - 16);
    ctx.rotate(0.5 + Math.sin(t * 2) * 0.05);
    ctx.fillStyle = '#cfd6dd';
    ctx.fillRect(-4, -20, 8, 26);
    ctx.fillStyle = '#5f3013';
    ctx.fillRect(-3, 6, 6, 14);
    ctx.restore();
    if (job) drawFood(ctx, job.comp, cx - 12, cy + 8, 18);
  }
  // A finished dish pulses a ring so the eye catches it before it burns.
  if (job && job.phase === 'ready') {
    const pulse = (t * 1.4 + index * 0.3) % 1;
    ctx.strokeStyle = `rgba(127,194,74,${0.75 * (1 - pulse)})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, 30 + pulse * 22, 0, Math.PI * 2); ctx.stroke();
  }
  // Cooking progress arc.
  if (job && job.phase === 'cooking') {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = def.colour;
    ctx.beginPath(); ctx.arc(cx, cy, 46, -Math.PI / 2, -Math.PI / 2 + job.progress * Math.PI * 2); ctx.stroke();
  }
  if (job && job.phase === 'cooking') drawSteam(ctx, cx + 18, cy - 18, t, index + 3, 2);
  // Status line.
  if (job === null) text(ctx, 'idle — pick a dish below', cx, card.y + 106, 11, '#9a8ab0', 'center', false);
  else if (job.phase === 'cooking') text(ctx, `${COMPONENTS[job.comp].short} · Q${Math.round(job.quality)} · ${Math.round(job.progress * 100)}%`, cx, card.y + 106, 11.5, '#e8dcc0');
  else if (job.phase === 'ready') text(ctx, `READY! click to collect · ${Math.ceil(job.grace)}s`, cx, card.y + 106, 11.5, '#7fc24a');
  else text(ctx, 'BURNT! click to clear', cx, card.y + 106, 12, '#ff7a5c');
  // Heat gauge with the current job's ideal band painted on.
  if (def.hot) {
    const minus = heatButtonRect(index, -1);
    const plus = heatButtonRect(index, 1);
    for (const [rect, label] of [[minus, '−'], [plus, '+']]) {
      ctx.fillStyle = '#171021';
      rr(ctx, rect.x, rect.y, rect.w, rect.h, 5); ctx.fill();
      ctx.strokeStyle = PANEL_EDGE; ctx.lineWidth = 1.5; rr(ctx, rect.x, rect.y, rect.w, rect.h, 5); ctx.stroke();
      text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 15, GOLD);
    }
    const gx = card.x + 30;
    const gw = card.w - 60;
    const gy = card.y + 120;
    ctx.fillStyle = '#171021';
    rr(ctx, gx, gy, gw, 12, 6); ctx.fill();
    const band = job ? world.bandFor(job.comp) : null;
    if (band) {
      ctx.fillStyle = 'rgba(127,194,74,0.55)';
      rr(ctx, gx + (band[0] / 100) * gw, gy, ((band[1] - band[0]) / 100) * gw, 12, 6); ctx.fill();
    }
    const heatX = gx + (station.heat / 100) * gw;
    ctx.fillStyle = '#ff8a3c';
    ctx.fillRect(heatX - 2, gy - 3, 4, 18);
    text(ctx, `heat ${Math.round(station.heat)}`, cx, card.y + 146, 10.5, '#9a8ab0', 'center', false);
  } else {
    text(ctx, 'no heat — fresh & fast', cx, card.y + 126, 10.5, '#9a8ab0', 'center', false);
  }
  // Cook buttons.
  def.makes.forEach((compId, itemIndex) => {
    const rect = cookButtonRect(index, itemIndex);
    const comp = COMPONENTS[compId];
    const busy = job !== null;
    ctx.fillStyle = busy ? '#3a2d4a' : '#171021';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 8); ctx.fill();
    ctx.strokeStyle = busy ? '#4a3a5c' : def.colour;
    ctx.lineWidth = 1.5;
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 8); ctx.stroke();
    drawFood(ctx, compId, rect.x + 16, rect.y + 21, 10);
    text(ctx, comp.short, rect.x + 29, rect.y + 15, 11, busy ? '#8a7a9e' : '#fdf6e3', 'left');
    text(ctx, `${def.keys[itemIndex]} · ${world.cookSeconds(compId).toFixed(1)}s`, rect.x + 29, rect.y + 30, 9.5, '#9a8ab0', 'left', false);
  });
}

function drawStations(ctx, world, t) {
  const panel = LAYOUT.stationsPanel;
  ctx.fillStyle = 'rgba(20,13,28,0.82)';
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 14); ctx.fill();
  ctx.strokeStyle = PANEL_EDGE; ctx.lineWidth = 2; rr(ctx, panel.x, panel.y, panel.w, panel.h, 14); ctx.stroke();
  text(ctx, 'THE FIVE STATIONS — ride the heat into the green band, collect before it burns', panel.x + panel.w / 2, panel.y + 20, 13, '#e8dcc0');
  STATION_ORDER.forEach((stationId, i) => drawStationCard(ctx, world, stationId, i, t));
}

function drawPlate(ctx, world, t) {
  const panel = LAYOUT.platePanel;
  ctx.fillStyle = PANEL;
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 14); ctx.fill();
  ctx.strokeStyle = PANEL_EDGE; ctx.lineWidth = 2; rr(ctx, panel.x, panel.y, panel.w, panel.h, 14); ctx.stroke();
  text(ctx, 'THE SERVING PLATE', panel.x + panel.w / 2, panel.y + 20, 13, GOLD);
  const cx = panel.x + 108;
  const cy = panel.y + 118;
  ctx.fillStyle = '#171021';
  ctx.beginPath(); ctx.arc(cx, cy, 82, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8f4e8';
  ctx.beginPath(); ctx.arc(cx, cy, 76, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#cbbf9d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.stroke();
  const spots = [[0, -26], [-30, 8], [30, 8], [-16, -4], [16, -4]];
  world.plate.forEach((item, i) => {
    const [dx, dy] = spots[i % spots.length];
    drawFood(ctx, item.id, cx + dx, cy + dy, 21);
    ctx.fillStyle = item.quality >= 85 ? '#ffc93c' : item.quality >= 65 ? '#7fc24a' : item.quality >= 45 ? '#e8a13c' : '#e2543e';
    ctx.beginPath(); ctx.arc(cx + dx + 15, cy + dy - 15, 6, 0, Math.PI * 2); ctx.fill();
    text(ctx, `${Math.round(item.quality)}`, cx + dx + 15, cy + dy - 14.5, 8, '#241a30');
  });
  if (world.plate.length === 0) text(ctx, 'empty plate', cx, cy, 12.5, '#8a7a9e', 'center', false);
  // Grade preview.
  const gx = panel.x + 214;
  text(ctx, 'DISH GRADE', gx, panel.y + 52, 11, '#9a8ab0', 'left', false);
  if (world.plate.length > 0) {
    const score = world.dishScore();
    const grade = gradeFor(score);
    text(ctx, grade.name, gx, panel.y + 80, 21, grade.colour, 'left');
    text(ctx, `score ${score} / 100`, gx, panel.y + 104, 12, '#e8dcc0', 'left', false);
  } else {
    text(ctx, '—', gx, panel.y + 80, 21, '#57406b', 'left');
  }
  // Serve / clear.
  const serve = LAYOUT.serveButton;
  const anyMatch = world.orders.some((o) => world.plateMatches(o.recipe));
  ctx.fillStyle = anyMatch ? '#58b368' : '#2f7a33';
  rr(ctx, serve.x, serve.y, serve.w, serve.h, 12); ctx.fill();
  text(ctx, 'SERVE ▶', serve.x + serve.w / 2, serve.y + 20, 17, '#ffffff');
  text(ctx, 'Enter', serve.x + serve.w / 2, serve.y + 41, 10.5, 'rgba(255,255,255,0.75)', 'center', false);
  const clear = LAYOUT.clearButton;
  ctx.fillStyle = '#171021';
  rr(ctx, clear.x, clear.y, clear.w, clear.h, 10); ctx.fill();
  ctx.strokeStyle = PANEL_EDGE; ctx.lineWidth = 1.5; rr(ctx, clear.x, clear.y, clear.w, clear.h, 10); ctx.stroke();
  text(ctx, 'CLEAR (Bksp)', clear.x + clear.w / 2, clear.y + clear.h / 2, 12, '#e8dcc0');
  // Contents line.
  const names = world.plate.map((item) => COMPONENTS[item.id].short).join(' · ');
  text(ctx, names || 'Click counter tiles to build a dish', panel.x + 16, panel.y + panel.h - 14, 11.5, '#b8a8d0', 'left', false);
  // Floaters rise off the serve button.
  for (const floater of world.floaters) {
    const p = floater.t / floater.life;
    ctx.globalAlpha = 1 - p;
    const grade = GRADES.find((g) => g.name === floater.grade);
    text(ctx, floater.text, serve.x + serve.w / 2, serve.y - 16 - p * 62, 25, grade ? grade.colour : GOLD);
    text(ctx, floater.sub, serve.x + serve.w / 2, serve.y + 12 - p * 62, 13, '#fdf6e3');
    ctx.globalAlpha = 1;
  }
}

function drawCounter(ctx, world) {
  const panel = LAYOUT.counter;
  ctx.fillStyle = 'rgba(20,13,28,0.82)';
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 14); ctx.fill();
  ctx.strokeStyle = PANEL_EDGE; ctx.lineWidth = 2; rr(ctx, panel.x, panel.y, panel.w, panel.h, 14); ctx.stroke();
  text(ctx, 'THE COUNTER — pantry staples are always ready; cooked food waits in the tray with its quality & freshness', panel.x + panel.w / 2, panel.y + 20, 13, '#e8dcc0');
  COUNTER_ORDER.forEach((compId, i) => {
    const rect = tileRect(i);
    const comp = COMPONENTS[compId];
    const isPantry = comp.from === 'pantry';
    const count = isPantry ? Infinity : world.trayCount(compId);
    ctx.fillStyle = '#2d2138';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
    ctx.strokeStyle = count > 0 || isPantry ? comp.shade : '#453457';
    ctx.lineWidth = 1.5;
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.stroke();
    drawFood(ctx, compId, rect.x + rect.w / 2, rect.y + 38, 23);
    text(ctx, comp.short, rect.x + rect.w / 2, rect.y + 72, 11.5, '#fdf6e3');
    if (isPantry) {
      text(ctx, 'PANTRY', rect.x + rect.w / 2, rect.y + 92, 10, '#7fd4c9');
    } else {
      const nextItem = world.trayNext(compId);
      text(ctx, count > 0 ? `tray ×${count}` : 'cook it!', rect.x + rect.w / 2, rect.y + 90, 10.5, count > 0 ? GOLD : '#8a7a9e');
      if (nextItem) {
        text(ctx, `Q${nextItem.quality}`, rect.x + rect.w / 2 - 14, rect.y + 108, 10, nextItem.quality >= 70 ? '#7fc24a' : '#e8a13c');
        ctx.fillStyle = '#171021';
        rr(ctx, rect.x + 44, rect.y + 102, 30, 7, 3); ctx.fill();
        ctx.fillStyle = nextItem.fresh > 40 ? '#7fd4c9' : '#e2543e';
        if (nextItem.fresh > 0) { rr(ctx, rect.x + 45, rect.y + 103, 28 * (nextItem.fresh / 100), 5, 2); ctx.fill(); }
      }
    }
    if (comp.key) text(ctx, comp.key, rect.x + 7, rect.y + 12, 10, '#9a8ab0', 'left', false);
  });
}

function drawFooter(ctx, world) {
  ctx.fillStyle = 'rgba(16,10,24,0.88)';
  ctx.fillRect(0, LAYOUT.footer.y, VIEW.width, LAYOUT.footer.h);
  text(ctx, world.message, VIEW.width / 2, LAYOUT.footer.y + 22, 15, '#ffd98a');
  text(ctx, `Served ${world.served} · Perfects ${world.perfects} · Walked out ${world.lost} · Best combo ×${world.bestCombo}`, 20, LAYOUT.footer.y + 52, 12, '#b8a8d0', 'left', false);
  text(ctx, 'Keys: Q–P cook · Z/X heat of last station used · 1–= plate · Enter serve · M mute', VIEW.width - 20, LAYOUT.footer.y + 52, 12, '#b8a8d0', 'right', false);
}

function drawPlay(ctx, world, t) {
  drawSky(ctx, world, t);
  const shakeX = world.shake > 0 ? Math.sin(t * 70) * 5 * world.shake : 0;
  ctx.save();
  ctx.translate(shakeX, 0);
  drawHeader(ctx, world);
  drawTickets(ctx, world, t);
  drawTonight(ctx, world);
  drawStations(ctx, world, t);
  drawPlate(ctx, world, t);
  drawCounter(ctx, world);
  drawFooter(ctx, world);
  if (world.rushT > 0 && world.elapsed < 9999) {
    // A slim rush ribbon under the header while the surge lasts.
    ctx.fillStyle = 'rgba(210,58,34,0.85)';
    ctx.fillRect(0, LAYOUT.header.h, VIEW.width, 0);
  }
  ctx.restore();
}

function drawTitle(ctx, world, t) {
  drawSky(ctx, world, t);
  // Big hanging lanterns.
  for (const [lx, s, phase] of [[150, 1.15, 0], [1130, 1.15, 2], [640, 0.8, 4]]) {
    const sway = Math.sin(t * 1.1 + phase) * 5;
    ctx.strokeStyle = 'rgba(10,6,16,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + sway, 58 * s); ctx.stroke();
    const grad = ctx.createRadialGradient(lx + sway, 84 * s, 4, lx + sway, 84 * s, 46 * s);
    grad.addColorStop(0, 'rgba(255,217,138,0.95)');
    grad.addColorStop(1, 'rgba(226,84,62,0.12)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(lx + sway, 84 * s, 34 * s, 42 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2543e';
    ctx.beginPath(); ctx.ellipse(lx + sway, 84 * s, 24 * s, 34 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.ellipse(lx + sway, 84 * s, 9 * s, 30 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.shadowColor = 'rgba(255,201,60,0.55)';
  ctx.shadowBlur = 26;
  text(ctx, 'WOK & WONDER', VIEW.width / 2, 138, 62, GOLD);
  ctx.restore();
  text(ctx, 'N I G H T   M A R K E T   R U S H', VIEW.width / 2, 182, 21, '#ffd98a');
  text(ctx, 'Ride the heat, plate with pride, and feed the whole market before their patience runs out.', VIEW.width / 2, 216, 15.5, '#e8dcc0', 'center', false);
  // Feature chips: the whole game in one glance, right under the subtitle.
  const chips = ['5 STATIONS', '12 RECIPES', '3 MARKETS', '10 UPGRADES', 'VIP + RUSH HOURS', 'ENDLESS MODE'];
  ctx.font = '700 11.5px "Trebuchet MS", "Segoe UI", sans-serif';
  const chipWidths = chips.map((c) => ctx.measureText(c).width + 22);
  let chipX = VIEW.width / 2 - chipWidths.reduce((a, b) => a + b + 8, -8) / 2;
  chips.forEach((chip, i) => {
    ctx.fillStyle = 'rgba(23,16,33,0.85)';
    rr(ctx, chipX, 230, chipWidths[i], 22, 11); ctx.fill();
    ctx.strokeStyle = 'rgba(255,201,60,0.6)';
    ctx.lineWidth = 1;
    rr(ctx, chipX, 230, chipWidths[i], 22, 11); ctx.stroke();
    text(ctx, chip, chipX + chipWidths[i] / 2, 241.5, 11.5, '#ffd98a');
    chipX += chipWidths[i] + 8;
  });
  text(ctx, `BANK ${world.bank} coins · ${world.upgrades.size} upgrades owned${world.bestEndless > 0 ? ` · Best endless ${world.bestEndless}` : ''}`, VIEW.width / 2, 270, 14, '#b8a8d0', 'center', false);
  // Location cards.
  text(ctx, 'CHOOSE YOUR MARKET', VIEW.width / 2, 290, 13, '#9a8ab0');
  TITLE_UI.locCards.forEach((rect, i) => {
    const loc = LOCATIONS[i];
    const locked = i > world.unlockedLoc;
    const selected = world.locationIndex === i;
    ctx.fillStyle = locked ? '#1d1526' : '#2d2138';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 14); ctx.fill();
    ctx.strokeStyle = selected ? GOLD : PANEL_EDGE;
    ctx.lineWidth = selected ? 3 : 2;
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 14); ctx.stroke();
    ctx.fillStyle = loc.accent;
    rr(ctx, rect.x, rect.y, rect.w, 30, 14); ctx.fill();
    ctx.fillRect(rect.x, rect.y + 16, rect.w, 14);
    text(ctx, loc.name, rect.x + rect.w / 2, rect.y + 16, 15, '#fff6e0');
    if (locked) {
      text(ctx, 'LOCKED', rect.x + rect.w / 2, rect.y + 58, 17, '#8a7a9e');
      text(ctx, `finish a day at ${LOCATIONS[i - 1].name} to open`, rect.x + rect.w / 2, rect.y + 84, 12, '#8a7a9e', 'center', false);
    } else {
      text(ctx, `goal ${Math.round(loc.goal * DIFFICULTIES[world.difficultyIndex].goal)} · ${recipesCount(i)} recipes · crowd ${i + 1}/3`, rect.x + rect.w / 2, rect.y + 58, 13, '#e8dcc0', 'center', false);
      text(ctx, i <= world.unlockedLoc && i > 0 ? 'unlocked — selamat datang!' : 'your stall is ready', rect.x + rect.w / 2, rect.y + 84, 12, '#b8a8d0', 'center', false);
    }
  });
  // Difficulty pills.
  TITLE_UI.diffPills.forEach((rect, i) => {
    const diff = DIFFICULTIES[i];
    const selected = world.difficultyIndex === i;
    ctx.fillStyle = selected ? GOLD : '#2d2138';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 20); ctx.fill();
    text(ctx, diff.name, rect.x + rect.w / 2, rect.y + rect.h / 2, 15, selected ? '#241a30' : '#e8dcc0');
  });
  text(ctx, DIFFICULTIES[world.difficultyIndex].desc, VIEW.width / 2, 486, 12.5, '#b8a8d0', 'center', false);
  // Buttons.
  const start = TITLE_UI.startButton;
  ctx.fillStyle = '#58b368';
  rr(ctx, start.x, start.y, start.w, start.h, 14); ctx.fill();
  text(ctx, 'OPEN THE MARKET ▶', start.x + start.w / 2, start.y + start.h / 2, 18, '#ffffff');
  const endless = TITLE_UI.endlessButton;
  ctx.fillStyle = '#4d9bb5';
  rr(ctx, endless.x, endless.y, endless.w, endless.h, 14); ctx.fill();
  text(ctx, 'ENDLESS NIGHT ∞', endless.x + endless.w / 2, endless.y + endless.h / 2, 18, '#ffffff');
  const shop = TITLE_UI.shopButton;
  ctx.fillStyle = '#171021';
  rr(ctx, shop.x, shop.y, shop.w, shop.h, 12); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(ctx, shop.x, shop.y, shop.w, shop.h, 12); ctx.stroke();
  text(ctx, 'UPGRADE SHOP', shop.x + shop.w / 2, shop.y + shop.h / 2, 15, GOLD);
  text(ctx, 'How it works: cook at 5 stations (ride heat into the green) → collect before it burns → build the plate → serve for tips. PERFECT dishes (score 85+) pay 60% more tip. Beware rush hours and VIPs!', VIEW.width / 2, 664, 13, '#9a8ab0', 'center', false);
  text(ctx, `Tonight's special at ${LOCATIONS[world.locationIndex].name}: ★ ${world.specialRecipe().name} (+50%)`, VIEW.width / 2, 690, 13, '#ffd98a', 'center', false);
}

function recipesCount(locIndex) { return RECIPES.filter((r) => r.unlockLoc <= locIndex).length; }

function drawShop(ctx, world) {
  drawSky(ctx, world, 0);
  ctx.fillStyle = 'rgba(16,10,24,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'THE UPGRADE SHOP', VIEW.width / 2, 58, 34, GOLD);
  text(ctx, `Bank: ${world.bank} coins — earnings from finished days live here. Every upgrade is permanent.`, VIEW.width / 2, 96, 15, '#e8dcc0', 'center', false);
  UPGRADES.forEach((upgrade, i) => {
    const rect = shopCardRect(i);
    const owned = world.hasUpgrade(upgrade.id);
    const afford = world.bank >= upgrade.cost;
    ctx.fillStyle = owned ? '#24402a' : '#2d2138';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 12); ctx.fill();
    ctx.strokeStyle = owned ? '#58b368' : afford ? GOLD : PANEL_EDGE;
    ctx.lineWidth = 2;
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 12); ctx.stroke();
    text(ctx, upgrade.name, rect.x + rect.w / 2, rect.y + 30, 16.5, owned ? '#a8e0a0' : '#fdf6e3');
    wrap(ctx, upgrade.desc, rect.x + rect.w / 2, rect.y + 66, 12.5, '#cbbfd8', rect.w - 28, 17);
    text(ctx, owned ? 'OWNED ✓' : `${upgrade.cost} coins`, rect.x + rect.w / 2, rect.y + 128, 16, owned ? '#7fc24a' : afford ? GOLD : '#8a7a9e');
    if (!owned) text(ctx, afford ? 'click to buy' : 'not enough coins yet', rect.x + rect.w / 2, rect.y + 154, 11.5, '#9a8ab0', 'center', false);
  });
  const start = SHOP_UI.startButton;
  ctx.fillStyle = '#58b368';
  rr(ctx, start.x, start.y, start.w, start.h, 12); ctx.fill();
  text(ctx, 'START NEXT DAY ▶', start.x + start.w / 2, start.y + start.h / 2, 16, '#ffffff');
  const title = SHOP_UI.titleButton;
  ctx.fillStyle = '#171021';
  rr(ctx, title.x, title.y, title.w, title.h, 12); ctx.fill();
  ctx.strokeStyle = PANEL_EDGE; ctx.lineWidth = 2; rr(ctx, title.x, title.y, title.w, title.h, 12); ctx.stroke();
  text(ctx, 'BACK TO TITLE', title.x + title.w / 2, title.y + title.h / 2, 15, '#e8dcc0');
}

function drawEndPanel(ctx, world) {
  drawSky(ctx, world, 0);
  ctx.fillStyle = 'rgba(14,8,20,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const isEndless = world.screen === SCREEN_ENDLESS_END;
  const failed = world.screen === SCREEN_DAY_FAILED;
  const title = isEndless ? 'THE NIGHT ENDS' : failed ? 'A HARD NIGHT…' : `DAY ${world.day} COMPLETE!`;
  text(ctx, title, VIEW.width / 2, 130, 40, failed ? '#ff8a5c' : GOLD);
  if (!isEndless && !failed) {
    const stars = world.stars();
    for (let i = 0; i < 3; i += 1) {
      text(ctx, '★', VIEW.width / 2 - 60 + i * 60, 190, 46, i < stars ? GOLD : 'rgba(255,201,60,0.25)');
    }
  }
  const banked = failed ? Math.floor(world.coins / 2) : world.coins;
  const lines = isEndless
    ? [`You survived the Endless Night with ${world.coins} coins`, `Best endless: ${world.bestEndless} · Served ${world.served} · Perfects ${world.perfects}`]
    : [`Coins earned: ${world.coins} (goal ${world.goal()}) — ${banked} banked`, `Served ${world.served} · Perfects ${world.perfects} · Walked out ${world.lost} · Best combo ×${world.bestCombo}`];
  lines.forEach((line, i) => text(ctx, line, VIEW.width / 2, 258 + i * 34, 17, '#e8dcc0', 'center', false));
  if (!failed && !isEndless && world.locationIndex < world.unlockedLoc) {
    text(ctx, `NEW MARKET UNLOCKED: ${LOCATIONS[world.unlockedLoc].name}!`, VIEW.width / 2, 340, 17, '#7fd4c9');
  }
  if (failed) text(ctx, 'Half the night’s coins still bank. Buy an upgrade, breathe, retry.', VIEW.width / 2, 340, 14.5, '#b8a8d0', 'center', false);
  const primary = END_UI.primaryButton;
  ctx.fillStyle = '#58b368';
  rr(ctx, primary.x, primary.y, primary.w, primary.h, 12); ctx.fill();
  text(ctx, isEndless ? 'AGAIN ∞' : failed ? 'RETRY DAY' : 'NEXT DAY ▶', primary.x + primary.w / 2, primary.y + primary.h / 2, 16, '#ffffff');
  const shop = END_UI.shopButton;
  ctx.fillStyle = '#171021';
  rr(ctx, shop.x, shop.y, shop.w, shop.h, 12); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(ctx, shop.x, shop.y, shop.w, shop.h, 12); ctx.stroke();
  text(ctx, 'UPGRADE SHOP', shop.x + shop.w / 2, shop.y + shop.h / 2, 15, GOLD);
  const titleBtn = END_UI.titleButton;
  ctx.fillStyle = '#171021';
  rr(ctx, titleBtn.x, titleBtn.y, titleBtn.w, titleBtn.h, 12); ctx.fill();
  ctx.strokeStyle = PANEL_EDGE; ctx.lineWidth = 2; rr(ctx, titleBtn.x, titleBtn.y, titleBtn.w, titleBtn.h, 12); ctx.stroke();
  text(ctx, 'TITLE', titleBtn.x + titleBtn.w / 2, titleBtn.y + titleBtn.h / 2, 15, '#e8dcc0');
}

export function drawFrame(ctx, world, t) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world, t);
  else if (world.screen === SCREEN_SHOP) drawShop(ctx, world);
  else if (world.screen === SCREEN_DAY_END || world.screen === SCREEN_DAY_FAILED || world.screen === SCREEN_ENDLESS_END) drawEndPanel(ctx, world);
  else drawPlay(ctx, world, t);
  if (world.screen !== SCREEN_PLAY) return;
}
