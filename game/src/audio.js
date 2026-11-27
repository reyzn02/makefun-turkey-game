// All sound is synthesized live with WebAudio — no audio files, nothing fetched.
// Ten named effects plus a small looping farmyard tune, all built from oscillators
// and filtered noise, with a mute toggle.
export function createAudio() {
  let context = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  // One short oscillator blip: frequency slides from `from` to `to`.
  function blip(from, to, seconds, type, gainValue, when = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const start = ctx.currentTime + when;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  // A burst of filtered noise, for whooshes, thuds and rustles.
  function noise(seconds, filterFrequency, gainValue, when = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const start = ctx.currentTime + when;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(start);
  }

  // A two-note gobble: the turkey's own voice, used on jumps and escapes.
  function gobble() {
    blip(420, 300, 0.09, 'square', 0.12);
    blip(520, 340, 0.09, 'square', 0.12, 0.09);
    blip(460, 260, 0.12, 'square', 0.1, 0.18);
  }

  const sfx = {
    jump() { blip(300, 620, 0.16, 'sine', 0.16); },
    doubleJump() { blip(420, 880, 0.18, 'sine', 0.16); gobble(); },
    corn() { blip(880, 1320, 0.09, 'triangle', 0.14); },
    pumpkin() { blip(523, 784, 0.12, 'triangle', 0.16); blip(784, 1046, 0.12, 'triangle', 0.14, 0.1); },
    hit() { noise(0.25, 220, 0.3); blip(180, 60, 0.3, 'sawtooth', 0.22); },
    knife() { noise(0.35, 3200, 0.2); },
    power() { [523, 659, 784, 1046].forEach((f, i) => blip(f, f, 0.14, 'triangle', 0.14, i * 0.07)); },
    spotted() { blip(220, 440, 0.12, 'square', 0.14); blip(220, 440, 0.12, 'square', 0.14, 0.14); },
    win() { [523, 659, 784, 1046, 1318].forEach((f, i) => blip(f, f * 1.01, 0.22, 'triangle', 0.16, i * 0.11)); gobble(); },
    caught() { blip(392, 196, 0.5, 'sawtooth', 0.2); blip(311, 155, 0.6, 'sawtooth', 0.18, 0.3); noise(0.4, 300, 0.2, 0.1); },
    click() { blip(700, 900, 0.06, 'sine', 0.1); },
    mission() { blip(1046, 1046, 0.1, 'triangle', 0.14); blip(1318, 1318, 0.16, 'triangle', 0.14, 0.09); },
  };

  // The farmyard tune: a cheerful 16-step loop, bass on the beat and a plucked
  // melody above it. It speeds up slightly as the run gets faster.
  const MELODY = [523, 0, 659, 784, 0, 659, 523, 0, 587, 0, 698, 880, 784, 659, 587, 0];
  const BASS = [131, 0, 131, 0, 175, 0, 131, 0, 196, 0, 175, 0, 131, 98, 131, 0];
  function startMusic() {
    if (musicTimer) return;
    ensure();
    musicTimer = setInterval(() => {
      if (muted || !context) return;
      const step = musicStep % 16;
      const melodyNote = MELODY[step];
      const bassNote = BASS[step];
      if (melodyNote) blip(melodyNote, melodyNote, 0.16, 'square', 0.035);
      if (bassNote) blip(bassNote, bassNote, 0.2, 'triangle', 0.07);
      musicStep += 1;
    }, 190);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  return {
    sfx,
    startMusic,
    stopMusic,
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
  };
}
