// WOK & WONDER: NIGHT MARKET RUSH — configuration.
// Every fixed fact of the game lives in this one file: the canvas and layout,
// the twelve components and the five stations that make them, the heat bands
// that decide quality, the twelve recipes, the three night-market locations,
// the ten upgrades, and the three difficulties. The world, the renderer and
// the input handler all read from here, so they can never disagree.

export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const SHIFT_SECONDS = 150;
export const BASE_HEARTS = 3;
export const BASE_MAX_ORDERS = 3;
export const MAX_PLATE = 5;

// Layout rectangles in canvas pixels, shared by renderer and input alike.
export const LAYOUT = {
  header: { x: 0, y: 0, w: 1280, h: 56 },
  ticketsArea: { x: 16, y: 64, w: 836, h: 124 },
  tonightPanel: { x: 868, y: 64, w: 396, h: 124 },
  stationsPanel: { x: 16, y: 196, w: 836, h: 256 },
  platePanel: { x: 868, y: 196, w: 396, h: 256 },
  serveButton: { x: 1092, y: 330, w: 156, h: 54 },
  clearButton: { x: 1092, y: 394, w: 156, h: 40 },
  counter: { x: 16, y: 460, w: 1248, h: 180 },
  footer: { x: 0, y: 648, w: 1280, h: 72 },
};

export function ticketRect(index) {
  const area = LAYOUT.ticketsArea;
  const w = 200;
  const gap = 12;
  return { x: area.x + index * (w + gap), y: area.y, w, h: area.h };
}

export function stationRect(index) {
  const panel = LAYOUT.stationsPanel;
  const w = 158;
  const gap = 11;
  const total = 5 * w + 4 * gap;
  const startX = panel.x + (panel.w - total) / 2;
  return { x: startX + index * (w + gap), y: panel.y + 40, w, h: 204 };
}

// The five stations. The first four are hot: they hold a heat setting the
// player rides while food cooks. The cutting board is cold and fast, and its
// food collects itself — nobody burns a salad.
export const STATIONS = {
  wok:     { id: 'wok',     name: 'WOK',         hot: true,  keys: ['Q', 'W'], colour: '#e2543e', makes: ['wokNoodles', 'friedRice'] },
  grill:   { id: 'grill',   name: 'GRILL',       hot: true,  keys: ['E', 'R'], colour: '#d97b26', makes: ['satay', 'grillChicken'] },
  steamer: { id: 'steamer', name: 'STEAMER',     hot: true,  keys: ['T', 'Y'], colour: '#4d9bb5', makes: ['dumplings', 'steamBuns'] },
  fryer:   { id: 'fryer',   name: 'FRYER',       hot: true,  keys: ['U', 'I'], colour: '#c9a227', makes: ['springRolls', 'friedEgg'] },
  board:   { id: 'board',   name: 'PREP BOARD',  hot: false, keys: ['O', 'P'], colour: '#58b368', makes: ['herbSalad', 'sambal'] },
};
export const STATION_ORDER = ['wok', 'grill', 'steamer', 'fryer', 'board'];

