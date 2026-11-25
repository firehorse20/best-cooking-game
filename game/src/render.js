// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Canvas
// shapes for every ingredient (no borrowed images), canvas text for the HUD and the panels.
// hitTest turns a logical point into the thing the player clicked: a counter bin, the wok, the
// plate, an order ticket or the dump button.
import { DISHES, FIELD, FONT, INGREDIENTS, LIVES, ORDER, PALETTE, PLATE } from './config.js';
import { dishById, ingredientById } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Where the kitchen's pieces sit, shared by the painter and the click test. */
export const LAYOUT = {
  board: { x: 24, y: 56, width: 972, height: 102 },
  ticket: { width: 300, height: 88, gap: 16 },
  hud: { x: 1012, y: 56, width: 244, height: 102 },
  menu: { x: 24, y: 170, width: 306, height: 300 },
  wok: { cx: 640, cy: 305, r: 105 },
  dump: { x: 580, y: 442, width: 120, height: 30 },
  plate: { cx: 1103, cy: 305, r: 95 },
  counter: { y: 480 },
  bin: { width: 140, height: 148, gap: 14, y: 516 },
  hint: { y: 686 },
};

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, ratio: 1 };
  const moneyLabel = cachedLabel('营业额 $');
  const comboLabel = cachedLabel('连击 x');
  const levelLabel = cachedLabel('第 ');
  const servedLabel = cachedLabel('已上菜 ');
  const finalLabel = cachedLabel('营业额 $');
  const bestLabel = cachedLabel('最佳 $');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.ratio = ratio;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** A canvas (CSS-pixel) point turned into a logical playfield point. */
  function toField(cssX, cssY) {
    return {
      x: (cssX * view.ratio - view.x) / view.scale,
      y: (cssY * view.ratio - view.y) / view.scale,
    };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = size + (weight || '');
    if (!fonts.has(key)) fonts.set(key, `${weight ? weight + ' ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  /** One ingredient's icon, drawn from shapes at (cx, cy) with radius r. */
  function drawIngredientIcon(id, cx, cy, r) {
    context.save();
    context.translate(cx, cy);
    if (id === 'rice') {
      context.fillStyle = '#8a5a33';
      context.beginPath();
      context.arc(0, r * 0.25, r * 0.85, 0, Math.PI);
      context.fill();
      context.fillStyle = '#f5efe0';
      context.beginPath();
      context.arc(-r * 0.4, -r * 0.1, r * 0.32, 0, Math.PI * 2);
      context.arc(0, -r * 0.3, r * 0.36, 0, Math.PI * 2);
      context.arc(r * 0.4, -r * 0.1, r * 0.32, 0, Math.PI * 2);
      context.fill();
    } else if (id === 'egg') {
      context.fillStyle = '#fdf6e3';
      context.beginPath();
      context.ellipse(0, 0, r * 0.9, r * 0.65, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffd94d';
      context.beginPath();
      context.arc(r * 0.15, 0, r * 0.38, 0, Math.PI * 2);
      context.fill();
    } else if (id === 'noodles') {
      context.strokeStyle = '#e8b45a';
      context.lineWidth = r * 0.22;
      context.lineCap = 'round';
      for (let line = -1; line <= 1; line += 1) {
        context.beginPath();
        context.moveTo(-r * 0.8, line * r * 0.4);
        context.quadraticCurveTo(-r * 0.3, line * r * 0.4 - r * 0.35, r * 0.2, line * r * 0.4);
        context.quadraticCurveTo(r * 0.6, line * r * 0.4 + r * 0.35, r * 0.85, line * r * 0.4);
        context.stroke();
      }
    } else if (id === 'shrimp') {
      context.strokeStyle = '#ff9a8a';
      context.lineWidth = r * 0.45;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(0, r * 0.1, r * 0.6, Math.PI * 0.9, Math.PI * 2.1);
      context.stroke();
      context.fillStyle = '#ff6b5e';
      context.beginPath();
      context.arc(r * 0.55, -r * 0.45, r * 0.16, 0, Math.PI * 2);
      context.fill();
    } else if (id === 'greens') {
      context.fillStyle = '#5fbf5a';
      for (const angle of [-0.6, 0, 0.6]) {
        context.save();
        context.rotate(angle);
        context.beginPath();
        context.ellipse(0, -r * 0.35, r * 0.28, r * 0.55, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      context.strokeStyle = '#3d8a37';
      context.lineWidth = r * 0.1;
      context.beginPath();
      context.moveTo(0, r * 0.7);
      context.lineTo(0, -r * 0.1);
      context.stroke();
    } else if (id === 'dumpling') {
      context.fillStyle = '#fdf6e3';
      context.beginPath();
      context.arc(0, r * 0.15, r * 0.75, Math.PI, 0);
      context.closePath();
      context.fill();
      context.fillStyle = '#e8dcc0';
      for (let bump = -2; bump <= 2; bump += 1) {
        context.beginPath();
        context.arc(bump * r * 0.3, -r * 0.55, r * 0.16, 0, Math.PI * 2);
        context.fill();
      }
    } else if (id === 'chili') {
      context.strokeStyle = '#e5382a';
      context.lineWidth = r * 0.42;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(0, -r * 0.1, r * 0.6, Math.PI * 1.15, Math.PI * 1.95);
      context.stroke();
      context.strokeStyle = '#5fbf5a';
      context.lineWidth = r * 0.16;
      context.beginPath();
      context.moveTo(r * 0.5, -r * 0.62);
      context.lineTo(r * 0.72, -r * 0.85);
      context.stroke();
    } else if (id === 'sauce') {
      context.fillStyle = '#3a2415';
      roundRect(-r * 0.42, -r * 0.7, r * 0.84, r * 1.4, r * 0.18);
      context.fill();
      context.fillStyle = '#c62f22';
      context.fillRect(-r * 0.3, -r * 0.95, r * 0.6, r * 0.3);
      context.fillStyle = '#f5efe0';
      context.font = `${Math.round(r * 0.55)}px ${FONT}`;
      context.textAlign = 'center';
      context.fillText('酱', 0, r * 0.35);
    }
    context.restore();
  }

  function drawBackground(elapsed) {
    context.fillStyle = PALETTE.sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // String lights across the top of the stall.
    for (let bulb = 0; bulb < 16; bulb += 1) {
      const x = 40 + bulb * 78;
      const sway = Math.sin(elapsed * 1.4 + bulb) * 3;
      context.fillStyle = bulb % 2 === 0 ? PALETTE.gold : '#ff9a8a';
      context.beginPath();
      context.arc(x + sway, 52 + Math.sin(bulb * 1.3) * 4, 5, 0, Math.PI * 2);
      context.fill();
    }
    // Red awning stripes.
    for (let stripe = 0; stripe < 16; stripe += 1) {
      context.fillStyle = stripe % 2 === 0 ? PALETTE.awning : PALETTE.awningLight;
      context.fillRect(stripe * 80, 0, 80, 46);
    }
    context.fillStyle = PALETTE.woodDark;
    context.fillRect(0, 46, FIELD.width, 6);
  }

  function drawTicket(ticket, x, y) {
    const dish = dishById(ticket.dish);
    const frac = Math.max(0, ticket.timeLeft / ticket.timeMax);
    const barColor = frac > 0.5 ? PALETTE.ready : frac > 0.25 ? PALETTE.warn : PALETTE.danger;
    context.fillStyle = '#f5efe0';
    roundRect(x, y, LAYOUT.ticket.width, LAYOUT.ticket.height, 10);
    context.fill();
    context.fillStyle = '#2a1f16';
    context.textBaseline = 'alphabetic';
    text(`${dish.name} ${dish.en}`, x + 14, y + 30, 24, '#2a1f16', 'left', 'bold');
    text(`$${dish.price}`, x + LAYOUT.ticket.width - 14, y + 30, 22, '#c62f22', 'right', 'bold');
    for (let chip = 0; chip < dish.recipe.length; chip += 1) {
      // A tinted disc behind each chip so pale ingredients (dumpling, rice) still read on white.
      context.fillStyle = '#e8e0d0';
      context.beginPath();
      context.arc(x + 30 + chip * 34, y + 56, 15, 0, Math.PI * 2);
      context.fill();
      drawIngredientIcon(dish.recipe[chip], x + 30 + chip * 34, y + 56, 13);
    }
    // Countdown bar and seconds.
    context.fillStyle = '#d8cbb8';
    roundRect(x + 14, y + 72, LAYOUT.ticket.width - 28, 8, 4);
    context.fill();
    context.fillStyle = barColor;
    roundRect(x + 14, y + 72, (LAYOUT.ticket.width - 28) * frac, 8, 4);
    context.fill();
    text(`${Math.ceil(ticket.timeLeft)}s`, x + LAYOUT.ticket.width - 52, y + 56, 18, barColor, 'right', 'bold');
  }

  function drawOrderBoard(state) {
    const board = LAYOUT.board;
    context.fillStyle = PALETTE.wood;
    roundRect(board.x, board.y, board.width, board.height, 12);
    context.fill();
    context.fillStyle = PALETTE.woodDark;
    roundRect(board.x, board.y, board.width, board.height, 12);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text('点单 ORDER BOARD', board.x + 16, board.y + 22, 15, PALETTE.gold, 'left', 'bold');
    for (let slot = 0; slot < ORDER.max; slot += 1) {
      const x = board.x + 16 + slot * (LAYOUT.ticket.width + LAYOUT.ticket.gap);
      if (state.orders[slot]) drawTicket(state.orders[slot], x, board.y + 28);
      else {
        context.fillStyle = 'rgba(0,0,0,0.25)';
        roundRect(x, board.y + 28, LAYOUT.ticket.width, LAYOUT.ticket.height, 10);
        context.fill();
        text('等单中…', x + LAYOUT.ticket.width / 2, board.y + 76, 20, PALETTE.muted, 'center');
      }
    }
  }

  function drawHud(state) {
    const hud = LAYOUT.hud;
    context.fillStyle = PALETTE.board;
    roundRect(hud.x, hud.y, hud.width, hud.height, 12);
    context.fill();
    context.textBaseline = 'alphabetic';
    text(moneyLabel(state.score), hud.x + 14, hud.y + 32, 26, PALETTE.gold, 'left', 'bold');
    text(comboLabel(state.combo), hud.x + 14, hud.y + 60, 18, PALETTE.text, 'left');
    text(`${levelLabel(state.level)}级 · ${servedLabel(state.served)}`, hud.x + 14, hud.y + 86, 18, PALETTE.muted, 'left');
    for (let life = 0; life < LIVES; life += 1) {
      const cx = hud.x + hud.width - 20 - life * 30;
      const cy = hud.y + 26;
      context.fillStyle = life < state.lives ? PALETTE.danger : '#3a2a2a';
      context.beginPath();
      context.arc(cx - 6, cy - 3, 7, 0, Math.PI * 2);
      context.arc(cx + 6, cy - 3, 7, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(cx - 12, cy - 1);
      context.lineTo(cx + 12, cy - 1);
      context.lineTo(cx, cy + 12);
      context.closePath();
      context.fill();
    }
  }

  function drawMenu() {
    const menu = LAYOUT.menu;
    context.fillStyle = PALETTE.board;
    roundRect(menu.x, menu.y, menu.width, menu.height, 12);
    context.fill();
    context.textBaseline = 'alphabetic';
    text('菜谱 MENU', menu.x + 16, menu.y + 30, 18, PALETTE.gold, 'left', 'bold');
    for (let index = 0; index < DISHES.length; index += 1) {
      const dish = DISHES[index];
      const y = menu.y + 52 + index * 44;
      text(`${dish.name} ${dish.en}`, menu.x + 16, y, 20, PALETTE.text, 'left', 'bold');
      text(`$${dish.price} · ${dish.cook}s`, menu.x + menu.width - 16, y, 18, PALETTE.muted, 'right');
      for (let chip = 0; chip < dish.recipe.length; chip += 1) {
        drawIngredientIcon(dish.recipe[chip], menu.x + 30 + chip * 32, y + 18, 11);
      }
    }
    text('配方要一模一样，错了就倒掉重做。', menu.x + 16, menu.y + menu.height - 12, 14, PALETTE.muted, 'left');
  }

  function drawWok(state, elapsed) {
    const wok = LAYOUT.wok;
    // Stove under the wok.
    context.fillStyle = '#241c2e';
    roundRect(wok.cx - 130, wok.cy + 78, 260, 34, 8);
    context.fill();
    // Wok body.
    context.fillStyle = PALETTE.wok;
    context.beginPath();
    context.arc(wok.cx, wok.cy, wok.r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#55555f';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(wok.cx, wok.cy, wok.r, 0, Math.PI * 2);
    context.stroke();
    // Flames under the wok, licking its bottom edge (drawn after the wok so they show).
    for (let flame = 0; flame < 5; flame += 1) {
      const fx = wok.cx - 88 + flame * 44;
      const height = 30 + Math.sin(elapsed * 9 + flame * 2.1) * 7;
      context.fillStyle = flame % 2 === 0 ? PALETTE.flame : PALETTE.flameCore;
      context.beginPath();
      context.moveTo(fx - 12, wok.cy + 128);
      context.quadraticCurveTo(fx - 5, wok.cy + 128 - height, fx, wok.cy + 128 - height - 9);
      context.quadraticCurveTo(fx + 5, wok.cy + 128 - height, fx + 12, wok.cy + 128);
      context.closePath();
      context.fill();
    }
    // Contents.
    const contents = state.wok.contents;
    for (let index = 0; index < contents.length; index += 1) {
      const angle = -Math.PI / 2 + (index - (contents.length - 1) / 2) * 0.9;
      drawIngredientIcon(contents[index], wok.cx + Math.cos(angle) * 42, wok.cy + Math.sin(angle) * 30, 24);
    }
    // Cooking progress ring.
    if (state.wok.cooking >= 0) {
      const dish = state.wok.dish;
      context.strokeStyle = state.wok.done ? PALETTE.ready : PALETTE.gold;
      context.lineWidth = 10;
      context.beginPath();
      context.arc(wok.cx, wok.cy, wok.r + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.wok.cooking);
      context.stroke();
      context.textBaseline = 'alphabetic';
      if (state.wok.done) {
        text('好了! READY', wok.cx, wok.cy + 84, 22, PALETTE.ready, 'center', 'bold');
      } else {
        text(`${dish.name} ${Math.round(state.wok.cooking * 100)}%`, wok.cx, wok.cy + 84, 20, PALETTE.gold, 'center', 'bold');
      }
    } else if (contents.length === 3) {
      text('配方不对，点铁锅倒掉', wok.cx, wok.cy + 84, 18, PALETTE.danger, 'center', 'bold');
    } else if (contents.length > 0) {
      text('继续加食材…', wok.cx, wok.cy + 84, 18, PALETTE.muted, 'center');
    }
    // Steam.
    if (state.wok.cooking >= 0) {
      context.strokeStyle = 'rgba(245,239,224,0.5)';
      context.lineWidth = 4;
      context.lineCap = 'round';
      for (let puff = 0; puff < 3; puff += 1) {
        const phase = (elapsed * 0.7 + puff * 0.33) % 1;
        const sx = wok.cx - 40 + puff * 40 + Math.sin(phase * 6 + puff) * 8;
        const sy = wok.cy - wok.r - 10 - phase * 46;
        context.globalAlpha = 0.55 * (1 - phase);
        context.beginPath();
        context.moveTo(sx, sy);
        context.quadraticCurveTo(sx + 8, sy - 12, sx - 4, sy - 24);
        context.stroke();
      }
      context.globalAlpha = 1;
    }
    // Dump button.
    const dump = LAYOUT.dump;
    context.fillStyle = state.wok.contents.length > 0 ? '#5a2a22' : '#2a2226';
    roundRect(dump.x, dump.y, dump.width, dump.height, 8);
    context.fill();
    text('倒掉 DUMP (Del)', dump.x + dump.width / 2, dump.y + 21, 15, state.wok.contents.length > 0 ? '#ff9a8a' : PALETTE.muted, 'center', 'bold');
  }

  function drawPlate(state) {
    const plate = LAYOUT.plate;
    context.textBaseline = 'alphabetic';
    text('出菜口 SERVE', plate.cx - 110, 190, 18, PALETTE.gold, 'left', 'bold');
    if (state.plate.dish) {
      const dish = dishById(state.plate.dish);
      const cold = state.plate.timer > PLATE.coldAfter;
      context.fillStyle = cold ? '#3a2a2a' : PALETTE.ready;
      context.beginPath();
      context.arc(plate.cx, plate.cy, plate.r + 12, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.plate;
      context.beginPath();
      context.arc(plate.cx, plate.cy, plate.r, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#d8cbb8';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(plate.cx, plate.cy, plate.r - 18, 0, Math.PI * 2);
      context.stroke();
      // A tinted disc behind the dish so pale ingredients (dumpling, rice) still read.
      context.fillStyle = '#ead9b8';
      context.beginPath();
      context.arc(plate.cx, plate.cy, 58, 0, Math.PI * 2);
      context.fill();
      for (let chip = 0; chip < dish.recipe.length; chip += 1) {
        const angle = -Math.PI / 2 + (chip - (dish.recipe.length - 1) / 2) * 0.8;
        drawIngredientIcon(dish.recipe[chip], plate.cx + Math.cos(angle) * 34, plate.cy + Math.sin(angle) * 24, 22);
      }
      text(`${dish.name} ${cold ? '凉了' : '好了!'}`, plate.cx, plate.cy + plate.r + 34, 22, cold ? PALETTE.warn : PALETTE.ready, 'center', 'bold');
      text('点击上菜 (Space)', plate.cx, plate.cy + plate.r + 60, 16, PALETTE.muted, 'center');
    } else {
      context.fillStyle = PALETTE.plate;
      context.beginPath();
      context.arc(plate.cx, plate.cy, plate.r, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#d8cbb8';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(plate.cx, plate.cy, plate.r - 18, 0, Math.PI * 2);
      context.stroke();
      text('空盘子', plate.cx, plate.cy + 8, 22, '#8a7a63', 'center', 'bold');
      text('做好了会自动上盘', plate.cx, plate.cy + plate.r + 34, 16, PALETTE.muted, 'center');
    }
  }

  function drawCounter(state, hover) {
    const bin = LAYOUT.bin;
    context.fillStyle = PALETTE.counterTop;
    context.fillRect(0, LAYOUT.counter.y, FIELD.width, 22);
    context.fillStyle = PALETTE.counter;
    context.fillRect(0, LAYOUT.counter.y + 22, FIELD.width, FIELD.height - LAYOUT.counter.y - 22);
    const totalWidth = INGREDIENTS.length * bin.width + (INGREDIENTS.length - 1) * bin.gap;
    const startX = (FIELD.width - totalWidth) / 2;
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      const ingredient = INGREDIENTS[index];
      const x = startX + index * (bin.width + bin.gap);
      const y = bin.y;
      const isHover = hover && hover.x >= x && hover.x <= x + bin.width && hover.y >= y && hover.y <= y + bin.height;
      context.fillStyle = isHover ? '#54401f' : PALETTE.woodDark;
      roundRect(x, y, bin.width, bin.height, 10);
      context.fill();
      context.strokeStyle = isHover ? PALETTE.gold : '#5a4632';
      context.lineWidth = 2;
      roundRect(x, y, bin.width, bin.height, 10);
      context.stroke();
      drawIngredientIcon(ingredient.id, x + bin.width / 2, y + 52, 30);
      context.textBaseline = 'alphabetic';
      text(ingredient.name, x + bin.width / 2, y + 112, 22, PALETTE.text, 'center', 'bold');
      text(`按 ${ingredient.key}`, x + bin.width / 2, y + 136, 15, PALETTE.muted, 'center');
    }
    text('点击食材加入铁锅 · 点击铁锅翻炒 · Space 上菜 · Del 倒掉 · P 暂停', FIELD.width / 2, LAYOUT.hint.y, 16, PALETTE.muted, 'center');
  }

  function drawPanel(title, lines, prompt) {
    const panel = { width: 640, top: 150, line: 34, bottom: 76 };
    const height = panel.top + lines.length * panel.line + panel.bottom;
    const x = (FIELD.width - panel.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20,16,31,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, panel.width, height, 14);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    roundRect(x, y, panel.width, height, 14);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, PALETTE.text, 'center', 'bold');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + panel.top + index * panel.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 42, 23, PALETTE.gold, 'center', 'bold');
  }

  const TITLE_LINES = [
    '夜市大排档：看单做菜，别让客人等太久。',
    '点食材下锅，配方对了就开炒，好了自动上盘，',
    '点盘子（或按 Space）上菜赚钱。超时、烧糊都扣命。',
    '',
  ];
  const PAUSED_LINES = ['锅还热着，等你回来。'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the stall, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, hover) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawBackground(state.elapsed);
    drawOrderBoard(state);
    drawHud(state);
    drawMenu();
    drawWok(state, state.elapsed);
    drawPlate(state);
    drawCounter(state, hover);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('WOK RUSH 宵夜档', TITLE_LINES, '按 Space 或点击开始');
      return;
    }
    if (screen === SCREEN_PAUSED) drawPanel('暂停 Paused', PAUSED_LINES, '按 P 继续');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = `上了 ${state.served} 道菜 · 最高连击 x${state.bestCombo}`;
      OVER_LINES[2] = bestLabel(best);
      drawPanel('打烊了 Game Over', OVER_LINES, '按 Space 或点击再来一局');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}

/** What the player clicked, in logical playfield coordinates (or null). */
export function hitTest(x, y) {
  const bin = LAYOUT.bin;
  const totalWidth = INGREDIENTS.length * bin.width + (INGREDIENTS.length - 1) * bin.gap;
  const startX = (FIELD.width - totalWidth) / 2;
  for (let index = 0; index < INGREDIENTS.length; index += 1) {
    const bx = startX + index * (bin.width + bin.gap);
    if (x >= bx && x <= bx + bin.width && y >= bin.y && y <= bin.y + bin.height) {
      return { type: 'ingredient', id: INGREDIENTS[index].id };
    }
  }
  const wok = LAYOUT.wok;
  if ((x - wok.cx) ** 2 + (y - wok.cy) ** 2 <= (wok.r + 12) ** 2) return { type: 'wok' };
  const plate = LAYOUT.plate;
  if ((x - plate.cx) ** 2 + (y - plate.cy) ** 2 <= (plate.r + 12) ** 2) return { type: 'plate' };
  const dump = LAYOUT.dump;
  if (x >= dump.x && x <= dump.x + dump.width && y >= dump.y && y <= dump.y + dump.height) {
    return { type: 'dump' };
  }
  const board = LAYOUT.board;
  for (let slot = 0; slot < ORDER.max; slot += 1) {
    const tx = board.x + 16 + slot * (LAYOUT.ticket.width + LAYOUT.ticket.gap);
    const ty = board.y + 28;
    if (x >= tx && x <= tx + LAYOUT.ticket.width && y >= ty && y <= ty + LAYOUT.ticket.height) {
      return { type: 'ticket', index: slot };
    }
  }
  return null;
}
