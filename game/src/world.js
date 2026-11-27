// The game world: the turkey, the farmer, the obstacles, the pickups, the
// missions and the rules that decide caught or escaped. Rendering never touches
// this state except to read it, and the screenshot autopilot drives it by
// calling step() with the same actions a player would make.
import {
  BEST_KEY, ESCAPE_DISTANCE_M, FARMER, GROUND_Y, LIVES_START, MISSION_BONUS,
  MISSIONS, OBSTACLES, PICKUPS, POWERUPS, PX_PER_METER, STEP, TURKEY, ZONES,
} from './config.js';
import { makeRandom, pickWeighted, range } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export function zoneFor(distanceM) {
  for (let i = ZONES.length - 1; i >= 0; i -= 1) {
    if (distanceM >= ZONES[i].fromM) return ZONES[i];
  }
  return ZONES[0];
}

export function createWorld(seed = 1) {
  const random = makeRandom(seed);
  const state = freshState();

  function freshState() {
    return {
      screen: SCREEN_TITLE,
      overReason: null,
      time: 0,
      distanceM: 0,
      score: 0,
      lives: LIVES_START,
      speed: TURKEY.baseSpeed,
      zone: ZONES[0],
      zoneAnnounced: ZONES[0].id,
      turkey: { y: GROUND_Y - TURKEY.height, vy: 0, onGround: true, ducking: false, jumpsUsed: 0, runCycle: 0 },
      farmer: { gap: FARMER.startGap, mode: 'chase', modeTimer: 0, searchTimer: 0, cornerTimer: 0, sprinting: false },
      obstacles: [],
      pickups: [],
      powerups: [],
      particles: [],
      toasts: [],
      counts: { corn: 0, pumpkins: 0, dodges: 0, knives: 0, seconds: 0 },
      missionsDone: new Set(),
      effects: { featherUntil: 0, speedUntil: 0, hideUntil: 0, shield: false },
      invulnerableUntil: 0,
      snaredUntil: 0,
      spawnTimer: 1.2,
      pickupTimer: 2.2,
      powerupTimer: 9,
      forceNetNext: false,
      banner: null,
      bannerUntil: 0,
      events: [],
      best: 0,
    };
  }

  function reset() {
    const keepBest = state.best;
    Object.assign(state, freshState());
    state.best = keepBest;
    try { state.best = Number(window.localStorage.getItem(BEST_KEY)) || 0; } catch { /* storage may be off */ }
  }

  function toast(text, seconds = 2.4) {
    state.toasts.push({ text, until: state.time + seconds });
    if (state.toasts.length > 3) state.toasts.shift();
  }

  function announceZone(zone) {
    state.banner = zone.light === 'day'
      ? `${zone.name} — morning sun, Farmer Gus is on your tail!`
      : zone.light === 'dusk'
        ? `${zone.name} — dusk falls, the knives come out!`
        : `${zone.name} — night. Fireflies, owls, and one very angry farmer.`;
    state.bannerUntil = state.time + 3.2;
    state.events.push('zone');
  }

  function completeMission(mission) {
    state.missionsDone.add(mission.id);
    state.score += MISSION_BONUS;
    toast(`Mission complete: ${mission.text}  (+${MISSION_BONUS})`, 3);
    state.events.push('mission');
  }

  function checkMissions() {
    for (const mission of MISSIONS) {
      if (state.missionsDone.has(mission.id)) continue;
      const c = state.counts;
      const done =
        (mission.kind === 'distance' && state.distanceM >= mission.goal) ||
        (mission.kind === 'corn' && c.corn >= mission.goal) ||
        (mission.kind === 'pumpkins' && c.pumpkins >= mission.goal) ||
        (mission.kind === 'dodges' && c.dodges >= mission.goal) ||
        (mission.kind === 'knives' && c.knives >= mission.goal) ||
        (mission.kind === 'seconds' && c.seconds >= mission.goal);
      if (done) completeMission(mission);
    }
  }

  function spawnObstacle() {
    // A cornered farmer throws a net — but it goes through the normal spawn
    // gate, never squeezed in on top of another obstacle.
    const def = state.forceNetNext
      ? OBSTACLES.find((o) => o.id === 'netTrap')
      : pickWeighted(random, OBSTACLES.filter((o) => o.zones.includes(state.zone.id)));
    state.forceNetNext = false;
    const zone = state.zone;
    const obstacle = {
      id: def.id, def, x: 1280 + 60, y: GROUND_Y - def.h,
      w: def.w, h: def.h, passed: false, state: 'active', timer: 0,
    };
    // The carving knife flies in high where the player can see it, then drops
    // on the turkey's path once it is close; the axe travels in, then telegraphs
    // its chop. Both strike by proximity, never by a timer that could expire
    // while they are still a screen away.
    if (def.falls) { obstacle.y = 120; obstacle.vy = 0; obstacle.state = 'approach'; }
    if (def.timed) { obstacle.state = 'approach'; obstacle.timer = 0; }
    state.obstacles.push(obstacle);
    return obstacle;
  }

  function spawnPickupRow() {
    const def = pickWeighted(random, PICKUPS);
    const baseY = GROUND_Y - 46;
    const count = def.id === 'corn' ? 3 : 1;
    for (let i = 0; i < count; i += 1) {
      state.pickups.push({
        id: def.id, def, x: 1280 + 80 + i * 56,
        y: def.id === 'pumpkin' ? GROUND_Y - 40 : baseY - (i === 1 ? 70 : 0),
        w: 40, h: 40, taken: false, bob: random() * 6,
      });
    }
  }

  function spawnPowerup() {
    const def = pickWeighted(random, POWERUPS);
    state.powerups.push({
      id: def.id, def, x: 1280 + 80, y: GROUND_Y - 150,
      w: 44, h: 44, taken: false, bob: 0,
    });
  }

  function addParticles(kind, x, y, n) {
    for (let i = 0; i < n; i += 1) {
      state.particles.push({
        kind, x: x + range(random, -14, 14), y: y + range(random, -10, 10),
        vx: range(random, -90, 30), vy: range(random, -160, -40),
        life: range(random, 0.4, 0.9), maxLife: 0.9, size: range(random, 3, 7),
      });
    }
  }

  function hurtTurkey(reason) {
    if (state.time < state.invulnerableUntil || state.effects.shield) {
      if (state.effects.shield) {
        state.effects.shield = false;
        toast('Golden Egg Shield shattered — saved!');
        state.events.push('shield');
      }
      return;
    }
    state.lives -= 1;
    state.farmer.gap = Math.max(20, state.farmer.gap - FARMER.hitClosesGap);
    state.invulnerableUntil = state.time + 1.6;
    state.events.push('hit');
    addParticles('feather', TURKEY.x + 30, state.turkey.y + 20, 14);
    toast(reason, 1.6);
    if (state.lives <= 0 || state.farmer.gap <= FARMER.catchGap) endRun('caught');
  }

  function endRun(reason) {
    state.screen = SCREEN_OVER;
    state.overReason = reason;
    state.events.push(reason === 'escaped' ? 'win' : 'caught');
    const finalScore = Math.floor(state.score);
    if (finalScore > state.best) {
      state.best = finalScore;
      try { window.localStorage.setItem(BEST_KEY, String(finalScore)); } catch { /* storage may be off */ }
    }
  }

  // One fixed step of the run. `action` is { jump: boolean (edge), duck: boolean }.
  // Returns a bitmask of events for the sound layer; the world itself is silent.
  function step(dt, action) {
    if (state.screen !== SCREEN_PLAY) return 0;
    state.time += dt;
    state.counts.seconds = Math.floor(state.time);
    const t = state.turkey;
    const farmer = state.farmer;

    // Speed and distance. Speed Corn multiplies the pace for a short dash.
    const dash = state.time < state.effects.speedUntil ? 1.45 : 0;
    state.speed = Math.min(TURKEY.maxSpeed, TURKEY.baseSpeed + state.time * TURKEY.speedRampPerSecond) * (dash || 1);
    state.distanceM += (state.speed * dt) / PX_PER_METER;
    state.score += (state.speed * dt) / PX_PER_METER;

    // Zone changes as the run crosses each boundary.
    const zone = zoneFor(state.distanceM);
    if (zone.id !== state.zone.id) {
      state.zone = zone;
      announceZone(zone);
    }
    if (state.distanceM >= ESCAPE_DISTANCE_M) { checkMissions(); endRun('escaped'); return 0; }

    // Turkey physics: jump, double jump with Feather Wings, duck, gravity.
    const feather = state.time < state.effects.featherUntil;
    if (action.jump && state.time >= state.snaredUntil) {
      if (t.onGround) {
        t.vy = TURKEY.jumpVelocity;
        t.onGround = false;
        t.jumpsUsed = 1;
        state.events.push('jump');
      } else if (feather && t.jumpsUsed < 2) {
        t.vy = TURKEY.jumpVelocity * 0.92;
        t.jumpsUsed = 2;
        state.events.push('doubleJump');
      }
    }
    t.ducking = Boolean(action.duck) && t.onGround;
    t.vy += TURKEY.gravity * dt;
    t.y += t.vy * dt;
    if (t.y >= GROUND_Y - TURKEY.height) {
      t.y = GROUND_Y - TURKEY.height;
      t.vy = 0;
      t.onGround = true;
      t.jumpsUsed = 0;
    }
    t.runCycle += (state.speed * dt) / 26;

    // The farmer: three behaviours. Chase is the default; every so often he
    // stops to search, and when the turkey pulls far ahead he corners — a
    // sprint plus a net trap thrown ahead of the bird.
    farmer.modeTimer += dt;
    if (farmer.mode === 'chase' && farmer.modeTimer > FARMER.searchEverySeconds) {
      farmer.mode = 'search';
      farmer.modeTimer = 0;
      farmer.searchTimer = FARMER.searchDuration;
      state.events.push('spotted');
      toast('Farmer Gus stops to SEARCH… duck behind a hay bale!', 2.6);
    } else if (farmer.mode === 'search') {
      farmer.searchTimer -= dt;
      farmer.gap = Math.min(420, farmer.gap + 26 * dt);
      const nearHay = state.obstacles.some((o) => o.id === 'hayBale' && Math.abs(o.x - TURKEY.x) < 120 && t.ducking);
      if (nearHay) {
        farmer.gap = Math.min(420, farmer.gap + 130);
        toast('Hidden in the hay — Gus lost your trail!', 2);
        farmer.mode = 'chase';
        farmer.modeTimer = 0;
      } else if (farmer.searchTimer <= 0) {
        farmer.mode = 'chase';
        farmer.modeTimer = 0;
      }
    }
    const farAhead = (farmer.gap > 380 && state.distanceM > 300) || state.distanceM > 1500;
    if (farmer.mode === 'chase' && farAhead && farmer.cornerTimer <= 0) {
      farmer.mode = 'corner';
      farmer.modeTimer = 0;
      farmer.cornerTimer = 12;
      state.events.push('spotted');
      toast('Gus CORNERS you — he sprints and throws a net!', 2.6);
      state.forceNetNext = true;
    }
    if (farmer.mode === 'corner') {
      farmer.gap -= 42 * dt;
      if (farmer.modeTimer > FARMER.cornerSprintSeconds) {
        farmer.mode = 'chase';
        farmer.modeTimer = 0;
      }
    }
    farmer.cornerTimer = Math.max(0, farmer.cornerTimer - dt);
    if (farmer.mode === 'chase' && state.time >= state.effects.hideUntil) {
      farmer.gap = Math.min(420, farmer.gap + FARMER.recoverPerSecond * dt);
    }
    if (farmer.gap <= FARMER.catchGap) { endRun('caught'); return 0; }

    // Spawning: obstacles, pickup rows and power-ups, paced by the zone — and
    // gated on position, so no two obstacles can ever arrive closer together
    // than one jump's distance plus the time to jump again.
    state.spawnTimer -= dt;
    const rightmostX = state.obstacles.reduce((max, o) => Math.max(max, o.x), 0);
    const minGap = state.speed * 1.5;
    if (state.spawnTimer <= 0 && rightmostX <= 1340 - minGap) {
      spawnObstacle();
      const [slow, fast] = state.zone.spawnEverySeconds;
      state.spawnTimer = range(random, fast, slow);
    }
    state.pickupTimer -= dt;
    if (state.pickupTimer <= 0) { spawnPickupRow(); state.pickupTimer = range(random, 3.2, 5.5); }
    state.powerupTimer -= dt;
    if (state.powerupTimer <= 0) { spawnPowerup(); state.powerupTimer = range(random, 11, 17); }

    // Move the world past the turkey and resolve every entity.
    const turkeyBox = {
      x: TURKEY.x + 6, y: t.y + (t.ducking ? 26 : 0),
      w: TURKEY.width - 12, h: TURKEY.height - (t.ducking ? 26 : 0),
    };
    const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    for (const obstacle of state.obstacles) {
      obstacle.x -= state.speed * dt;
      if (obstacle.def.falls) {
        if (obstacle.state === 'approach') {
          // Drop where the turkey will be, not where it is: the knife warns for
          // 0.55 s, then falls for ~0.47 s, so it starts its drop far enough out
          // that it lands 180 px ahead of the turkey's beak — a fair dodge.
          const dropAt = TURKEY.x + TURKEY.width + 180 + state.speed * 1.02;
          if (obstacle.x < dropAt) { obstacle.state = 'active'; obstacle.timer = 0; }
        } else if (obstacle.state === 'active') {
          obstacle.timer += dt;
          if (obstacle.timer > 0.55) { obstacle.state = 'falling'; obstacle.vy = 350; state.events.push('knife'); }
        } else if (obstacle.state === 'falling') {
          obstacle.vy = (obstacle.vy || 0) + 2400 * dt;
          obstacle.y += obstacle.vy * dt;
          if (obstacle.y >= GROUND_Y - obstacle.h) {
            obstacle.y = GROUND_Y - obstacle.h;
            obstacle.state = 'stuck';
            obstacle.timer = 0;
          }
        } else if (obstacle.state === 'stuck') {
          obstacle.timer += dt;
          if (obstacle.timer > 1.6) obstacle.state = 'done';
        }
      }
      if (obstacle.def.timed) {
        if (obstacle.state === 'approach') {
          if (obstacle.x < TURKEY.x + 340) { obstacle.state = 'telegraph'; obstacle.timer = 0.9; }
        } else if (obstacle.state === 'telegraph') {
          // The axe chops once it is right on the turkey — the warning is the
          // approach, and the chop itself is short and sweeps through the bird.
          if (obstacle.x < TURKEY.x + 120) { obstacle.state = 'chop'; obstacle.timer = 0.4; state.events.push('knife'); }
        } else if (obstacle.state === 'chop') {
          obstacle.timer -= dt;
          if (obstacle.timer <= 0) obstacle.state = 'done';
        }
      }
      if (!obstacle.passed && obstacle.x + obstacle.w < TURKEY.x) {
        obstacle.passed = true;
        if (obstacle.state !== 'done') {
          state.counts.dodges += 1;
          if (obstacle.id === 'fallingKnife' || obstacle.id === 'axeChop') state.counts.knives += 1;
          state.score += 5;
        }
      }
      if (obstacle.state === 'done') continue;
      const box = { x: obstacle.x, y: obstacle.y, w: obstacle.w, h: obstacle.h };
      if (obstacle.def.clear === 'duck') box.h = 54;
      if (overlaps(turkeyBox, box)) {
        if (obstacle.id === 'netTrap') {
          state.snaredUntil = state.time + 1.1;
          state.farmer.gap = Math.max(20, state.farmer.gap - FARMER.netClosesGap);
          obstacle.state = 'done';
          state.events.push('hit');
          toast('Snared in the net! Gus closes in!', 1.8);
          if (state.farmer.gap <= FARMER.catchGap) endRun('caught');
        } else if (obstacle.def.clear === 'flee' && (obstacle.state === 'approach' || obstacle.state === 'active' || obstacle.state === 'telegraph')) {
          // A knife still in the air, or an axe still raised, is only a warning — run past it.
        } else if (obstacle.def.clear === 'duck' && t.ducking) {
          // Ducked clean under the scarecrow's arms / the corn wall.
        } else {
          hurtTurkey(`Ouch — the ${obstacle.def.name.toLowerCase()} got you!`);
          obstacle.state = 'done';
        }
      }
    }
    state.obstacles = state.obstacles.filter((o) => o.x + o.w > -80 && o.state !== 'done');

    for (const pickup of state.pickups) {
      pickup.x -= state.speed * dt;
      pickup.bob += dt * 3;
      if (!pickup.taken && overlaps(turkeyBox, { x: pickup.x, y: pickup.y, w: pickup.w, h: pickup.h })) {
        pickup.taken = true;
        state.score += pickup.def.points;
        if (pickup.id === 'corn') { state.counts.corn += 1; state.events.push('corn'); }
        if (pickup.id === 'pumpkin') { state.counts.pumpkins += 1; state.events.push('pumpkin'); }
        if (pickup.id === 'egg') { state.events.push('power'); }
        addParticles('sparkle', pickup.x + 20, pickup.y + 20, 8);
      }
    }
    state.pickups = state.pickups.filter((p) => !p.taken && p.x > -60);

    for (const powerup of state.powerups) {
      powerup.x -= state.speed * dt;
      powerup.bob += dt * 3;
      if (!powerup.taken && overlaps(turkeyBox, { x: powerup.x, y: powerup.y, w: powerup.w, h: powerup.h })) {
        powerup.taken = true;
        state.events.push('power');
        if (powerup.id === 'feather') { state.effects.featherUntil = state.time + 10; toast('Feather Wings — double jump for 10 s!'); }
        if (powerup.id === 'speedCorn') { state.effects.speedUntil = state.time + 5; state.farmer.gap = Math.min(420, state.farmer.gap + 90); toast('Speed Corn — DASH!'); }
        if (powerup.id === 'haystack') { state.effects.hideUntil = state.time + 8; toast('Haystack Hide — Gus cannot see you for 8 s!'); }
        if (powerup.id === 'goldenEgg') { state.effects.shield = true; toast('Golden Egg Shield — blocks the next hit!'); }
        if (powerup.id === 'pumpkinPie') {
          state.lives = Math.min(LIVES_START, state.lives + 1);
          toast('Pumpkin Pie — a life back!');
        }
      }
    }
    state.powerups = state.powerups.filter((p) => !p.taken && p.x > -60);

    // Ambient particles: leaves in the cornfield, fireflies at night, dust on the run.
    if (random() < (state.zone.light === 'night' ? 0.25 : state.zone.light === 'dusk' ? 0.18 : 0.06)) {
      state.particles.push({
        kind: state.zone.light === 'night' ? 'firefly' : 'leaf',
        x: 1280 + 10, y: range(random, 60, 420), vx: range(random, -140, -60), vy: range(random, -12, 30),
        life: range(random, 2, 4), maxLife: 4, size: range(random, 3, 6),
      });
    }
    if (t.onGround && random() < 0.3) {
      state.particles.push({ kind: 'dust', x: TURKEY.x + 6, y: GROUND_Y - 4, vx: -60, vy: -30, life: 0.5, maxLife: 0.5, size: 4 });
    }
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    state.toasts = state.toasts.filter((toastItem) => toastItem.until > state.time);
    checkMissions();
    return 0;
  }

  function takeEvents() {
    const events = state.events;
    state.events = [];
    return events;
  }

  function startRun() {
    reset();
    state.screen = SCREEN_PLAY;
  }

  return { state, reset, startRun, step, takeEvents, zoneFor };
}

export { STEP };
