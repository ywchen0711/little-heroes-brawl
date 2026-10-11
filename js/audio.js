// WebAudio synth: a small step sequencer for each area's gothic theme, and synthesized sound effects.
let ac = null, master = null, musicGain = null, sfxGain = null, enabled = true, cur = null, timer = null, step = 0, nextT = 0;
try { enabled = localStorage.getItem('lhb_sound') !== '0'; } catch (e) { /* ignore */ }
export const soundOn = () => enabled;
export function setSound(on) {
  enabled = on; try { localStorage.setItem('lhb_sound', on ? '1' : '0'); } catch (e) { /* ignore */ }
  if (master) master.gain.value = on ? 0.8 : 0;
}
export function unlock() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    ac = new C(); master = ac.createGain(); master.gain.value = enabled ? 0.8 : 0; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
  }
  if (ac.state === 'suspended') ac.resume();
}
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
function tone(dest, type, f, t, dur, vol, f2, attack = 0.005) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(dest, t, dur, vol, freq = 1200, q = 1, type = 'bandpass') {
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
}

// ------------------------------------------------------------------ music: chords (root midi + minor/major), arpeggio, bass, melody
// each song: bpm, chord list (one per bar), melody per bar as 8 eighth notes (scale degrees in semitones from the chord root, null = rest)
const SONGS = {
  menu: { bpm: 120, wave: 'square', drums: 1, chords: [[60, 'M'], [57, 'm'], [53, 'M'], [55, 'M']], mel: [[12, null, 16, null, 19, 21, 19, 16], [12, null, 15, null, 19, null, 16, 15], [17, null, 21, null, 24, 21, 19, 17], [19, null, 23, null, 26, 23, 19, null]] },
  park: { bpm: 140, wave: 'square', drums: 1, chords: [[60, 'M'], [65, 'M'], [55, 'M'], [60, 'M'], [57, 'm'], [65, 'M'], [55, 'M'], [55, 'M']],
    mel: [[16, 16, 19, null, 16, 14, 12, null], [12, 14, 16, 17, 16, null, 12, null], [14, 14, 17, null, 19, 17, 14, null], [16, null, 12, null, 7, null, null, null], [15, 15, 19, null, 22, 19, 15, null], [12, 14, 16, 17, 19, null, 21, null], [19, 17, 16, 14, 16, null, 19, null], [24, null, null, null, 19, null, null, null]] },
  forest: { bpm: 132, wave: 'triangle', drums: 1, chords: [[57, 'm'], [53, 'M'], [55, 'M'], [52, 'M']], mel: [[12, 15, 19, 15, 24, 19, 15, 12], [12, 16, 19, 16, 21, 19, 16, 12], [14, 17, 19, 23, 26, 23, 19, 17], [16, 20, 23, 20, 16, null, 11, null]] },
  village: { bpm: 126, wave: 'triangle', drums: 1, chords: [[62, 'm'], [62, 'm'], [58, 'M'], [60, 'M']], mel: [[12, null, 15, 17, 19, null, 22, 19], [17, null, 15, 12, 10, null, 12, null], [12, 14, 17, 19, 22, 19, 17, 14], [12, null, 10, null, 7, null, null, null]] },
  factory: { bpm: 150, wave: 'sawtooth', drums: 1, chords: [[52, 'm'], [52, 'm'], [48, 'M'], [50, 'M']], mel: [[12, 12, 19, 12, 18, 12, 17, 15], [12, null, 10, null, 7, 10, 12, null], [12, 12, 19, 12, 22, 12, 19, 17], [14, null, 17, null, 19, null, 22, null]] },
  castle: { bpm: 138, wave: 'sawtooth', drums: 1, chords: [[57, 'm'], [53, 'M'], [50, 'm'], [52, 'M']], mel: [[12, null, 15, 12, 19, null, 18, 19], [24, null, 22, 19, 17, null, 15, null], [12, 15, 17, 19, 20, 19, 17, 15], [16, null, 19, null, 23, null, 24, null]] },
  dojo: { bpm: 136, wave: 'square', drums: 1, chords: [[55, 'M'], [52, 'm'], [48, 'M'], [50, 'M']], mel: [[12, 14, 16, 19, 21, 19, 16, 14], [12, null, 19, null, 16, null, 12, null], [12, 16, 19, 24, 21, 19, 16, 19], [14, null, 18, null, 21, null, 26, null]] },
  boss: { bpm: 160, wave: 'sawtooth', drums: 1, chords: [[52, 'm'], [52, 'm'], [53, 'M'], [50, 'M']], mel: [[12, 12, 13, 12, 15, 12, 13, 12], [19, null, 18, null, 15, null, 13, null], [12, 12, 13, 12, 16, 12, 13, 12], [18, 19, 18, 15, 13, 12, 10, null]] },
  win: { bpm: 150, wave: 'square', drums: 0, chords: [[60, 'M'], [65, 'M'], [67, 'M'], [72, 'M']], mel: [[12, 16, 19, 24, null, 19, 24, null], [12, 17, 21, 24, null, 21, 24, null], [14, 19, 23, 26, null, 23, 26, null], [24, null, null, null, null, null, null, null]] },
};
export function music(id) {
  if (!ac || cur === id) return;
  cur = id; step = 0; nextT = ac.currentTime + 0.05;
  if (!timer) timer = setInterval(tick, 50);
}
export function stopMusic() { cur = null; }
function tick() {
  if (!ac || !cur) return;
  const s = SONGS[cur], e8 = 60 / s.bpm / 2;
  while (nextT < ac.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % s.chords.length, i = step % 8, [root, q] = s.chords[bar];
    const third = q === 'm' ? 3 : 4, arp = [0, 7, third + 12, 12, 7, third + 12, 12, 19];
    if (enabled) {
      tone(musicGain, 'triangle', hz(root - 12 + (i === 4 ? 7 : 0)), nextT, e8 * (i % 4 === 0 ? 1.8 : 0.9), i % 4 === 0 ? 0.5 : 0.25);
      tone(musicGain, 'square', hz(root + arp[i]), nextT, e8 * 0.7, 0.07);
      const m = s.mel[bar % s.mel.length][i];
      if (m != null) tone(musicGain, s.wave, hz(root + m + (s.wave === 'sine' ? 12 : 0)), nextT, e8 * 1.6, s.wave === 'sawtooth' ? 0.09 : 0.14, null, 0.01);
      if (s.drums) { if (i % 2 === 0) noise(musicGain, nextT, 0.04, 0.12, 7000, 0.7, 'highpass'); if (i === 2 || i === 6) noise(musicGain, nextT, 0.12, 0.25, 1800, 0.8); }
    }
    nextT += e8; step++;
  }
}

