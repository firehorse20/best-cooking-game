// The game's rules and state, with no drawing and no browser in it: the order board, the wok,
// the serving plate, the rush, the money and the lives. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react without the world knowing about
// screens or sound. Actions (addIngredient, stir, dump, serve) are the player's moves; the
// screenshot scenes drive them directly, so a staged frame is what real play looks like.
import { COMBO_CAP, COMBO_STEP, DISHES, INGREDIENTS, LEVEL, LIVES, ORDER, PLATE, STIR_BONUS, TIP_MAX, WOK_BURN_AFTER } from './config.js';

export const EVENT_SERVE = 1;
export const EVENT_EXPIRE = 2;
export const EVENT_BURN = 4;
export const EVENT_OVER = 8;

/** The dish whose recipe is exactly this multiset of ingredients, or null. */
export function dishFor(contents) {
  const key = [...contents].sort().join('+');
  for (const dish of DISHES) {
    if ([...dish.recipe].sort().join('+') === key) return dish;
  }
  return null;
}

export function ingredientById(id) {
  for (const ingredient of INGREDIENTS) if (ingredient.id === id) return ingredient;
  return null;
}

export function dishById(id) {
  for (const dish of DISHES) if (dish.id === id) return dish;
  return null;
}

export function createWorld(random) {
  const wok = { contents: [], cooking: -1, dish: null, done: false, doneTimer: 0 };
  const plate = { dish: null, timer: 0 };
  const orders = [];
  const state = {
    wok,
    plate,
    orders,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    lives: LIVES,
    level: 1,
    elapsed: 0,
    spawnTimer: ORDER.firstAt,
    nextOrderId: 1,
  };

  function reset() {
    wok.contents = [];
    wok.cooking = -1;
    wok.dish = null;
    wok.done = false;
    wok.doneTimer = 0;
    plate.dish = null;
    plate.timer = 0;
    orders.length = 0;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.served = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.spawnTimer = ORDER.firstAt;
    state.nextOrderId = 1;
  }

  function orderTime() {
    return Math.max(ORDER.minTime, ORDER.time * ORDER.timeScale ** (state.level - 1));
  }

  function spawnInterval() {
    return Math.max(ORDER.minInterval, ORDER.interval * ORDER.intervalScale ** (state.level - 1));
  }

  function spawnOrder() {
    if (orders.length >= ORDER.max) return;
    const dish = DISHES[Math.floor(random() * DISHES.length)];
    const time = orderTime();
    orders.push({ id: state.nextOrderId, dish: dish.id, timeLeft: time, timeMax: time });
    state.nextOrderId += 1;
  }

  /** Add one order for a named dish (used by the screenshot scenes). */
  function forceOrder(dishId, timeLeft) {
    if (orders.length >= ORDER.max) return;
    const dish = dishById(dishId);
    if (!dish) return;
    const time = timeLeft === undefined ? orderTime() : timeLeft;
    orders.push({ id: state.nextOrderId, dish: dish.id, timeLeft: time, timeMax: time });
    state.nextOrderId += 1;
  }

  function loseLife() {
    state.lives -= 1;
    state.combo = 0;
    if (state.lives <= 0) return EVENT_OVER;
    return 0;
  }

  /** Drop one ingredient into the wok; a complete recipe starts cooking at once. */
  function addIngredient(id) {
    if (wok.cooking >= 0 || wok.contents.length >= 3) return false;
    if (!ingredientById(id)) return false;
    wok.contents.push(id);
    const dish = dishFor(wok.contents);
    if (dish) {
      wok.dish = dish;
      wok.cooking = 0;
      wok.done = false;
      wok.doneTimer = 0;
    }
    return true;
  }

  /** Stir a cooking wok: a little extra progress, for an impatient cook. */
  function stir() {
    if (wok.cooking < 0 || wok.done) return false;
    wok.cooking = Math.min(1, wok.cooking + STIR_BONUS);
    return true;
  }

  /** Tip the wok's contents out (only before it finishes cooking). */
  function dump() {
    if (wok.cooking >= 0 && !wok.done) {
      // A half-cooked wok can be dumped too: the food is lost, the wok is free.
    }
    if (wok.contents.length === 0) return false;
    wok.contents = [];
    wok.cooking = -1;
    wok.dish = null;
    wok.done = false;
    wok.doneTimer = 0;
    return true;
  }

  /** Serve the plated dish to the oldest order that wants it. */
  function serve() {
    if (!plate.dish) return 0;
    const dish = dishById(plate.dish);
    let target = null;
    for (const order of orders) {
      if (order.dish === plate.dish) {
        target = order;
        break;
      }
    }
    if (!target) return 0;
    orders.splice(orders.indexOf(target), 1);
    const tip = plate.timer < PLATE.coldAfter ? Math.round(TIP_MAX * (target.timeLeft / target.timeMax)) : 0;
    const multiplier = Math.min(COMBO_CAP, 1 + state.combo * COMBO_STEP);
    state.score += Math.round((dish.price + tip) * multiplier);
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.served += 1;
    plate.dish = null;
    plate.timer = 0;
    return EVENT_SERVE;
  }

  /**
   * One fixed step. With `harmless` set (the title screen's backdrop) orders arrive and tick
   * but nothing expires, burns or scores: the kitchen stays busy behind the panel.
   */
  function step(dt, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnOrder();
      state.spawnTimer += spawnInterval();
    }

    for (let index = orders.length - 1; index >= 0; index -= 1) {
      const order = orders[index];
      order.timeLeft -= dt;
      if (order.timeLeft <= 0) {
        orders.splice(index, 1);
        if (!harmless) {
          events |= EVENT_EXPIRE;
          events |= loseLife();
          if (events & EVENT_OVER) return events;
        }
      }
    }

    if (wok.cooking >= 0 && !wok.done) {
      wok.cooking += dt / wok.dish.cook;
      if (wok.cooking >= 1) {
        wok.cooking = 1;
        wok.done = true;
        wok.doneTimer = 0;
        if (!plate.dish) {
          plate.dish = wok.dish.id;
          plate.timer = 0;
          wok.contents = [];
          wok.cooking = -1;
          wok.dish = null;
          wok.done = false;
        }
      }
    } else if (wok.done) {
      wok.doneTimer += dt;
      if (wok.doneTimer > WOK_BURN_AFTER && !harmless) {
        wok.contents = [];
        wok.cooking = -1;
        wok.dish = null;
        wok.done = false;
        wok.doneTimer = 0;
        events |= EVENT_BURN;
        events |= loseLife();
        if (events & EVENT_OVER) return events;
      }
    }

    if (plate.dish) {
      plate.timer += dt;
      if (plate.timer > PLATE.burnAfter && !harmless) {
        plate.dish = null;
        plate.timer = 0;
        events |= EVENT_BURN;
        events |= loseLife();
        if (events & EVENT_OVER) return events;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, addIngredient, stir, dump, serve, forceOrder };
}