// The twelve things that can land on a plate. Pantry components are taken
// straight off the counter; the rest are cooked or prepped at a station and
// carry a quality and a freshness with them. `band` is the ideal heat range
// for the station while this component cooks.
export const COMPONENTS = {
  steamedRice: { id: 'steamedRice', name: 'Steamed Rice',  short: 'Rice',    from: 'pantry',  key: '1', main: '#f7f2df', shade: '#ddd2ac', accent: '#b8a86b' },
  icedTea:     { id: 'icedTea',     name: 'Iced Tea',      short: 'Tea',     from: 'pantry',  key: '2', main: '#c97b2f', shade: '#9c5a1d', accent: '#ffd98a' },
  limeJuice:   { id: 'limeJuice',   name: 'Lime Juice',    short: 'Lime',    from: 'pantry',  key: '3', main: '#b7d94e', shade: '#8fb52f', accent: '#e8ffb0' },
  wokNoodles:  { id: 'wokNoodles',  name: 'Wok Noodles',   short: 'Noodles', from: 'wok',     key: '4', cook: 4.5, band: [45, 70], main: '#f2c14e', shade: '#cf9827', accent: '#ffe9a3' },
  friedRice:   { id: 'friedRice',   name: 'Fried Rice',    short: 'F.Rice',  from: 'wok',     key: '5', cook: 5.5, band: [60, 85], main: '#e8a35f', shade: '#b06a35', accent: '#ffd98a' },
  satay:       { id: 'satay',       name: 'Satay Skewers', short: 'Satay',   from: 'grill',   key: '6', cook: 4,   band: [65, 90], main: '#8a4b24', shade: '#5f3013', accent: '#d98e4a' },
  grillChicken:{ id: 'grillChicken',name: 'Grill Chicken', short: 'Chicken', from: 'grill',   key: '7', cook: 5.5, band: [50, 75], main: '#b06a35', shade: '#7e451d', accent: '#e8a35f' },
  dumplings:   { id: 'dumplings',   name: 'Dumplings',     short: 'Dumpling', from: 'steamer', key: '8', cook: 5,   band: [30, 55], main: '#f3e9d2', shade: '#d8c49a', accent: '#e8a35f' },
  steamBuns:   { id: 'steamBuns',   name: 'Steam Buns',    short: 'Buns',    from: 'steamer', key: '9', cook: 4,   band: [25, 50], main: '#fdf6ec', shade: '#e3d3b8', accent: '#f2c14e' },
  springRolls: { id: 'springRolls', name: 'Spring Rolls',  short: 'Rolls',   from: 'fryer',   key: '0', cook: 3.5, band: [60, 85], main: '#e0aa4e', shade: '#b57f2a', accent: '#ffdf94' },
  friedEgg:    { id: 'friedEgg',    name: 'Fried Egg',     short: 'Egg',     from: 'fryer',   key: '-', cook: 3,   band: [45, 70], main: '#fdfdf6', shade: '#e8e4ce', accent: '#ffb921' },
  herbSalad:   { id: 'herbSalad',   name: 'Herb Salad',    short: 'Salad',   from: 'board',   key: '=', cook: 2,   band: null, main: '#4d9b4d', shade: '#2f6b2f', accent: '#8fd07e' },
  sambal:      { id: 'sambal',      name: 'Chili Sambal',  short: 'Sambal',  from: 'board',   key: '',  cook: 2.5, band: null, main: '#d63a22', shade: '#a52312', accent: '#ff8a5c' },
};
export const COUNTER_ORDER = ['steamedRice', 'icedTea', 'limeJuice', 'wokNoodles', 'friedRice', 'satay', 'grillChicken', 'dumplings', 'steamBuns', 'springRolls', 'friedEgg', 'herbSalad', 'sambal'];

// Thirteen entries above include three pantry staples; the twelve recipes
// below combine them. Prices are in coins, before tips, VIP and specials.
export const RECIPES = [
  { id: 'noodlebowl', name: 'Market Noodle Bowl', items: ['wokNoodles', 'friedEgg', 'herbSalad'], price: 110, unlockLoc: 0 },
  { id: 'sataynight', name: 'Satay Night Plate', items: ['satay', 'steamedRice', 'sambal'], price: 120, unlockLoc: 0 },
  { id: 'dumplingtea', name: 'Dumpling & Tea Set', items: ['dumplings', 'sambal', 'icedTea'], price: 115, unlockLoc: 0 },
  { id: 'bungrill', name: 'Bun & Grill Combo', items: ['steamBuns', 'grillChicken', 'herbSalad'], price: 135, unlockLoc: 0 },
  { id: 'rollplatter', name: 'Crispy Roll Platter', items: ['springRolls', 'satay', 'limeJuice'], price: 140, unlockLoc: 0 },
  { id: 'firecracker', name: 'Firecracker Rice', items: ['friedRice', 'sambal', 'friedEgg'], price: 130, unlockLoc: 0 },
  { id: 'wonderrice', name: 'Wonder Fried Rice', items: ['friedRice', 'grillChicken', 'springRolls'], price: 150, unlockLoc: 1 },
  { id: 'gardensteam', name: 'Garden Steam Set', items: ['dumplings', 'herbSalad', 'steamedRice', 'icedTea'], price: 145, unlockLoc: 1 },
  { id: 'teahouse', name: 'Tea House Tray', items: ['herbSalad', 'springRolls', 'icedTea', 'steamedRice'], price: 125, unlockLoc: 1 },
  { id: 'midnightwok', name: 'Midnight Wok Special', items: ['wokNoodles', 'satay', 'friedEgg', 'sambal'], price: 170, unlockLoc: 2 },
  { id: 'lanternfeast', name: 'Lantern Feast', items: ['steamBuns', 'dumplings', 'satay', 'limeJuice'], price: 180, unlockLoc: 2 },
  { id: 'banquet', name: "Emperor's Night Banquet", items: ['friedRice', 'grillChicken', 'dumplings', 'satay'], price: 210, unlockLoc: 2 },
];