// ------------------------------------------------------------------ effects
export function sfx(id) {
  if (!ac || !enabled) return;
  const t = ac.currentTime, g = sfxGain;
  switch (id) {
    case 'swing': noise(g, t, 0.07, 0.35, 2400, 0.7); break;
    case 'hit': noise(g, t, 0.08, 0.6, 900, 0.8); tone(g, 'square', 220, t, 0.07, 0.18, 90); break;
    case 'hitbig': noise(g, t, 0.16, 0.8, 600, 0.6); tone(g, 'square', 160, t, 0.15, 0.25, 50); break;
    case 'block': tone(g, 'triangle', 900, t, 0.08, 0.2, 500); noise(g, t, 0.05, 0.3, 3000, 1); break;
    case 'ko': tone(g, 'square', 400, t, 0.3, 0.2, 80); break;
    case 'thud': noise(g, t, 0.18, 0.5, 200, 0.6, 'lowpass'); break;
    case 'jump': tone(g, 'square', 260, t, 0.1, 0.1, 520); break;
    case 'cast': tone(g, 'triangle', 500, t, 0.18, 0.18, 1200); break;
    case 'shoot': noise(g, t, 0.18, 0.4, 1200, 0.9); tone(g, 'sawtooth', 300, t, 0.15, 0.1, 150); break;
    case 'bow': tone(g, 'triangle', 1400, t, 0.06, 0.15, 300); noise(g, t, 0.08, 0.2, 4000, 1); break;
    case 'column': noise(g, t, 0.3, 0.5, 500, 0.6); break;
    case 'boom': noise(g, t, 0.6, 0.9, 180, 0.5, 'lowpass'); tone(g, 'sine', 90, t, 0.5, 0.4, 30); break;
    case 'beam': tone(g, 'sawtooth', 200, t, 0.6, 0.18, 400); noise(g, t, 0.6, 0.3, 2000, 0.5); break;
    case 'freeze': tone(g, 'sine', 1600, t, 0.3, 0.15, 2600); noise(g, t, 0.3, 0.2, 6000, 1); break;
    case 'shatter': noise(g, t, 0.3, 0.5, 5000, 1); tone(g, 'triangle', 2000, t, 0.2, 0.12, 900); break;
    case 'thunder': noise(g, t, 0.5, 0.8, 300, 0.4); tone(g, 'square', 80, t, 0.3, 0.2, 40); break;
    case 'heal': [0, 4, 7, 12].forEach((n, i) => tone(g, 'sine', 440 * Math.pow(2, (n + 12) / 12), t + i * 0.06, 0.3, 0.16)); break;
    case 'buff': [0, 7, 12].forEach((n, i) => tone(g, 'square', 330 * Math.pow(2, n / 12), t + i * 0.07, 0.2, 0.1)); break;
    case 'poof': noise(g, t, 0.3, 0.35, 800, 0.5); break;
    case 'tele': tone(g, 'sine', 2000, t, 0.15, 0.15, 300); break;
    case 'coin': tone(g, 'square', 1300, t, 0.05, 0.1); tone(g, 'square', 1950, t + 0.05, 0.1, 0.1); break;
    case 'drink': tone(g, 'sine', 500, t, 0.3, 0.2, 900); break;
    case 'pick': tone(g, 'triangle', 700, t, 0.08, 0.15); break;
    case 'break': noise(g, t, 0.3, 0.6, 1500, 0.7); break;
    case 'wave': [0, 5, 10].forEach((n, i) => tone(g, 'square', 523 * Math.pow(2, n / 12), t + i * 0.1, 0.15, 0.12)); break;
    case 'nomp': tone(g, 'square', 150, t, 0.12, 0.12); break;
    case 'menu': tone(g, 'square', 880, t, 0.05, 0.08); break;
    case 'buy': tone(g, 'square', 1000, t, 0.06, 0.12); tone(g, 'square', 1500, t + 0.06, 0.12, 0.12); break;
    case 'level': [0, 4, 7, 12, 16].forEach((n, i) => tone(g, 'square', 523 * Math.pow(2, n / 12), t + i * 0.07, 0.2, 0.12)); break;
    case 'lose': [7, 4, 0, -5].forEach((n, i) => tone(g, 'triangle', 440 * Math.pow(2, n / 12), t + i * 0.18, 0.3, 0.2)); break;
  }
}
