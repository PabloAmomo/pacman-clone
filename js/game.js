import { drawBoard, redrawPills, updateBoardStats } from './board.js';
import { GAME_STATE, MOVEMENTS, PILL_DURATION } from './constant.js';
import { gameOver, isMobile, resetGameState } from './tools.js';

const init = () => {
  if (!isMobile()) {
    // Keys and start game event listeners (For not mobile)
    document.addEventListener('keydown', (e) => keyPressed(e.key, e));
    document.getElementById('board').addEventListener('click', (e) => keyPressed('s', e));
    // Start game
    startGame(true);
    return;
  }

  // Set mobile class for html
  document.body.classList.add('mobile');
  // Create event listeners for mobile keys
  document.querySelectorAll('.key').forEach((key) => {
    // Remove copy, cut and paste events
    ['copy', 'cut', 'paste'].forEach((event) => key.addEventListener(event, (e) => e.preventDefault()));
    // Create touch and mouse events
    key.addEventListener('touchstart', (evt) => keyPressed(key.dataset.key, evt));
  });
  // Start game touch event listener
  document.getElementById('board').addEventListener('touchstart', (e) => keyPressed('s', e));
  // Start game
  startGame(true);
};

const onEatPill = () => {
  // Set the super pill effect end time
  GAME_STATE.powerPillUntil = new Date().getTime() + PILL_DURATION;
};

const onDie = () => {
  GAME_STATE.lives--;
  GAME_STATE.updateStats = true;
  // Check if game over (No more lives)
  if (GAME_STATE.lives <= 0) {
    gameOver(true);
    return;
  }
  // Pause game for 1 second before start new live
  GAME_STATE.pause = true;
  setTimeout(() => resetGameState({ type: 'new-live', onDie, onEatPill }), 1000);
};

const startGame = (init) => {
  // Reset game state and board
  resetGameState({ type: 'new-game', onDie, onEatPill });
  // Set not game over (Or game over if first start - come from init)
  gameOver(init);
  // Update game state
  GAME_STATE.updateStats = true;
  updateBoardStats();
  // Start loop
  loop();
};

var isOnLoop = false;
const loop = () => {
  // If game over, stop loop
  if (GAME_STATE.gameOver || isOnLoop) return;
  // Set on loop
  isOnLoop = true;
  try {
    // Loop
    window.requestAnimationFrame(loop);
    // If pause, jump loop
    if (GAME_STATE.pause) return;
    // Clear Ghost
    GAME_STATE.ghosts.forEach((ghost) => ghost.clearPosition());
    // Cycling board redraw (For posible error on ghost repaint)
    if (GAME_STATE.lastFullDraw >= 0 && Date.now() - GAME_STATE.lastFullDraw > 500) {
      GAME_STATE.lastFullDraw = Date.now();
      drawBoard({ clearBoard: false, drawFoods: true });
    }
    // Move pacman
    GAME_STATE.pacman.move();
    // Move the Ghosts
    GAME_STATE.ghosts.forEach((ghost) => ghost.move());
    // Redraw pills (Animte pills)
    redrawPills();
    // Update board stats
    updateBoardStats();
    // Check if all pills and foods are eaten
    if (GAME_STATE.eated.food + GAME_STATE.eated.pill == GAME_STATE.eated.startPills + GAME_STATE.eated.startFoods)
      resetGameState({ type: 'next-level', onDie, onEatPill });
  } catch (e) {
    console.log(e);
  } finally {
    isOnLoop = false;
  }
};

const keyPressed = (key, evt) => {
  if (GAME_STATE.gameOver) key = 's';
  // Execute action (Move pacman)
  if ([MOVEMENTS.LEFT, MOVEMENTS.RIGHT, MOVEMENTS.DOWN, MOVEMENTS.UP].includes(key)) {
    GAME_STATE.pacman.nextDirection = key;
    evt && evt.preventDefault();
    return;
  }
  // Start game
  if (key.toLowerCase() == 's' && GAME_STATE.gameOver) startGame();
};

export { init };
