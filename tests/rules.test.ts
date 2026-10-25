import { describe, expect, it } from 'vitest';
import { createSchedule, exposure, glare, hittable, RULES, scoreDelta, Session } from '../src/game/rules';
import type { Vehicle } from '../src/game/rules';
import { SpaceInput } from '../src/game/input';

function seeded(seed: number) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function target(spawn = 0, light: 'high' | 'normal' = 'high', id = 0): Vehicle {
  return { id, spawn, light, kind: 'car', hit: false };
}
function session(...vehicles: Vehicle[]) {
  const game = new Session();
  game.start();
  game.vehicles = vehicles;
  return game;
}

describe('scheduled traffic', () => {
  it('preserves quotas and playable windows over 200 random rounds', () => {
    for (let seed = 0; seed < 200; seed++) {
      const schedule = createSchedule(seeded(seed));
      expect(schedule).toHaveLength(30);
      expect(new Set(schedule.map(v => v.id)).size).toBe(30);
      for (const kind of ['car', 'bike']) {
        expect(schedule.filter(v => v.kind === kind && v.light === 'high')).toHaveLength(10);
        expect(schedule.filter(v => v.kind === kind && v.light === 'normal')).toHaveLength(5);
      }
      expect(schedule.every(v => v.spawn + RULES.approach + RULES.window <= 30)).toBe(true);
      const gaps = schedule.slice(1).map((v, i) => v.spawn - schedule[i].spawn);
      expect(Math.min(...gaps)).toBeGreaterThan(RULES.swing + RULES.hitstop);
      expect(Math.max(...gaps.slice(25))).toBeLessThan(Math.min(...gaps.slice(0, 24)));
      expect(schedule.filter(v => v.spawn >= 25)).toHaveLength(5);
    }
  });
  it('changes order and jitter between seeds', () => {
    expect(createSchedule(seeded(1))).not.toEqual(createSchedule(seeded(2)));
  });
});

describe('session and scoring', () => {
  it('starts only on request, ends at 30 and resets all state', () => {
    const game = new Session();
    game.advance(100);
    expect(game.state).toBe('ready');
    expect(game.attack(100)).toBe(false);
    game.start(100);
    game.advance(129.9);
    expect(game.state).toBe('playing');
    game.advance(140);
    expect(game.state).toBe('results');
    expect(game.elapsed).toBe(30);
    expect(game.attack(140)).toBe(false);
    game.start(200);
    expect([game.elapsed, game.score, game.hits.length, game.swings]).toEqual([0, 0, 0, 0]);
    expect(game.swing).toBe(null);
    expect(game.vehicles.every(v => !v.hit)).toBe(true);
  });
  it.each([24.999, 25, 29.999, 30])('uses hit time %s for both lamp types', time => {
    expect(scoreDelta('high', time)).toBe(time >= 30 ? 0 : time >= 25 ? 2 : 1);
    expect(scoreDelta('normal', time)).toBe(time >= 30 ? 0 : time >= 25 ? -2 : -1);
  });
  it('can go negative and does not deduct for empty swings or missed vehicles', () => {
    const game = session(target(0, 'normal'));
    game.attack(2.5);
    game.advance(2.7);
    expect(game.score).toBe(-1);
    game.attack(10);
    game.advance(30);
    expect(game.score).toBe(-1);
    const missed = session(target());
    missed.advance(30);
    expect(missed.score).toBe(0);
  });
  it('settles an actual pre-25 contact using +1 even if the next frame is after 25', () => {
    const game = session(target(22.4));
    game.attack(24.85);
    game.advance(25.1);
    expect(game.hits[0].time).toBeCloseTo(24.93);
    expect(game.score).toBe(1);
  });
  it('settles a pre-expiry hit when a frame crosses 30 and rejects contacts at 30', () => {
    const game = session(target(27.4));
    game.attack(29.9);
    game.advance(31);
    expect(game.hits[0].time).toBeCloseTo(29.98);
    expect(game.score).toBe(2);
    expect(game.state).toBe('results');
    const expired = session(target(27.5));
    expired.attack(29.95);
    expired.advance(31);
    expect(expired.score).toBe(0);
  });
  it('handles background return and monotonic updates', () => {
    const game = session(target());
    game.advance(12);
    game.advance(11);
    expect(game.elapsed).toBe(12);
    game.advance(70);
    expect(game.state).toBe('results');
  });
});