// The three locations: a palette, a crowd speed and a coin goal per day.
// Finishing a day at or above goal unlocks the next location for good.
export const LOCATIONS = [
  { id: 'alley',    name: 'LANTERN ALLEY',       sky: '#1b2340', skyLow: '#3a2b52', glow: '#ffb35c', accent: '#e2543e', goal: 550, patience: 64, spawnEvery: 7 },
  { id: 'river',    name: 'RIVERSIDE PROMENADE', sky: '#12283d', skyLow: '#274b5c', glow: '#7fd4c9', accent: '#4d9bb5', goal: 750, patience: 57, spawnEvery: 6 },
  { id: 'rooftop',  name: 'SKY LANTERN ROOFTOP', sky: '#241a3f', skyLow: '#54386e', glow: '#ffd98a', accent: '#c95f9e', goal: 950, patience: 51, spawnEvery: 5 },
];

// The ten upgrades, bought between days from the bank. Each is bought once;
// `desc` is what the shop card promises, and the world honours exactly that.
export const UPGRADES = [
  { id: 'turbo',    name: 'Turbo Burner',    cost: 300, desc: 'Everything cooks 20% faster.' },
  { id: 'wideband', name: 'Wide Flame',      cost: 250, desc: 'Ideal heat bands are 8 points wider.' },
  { id: 'cleaver',  name: 'Sharp Cleaver',   cost: 200, desc: 'Prep board works 40% faster.' },
  { id: 'cushions', name: 'Comfy Cushions',  cost: 300, desc: 'Customers wait 20% longer.' },
  { id: 'lantern',  name: 'Golden Lantern',  cost: 350, desc: 'All tips are 25% bigger.' },
  { id: 'freshbox', name: 'Fresh Box',       cost: 250, desc: 'Food in the tray stays fresh twice as long.' },
  { id: 'rail',     name: 'Extra Ticket Rail', cost: 400, desc: 'Hold 4 orders at once instead of 3.' },
  { id: 'charm',    name: 'Heat Charm',      cost: 250, desc: 'Station heat drifts 35% slower.' },
  { id: 'luckycat', name: 'Lucky Cat',       cost: 350, desc: 'Start every day with +1 heart.' },
  { id: 'tongs',    name: 'Master Tongs',    cost: 200, desc: 'Finished food waits 4s longer before it burns.' },
];

// Three difficulties, chosen on the title screen.
export const DIFFICULTIES = [
  { id: 'chill',   name: 'CHILL',   patience: 1.3,  spawn: 1.25, goal: 0.8,  reward: 0.9,  desc: 'A gentle evening crowd.' },
  { id: 'classic', name: 'CLASSIC', patience: 1.0,  spawn: 1.0,  goal: 1.0,  reward: 1.0,  desc: 'The market as it is meant to be.' },
  { id: 'rush',    name: 'RUSH',    patience: 0.82, spawn: 0.8,  goal: 1.25, reward: 1.15, desc: 'Fast crowd, faster money, no mercy.' },
];

// Quality grades, best first: the effective score of a served dish picks one.
export const GRADES = [
  { min: 85, name: 'PERFECT', tipFactor: 1.6, colour: '#ffc93c' },
  { min: 70, name: 'GREAT',   tipFactor: 1.15, colour: '#7fc24a' },
  { min: 55, name: 'GOOD',    tipFactor: 0.7,  colour: '#7fd4c9' },
  { min: 40, name: 'POOR',    tipFactor: 0.35, colour: '#e8a13c' },
  { min: 0,  name: 'SAD',     tipFactor: 0.1,  colour: '#e2543e' },
];

export function gradeFor(score) {
  return GRADES.find((grade) => score >= grade.min) ?? GRADES[GRADES.length - 1];
}

export function recipesForLocation(locIndex) {
  return RECIPES.filter((recipe) => recipe.unlockLoc <= locIndex);
}
