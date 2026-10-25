import './style.css';
import { Session } from './game/rules';
import { SpaceInput } from './game/input';
import { Scene } from './render/scene';
import { Sound } from './audio/sound';

const lamp = (high = false) => `<svg viewBox="0 0 32 24" fill="none" aria-hidden="true"><path d="M15 4C8 4 4 7 4 12s4 8 11 8V4Z" stroke="currentColor" stroke-width="2"/><path d="M20 5h9M20 12h9M20 19h9" stroke="currentColor" stroke-width="2" ${high ? '' : 'transform="rotate(16 20 12)"'}/></svg>`;

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <div class="shell">
    <header class="masthead">
      <a class="brand" href="./" aria-label="遠光燈粉碎者首頁"><span class="brand-icon">${lamp(true)}</span><span>HIGH BEAM<span class="brand-small">SMASHER</span></span></a>
      <div class="edition"><span class="signal"></span> AFTER HOURS ARCADE <span class="edition-no">/ 001</span></div>
      <button class="sound-button" id="sound" type="button" aria-pressed="false"><span aria-hidden="true">◖))</span> <span id="sound-label">聲音 開</span></button>
    </header>
    <section class="page-heading" aria-label="遊戲介紹">
      <div><p class="eyebrow">夜騎限定 · 像素紓壓遊戲</p><h1>遠光燈<span>粉碎者</span><span class="title-dot">.</span></h1></div>
      <p class="heading-note">夜路已經夠長了。<br>把刺眼的，留在身後。</p>
    </section>
    <section class="arcade" aria-label="遊戲機台">
      <div class="arcade-top"><span><i class="status-led"></i><span id="machine-status">READY TO RIDE</span></span><span>ROUTE 09 <b>↗</b> NIGHT SHIFT</span><span class="desktop-label">SPACE / CLICK / TAP</span></div>
      <div class="stage" id="stage" data-state="ready" data-phase="normal">
        <canvas id="world" width="480" height="270" aria-label="像素夜間道路；空白鍵、滑鼠左鍵或點按畫面揮棒"></canvas>
        <div class="vignette" aria-hidden="true"></div>
        <div class="hud" id="hud" hidden>
          <div class="hud-block"><span class="hud-label">TIME LEFT</span><div><strong id="time">30</strong><span class="hud-unit">SEC</span></div></div>
          <div class="phase" id="phase"><span class="signal"></span><span id="phase-label">夜騎進行中</span></div>
          <div class="hud-block hud-score"><span class="hud-label">SCORE</span><div><strong id="score">0</strong><span class="hud-unit">PTS</span></div></div>
        </div>
        <div class="intro" id="intro">
          <p class="intro-code"><span>01 / NIGHT RIDE</span><span>30 SEC</span></p>
          <h2>給遠光燈<br>一點<span>教訓。</span></h2>
          <p class="intro-copy">握穩手把，看準來車。<br>在它靠近的瞬間，揮出漂亮的一棒。</p>
          <div class="lamp-legend"><span class="high-light">${lamp(true)} 遠光燈 <b>+1</b></span><span class="low-light">${lamp()} 一般大燈 <b>−1</b></span></div>
          <button class="primary-button" id="start" type="button">開始夜騎 <span aria-hidden="true">↗</span></button>
          <p class="intro-foot"><kbd>SPACE</kbd> 或點按畫面揮棒 <span>·</span> 最後5秒雙倍</p>
        </div>
        <section class="results" id="results" aria-label="本局結算" hidden>
          <p class="eyebrow">SHIFT COMPLETE / 夜騎結束</p>
          <h2>夜色，清爽多了。</h2>
          <span class="result-label">本局得分</span>
          <div class="result-number"><strong id="final-score">0</strong><span>PTS</span></div>
          <p id="result-message">放鬆肩膀，再出發一次。</p>
          <div class="result-stats"><span>擊碎遠光燈 <b id="correct-count">0 / 20</b></span><span>誤擊 <b id="wrong-count">0</b></span></div>
          <button class="primary-button" id="restart" type="button">再騎一回 <span aria-hidden="true">↗</span></button>
        </section>
        <div class="hit-toast" id="hit-toast" aria-live="polite" role="status"></div>
        <div class="frenzy-banner" id="frenzy-banner" hidden><b>FINAL 5</b><span>車流加速 · 得失分 ×2</span></div>
        <span class="corner-label" id="corner-label" aria-hidden="true">一人、一車、一點脾氣。</span>
      </div>
      <div class="control-bar"><div><kbd>SPACE</kbd><span>或滑鼠左鍵／點按畫面揮棒</span></div><button id="attack" class="attack-button" type="button" hidden>點按揮棒 <span aria-hidden="true">↗</span></button><span class="control-note">放過一般大燈 <span>／</span> 揮空、漏打不扣分</span></div>
    </section>
    <section class="guide" aria-label="玩法提示">
      <article><span class="step-no">01</span><div><h3>先看燈，再出手</h3><p>白光刺眼的是目標，暖色一般大燈請放行。</p></div></article>
      <article><span class="step-no">02</span><div><h3>靠近了，才夠痛快</h3><p>亮起紅框時按空白鍵，或用滑鼠／手指點按揮棒。</p></div></article>
      <article><span class="step-no">03</span><div><h3>最後5秒，火力全開</h3><p>車流變密集，每次命中與誤擊都以雙倍計分。</p></div></article>
    </section>
    <footer class="footer"><span>MADE FOR A LITTLE PEACE OF MIND.</span><span>保持冷靜，把脾氣留在遊戲裡。 <span class="footer-mark">✳</span></span></footer>
  </div>`;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = byId('stage'), intro = byId('intro'), hud = byId('hud'), results = byId('results');
const time = byId('time'), score = byId('score'), phaseLabel = byId('phase-label');
const toast = byId('hit-toast'), banner = byId('frenzy-banner');
const game = new Session(), input = new SpaceInput(), sound = new Sound();
const scene = new Scene(byId<HTMLCanvasElement>('world'));
let shownHits = 0, previousState = game.state, lastTick = -1;
let toastUntil = 0, hasAnnouncedFinal = false;

function start(): void {
  input.clear();
  sound.resetVoice();
  game.start(performance.now() / 1000);
  shownHits = 0; lastTick = -1; toastUntil = 0; hasAnnouncedFinal = false;
  delete score.dataset.kind;
  toast.textContent = ''; toast.classList.remove('visible');
  banner.hidden = true; results.hidden = true; intro.hidden = true; hud.hidden = false;
  byId('corner-label').hidden = true;
  byId('machine-status').textContent = 'RIDE IN PROGRESS';
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  void sound.unlock();
  refresh();
}

function refresh(): void {
  stage.dataset.state = game.state;
  byId('attack').hidden = game.state !== 'playing';
  const attackButton = byId<HTMLButtonElement>('attack');
  attackButton.disabled = !game.canAttack;
  attackButton.textContent = game.canAttack ? '點按揮棒 ↗' : '揮棒回位中…';
  const final = game.elapsed >= 25 && game.state === 'playing';
  stage.dataset.phase = final ? 'frenzy' : 'normal';
  time.textContent = String(Math.ceil(30 - game.elapsed)).padStart(2, '0');
  score.textContent = String(game.score);
  phaseLabel.textContent = final ? '最後衝刺 · 得失分 ×2' : '夜騎進行中';
  if (game.hits.length > shownHits) {
    const hit = game.hits.at(-1)!;
    const correct = hit.delta > 0;
    toast.textContent = correct ? `漂亮一擊！ +${hit.delta}` : `這是一般大燈！ ${hit.delta}`;
    toast.dataset.kind = correct ? 'correct' : 'wrong';
    toast.classList.add('visible');
    toastUntil = game.elapsed + 0.65;
    score.dataset.kind = correct ? 'correct' : 'wrong';
    sound.hit(correct);
    shownHits = game.hits.length;
  }
  if (game.elapsed > toastUntil) toast.classList.remove('visible');
  if (final) {
    if (!hasAnnouncedFinal) { banner.hidden = false; hasAnnouncedFinal = true; }
    if (game.elapsed >= 26.65) banner.hidden = true;
    const tick = Math.floor((game.elapsed - 25) * 2);
    if (tick !== lastTick) { lastTick = tick; sound.tick(); }
  }
  if (game.state === 'results' && previousState !== 'results') {
    hud.hidden = true; banner.hidden = true; toast.classList.remove('visible'); results.hidden = false;
    byId('final-score').textContent = String(game.score);
    const correct = game.hits.filter(hit => hit.delta > 0).length;
    const wrong = game.hits.length - correct;
    byId('correct-count').textContent = `${correct} / 20`;
    byId('wrong-count').textContent = String(wrong);
    byId('result-message').textContent = game.score >= 15 ? '漂亮。今晚的夜路，由你守護。' : game.score > 0 ? '痛快了嗎？下一回，抓準每個瞬間。' : '放鬆肩膀，先看清燈光，再揮下一棒。';
    byId('machine-status').textContent = 'SHIFT COMPLETE';
    sound.finish(); input.clear();
    byId('restart').focus({ preventScroll: true });
  }
  previousState = game.state;
}

byId('start').addEventListener('click', start);
byId('restart').addEventListener('click', start);
function attack(): boolean {
  const accepted = game.attack(performance.now() / 1000);
  if (accepted) sound.swing();
  refresh();
  return accepted;
}

document.addEventListener('pointerdown', event => {
  if (game.state !== 'playing' || event.button !== 0 || !event.isPrimary) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  // UI controls stay controls; a start/restart press never doubles as a swing.
  if (target.closest('button, a, input, select, textarea') && !target.closest('#attack')) return;
  if (target.closest('#stage, #attack')) event.preventDefault();
  attack();
});
byId('attack').addEventListener('click', event => {
  // Keyboard/assistive activation; pointer activation already ran on pointerdown.
  if (event.detail === 0) attack();
});
byId('sound').addEventListener('click', () => {
  sound.muted = !sound.muted;
  byId('sound').setAttribute('aria-pressed', String(sound.muted));
  byId('sound-label').textContent = sound.muted ? '聲音 關' : '聲音 開';
  if (!sound.muted) void sound.unlock();
});
window.addEventListener('keydown', event => {
  if (event.code === 'Space' && game.state === 'playing') event.preventDefault();
  input.down(event.code, event.repeat, game.state === 'playing', attack);
  refresh();
});
window.addEventListener('keyup', event => input.up(event.code));
window.addEventListener('blur', () => input.clear());
document.addEventListener('visibilitychange', () => {
  input.clear(); game.advance(performance.now() / 1000); refresh();
});
function frame(now: number): void {
  game.advance(now / 1000);
  refresh();
  scene.draw(game, now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
