// The screenshot scenes behind ?shot=start|play|serve|end. Each one drives the real rules from
// a fresh world with scripted moves (add the recipe, let it cook, serve it), so the frame is
// what real play looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
/** Seconds of cooking to leave the wok at for the mid-assembly scene (about half done). */
const PLAY_COOK_SECONDS = 2.2;

function addRecipe(world, dishId) {
  const recipes = {
    'fried-rice': ['rice', 'egg', 'greens'],
    dumplings: ['dumpling', 'greens', 'chili'],
    'noodle-soup': ['noodles', 'egg', 'shrimp'],
    'shrimp-rice': ['rice', 'shrimp', 'sauce'],
    'spicy-pot': ['noodles', 'chili', 'sauce'],
  };
  for (const ingredient of recipes[dishId]) world.addIngredient(ingredient);
}

function stepFor(world, seconds) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    world.step(STEP, false);
  }
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Two orders on the board, the first one half-cooked in the wok.
    world.forceOrder('fried-rice', 24);
    world.forceOrder('noodle-soup', 18);
    stepFor(world, 1);
    addRecipe(world, 'fried-rice');
    stepFor(world, PLAY_COOK_SECONDS);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'serve') {
    // A finished plate, glowing READY, with two orders waiting behind it.
    world.forceOrder('dumplings', 22);
    world.forceOrder('shrimp-rice', 16);
    addRecipe(world, 'dumplings');
    stepFor(world, 6);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    // Serve two dishes for a real score, then let three orders walk away.
    world.forceOrder('fried-rice', 30);
    addRecipe(world, 'fried-rice');
    stepFor(world, 5);
    world.serve();
    world.forceOrder('dumplings', 30);
    addRecipe(world, 'dumplings');
    stepFor(world, 6);
    world.serve();
    world.forceOrder('noodle-soup', 4);
    world.forceOrder('spicy-pot', 5);
    world.forceOrder('shrimp-rice', 6);
    for (let index = 0; index < 600 / STEP; index += 1) {
      if (world.step(STEP, false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // Title: a busy kitchen behind the panel.
  world.forceOrder('fried-rice', 26);
  world.forceOrder('dumplings', 20);
  for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
