# Gobble Dash: The Great Turkey Escape — 3 zones, 14 obstacles, 5 power-ups, 3 farmer moods, 12 missions, 12 sound effects

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/reyzn02/makefun-turkey-game/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/reyzn02/makefun-turkey-game/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Thanksgiving is coming. Farmer Gus has the oven hot and the carving knife
sharp — and you are the turkey. Run 2,000 m from the farmhouse through the
farmyard, the cornfield and the dark forest, and live to gobble another day.

## Play it

Serve `game/` with any static server and open `index.html` in desktop Chrome
(no network needed — every file is local, every sound is synthesized):

```sh
node serve.ts
# then open http://localhost:8080
```

## Controls

- **Space / ↑ / W / click** — jump (double jump with Feather Wings)
- **↓ / S** — duck under scarecrows and corn walls
- **P** — pause · **M** — mute · **R** — restart · **Enter** — start

## The depth, enumerated

- **3 zones** — The Farmyard (day), The Cornfield (dusk), The Dark Forest
  (night, fireflies and stars). Each has its own sky, ground, silhouettes,
  spawn pace and obstacle mix; a banner announces every crossing.
- **14 obstacle types** — picket fence, hay bale, mud puddle, pumpkin patch,
  rolling barrel, garden rake, scarecrow (duck), farm dog, farmer net trap
  (snares you and drags Gus closer), falling carving knife (warns, then drops
  on a point ahead of you), roaring oven, chopping axe (telegraphs, then
  sweeps through where you stand), chicken wire, corn stalk wall (duck).
- **5 power-ups** — Feather Wings (double jump, 10 s), Speed Corn (dash,
  +45% speed, Gus falls behind), Haystack Hide (invisible to Gus, 8 s),
  Golden Egg Shield (blocks the next hit), Pumpkin Pie (restores a life).
  Plus corn (+10), pumpkins (+25) and golden eggs (+50) to collect.
- **3 farmer moods** — Gus *chases* (every hit closes the gap, clean running
  opens it), *searches* (stops to look around — duck behind a hay bale and he
  loses your trail), and *corners* (sprints and throws a net when you pull far
  ahead or past 1,500 m). The HUD's farmer meter shows how close he is; gap
  zero means dinner is served.
- **12 missions** — distance, corn, pumpkin, dodge, knife-dodge and survival
  goals, each paying +150 points with a toast when completed; escaping is
  mission 12 of 12.
- **12 sound effects + a music loop** — jump, double jump, corn, pumpkin, hit,
  knife whoosh, power-up, spotted, mission, win fanfare, caught sting, click,
  all synthesized live with WebAudio, plus a 16-step farmyard tune that plays
  while you run. No audio files.
- **High score** persisted in localStorage; **increasing difficulty** (speed
  ramps 260 → 540 px/s, spawn pace tightens per zone); **pause, mute, restart**;
  **title screen, HUD (score / distance / lives / farmer meter / effects /
  next mission), caught and escaped end screens** with full run stats.

## How it is built

Plain static files, no library, no build step — the game is one canvas and
eight small modules, each with one job:

| File | Job |
| --- | --- |
| `game/index.html` | Page, canvas, status line |
| `game/src/config.js` | Zones, obstacles, power-ups, missions, tuning |
| `game/src/random.js` | Seeded RNG (deterministic runs) |
| `game/src/audio.js` | WebAudio synth: 12 effects + music loop |
| `game/src/input.js` | Keyboard + mouse |
| `game/src/world.js` | State, physics, spawning, farmer AI, missions |
| `game/src/render.js` | All art, HUD, title and end screens |
| `game/src/shots.js` | Screenshot scenes + autopilot |
| `game/src/main.js` | Game loop and wiring |

`main.ts` (Node 22, standard library only) hands the entry in: it copies
`game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library. Screenshots are real
renders of the game's own code in headless Chromium — the title screen, a run
in play, the caught screen and the escaped screen — staged by `shots.js`,
which plays the real rules forward with an autopilot.

## Run the hand-in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Test evidence

- All 8 game modules parse as ES modules (`node --check`).
- Headless-Chromium runs of all four `?shot=` scenes and a live keyboard play
  session: **0 console errors, 0 failed requests** on every run.
- Autopilot logic tests (Node, real world + autopilot): the play scene survives
  its full 24 s on seeds 1, 2, 3, 7, 42; the caught scene ends caught at
  27–33 s; the escaped scene reaches 2,000 m with 12/12 missions on 7 of 8
  seeds 1, 2, 3, 5, 7, 11, 42, 99 (seed 42 escapes with 11/12) and scores
  5,085–5,375.
- Dossier: text 71,956 bytes (< 160 KiB cap); dossier.json 593,201 bytes
  (< 1.5 MiB cap).

---

<sub>Entered on [make.fun](https://make.fun/?ref=jqzhkth7&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
