const INITIAL_STATE = {
  score: 0,
  level: 1,
  lives: 3,
  gameOver: false,
  map: [],
  pacman: {},
  pacmanStart: { x: 14, y: 23 },
  ghosts: [],
  pills: [],
  updateStats: false,
  eated: { pill: 0, food: 0, startPills: 0, startFoods: 0 },
  powerPillUntil: 0,
  isPowerPill: () => GAME_STATE.powerPillUntil > new Date().getTime(),
  powerPillLeft: () => GAME_STATE.powerPillUntil - new Date().getTime(),
  pause: false,
  nextFreeLifeScore: 15000, // 15000, 50000, 100000, 150000 - see FREE_LIFE_SCORE
  lastFullDraw: -1, // if -1 then no periodic board redraw, 0 active periodic board redraw (500 ms)
  ghostIniPos: [[12, 14], [13, 14], [14, 14], [15, 14]],
  cheats: { notDie: false },
};
const FREE_LIFE_SCORE = [15000, 50000, 100000, 150000];
const PILL_DURATION = 10000;
const GAME_STATE = { ...INITIAL_STATE };
const MOVEMENTS = { UP: 'ArrowUp', RIGHT: 'ArrowRight', DOWN: 'ArrowDown', LEFT: 'ArrowLeft' };

const CHARACTERS_SIZE = { width: 24, height: 24, speed: 4 };
const CHARACTERS = {
  pacman: { ...CHARACTERS_SIZE, animation: document.getElementById('animation-pacman') },
  ghost: { ...CHARACTERS_SIZE, animation: document.getElementById('animation-ghost') },
};

export { GAME_STATE, INITIAL_STATE, MOVEMENTS, CHARACTERS, PILL_DURATION, FREE_LIFE_SCORE };
