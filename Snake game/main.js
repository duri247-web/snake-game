const GRID = 20;                 // 격자 칸 수 (20x20)
const CELL = 20;                 // 한 칸 크기(px) → 400 / 20
const LEVEL_SCORE = 50;          // 레벨업에 필요한 점수 간격
const LEVEL_SPEEDUP_MS = 10;     // 레벨업마다 줄어드는 이동 간격
const MIN_TICK_MS = 30;          // 이동 간격 하한 (너무 빨라지는 것 방지)
const STORAGE_KEY = 'snakeHighScore';
const MUTE_KEY = 'snakeMuted';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const soundBtn = document.getElementById('sound-btn');
const pauseBtn = document.getElementById('pause-btn');
const levelEl = document.getElementById('level');
const difficultyEl = document.getElementById('difficulty');

let snake = [];
let food = null;
let direction = { x: 1, y: 0 };
let nextDirection = direction;
let score = 0;
let highScore = 0;
let timer = null;
let particles = [];
let state = 'idle';              // idle | playing | paused | over
let level = 1;
let baseInterval = 150;          // 선택한 난이도의 이동 간격(ms)

// ---------- 소리 (Web Audio API로 효과음을 직접 합성) ----------

let audioCtx = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch (e) {
  muted = false;
}

// 브라우저 정책상 사용자 클릭 이후에 오디오 컨텍스트 생성
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

// 단일 톤 재생: 시작 주파수에서 끝 주파수로 변화
function tone(freq, endFreq, duration, type = 'sine', volume = 0.15, delay = 0) {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

const sounds = {
  // 시작: 밝게 올라가는 3음
  start() {
    tone(523, 523, 0.12, 'triangle', 0.15, 0);
    tone(659, 659, 0.12, 'triangle', 0.15, 0.1);
    tone(784, 784, 0.2, 'triangle', 0.15, 0.2);
  },
  // 먹이: 짧고 경쾌한 2음
  eat() {
    tone(660, 880, 0.08, 'square', 0.08, 0);
    tone(990, 1320, 0.12, 'square', 0.08, 0.07);
  },
  // 게임 오버: 아래로 떨어지는 음
  gameOver() {
    tone(400, 90, 0.7, 'sawtooth', 0.12, 0);
    tone(300, 60, 0.8, 'triangle', 0.12, 0.15);
  },
  // 레벨업: 위로 올라가는 짧은 음
  levelUp() {
    tone(440, 660, 0.1, 'triangle', 0.14, 0);
    tone(660, 990, 0.16, 'triangle', 0.14, 0.1);
  },
  // 최고 기록 달성: 팡파르
  record() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.14, 0.9 + i * 0.12));
  },
};

function updateSoundButton() {
  soundBtn.textContent = muted ? '🔇' : '🔊';
}

soundBtn.addEventListener('click', () => {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch (e) {
    // 저장 실패는 무시
  }
  ensureAudio();
  updateSoundButton();
  soundBtn.blur(); // 스페이스/방향키 입력이 버튼에 영향을 주지 않도록
});

// ---------- 최고 점수 ----------

function loadHighScore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

function saveHighScore() {
  try {
    localStorage.setItem(STORAGE_KEY, String(highScore));
  } catch (e) {
    console.warn('저장 실패:', e);
  }
}

// ---------- 게임 로직 ----------

// 먹이를 뱀 몸과 겹치지 않는 빈 칸에 생성
function placeFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  food = pos;
}

// 현재 레벨 기준 이동 간격: 레벨이 오를 때마다 10ms씩 빨라짐
function currentInterval() {
  return Math.max(baseInterval - (level - 1) * LEVEL_SPEEDUP_MS, MIN_TICK_MS);
}

// 현재 이동 간격으로 타이머 (재)시작
function startTimer() {
  clearInterval(timer);
  timer = setInterval(tick, currentInterval());
}

// 일시정지 / 재개
function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    clearInterval(timer);
    timer = null;
    pauseBtn.textContent = '재개';
    messageEl.textContent = '일시정지 중';
  } else if (state === 'paused') {
    state = 'playing';
    startTimer();
    pauseBtn.textContent = '일시정지';
    messageEl.textContent = '';
  }
}

// 게임 상태 초기화 후 시작
function startGame() {
  ensureAudio();
  baseInterval = Number(difficultyEl.value);
  difficultyEl.disabled = true;
  level = 1;
  levelEl.textContent = level;
  state = 'playing';
  pauseBtn.textContent = '일시정지';
  pauseBtn.classList.remove('hidden');
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = direction;
  score = 0;
  particles = [];
  scoreEl.textContent = score;
  messageEl.textContent = '';
  startBtn.classList.add('hidden');
  restartBtn.classList.add('hidden');
  placeFood();
  sounds.start();
  startTimer();
}

