// WOK & WONDER — input: mouse, touch and keyboard.
// Every clickable region comes from the renderer's own rect helpers, so the
// hit map cannot drift from the drawing. During play: cook buttons start
// dishes, −/+ ride a station's heat, clicking a station collects finished
// food (or clears a burnt mistake), counter tiles build the plate, tickets
// serve themselves when clicked, and the big SERVE button serves the first
// matching order. On menus the same pointer drives location and difficulty
// picks, the shop, and the day-end buttons.

import { COMPONENTS, COUNTER_ORDER, LAYOUT, STATIONS, STATION_ORDER, UPGRADES, stationRect, ticketRect } from './config.js';
import { EVENT_BURNT, EVENT_READY, SCREEN_DAY_END, SCREEN_DAY_FAILED, SCREEN_ENDLESS_END, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE } from './world.js';
import { END_UI, SHOP_UI, TITLE_UI, cookButtonRect, heatButtonRect, inside, shopCardRect, tileRect } from './render.js';
import { soundAdd, soundBurnt, soundBuy, soundClick, soundCollect, soundCookStart, soundError, soundServe, toggleMuted, unlockAudio } from './audio.js';

export function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
}

export function attachInput(canvas, world) {
  let lastStation = 'wok';

  function startCook(compId) {
    lastStation = COMPONENTS[compId].from;
    if (world.startCook(compId)) soundCookStart();
    else soundError();
  }

  function collect(stationId) {
    lastStation = stationId;
    const result = world.collectStation(stationId);
    if (result === EVENT_READY) soundCollect();
    else if (result === EVENT_BURNT) soundBurnt();
  }

  function serve(orderId = null) {
    const result = world.servePlate(orderId);
    if (result) soundServe(result.grade.name === 'PERFECT');
    return result;
  }

  function clickPlay(x, y) {
    // Tickets serve themselves when the plate matches them.
    for (let i = 0; i < world.maxOrders(); i += 1) {
      const order = world.orders[i];
      if (order && inside(x, y, ticketRect(i))) {
        if (!serve(order.id)) soundError();
        return;
      }
    }
    // Stations: heat buttons, the card itself (collect / clear), cook buttons.
    for (let s = 0; s < STATION_ORDER.length; s += 1) {
      const stationId = STATION_ORDER[s];
      const def = STATIONS[stationId];
      if (def.hot) {
        if (inside(x, y, heatButtonRect(s, -1))) { world.adjustHeat(stationId, -10); lastStation = stationId; soundClick(); return; }
        if (inside(x, y, heatButtonRect(s, 1))) { world.adjustHeat(stationId, 10); lastStation = stationId; soundClick(); return; }
      }
      for (let item = 0; item < def.makes.length; item += 1) {
        if (inside(x, y, cookButtonRect(s, item))) { startCook(def.makes[item]); return; }
      }
      if (inside(x, y, stationRect(s))) { collect(stationId); return; }
    }
    // Counter tiles build the plate.
    for (let i = 0; i < COUNTER_ORDER.length; i += 1) {
      if (inside(x, y, tileRect(i))) {
        if (world.addToPlate(COUNTER_ORDER[i])) soundAdd();
        else soundError();
        return;
      }
    }
    if (inside(x, y, LAYOUT.serveButton)) { if (!serve()) soundError(); return; }
    if (inside(x, y, LAYOUT.clearButton)) { world.clearPlate(); soundClick(); }
  }

  function clickTitle(x, y) {
    TITLE_UI.locCards.forEach((rect, i) => {
      if (inside(x, y, rect) && i <= world.unlockedLoc) { world.locationIndex = i; soundClick(); }
    });
    TITLE_UI.diffPills.forEach((rect, i) => {
      if (inside(x, y, rect)) { world.difficultyIndex = i; soundClick(); }
    });
    if (inside(x, y, TITLE_UI.startButton)) { world.startDay(world.locationIndex, world.difficultyIndex); soundClick(); return; }
    if (inside(x, y, TITLE_UI.endlessButton)) { world.startEndless(); soundClick(); return; }
    if (inside(x, y, TITLE_UI.shopButton)) { world.screen = SCREEN_SHOP; soundClick(); }
  }

  function clickShop(x, y) {
    UPGRADES.forEach((upgrade, i) => {
      if (inside(x, y, shopCardRect(i))) {
        if (world.buyUpgrade(upgrade.id)) soundBuy();
        else if (!world.hasUpgrade(upgrade.id)) soundError();
      }
    });
    if (inside(x, y, SHOP_UI.startButton)) { world.startDay(world.locationIndex, world.difficultyIndex, true); soundClick(); return; }
    if (inside(x, y, SHOP_UI.titleButton)) { world.screen = SCREEN_TITLE; soundClick(); }
  }

  function clickEnd(x, y) {
    if (inside(x, y, END_UI.primaryButton)) {
      if (world.screen === SCREEN_ENDLESS_END) world.startEndless();
      else if (world.screen === SCREEN_DAY_FAILED) world.startDay(world.locationIndex, world.difficultyIndex, false);
      else world.startDay(world.locationIndex, world.difficultyIndex, true);
      soundClick();
      return;
    }
    if (inside(x, y, END_UI.shopButton)) { world.screen = SCREEN_SHOP; soundClick(); return; }
    if (inside(x, y, END_UI.titleButton)) { world.screen = SCREEN_TITLE; soundClick(); }
  }

  canvas.addEventListener('pointerdown', (event) => {
    unlockAudio();
    const { x, y } = canvasPoint(canvas, event);
    if (world.screen === SCREEN_PLAY) clickPlay(x, y);
    else if (world.screen === SCREEN_TITLE) clickTitle(x, y);
    else if (world.screen === SCREEN_SHOP) clickShop(x, y);
    else clickEnd(x, y);
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    unlockAudio();
    if (key === 'm' || key === 'M') { toggleMuted(); return; }
    if (world.screen !== SCREEN_PLAY) {
      if (key === 'Enter' && world.screen === SCREEN_TITLE) world.startDay(world.locationIndex, world.difficultyIndex);
      return;
    }
    if (key === 'Enter') { if (!serve()) soundError(); return; }
    if (key === 'Backspace') { event.preventDefault(); world.removeLastFromPlate(); return; }
    if (key === 'z' || key === 'Z') { world.adjustHeat(lastStation, -10); return; }
    if (key === 'x' || key === 'X') { world.adjustHeat(lastStation, 10); return; }
    const upper = key.toUpperCase();
    for (const def of Object.values(STATIONS)) {
      def.keys.forEach((stationKey, itemIndex) => {
        if (upper === stationKey) startCook(def.makes[itemIndex]);
      });
    }
    for (const comp of Object.values(COMPONENTS)) {
      if (comp.key && key === comp.key) {
        if (world.addToPlate(comp.id)) soundAdd();
        else soundError();
      }
    }
  });

  return { serve };
}
