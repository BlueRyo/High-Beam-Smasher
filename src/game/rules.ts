export const RULES = Object.freeze({
  duration: 30, frenzy: 25, approach: 2.5, window: 0.5,
  windup: 0.08, active: 0.1, swing: 0.32, hitstop: 0.08,
});

export type VehicleKind = 'car' | 'bike';
export type LightKind = 'high' | 'normal';
export interface Vehicle {
  id: number;
  kind: VehicleKind;
  light: LightKind;
  spawn: number;
  hit: boolean;
}
export interface Hit {
  vehicleId: number;
  time: number;
  delta: number;
}
export interface Swing {
  start: number;
  hitAt: number | null;
  targetId: number | null;
}

export function createSchedule(random: () => number = Math.random): Vehicle[] {
  const mix: { kind: VehicleKind; light: LightKind }[] = [];
  for (const kind of ['car', 'bike'] as const) {
    for (let i = 0; i < 10; i++) mix.push({ kind, light: 'high' });
    for (let i = 0; i < 5; i++) mix.push({ kind, light: 'normal' });
  }
  for (let i = mix.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [mix[i], mix[j]] = [mix[j], mix[i]];
  }
  return mix.map((vehicle, i) => {
    const tail = i >= 25;
    const pinned = tail ? i === 25 || i === 29 : i === 0 || i === 24;
    const jitter = pinned ? 0 : (random() * 2 - 1) * (tail ? 0.02 : 0.08);
    return { ...vehicle, id: i, spawn: (tail ? 25 + (i - 25) * 0.45 : 0.3 + i) + jitter, hit: false };
  });
}

export function scoreDelta(light: LightKind, time: number): number {
  if (time < 0 || time >= RULES.duration) return 0;
  return (light === 'high' ? 1 : -1) * (time >= RULES.frenzy ? 2 : 1);
}

export function hittable(vehicle: Vehicle, elapsed: number): boolean {
  const age = elapsed - vehicle.spawn;
  return !vehicle.hit && age >= RULES.approach && age < RULES.approach + RULES.window;
}

export function glare(vehicle: Vehicle, elapsed: number): number {
  const age = elapsed - vehicle.spawn;
  if (vehicle.hit || vehicle.light !== 'high' || age < 0 || age >= 3.3) return 0;
  const fade = age > 3 ? (3.3 - age) / 0.3 : 1;
  return Math.min(1, (age / 2.8) ** 2) * 0.44 * fade;
}

export function exposure(vehicles: readonly Vehicle[], elapsed: number): number {
  return Math.min(0.56, vehicles.reduce((total, vehicle) => total + glare(vehicle, elapsed), 0));
}

export class Session {
  state: 'ready' | 'playing' | 'results' = 'ready';
  elapsed = 0;
  score = 0;
  vehicles: Vehicle[] = [];
  hits: Hit[] = [];
  swing: Swing | null = null;
  swings = 0;
  private origin = 0;

  constructor(private readonly random: () => number = Math.random) {}

  start(now = 0): void {
    this.origin = now;
    this.elapsed = 0;
    this.score = 0;
    this.hits = [];
    this.swing = null;
    this.swings = 0;
    this.vehicles = createSchedule(this.random);
    this.state = 'playing';
  }

  get swingEnd(): number {
    return this.swing ? this.swing.start + RULES.swing + (this.swing.hitAt === null ? 0 : RULES.hitstop) : 0;
  }

  get canAttack(): boolean {
    return this.state === 'playing' && this.elapsed >= this.swingEnd
      && this.elapsed + RULES.windup < RULES.duration;
  }

  advance(now: number): void {
    if (this.state !== 'playing') return;
    const previous = this.elapsed;
    this.elapsed = Math.min(RULES.duration, Math.max(previous, now - this.origin));
    const swing = this.swing;
    if (swing && swing.hitAt === null) {
      const from = Math.max(previous, swing.start + RULES.windup);
      const until = Math.min(this.elapsed, swing.start + RULES.windup + RULES.active);
      // Intersect time intervals, so dropped frames cannot skip a valid contact.
      const candidates = this.vehicles.filter(v => !v.hit && (swing.targetId === null || v.id === swing.targetId)).map(v => ({
        vehicle: v,
        contact: Math.max(from, v.spawn + RULES.approach),
        // A target in reach when the player pressed is reserved for this swing;
        // the windup must not turn a valid red-frame press into a miss.
        end: Math.min(swing.start + RULES.windup + RULES.active,
          swing.targetId === v.id ? RULES.duration : v.spawn + RULES.approach + RULES.window, RULES.duration),
      })).filter(c => c.contact <= until && c.contact < c.end)
        .sort((a, b) => a.contact - b.contact || a.vehicle.spawn - b.vehicle.spawn || a.vehicle.id - b.vehicle.id);
      const target = candidates[0];
      if (target) {
        target.vehicle.hit = true;
        swing.hitAt = target.contact;
        const delta = scoreDelta(target.vehicle.light, target.contact);
        this.score += delta;
        this.hits.push({ vehicleId: target.vehicle.id, time: target.contact, delta });
      }
    }
    if (this.elapsed >= RULES.duration) this.state = 'results';
  }

  attack(now: number): boolean {
    this.advance(now);
    if (!this.canAttack) return false;
    const target = this.vehicles.filter(v => hittable(v, this.elapsed))
      .sort((a, b) => a.spawn - b.spawn || a.id - b.id)[0];
    this.swing = { start: this.elapsed, hitAt: null, targetId: target?.id ?? null };
    this.swings++;
    return true;
  }
}
