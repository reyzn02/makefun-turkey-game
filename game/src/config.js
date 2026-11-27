// Gobble Dash — configuration: every table that defines the world.
// Zones, obstacles, power-ups, collectibles, missions and tuning live here so
// the world, the renderer and the screenshot autopilot all read one truth.
export const VIEW = { width: 1280, height: 720 };
export const GROUND_Y = 620;
export const STEP = 1 / 60;
export const PX_PER_METER = 50;
export const ESCAPE_DISTANCE_M = 2000;

// The turkey's body. Speed is pixels per second; the world scrolls past it.
export const TURKEY = {
  x: 220,
  width: 64,
  height: 58,
  jumpVelocity: -1020,
  gravity: 1900,
  baseSpeed: 260,
  maxSpeed: 540,
  speedRampPerSecond: 1.6,
};

// The farmer starts this far behind the turkey (pixels). Hits close the gap;
// running clean opens it again. Gap <= 0 means the farmer grabs the turkey.
export const FARMER = {
  startGap: 280,
  catchGap: 0,
  hitClosesGap: 70,
  netClosesGap: 120,
  recoverPerSecond: 9,
  searchEverySeconds: 24,
  searchDuration: 2.6,
  cornerSprintSeconds: 3,
};

// Three zones the run passes through. Each has its own sky, light and ground,
// and the difficulty table that feeds the spawner.
export const ZONES = [
  {
    id: 'farmyard',
    name: 'The Farmyard',
    fromM: 0,
    toM: 500,
    sky: ['#ffd98a', '#ff9d5c', '#e26d3d'],
    sun: '#fff3b0',
    ground: '#8a5a2b',
    grass: '#7fae4c',
    light: 'day',
    spawnEverySeconds: [1.8, 1.55],
  },
  {
    id: 'cornfield',
    name: 'The Cornfield',
    fromM: 500,
    toM: 1200,
    sky: ['#ff9e57', '#d95f6e', '#6b3a6e'],
    sun: '#ffcf7d',
    ground: '#6e4423',
    grass: '#c98f2e',
    light: 'dusk',
    spawnEverySeconds: [1.7, 1.5],
  },
  {
    id: 'forest',
    name: 'The Dark Forest',
    fromM: 1200,
    toM: 2000,
    sky: ['#1d2b4f', '#0f1a33', '#070d1d'],
    sun: '#f4ead2',
    ground: '#2e2118',
    grass: '#2f5d3a',
    light: 'night',
    spawnEverySeconds: [1.6, 1.45],
  },
];

// Fourteen obstacle types. `clear` says how the turkey gets past:
// jump (over it), duck (under it) or flee (get out of the marked zone in time).
// `zones` says where each one can appear.
export const OBSTACLES = [
  { id: 'fence', name: 'Picket Fence', w: 70, h: 52, clear: 'jump', zones: ['farmyard', 'cornfield'], weight: 10 },
  { id: 'hayBale', name: 'Hay Bale', w: 84, h: 64, clear: 'jump', zones: ['farmyard', 'cornfield', 'forest'], weight: 9 },
  { id: 'mudPuddle', name: 'Mud Puddle', w: 110, h: 18, clear: 'jump', zones: ['farmyard', 'cornfield'], weight: 8 },
  { id: 'pumpkinPatch', name: 'Pumpkin Patch', w: 96, h: 46, clear: 'jump', zones: ['farmyard', 'cornfield'], weight: 8 },
  { id: 'rollingBarrel', name: 'Rolling Barrel', w: 64, h: 64, clear: 'jump', zones: ['farmyard', 'cornfield', 'forest'], weight: 7, moves: true },
  { id: 'rake', name: 'Garden Rake', w: 60, h: 30, clear: 'jump', zones: ['farmyard'], weight: 6 },
  { id: 'scarecrow', name: 'Scarecrow', w: 70, h: 110, clear: 'duck', zones: ['cornfield'], weight: 7 },
  { id: 'farmDog', name: 'Farm Dog', w: 84, h: 52, clear: 'jump', zones: ['farmyard', 'cornfield', 'forest'], weight: 7, moves: true },
  { id: 'netTrap', name: 'Farmer Net Trap', w: 90, h: 26, clear: 'jump', zones: ['farmyard', 'cornfield', 'forest'], weight: 6, snare: true },
  { id: 'fallingKnife', name: 'Falling Carving Knife', w: 26, h: 74, clear: 'flee', zones: ['farmyard', 'cornfield', 'forest'], weight: 8, falls: true },
  { id: 'hotOven', name: 'Roaring Oven', w: 120, h: 110, clear: 'jump', zones: ['farmyard'], weight: 6 },
  { id: 'axeChop', name: 'Chopping Axe', w: 40, h: 90, clear: 'flee', zones: ['forest', 'cornfield'], weight: 6, timed: true },
  { id: 'chickenWire', name: 'Chicken Wire', w: 80, h: 44, clear: 'jump', zones: ['farmyard', 'forest'], weight: 6 },
  { id: 'cornWall', name: 'Corn Stalk Wall', w: 90, h: 120, clear: 'duck', zones: ['cornfield'], weight: 7 },
];

