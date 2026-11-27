// The entry point: wires the world, the renderer, the input and the sound
// together, runs the fixed-step game loop, and stages screenshot scenes when
// the page is opened with ?shot=title|play|caught|escaped.
import { STEP, VIEW } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { BUTTONS, render } from './render.js';
import { stageShot } from './shots.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, createWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1);

const audio = createAudio();
const input = createInput(canvas);
const world = createWorld(seed);
const state = world.state;

let paused = false;
let muted = false;
let lastTime = performance.now();
let accumulator = 0;
let jumpQueued = false;

function pointIn(button, point) {
  return point && point.x >= button.x && point.x <= button.x + button.w
    && point.y >= button.y && point.y <= button.y + button.h;
}

function announce(text) {
  if (status) status.textContent = text;
}

function startRun() {
  audio.unlock();
  audio.sfx.click();
  audio.startMusic();
  world.startRun();
  paused = false;
  announce('The run begins. Farmer Gus is chasing you — jump the fences!');
}

function togglePause() {
  if (state.screen !== SCREEN_PLAY) return;
  paused = !paused;
  announce(paused ? 'Paused.' : 'Running again.');
}

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // Menu keys and clicks, handled outside the fixed step.
  if (input.takePressed('Enter') || input.takePressed(' ')) {
    if (state.screen === SCREEN_TITLE) startRun();
    else if (state.screen === SCREEN_OVER) startRun();
  }
  if (input.takePressed('r') || input.takePressed('R')) {
    if (state.screen === SCREEN_OVER || state.screen === SCREEN_PLAY) startRun();
  }
  if (input.takePressed('p') || input.takePressed('P')) togglePause();
  if (input.takePressed('m') || input.takePressed('M')) {
    muted = audio.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }
  const click = input.takeClick();
  if (click) {
    audio.unlock();
    if (pointIn(BUTTONS.mute, click)) {
      muted = audio.toggleMute();
    } else if (state.screen === SCREEN_TITLE && pointIn(BUTTONS.start, click)) {
      startRun();
    } else if (state.screen === SCREEN_OVER && pointIn(BUTTONS.restart, click)) {
      startRun();
    } else if (state.screen === SCREEN_PLAY) {
      jumpQueued = true;
    }
  }
  if (input.jumpHeld() && state.screen === SCREEN_PLAY && !paused) jumpQueued = true;

  // Fixed-step simulation. Sounds fire from the events the world reports.
  if (state.screen === SCREEN_PLAY && !paused) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const action = { jump: jumpQueued, duck: input.duckHeld() };
      jumpQueued = false;
      world.step(STEP, action);
      for (const event of world.takeEvents()) {
        if (event === 'jump') audio.sfx.jump();
        else if (event === 'doubleJump') audio.sfx.doubleJump();
        else if (event === 'corn') audio.sfx.corn();
        else if (event === 'pumpkin') audio.sfx.pumpkin();
        else if (event === 'hit') audio.sfx.hit();
        else if (event === 'knife') audio.sfx.knife();
        else if (event === 'power') audio.sfx.power();
        else if (event === 'spotted') audio.sfx.spotted();
        else if (event === 'mission') audio.sfx.mission();
        else if (event === 'win') { audio.sfx.win(); audio.stopMusic(); }
        else if (event === 'caught') { audio.sfx.caught(); audio.stopMusic(); }
      }
      if (state.screen !== SCREEN_PLAY) break;
    }
  }
  input.endFrame();

  // The canvas is 1280x720 logical; the page scales it to the window.
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  render(ctx, state, now / 1000, muted);
  if (paused && state.screen === SCREEN_PLAY) {
    ctx.fillStyle = 'rgba(10,10,10,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 10);
    ctx.font = '22px sans-serif';
    ctx.fillText('Press P to keep running — Gus waits for no turkey.', VIEW.width / 2, VIEW.height / 2 + 32);
  }
  requestAnimationFrame(frame);
}

function resize() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}
window.addEventListener('resize', resize);
resize();

if (shotName) {
  // Screenshot mode: stage the scene deterministically, draw one frame, and
  // stop. No music, no input — the frame is the game itself, mid-run.
  const screen = stageShot(shotName, world);
  void screen;
  render(ctx, state, 4, false);
  announce(`Screenshot scene: ${shotName}.`);
} else {
  world.reset();
  announce('Gobble Dash: the great turkey escape. Press Enter or click Start.');
  requestAnimationFrame(frame);
}

export { VIEW };
