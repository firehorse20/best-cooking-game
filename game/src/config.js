// Every tuning number, dish and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Lives: an order that expires, or a dish that burns, costs one. */
export const LIVES = 3;

/** The eight ingredient bins on the counter, in counter order, with their key. */
export const INGREDIENTS = [
  { id: 'rice', name: '米饭', key: '1', color: '#f5efe0' },
  { id: 'egg', name: '鸡蛋', key: '2', color: '#ffd94d' },
  { id: 'noodles', name: '面条', key: '3', color: '#e8b45a' },
  { id: 'shrimp', name: '虾仁', key: '4', color: '#ff9a8a' },
  { id: 'greens', name: '青菜', key: '5', color: '#5fbf5a' },
  { id: 'dumpling', name: '饺子', key: '6', color: '#fdf6e3' },
  { id: 'chili', name: '辣椒', key: '7', color: '#e5382a' },
  { id: 'sauce', name: '酱油', key: '8', color: '#5a3a22' },
];

/** The menu: every dish is a recipe (an exact multiset of ingredients), a price and a cook time. */
export const DISHES = [
  { id: 'fried-rice', name: '炒饭', en: 'Fried Rice', recipe: ['rice', 'egg', 'greens'], price: 10, cook: 4 },
  { id: 'dumplings', name: '煎饺', en: 'Pan Dumplings', recipe: ['dumpling', 'greens', 'chili'], price: 12, cook: 5 },
  { id: 'noodle-soup', name: '汤面', en: 'Noodle Soup', recipe: ['noodles', 'egg', 'shrimp'], price: 12, cook: 5 },
  { id: 'shrimp-rice', name: '虾仁饭', en: 'Shrimp Rice', recipe: ['rice', 'shrimp', 'sauce'], price: 14, cook: 4 },
  { id: 'spicy-pot', name: '麻辣烫', en: 'Spicy Hotpot', recipe: ['noodles', 'chili', 'sauce'], price: 13, cook: 6 },
];

/** Seconds an order waits before it walks away, and how the rush tightens with level. */
export const ORDER = {
  max: 3,
  firstAt: 2,
  interval: 13,
  minInterval: 6.5,
  intervalScale: 0.9,
  time: 32,
  minTime: 20,
  timeScale: 0.92,
};

/** A plated dish goes cold after this long (no tip, and it burns after this long again). */
export const PLATE = { coldAfter: 10, burnAfter: 20 };

/** A dish left in the wok after it finishes cooking burns after this long. */
export const WOK_BURN_AFTER = 8;

/** Stirring the wok (click it while cooking) adds this much progress. */
export const STIR_BONUS = 0.12;

/** Seconds of play per level, and the last level: the rush stops growing there. */
export const LEVEL = { seconds: 40, max: 8 };

/** Tip for a fast serve, and how a combo multiplies the money. */
export const TIP_MAX = 5;
export const COMBO_STEP = 0.1;
export const COMBO_CAP = 2;

export const PALETTE = {
  backdrop: '#14101f',
  sky: '#1c1633',
  awning: '#c62f22',
  awningLight: '#e85d3d',
  wood: '#6b4226',
  woodDark: '#4a2c17',
  board: '#2a1f16',
  counter: '#3a2a1c',
  counterTop: '#8a5a33',
  text: '#fdf6e3',
  muted: '#c9b8a3',
  gold: '#f2b134',
  flame: '#ff7a1a',
  flameCore: '#ffd94d',
  wok: '#2e2e38',
  plate: '#f5efe0',
  ready: '#5fbf5a',
  danger: '#e5382a',
  warn: '#f2a134',
  panel: '#241c2e',
};

export const FONT = '"Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'wok-rush.best';