// 한 칸 이동
function tick() {
  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  // 벽 충돌
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    return gameOver();
  }

  const ateFood = head.x === food.x && head.y === food.y;

  // 자기 몸 충돌 (먹이를 먹지 않으면 꼬리는 비켜나므로 제외)
  const body = ateFood ? snake : snake.slice(0, -1);
  if (body.some((s) => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  snake.unshift(head);

  if (ateFood) {
    score += 10;
    scoreEl.textContent = score;
    sounds.eat();
    burst(food.x, food.y);

    // 50점마다 레벨업 → 이동 간격 단축
    const newLevel = Math.floor(score / LEVEL_SCORE) + 1;
    if (newLevel > level) {
      level = newLevel;
      levelEl.textContent = level;
      sounds.levelUp();
      startTimer();
    }

    // 칸이 모두 찼으면 더 놓을 곳이 없으므로 종료
    if (snake.length === GRID * GRID) {
      return gameOver();
    }
    placeFood();
  } else {
    snake.pop();
  }
}

// 게임 오버 처리
function gameOver() {
  clearInterval(timer);
  timer = null;
  state = 'over';
  pauseBtn.classList.add('hidden');
  difficultyEl.disabled = false;
  sounds.gameOver();

  let text = `게임 오버! 점수: ${score}`;
  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = highScore;
    saveHighScore();
    sounds.record();
    text += ' (최고 기록!)';
  }

  messageEl.textContent = text;
  restartBtn.classList.remove('hidden');
}

// ---------- 그래픽 ----------

// 먹이를 먹었을 때 퍼지는 입자 효과
function burst(gx, gy) {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 70;
    particles.push({
      x: gx * CELL + CELL / 2,
      y: gy * CELL + CELL / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
    });
  }
}

// 배경: 그라데이션 + 은은한 격자
function drawBackground() {
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, '#16172e');
  bg.addColorStop(1, '#0d0e1f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

// 먹이: 맥박처럼 커졌다 작아지는 빛나는 구슬
function drawFood(time) {
  const pulse = 1 + Math.sin(time / 180) * 0.12;
  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2;
  const r = (CELL / 2 - 3) * pulse;

  ctx.save();
  ctx.shadowColor = '#ff6b8a';
  ctx.shadowBlur = 18;
  const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r);
  grad.addColorStop(0, '#ffd6e0');
  grad.addColorStop(0.5, '#ff6b8a');
  grad.addColorStop(1, '#d6336c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 뱀: 머리에서 꼬리로 갈수록 어두워지는 둥근 마디 + 눈
function drawSnake() {
  const n = snake.length;

  for (let i = n - 1; i >= 0; i--) {
    const s = snake[i];
    const t = n > 1 ? i / (n - 1) : 0;       // 0(머리) ~ 1(꼬리)
    const light = 68 - t * 22;               // 꼬리로 갈수록 어둡게
    const shrink = 1 + t * 1.5;              // 꼬리로 갈수록 살짝 작게

    ctx.save();
    ctx.shadowColor = 'rgba(102, 126, 234, 0.55)';
    ctx.shadowBlur = i === 0 ? 14 : 6;
    ctx.fillStyle = `hsl(${232 + t * 30}, 75%, ${light}%)`;
    ctx.beginPath();
    ctx.roundRect(
      s.x * CELL + shrink,
      s.y * CELL + shrink,
      CELL - shrink * 2,
      CELL - shrink * 2,
      i === 0 ? 7 : 6
    );
    ctx.fill();
    ctx.restore();
  }

  drawEyes(snake[0]);
}

// 진행 방향에 맞춰 눈 그리기
function drawEyes(head) {
  const cx = head.x * CELL + CELL / 2;
  const cy = head.y * CELL + CELL / 2;
  // 진행 방향에 수직인 벡터로 두 눈 간격을 벌림
  const px = -direction.y;
  const py = direction.x;
  const forward = 3;
  const side = 4;

  [-1, 1].forEach((sign) => {
    const ex = cx + direction.x * forward + px * side * sign;
    const ey = cy + direction.y * forward + py * side * sign;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1b33';
    ctx.beginPath();
    ctx.arc(ex + direction.x * 0.9, ey + direction.y * 0.9, 1.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 입자 갱신 및 그리기
function drawParticles(dt) {
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt * 2.2;

    ctx.fillStyle = `rgba(255, 140, 170, ${Math.max(p.life, 0)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5 * Math.max(p.life, 0) + 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 애니메이션 루프: 게임 틱과 별개로 부드럽게 다시 그림
let lastTime = 0;
function render(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.1) || 0;
  lastTime = time;

  drawBackground();
  if (food) drawFood(time);
  if (snake.length) drawSnake();
  drawParticles(dt);

  requestAnimationFrame(render);
}

// ---------- 입력 ----------

// 방향키 입력 (진행 방향의 정반대로는 전환 불가)
const KEY_DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

document.addEventListener('keydown', (e) => {
  const dir = KEY_DIRECTIONS[e.key];
  if (!dir) return;

  e.preventDefault(); // 방향키로 페이지가 스크롤되는 것 방지
  if (state !== 'playing') return; // 게임 중이 아니면(일시정지 포함) 무시

  if (dir.x === -direction.x && dir.y === -direction.y) return;
  nextDirection = dir;
});

pauseBtn.addEventListener('click', () => {
  togglePause();
  pauseBtn.blur(); // 이후 키 입력이 버튼에 영향을 주지 않도록
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// 초기화
highScore = loadHighScore();
highScoreEl.textContent = highScore;
updateSoundButton();
requestAnimationFrame(render);
