// The screenshot scenes behind ?shot=title|play|caught|escaped. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (jump the obstacle ahead, duck under the tall ones,
// grab what is safe), so every frame is what a short game really looks like and
// the same seed always gives the same frame.
import { STEP, TURKEY } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const TITLE_SECONDS = 4;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

// How close (pixels, turkey front to obstacle front) the autopilot lets an
// obstacle get before it jumps. The jump carries the turkey ~286 px at opening
// speed, and its whole body must clear the obstacle before it lands, so the
// jump has to be late — and later still as speed grows, since the jump covers
// more ground. A time-to-contact trigger keeps the timing right at any speed.
const JUMP_SECONDS = 0.35;

// How far ahead, in seconds, the autopilot looks for threats. The play scene's
// pilot looks well ahead and keeps its lives; the caught scene's barely looks
// ahead and stops jumping after a while, so it is caught out once the pace picks up.
const HORIZON_PLAY = 0.8;
const HORIZON_CAUGHT = 0.22;
const CAUGHT_GIVES_UP_AT = 26;

/** Would the turkey, moving at `speed`, hit `obstacle` if it stays on the ground? */
function wouldHitOnGround(state, obstacle, secondsAhead) {
  const speed = state.speed;
  const futureX = obstacle.x - speed * secondsAhead;
  const turkeyFront = TURKEY.x + TURKEY.width;
  return futureX < turkeyFront + 10 && futureX + obstacle.w > TURKEY.x;
}

/** The nearest obstacle the turkey must deal with right now, if any. A knife
 *  still in the air or an axe still raised is a warning, not a threat yet —
 *  except a telegraphing axe, which the turkey must jump early, before the chop
 *  sweeps through where it stands. An obstacle that has just reached the
 *  turkey's front still counts: the turkey may yet jump clear of it. */
function threatAhead(state, horizonSeconds) {
  const reach = state.speed * horizonSeconds + TURKEY.width;
  let threat = null;
  for (const obstacle of state.obstacles) {
    if (obstacle.state === 'done') continue;
    const distance = obstacle.x - (TURKEY.x + TURKEY.width);
    if (distance < -TURKEY.width - 100 || distance > reach) continue;
    if (obstacle.def.clear === 'flee' && (obstacle.state === 'approach' || obstacle.state === 'active')) continue;
    if (!threat || obstacle.x < threat.x) threat = obstacle;
  }
  return threat;
}

/** Jump for low obstacles and nets, duck under the tall ones, keep running otherwise.
 *  A jump is only asked for while the turkey is on the ground, so a fresh jump
 *  fires the moment it lands — holding jump across a landing must never swallow it. */
function autopilot(state, horizonSeconds, giveUpAt) {
  if (giveUpAt !== null && state.time > giveUpAt) return { jump: false, duck: false };
  const threat = threatAhead(state, horizonSeconds);
  if (!threat) return { jump: false, duck: false };
  const distance = threat.x - (TURKEY.x + TURKEY.width);
  if (threat.def.clear === 'duck') return { jump: false, duck: distance < 170 };
  if (threat.id === 'axeChop' && threat.state === 'telegraph') {
    // Jump early: the chop sweeps through the turkey's spot shortly after the
    // axe reaches it, and the jump must already be in the air by then.
    return { jump: distance < 150 && state.turkey.onGround, duck: false };
  }
  if (threat.id === 'axeChop' && threat.state === 'chop') {
    return { jump: distance < 150 && state.turkey.onGround, duck: false };
  }
  return { jump: distance < state.speed * JUMP_SECONDS && state.turkey.onGround, duck: false };
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * title: a few seconds of the farmyard behind the title screen.
 * play: the autopilot runs a real run for PLAY_SECONDS.
 * caught: a weak autopilot that gives up and gets caught.
 * escaped: the autopilot runs until the turkey escapes at 2,000 m.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'caught' && name !== 'escaped') {
    world.state.screen = SCREEN_TITLE;
    for (let i = 0; i < TITLE_SECONDS / STEP; i += 1) world.state.particles.push({
      kind: 'leaf', x: 200 + i * 3, y: 120 + (i % 40), vx: -60, vy: 20, life: 3, maxLife: 3, size: 5,
    });
    return SCREEN_TITLE;
  }
  world.startRun();
  const limit = name === 'play' ? PLAY_SECONDS : END_LIMIT_SECONDS;
  const horizon = name === 'caught' ? HORIZON_CAUGHT : HORIZON_PLAY;
  const giveUpAt = name === 'caught' ? CAUGHT_GIVES_UP_AT : null;
  let lastJump = false;
  for (let i = 0; i < limit / STEP; i += 1) {
    const action = autopilot(world.state, horizon, giveUpAt);
    const jumpEdge = action.jump && !lastJump;
    lastJump = action.jump;
    world.step(STEP, { jump: jumpEdge, duck: action.duck });
    if (world.state.screen === SCREEN_OVER) break;
  }
  if (world.state.screen !== SCREEN_OVER) {
    if (name === 'escaped') {
      // The autopilot survived the whole limit without escaping: nudge the run
      // to the finish line so the shot still shows the escaped screen.
      world.state.distanceM = 1995;
      for (let i = 0; i < 400; i += 1) {
        world.step(STEP, { jump: false, duck: false });
        if (world.state.screen === SCREEN_OVER) break;
      }
    } else if (name === 'caught') {
      // It survived: stop jumping entirely until the farmer closes in.
      for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
        world.step(STEP, { jump: false, duck: false });
        if (world.state.screen === SCREEN_OVER) break;
      }
    }
  }
  return world.state.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY;
}

export { SAMPLE, wouldHitOnGround };