describe('combat', () => {
  it('hides the attack-ready cue during recovery and restores it when an attack is accepted', () => {
    const game = session(target(), target(0.3, 'high', 1));
    game.advance(2.6);
    expect(game.canAttack).toBe(true);
    game.attack(2.6);
    game.advance(2.95);
    expect(hittable(game.vehicles[1], game.elapsed)).toBe(true);
    expect(game.canAttack).toBe(false);
    expect(game.attack(2.95)).toBe(false);
    game.advance(3.01);
    expect(game.canAttack).toBe(true);
    expect(game.attack(3.01)).toBe(true);
  });
  it('reserves the nearest ordinary light too, preserving the error penalty and actual impact multiplier', () => {
    const game = session(target(22.02, 'normal'), target(22.04, 'high', 1));
    game.advance(24.99);
    expect(hittable(game.vehicles[0], game.elapsed)).toBe(true);
    game.attack(24.99);
    game.advance(25.2);
    expect(game.hits).toHaveLength(1);
    expect(game.hits[0].vehicleId).toBe(0);
    expect(game.hits[0].time).toBeCloseTo(25.07);
    expect(game.score).toBe(-2);
  });
  it.each([2.5, 2.7, 2.9, 2.95, 2.99])('hits a vehicle when pressing while its red frame is visible at %s', time => {
    const vehicle = target();
    const game = session(vehicle);
    game.advance(time);
    expect(hittable(vehicle, game.elapsed)).toBe(true);
    expect(game.attack(time)).toBe(true);
    game.advance(time + 0.2);
    expect(game.score).toBe(1);
    expect(game.hits).toHaveLength(1);
  });
  it('requires active-phase overlap and handles a skipped whole hit window', () => {
    const game = session(target());
    game.attack(2.45);
    game.advance(4);
    expect(game.hits).toHaveLength(1);
    expect(game.hits[0].time).toBeCloseTo(2.53);
    for (const time of [0, 2.1, 3.01]) {
      const empty = session(target());
      empty.attack(time);
      empty.advance(time + 1);
      expect(empty.hits).toHaveLength(0);
    }
  });
  it('hits only nearest vehicle without preferring high beams', () => {
    const game = session(target(0, 'normal'), target(0.1, 'high', 1));
    game.attack(2.6);
    game.advance(2.9);
    expect(game.score).toBe(-1);
    expect(game.vehicles.map(v => v.hit)).toEqual([true, false]);
    expect(game.hits).toHaveLength(1);
  });
  it('never scores the same car twice or scores each headlamp separately', () => {
    const game = session(target());
    game.attack(2.4);
    game.advance(2.6);
    game.advance(2.7);
    game.attack(2.81);
    game.advance(3.1);
    expect(game.hits).toHaveLength(1);
  });
  it('extends only pose recovery by 80ms, not vehicle windows or round time', () => {
    const game = session(target());
    game.attack(2.5);
    game.advance(2.6);
    expect(game.swingEnd).toBeCloseTo(2.9);
    expect(game.attack(2.89)).toBe(false);
    expect(game.attack(2.91)).toBe(true);
    expect(game.vehicles[0].spawn).toBe(0);
    game.advance(30);
    expect(game.state).toBe('results');
  });
});

describe('keyboard gate', () => {
  it('does not repeat, queue recovery presses, or attack outside play', () => {
    const gate = new SpaceInput();
    let attempts = 0;
    const attack = () => { attempts++; return attempts !== 2; };
    expect(gate.down('Enter', false, true, attack)).toBe(false);
    expect(gate.down('Space', false, true, attack)).toBe(true);
    expect(gate.down('Space', true, true, attack)).toBe(false);
    expect(gate.down('Space', false, true, attack)).toBe(false);
    gate.up('Space');
    expect(gate.down('Space', false, true, attack)).toBe(false);
    expect(gate.down('Space', true, true, attack)).toBe(false);
    gate.clear();
    expect(gate.down('Space', false, false, attack)).toBe(false);
    gate.up('Space');
    expect(gate.down('Space', false, true, attack)).toBe(true);
    expect(attempts).toBe(3);
  });
});

describe('glare', () => {
  it('increases with distance, vanishes when hit/passed, and preserves other lights', () => {
    const vehicle = target();
    expect(glare(vehicle, 2.7)).toBeGreaterThan(glare(vehicle, 1));
    expect(glare(target(0, 'normal'), 2.7)).toBe(0);
    expect(glare(vehicle, 3.3)).toBe(0);
    const other = target(0.2, 'high', 1);
    const before = exposure([vehicle, other], 2.7);
    vehicle.hit = true;
    expect(glare(vehicle, 2.7)).toBe(0);
    expect(exposure([vehicle, other], 2.7)).toBeLessThan(before);
    expect(exposure([vehicle, other], 2.7)).toBeGreaterThan(0);
    expect(exposure(Array.from({ length: 30 }, (_, i) => target(0, 'high', i)), 2.8)).toBe(0.56);
  });
});
