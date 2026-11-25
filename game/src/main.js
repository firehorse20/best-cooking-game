// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over. Clicks land on counter bins,
// the wok, the plate, an order ticket or the dump button; keys 1-8 drop ingredients, Space
// serves, Del dumps the wok, P pauses.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BURN, EVENT_EXPIRE, EVENT_OVER, EVENT_SERVE } from './world.js';
import { ACTION_CONFIRM, ACTION_DUMP, ACTION_PAUSE, ACTION_SERVE, createInput } from './input.js';
import { createRenderer, hitTest, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each event.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    input.takeClicks();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`开工。${LIVES} 条命。`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`打烊了。营业额 ${world.state.score}。最佳 ${best}。`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('暂停。');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('继续。');
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_SERVE) {
        if (world.serve() & EVENT_SERVE) announce(`上菜！营业额 ${world.state.score}。`);
      }
      if (actions & ACTION_DUMP) world.dump();
    }
  }

  /** One click (or an ingredient key) while playing: what did it land on? */
  function handleClicks() {
    const clicks = input.takeClicks();
    for (const click of clicks) {
      if (click.ingredient !== undefined) {
        const ingredient = ['rice', 'egg', 'noodles', 'shrimp', 'greens', 'dumpling', 'chili', 'sauce'][click.ingredient];
        world.addIngredient(ingredient);
        continue;
      }
      const point = renderer.toField(click.x, click.y);
      const hit = hitTest(point.x, point.y);
      if (!hit) continue;
      if (hit.type === 'ingredient') world.addIngredient(hit.id);
      else if (hit.type === 'wok') world.stir();
      else if (hit.type === 'plate' || hit.type === 'ticket') {
        if (world.serve() & EVENT_SERVE) announce(`上菜！营业额 ${world.state.score}。`);
      } else if (hit.type === 'dump') world.dump();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, true);
      return;
    }
    const events = world.step(STEP, false);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_SERVE) announce(`上菜！营业额 ${world.state.score}。`);
    else if (events & EVENT_EXPIRE) announce(world.state.lives === 1 ? '客人走了！还剩 1 条命。' : `客人走了！还剩 ${world.state.lives} 条命。`);
    else if (events & EVENT_BURN) announce(world.state.lives === 1 ? '烧糊了！还剩 1 条命。' : `烧糊了！还剩 ${world.state.lives} 条命。`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) handleClicks();
    else input.takeClicks();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const hover = input.hover();
    renderer.draw(world.state, screen, best, hover ? renderer.toField(hover.x, hover.y) : null);
  }

  // Leaving the tab pauses a running game rather than letting orders walk away unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('暂停。');
    }
  });

  announce('Wok Rush 宵夜档。按 Space 或点击开始。');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
