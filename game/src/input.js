// Keyboard and pointer input. One-shot presses (serve, dump, pause, start) are queued as bit
// flags and taken once by the loop, so a press between two frames is never lost and never
// counted twice. Pointer clicks are queued with their canvas position; the loop turns them into
// logical playfield points through the renderer's view. Hover position is kept for bin highlights.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_DUMP = 8;

const SERVE = new Set(['Space']);
const DUMP = new Set(['Backspace', 'Delete']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
/** Digit1..Digit8 drop that counter bin's ingredient into the wok. */
const INGREDIENT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];

export function createInput(target) {
  let actions = 0;
  let clicks = [];
  let hover = null;

  window.addEventListener('keydown', (event) => {
    if (SERVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SERVE;
    } else if (DUMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DUMP;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (INGREDIENT_KEYS.includes(event.code)) {
      if (!event.repeat) clicks.push({ ingredient: INGREDIENT_KEYS.indexOf(event.code) });
    } else return;
    event.preventDefault();
  });
  // A key released while the tab is hidden never sends keyup: nothing held is tracked here,
  // so there is nothing to let go of on blur.
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    clicks.push({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    hover = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  target.addEventListener('pointerleave', () => {
    hover = null;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The clicks and ingredient-key presses since the last call, in order. */
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
    /** The pointer's last canvas position, or null when it is not over the canvas. */
    hover() {
      return hover;
    },
  };
}
