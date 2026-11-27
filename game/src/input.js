// Keyboard and mouse input. The game answers to arrows/WASD + Space to jump,
// Down/S to duck, P to pause, M to mute, R to restart, Enter to start — and a
// mouse click or tap jumps too, while menu buttons are clicked directly.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let clickX = null;
  let clickY = null;
  let clickConsumed = true;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const name = keyName(event);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
    if (!keys.has(name)) pressed.add(name);
    keys.add(name);
  });
  window.addEventListener('keyup', (event) => keys.delete(keyName(event)));
  window.addEventListener('blur', () => { keys.clear(); pressed.clear(); });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    clickX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    clickY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    clickConsumed = false;
  });

  function jumpHeld() {
    return keys.has(' ') || keys.has('ArrowUp') || keys.has('w') || keys.has('W');
  }
  function duckHeld() {
    return keys.has('ArrowDown') || keys.has('s') || keys.has('S');
  }
  function takePressed(name) {
    if (pressed.has(name)) { pressed.delete(name); return true; }
    return false;
  }
  function takeClick() {
    if (!clickConsumed && clickX !== null) {
      clickConsumed = true;
      return { x: clickX, y: clickY };
    }
    return null;
  }
  function endFrame() { pressed.clear(); }

  return { jumpHeld, duckHeld, takePressed, takeClick, endFrame };
}
