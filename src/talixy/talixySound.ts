/*
 * TALIXY — synthese du son d'interface (WebAudio, aucun fichier audio a telecharger).
 *
 * Un seul AudioContext pour toute l'application, cree au premier son (toujours suite a un clic : le
 * navigateur l'autorise). Son « navigation » : un tintement de verre court (~0,3 s), doux et clair,
 * avec un souffle tres leger qui evoque la rotation de la roue.
 */

export type TalixySoundKind = 'navigation';

type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor: AudioCtor | undefined = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch { return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === c.sampleRate) return noise;
  const len = Math.floor(c.sampleRate * 0.2);
  noise = c.createBuffer(1, len, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

/** Une note : oscillateur, attaque tres courte, extinction exponentielle. */
function tone(c: AudioContext, out: AudioNode, t0: number, type: OscillatorType, f0: number, f1: number, peak: number, decay: number) {
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(f1, t0 + decay * 0.6);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
  osc.connect(env).connect(out);
  osc.start(t0);
  osc.stop(t0 + decay + 0.02);
}

/*
 * Recette « verre » d'origine (~300 ms) : conservee non branchee — masquer, jamais supprimer.
 * @internal
 */
export function glassChime(c: AudioContext, out: AudioNode, t0: number) {
  tone(c, out, t0, 'sine', 1318.5, 1174.7, 0.5, 0.26);      // mi6 -> re6 : le tintement
  tone(c, out, t0, 'sine', 2637, 2349.3, 0.14, 0.12);       // harmonique claire, tres breve
  tone(c, out, t0, 'triangle', 659.3, 587.3, 0.22, 0.18);   // corps
  // Souffle : bruit filtre qui monte, comme l'air deplace par la roue.
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.9;
  band.frequency.setValueAtTime(1600, t0);
  band.frequency.exponentialRampToValueAtTime(3400, t0 + 0.12);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
  src.connect(band).connect(env).connect(out);
  src.start(t0);
  src.stop(t0 + 0.15);
}

/**
 * Recette « ultra high-tech » (David) : ~120 ms, douce, premium, jamais agressive.
 * Deux blips sinus tres courts qui montent (mi6 -> si6), une harmonique cristalline,
 * et un tres leger souffle d'air filtre — l'ensemble evoque un declic optique.
 */
function navigation(c: AudioContext, out: AudioNode, t0: number) {
  tone(c, out, t0, 'sine', 1318.5, 1567.98, 0.55, 0.07);          // mi6 -> sol6 : premier blip
  tone(c, out, t0 + 0.05, 'sine', 1975.5, 2349.3, 0.5, 0.095);    // si6 -> re7 : reponse
  tone(c, out, t0 + 0.055, 'sine', 3951, 4698.6, 0.13, 0.06);     // eclat cristallin
  tone(c, out, t0, 'triangle', 659.3, 784, 0.22, 0.12);           // corps doux, donne de la presence
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 1.4;
  band.frequency.setValueAtTime(5200, t0);
  band.frequency.exponentialRampToValueAtTime(8200, t0 + 0.08);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.05, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
  src.connect(band).connect(env).connect(out);
  src.start(t0);
  src.stop(t0 + 0.13);
}

/** Joue un son d'interface au gain donne (0 : rien n'est joue, aucun contexte audio n'est cree). */
export function playTalixySound(kind: TalixySoundKind, gain: number): void {
  if (!(gain > 0)) return;
  const c = audio();
  if (!c) return;
  const schedule = () => {
    try {
      const master = c.createGain();
      master.gain.value = Math.min(1, gain);
      const soft = c.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 11000; // assez haut pour l'eclat « high-tech », assez bas pour rester doux
      master.connect(soft).connect(c.destination);
      const t0 = c.currentTime + 0.005;
      if (kind === 'navigation') navigation(c, master, t0);
    } catch { /* audio indisponible : l'interface continue sans son */ }
  };
  // Contexte suspendu (politique du navigateur) : on programme APRES la reprise, sinon le son se perd.
  if (c.state === 'suspended') { c.resume().then(schedule).catch(() => {}); return; }
  schedule();
}
