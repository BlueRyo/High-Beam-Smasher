import { exposure, glare, hittable, RULES } from '../game/rules';
import type { Session, Vehicle } from '../game/rules';

const W = 480, H = 270;
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export interface Projection { x: number; y: number; scale: number }
export function project(vehicle: Vehicle, time: number): Projection {
  const progress = clamp((time - vehicle.spawn) / 3.3);
  const depth = 0.025 + 0.975 * progress ** 2.5;
  return { x: 244 - depth * 195, y: 96 + depth * 137, scale: 0.045 + depth * 1.45 };
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('此瀏覽器無法建立2D遊戲畫面');
    this.ctx = context;
    this.canvas.width = W; this.canvas.height = H;
    context.imageSmoothingEnabled = false;
  }

  private rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  private polygon(points: number[][], color: string): void {
    const c = this.ctx;
    c.fillStyle = color; c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(Math.round(x), Math.round(y)) : c.moveTo(Math.round(x), Math.round(y)));
    c.closePath(); c.fill();
  }

  private text(text: string, x: number, y: number, color: string, size = 7): void {
    this.ctx.font = `bold ${size}px monospace`;
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, Math.round(x), Math.round(y));
  }

  draw(game: Session, ambient: number): void {
    const c = this.ctx;
    const playing = game.state === 'playing';
    const time = game.state === 'ready' ? ambient * 0.35 : game.elapsed;
    const lastHit = game.hits.at(-1);
    const impactAge = lastHit ? game.elapsed - lastHit.time : 99;
    c.save();
    c.clearRect(0, 0, W, H);
    if (playing && impactAge < 0.17) {
      const force = 1 - impactAge / 0.17;
      c.translate(Math.round(Math.sin(impactAge * 180) * 4 * force), Math.round(Math.cos(impactAge * 140) * 2 * force));
    }
    this.world(time);
    const visible = game.vehicles.filter(v => game.elapsed >= v.spawn && game.elapsed - v.spawn < 3.3)
      .sort((a, b) => b.spawn - a.spawn);
    for (const vehicle of visible) this.vehicle(vehicle, game.elapsed);
    const veil = exposure(visible, game.elapsed);
    if (veil) {
      c.globalAlpha = veil;
      this.rect(0, 0, W, H, '#e7f4e0');
      c.globalAlpha = 1;
    }
    this.rider(game, time);
    // Draw the range cue once, above glare and foreground, for both lamp types.
    for (const vehicle of visible) {
      if (game.canAttack && hittable(vehicle, game.elapsed)) this.range(vehicle, game.elapsed);
    }
    this.fragments(game);
    c.restore();
    // Fine scanlines stay in screen space; never blur the pixel artwork.
    c.fillStyle = '#050d1710';
    for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
    if (playing) {
      this.text('HIGH BEAM PATROL', 12, 258, '#9bb2ad', 6);
      this.text('35.6 N  /  139.7 E', 370, 258, '#9bb2ad', 6);
    }
  }

  private world(time: number): void {
    const c = this.ctx;
    this.rect(0, 0, W, H, '#0a1721');
    this.rect(0, 48, W, 50, '#11262c');
    this.rect(0, 74, W, 26, '#183337');
    for (let i = 0; i < 48; i++) {
      const x = (i * 113 + 29) % 480, y = (i * 31) % 63;
      this.rect(x, y, i % 7 === 0 ? 2 : 1, 1, i % 3 ? '#47605d' : '#88aaa1');
    }
    this.rect(364, 25, 15, 15, '#ccd4b1');
    this.rect(360, 22, 15, 15, '#0a1721');
    this.polygon([[0, 77], [40, 61], [74, 72], [103, 49], [144, 74], [187, 62], [245, 87], [283, 65], [319, 75], [365, 52], [412, 75], [451, 59], [480, 73], [480, 106], [0, 106]], '#10242b');
    for (let i = 0; i < 32; i++) {
      const x = i * 17 - 12, h = 9 + (i * 23) % 24;
      this.rect(x, 98 - h, 13, h, i % 2 ? '#0c1c25' : '#11242b');
      for (let row = 0; row < 4; row++) {
        if ((i + row) % 3) this.rect(x + 3, 101 - h + row * 5, 2, 2, i % 6 ? '#38514c' : '#b08d4b');
      }
    }
    this.rect(0, 99, W, 171, '#142829');
    this.polygon([[220, 94], [254, 94], [365, 270], [-150, 270]], '#263337');
    this.polygon([[242, 94], [254, 94], [365, 270], [132, 270]], '#2a383a');
    // Segmented lane markings project outwards from the vanishing point.
    for (let i = 0; i < 22; i++) {
      const p = ((i / 22 + time * 0.22) % 1) ** 2;
      const p2 = Math.min(1, p + 0.018 + p * 0.04);
      const y = 96 + p * 177, y2 = 96 + p2 * 177;
      // Camera sits in the right lane: the divider recedes to the rider's left.
      this.polygon([[244 - p * 110, y], [246 - p * 110, y], [246 - p2 * 110, y2], [244 - p2 * 110, y2]], '#d5ae5e');
      for (const side of [-1, 1]) {
        const offset = side < 0 ? -390 : 110;
        this.polygon([[242 + p * offset, y], [244 + p * offset, y], [244 + p2 * offset, y2], [242 + p2 * offset, y2]], '#6a827a');
      }
      if (i % 2 === 0) {
        this.rect(242 - p * 260, y, Math.max(1, p * 20), 1, '#75908424');
        this.rect(249 + p * 50, y + 2, p * 21, 1, '#bfa86022');
      }
    }
    // Roadside reflectors, guardrails and utility poles reinforce forward motion.
    for (let i = 0; i < 7; i++) {
      const p = ((i / 7 + time * 0.12) % 1) ** 2;
      const y = 98 + p * 157;
      for (const side of [-1, 1]) {
        const x = 242 + side * (19 + p * (side < 0 ? 390 : 110));
        this.rect(x, y - p * 16, 1 + p * 2, 7 + p * 18, '#5b7065');
        this.rect(x, y - p * 16, 2 + p * 2, 2 + p * 2, '#dfb471');
      }
    }
    this.polygon([[212, 98], [0, 201], [0, 192]], '#4d6557');
    this.polygon([[255, 98], [375, 270], [383, 270]], '#4d6557');
    for (const [x, y, height] of [[27, 176, 122], [442, 170, 115], [143, 119, 53], [331, 116, 48]]) {
      this.rect(x, y - height, 3, height, '#15272a');
      this.rect(x - 11, y - height + 2, 25, 2, '#233b3b');
      c.strokeStyle = '#283e3c'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y - height + 3); c.quadraticCurveTo(242, 73, 480 - x, 70); c.stroke();
    }
    this.rect(403, 108, 2, 35, '#243b36');
    this.rect(387, 101, 35, 18, '#092c2c');
    this.rect(389, 103, 31, 1, '#5e8e78');
    this.text('09  NORTH', 391, 113, '#9bb89d', 6);
    this.polygon([[230, 205], [270, 205], [360, 270], [133, 270]], '#afc68d0c');
  }

  private vehicle(vehicle: Vehicle, time: number): void {
    const c = this.ctx;
    const { x, y, scale } = project(vehicle, time);
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(scale, scale);
    const car = vehicle.kind === 'car';
    const body = ['#697c80', '#566b77', '#707b66', '#716968'][vehicle.id % 4];
    this.rect(car ? -47 : -17, -3, car ? 94 : 34, 6, '#0b171d');
    if (car) {
      this.rect(-43, -18, 13, 23, '#09131c'); this.rect(30, -18, 13, 23, '#09131c');
      this.polygon([[-40, -28], [-29, -57], [27, -57], [41, -28]], '#17272f');
      this.polygon([[-33, -31], [-25, -51], [23, -51], [33, -31]], '#518086');
      this.rect(-25, -49, 18, 3, '#8aa9a0');
      this.rect(-1, -52, 2, 23, '#253942');
      this.rect(-44, -29, 88, 27, body);
      this.rect(-40, -27, 80, 3, '#a9b6a0');
      this.rect(-46, -14, 92, 9, '#263840');
      this.rect(-20, -16, 40, 8, '#13232c');
      this.rect(-15, -12, 30, 1, '#637370');
      this.rect(-10, -7, 20, 5, '#c4c3a3');
      this.rect(-51, -34, 9, 5, body); this.rect(42, -34, 9, 5, body);
    } else {
      this.rect(-5, -13, 10, 20, '#08151d');
      this.rect(-3, -9, 5, 15, '#647777');
      this.polygon([[-14, -19], [-11, -39], [11, -39], [15, -19], [7, -6], [-6, -6]], body);
      this.rect(-13, -41, 26, 5, '#14222d');
      this.rect(-22, -37, 44, 3, '#7e9995');
      this.rect(-19, -40, 7, 5, '#15222c'); this.rect(12, -40, 7, 5, '#15222c');
      this.polygon([[-14, -35], [-17, -56], [-8, -66], [8, -66], [17, -56], [14, -35]], '#233940');
      this.rect(-12, -74, 24, 19, '#9daea0');
      this.rect(-14, -70, 28, 12, '#132b35');
      this.rect(-9, -68, 19, 5, '#527e81');
    }
    const lights = car ? [-33, 33] : [0];
    for (const lx of lights) {
      if (vehicle.hit) {
        this.rect(lx - 7, -22, 14, 8, '#12232c');
        this.rect(lx - 4, -21, 4, 2, '#5b6c68');
        continue;
      }
      if (vehicle.light === 'high') {
        c.globalAlpha = 0.16;
        this.polygon([[lx - 5, -18], [lx - 49, 13], [lx + 49, 13], [lx + 5, -18]], '#eafbe4');
        for (let r = 42; r >= 10; r -= 8) this.rect(lx - r, -18 - r * 0.5, r * 2, r, '#e2f5d3');
        c.globalAlpha = 1;
        this.rect(lx - 9, -23, 18, 10, '#e7f4df');
        this.rect(lx - 5, -27, 10, 18, '#e7f4df');
        this.rect(lx - 14, -19, 28, 2, '#ffffff');
        this.rect(lx - 5, -21, 10, 6, '#ffffff');
      } else {
        c.globalAlpha = 0.15;
        this.rect(lx - 12, -25, 24, 17, '#edc77b');
        c.globalAlpha = 1;
        this.rect(lx - 7, -22, 14, 7, '#d9bd7f');
        this.rect(lx - 5, -21, 10, 3, '#f4df9e');
      }
    }
    c.restore();
  }

  private range(vehicle: Vehicle, time: number): void {
    const { x, y, scale } = project(vehicle, time);
    const half = (vehicle.kind === 'car' ? 51 : 25) * scale + 5;
    const left = Math.round(x - half), right = Math.round(x + half);
    const top = Math.round(y - (vehicle.kind === 'car' ? 58 : 77) * scale - 5);
    const bottom = Math.round(y + 9);
    const c = this.ctx;
    c.strokeStyle = '#101820'; c.lineWidth = 5;
    c.strokeRect(left, top, right - left, bottom - top);
    c.strokeStyle = '#ff4d4d'; c.lineWidth = 3;
    c.strokeRect(left, top, right - left, bottom - top);
    this.rect(x - 25, top - 13, 50, 11, '#d52f3b');
    const label = navigator.maxTouchPoints > 0 ? 'TAP!' : 'HIT!';
    this.text(label, x - label.length * 2.1, top - 5, '#ffffff', 7);
  }

  private rider(game: Session, time: number): void {
    const c = this.ctx;
    const bob = Math.sin(time * 16) * 0.6;
    c.save(); c.translate(0, Math.round(bob));
    // Mirrors, stems, handlebar and central instrument housing.
    this.polygon([[73, 229], [42, 198], [45, 194], [79, 224]], '#71847d');
    this.polygon([[407, 229], [438, 198], [435, 194], [401, 224]], '#71847d');
    for (const side of [-1, 1]) {
      const x = side === -1 ? 14 : 417;
      this.polygon([[x, 180], [x + 39, 184], [x + 49, 199], [x + 10, 197]], '#0a141e');
      this.polygon([[x + 5, 184], [x + 36, 187], [x + 41, 194], [x + 12, 192]], '#4c706e');
      this.rect(x + 14, 188, 15, 1, '#a8b799');
    }
    this.polygon([[83, 222], [157, 214], [188, 226], [292, 226], [323, 214], [397, 222], [397, 229], [323, 222], [288, 237], [192, 237], [157, 222], [83, 230]], '#71847e');
    this.rect(68, 220, 44, 11, '#0b171f'); this.rect(368, 220, 44, 11, '#0b171f');
    for (let i = 0; i < 7; i++) {
      this.rect(71 + i * 5, 222, 2, 7, '#32464b');
      this.rect(371 + i * 5, 222, 2, 7, '#32464b');
    }
    this.polygon([[179, 218], [201, 207], [280, 207], [304, 218], [313, 252], [294, 270], [184, 270], [168, 252]], '#0b161f');
    this.polygon([[184, 221], [204, 213], [277, 213], [298, 222], [305, 251], [174, 251]], '#334952');
    this.polygon([[194, 223], [205, 217], [273, 217], [287, 224], [290, 244], [189, 244]], '#0f272b');
    this.text('062', 211, 238, '#b2e1be', 19);
    this.text('km/h', 252, 238, '#82a78d', 6);
    this.text('N', 199, 227, '#e1cb78');
    for (let i = 0; i < 13; i++) this.rect(201 + i * 6, 241, 4, 2, i < 9 ? '#97c7a4' : '#37534e');
    this.rect(224, 254, 32, 9, '#15262c');
    this.rect(237, 253, 6, 11, '#778882');
    // Right arm stays planted throughout the swing.
    this.polygon([[349, 270], [372, 233], [394, 221], [416, 235], [458, 270]], '#101f2b');
    this.polygon([[380, 243], [399, 227], [414, 239], [398, 253]], '#406d69');
    this.polygon([[365, 225], [373, 213], [389, 213], [403, 222], [399, 235], [381, 239]], '#263c46');
    this.rect(374, 217, 17, 4, '#52686a');
    this.rect(381, 224, 18, 2, '#6f8177');
    let swingAge = game.swing ? game.elapsed - game.swing.start : 99;
    if (game.swing?.hitAt !== null && game.swing?.hitAt !== undefined) {
      swingAge -= Math.min(RULES.hitstop, Math.max(0, game.elapsed - game.swing.hitAt));
    }
    if (game.swing && swingAge >= 0 && swingAge < RULES.swing) {
      const phase = clamp(swingAge / RULES.swing);
      const reach = Math.sin(phase * Math.PI);
      const hx = 92 + reach * 98, hy = 226 - reach * 27;
      this.polygon([[23, 270], [11, 248], [hx - 12, hy - 4], [hx + 15, hy + 14], [119, 270]], '#172b37');
      this.polygon([[hx - 25, hy + 5], [hx - 13, hy - 8], [hx + 10, hy + 4], [hx - 2, hy + 20]], '#467d75');
      const angle = -2.05 + Math.sin(phase * Math.PI) * 0.6;
      if (swingAge >= RULES.windup && swingAge < RULES.windup + RULES.active) {
        c.globalAlpha = 0.28;
        this.polygon([[hx + 15, hy], [hx - 138, hy - 94], [hx - 111, hy - 109], [hx - 29, hy - 72]], '#e5e4b0');
        c.globalAlpha = 1;
      }
      c.save(); c.translate(hx, hy); c.rotate(angle);
      this.rect(-4, -4, 110, 9, '#142530');
      this.rect(0, -3, 104, 6, '#b6c3b4');
      this.rect(15, -3, 88, 2, '#edf0cd');
      this.rect(-6, -5, 29, 11, '#35464b');
      for (let i = 0; i < 5; i++) this.rect(i * 5, -5, 2, 11, '#1b2b32');
      c.restore();
      this.polygon([[hx - 12, hy - 9], [hx + 5, hy - 12], [hx + 15, hy - 2], [hx + 9, hy + 13], [hx - 7, hy + 14], [hx - 17, hy + 3]], '#324a53');
      this.rect(hx - 9, hy - 5, 15, 4, '#789087');
    } else {
      this.polygon([[22, 270], [48, 239], [76, 221], [99, 234], [131, 270]], '#142833');
      this.polygon([[52, 246], [72, 227], [93, 239], [78, 257]], '#406d69');
      this.polygon([[74, 222], [80, 214], [99, 212], [113, 221], [109, 233], [91, 239]], '#2b414a');
      this.rect(83, 216, 18, 4, '#71867c');
    }
    c.restore();
  }

  private fragments(game: Session): void {
    const c = this.ctx;
    for (const hit of game.hits.slice(-3)) {
      const age = game.elapsed - hit.time;
      if (age < 0 || age > 0.65) continue;
      const vehicle = game.vehicles.find(v => v.id === hit.vehicleId);
      if (!vehicle) continue;
      const p = project(vehicle, hit.time);
      const x = p.x, y = p.y - 18 * p.scale;
      c.globalAlpha = 1 - age / 0.65;
      for (let i = 0; i < 24; i++) {
        const angle = i * 2.399;
        const speed = 30 + (i * 37) % 100;
        const px = x + Math.cos(angle) * speed * age;
        const py = y + Math.sin(angle) * speed * age + age * age * 100;
        this.rect(px, py, i % 3 === 0 ? 4 : 2, 2, i % 4 === 0 ? '#eecb73' : '#e4efd4');
      }
      if (age < 0.09) {
        this.polygon([[x - 33, y - 4], [x - 6, y - 10], [x - 3, y - 34], [x + 5, y - 10], [x + 31, y - 3], [x + 6, y + 7], [x + 1, y + 26], [x - 7, y + 7]], '#fff4bf');
      }
      this.text(hit.delta > 0 ? `SMASH! +${hit.delta}` : `WRONG LIGHT  ${hit.delta}`, x - 36, y - 34 - age * 20, hit.delta > 0 ? '#f7d27a' : '#ff9c83', 9);
      c.globalAlpha = 1;
    }
  }
}

// Exported for presentation verification without exposing the live game globally.
export { glare };
