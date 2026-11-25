// WOK & WONDER — deterministic screenshot scenes for ?shot=<name>.
// Each scene stages a real World in a believable mid-game state — a rush in
// full swing, the title at dusk, the upgrade shop with a working bank, and
// a finished day — so the packaged screenshots are the game itself, frozen
// at its best moments, never a mock-up.

import { RECIPES } from './config.js';
import { SCREEN_DAY_END, SCREEN_SHOP, SCREEN_TITLE } from './world.js';

function recipe(id) { return RECIPES.find((r) => r.id === id); }
let serial = 9000;
function order(id, vip = false, patienceFrac = 0.8) {
  serial += 1;
  const max = 60;
  return { id: serial, recipe: recipe(id), vip, patience: max * patienceFrac, maxPatience: max };
}

export function stageShot(world, name) {
  if (name === 'title') {
    world.screen = SCREEN_TITLE;
    world.locationIndex = 0;
    world.difficultyIndex = 1;
    return true;
  }
  if (name === 'shop') {
    world.screen = SCREEN_SHOP;
    world.bank = 860;
    world.upgrades = new Set(['turbo', 'cleaver']);
    return true;
  }
  if (name === 'dayend') {
    world.startDay(0, 1);
    world.coins = 642;
    world.served = 9;
    world.perfects = 3;
    world.lost = 1;
    world.bestCombo = 6;
    world.unlockedLoc = 1;
    world.screen = SCREEN_DAY_END;
    return true;
  }
  if (name === 'rush') {
    world.startDay(0, 1);
    world.special = recipe('sataynight');
    world.orders = [order('noodlebowl', false, 0.78), order('sataynight', true, 0.62), order('dumplingtea', false, 0.9)];
    world.rushMarks = [52];
    world.shiftLeft = 96;
    world.elapsed = 54;
    world.coins = 240;
    world.combo = 3;
    world.bestCombo = 3;
    world.served = 4;
    // The wok is mid-noodles, heat ridden into the band; the grill's satay
    // is ready and waiting for a click; the steamer is warming dumplings.
    world.stations.wok.heatSet = 60;
    world.stations.wok.heat = 58;
    world.stations.wok.job = { comp: 'wokNoodles', progress: 0.55, quality: 88, phase: 'cooking', grace: 0 };
    world.stations.grill.heatSet = 75;
    world.stations.grill.heat = 72;
    world.stations.grill.job = { comp: 'satay', progress: 1, quality: 91, phase: 'ready', grace: 5.2 };
    world.stations.steamer.heatSet = 40;
    world.stations.steamer.heat = 41;
    world.stations.steamer.job = { comp: 'dumplings', progress: 0.3, quality: 74, phase: 'cooking', grace: 0 };
    world.stations.fryer.heatSet = 70;
    world.stations.fryer.heat = 66;
    world.tray = [
      { id: 'friedEgg', quality: 92, fresh: 96 },
      { id: 'herbSalad', quality: 88, fresh: 90 },
    ];
    world.plate = [
      { id: 'wokNoodles', quality: 88, fresh: 97 },
      { id: 'friedEgg', quality: 92, fresh: 96 },
    ];
    world.setMessage('The noodle bowl needs its herb salad — one click from a serve!');
    return true;
  }
  return false;
}