// Five power-ups, each with its own pickup and effect.
export const POWERUPS = [
  { id: 'feather', name: 'Feather Wings', effect: 'Double jump for 10 seconds', seconds: 10, weight: 5 },
  { id: 'speedCorn', name: 'Speed Corn', effect: 'Dash: +45% speed, farmer falls behind', seconds: 5, weight: 4 },
  { id: 'haystack', name: 'Haystack Hide', effect: 'Hidden from the farmer for 8 seconds', seconds: 8, weight: 4 },
  { id: 'goldenEgg', name: 'Golden Egg Shield', effect: 'Blocks the next hit', seconds: 0, weight: 3 },
  { id: 'pumpkinPie', name: 'Pumpkin Pie', effect: 'Restores one life', seconds: 0, weight: 3 },
];

// Ordinary pickups worth points.
export const PICKUPS = [
  { id: 'corn', name: 'Corn Cob', points: 10, weight: 10 },
  { id: 'pumpkin', name: 'Pumpkin', points: 25, weight: 4 },
  { id: 'egg', name: 'Golden Egg', points: 50, weight: 1 },
];

// Twelve missions. Each is checked against the run's totals and pays a bonus.
export const MISSIONS = [
  { id: 'm1', text: 'Run 250 m from the farmhouse', goal: 250, kind: 'distance' },
  { id: 'm2', text: 'Collect 10 corn cobs', goal: 10, kind: 'corn' },
  { id: 'm3', text: 'Dodge 10 obstacles', goal: 10, kind: 'dodges' },
  { id: 'm4', text: 'Reach the Cornfield', goal: 500, kind: 'distance' },
  { id: 'm5', text: 'Dodge 5 carving knives', goal: 5, kind: 'knives' },
  { id: 'm6', text: 'Collect 5 pumpkins', goal: 5, kind: 'pumpkins' },
  { id: 'm7', text: 'Run 1,000 m', goal: 1000, kind: 'distance' },
  { id: 'm8', text: 'Reach the Dark Forest', goal: 1200, kind: 'distance' },
  { id: 'm9', text: 'Collect 25 corn cobs', goal: 25, kind: 'corn' },
  { id: 'm10', text: 'Dodge 25 obstacles', goal: 25, kind: 'dodges' },
  { id: 'm11', text: 'Survive 60 seconds on the run', goal: 60, kind: 'seconds' },
  { id: 'm12', text: 'Escape! Run 2,000 m to freedom', goal: 2000, kind: 'distance' },
];

export const MISSION_BONUS = 150;
export const LIVES_START = 3;
export const BEST_KEY = 'gobble-dash-best';
