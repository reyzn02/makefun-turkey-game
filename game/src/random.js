// A tiny seeded random number generator (mulberry32) so the screenshot scenes
// and any seeded run play exactly the same way every time.
export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one entry from a weighted table using the seeded random function.
export function pickWeighted(random, table) {
  let total = 0;
  for (const entry of table) total += entry.weight;
  let roll = random() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return table[table.length - 1];
}

// A random number in [min, max).
export function range(random, min, max) {
  return min + random() * (max - min);
}
