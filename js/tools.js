import { BOARD, BOARD_CONFIG, drawBoard, getMap, initBoard } from './board.js';
import { Ghost } from './classGhost.js';
import { Pacman } from './classPacman.js';
import { CHARACTERS, GAME_STATE, INITIAL_STATE, MOVEMENTS } from './constant.js';

// Complete string with zero at left
const completeWithZero = (number, length) => number.toString().padStart(length, '0');
// Mobile detection
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
// replace char in string at position
const replaceAt = (str, index, replacement) => str.substr(0, index) + replacement + str.substr(index + replacement.length);
// Get the item on map position
const getPosOnMap = ({ y, x, height, width }) => ({ y: parseInt(y / height), x: parseInt(x / width) });
// Get the item on map position
const getItemOnMap = ({ y, x, that }) => GAME_STATE.map?.[parseInt(y / that.height)]?.[parseInt(x / that.width)];

// Find path from posStart to posEnd
const findPathTo = (posStart = { x: 0, y: 0 }, posEnd = { x: 1, y: 1 }, map = ['00', '00'], noWalkable = '1', walkableItems = ['0', '2', '3']) => {
  const queue = [];
  // Mark posStart as no walkable
  map[posStart.y] = replaceAt(map[posStart.y], posStart.x, noWalkable);
  // Save the initial path (The start Position)
  queue.push([[posStart.y, posStart.x]]);
  // Start the search
  while (queue.length > 0) {
    const path = queue.shift(); // Remove the first path from the queue
    const pos = path[path.length - 1]; // and add the last position from the path
    const [p0, p1] = [pos[0], pos[1]];
    const direction = [
      [p0 + 1, p1],
      [p0, p1 + 1],
      [p0 - 1, p1],
      [p0, p1 - 1],
    ];

    for (var i = 0; i < direction.length; i++) {
      // Check if we have found the end position
      if (direction[i][0] == posEnd.y && direction[i][1] == posEnd.x) {
        path.push([posEnd.y, posEnd.x]); // Include the end position
        let route = '';
        for (let i = 1; i < path.length; i++) {
          const [y, x] = path[i];
          const [yPrev, xPrev] = path[i - 1];
          if (y > yPrev) route += 'D';
          else if (y < yPrev) route += 'U';
          else if (x > xPrev) route += 'R';
          else if (x < xPrev) route += 'L';
        }
        return { path, route };
      }

      // Check if the new position is walkable
      if (
        direction[i][0] < 0 ||
        direction[i][0] >= map.length ||
        direction[i][1] < 0 ||
        direction[i][1] >= map[0].length ||
        !walkableItems.includes(map[direction[i][0]][direction[i][1]])
      )
        continue;

      // Mark the new position as no walkable
      map[direction[i][0]] = replaceAt(map[direction[i][0]], direction[i][1], noWalkable);

      // Create the new path
      queue.push(path.concat([direction[i]]));
    }
  }
  return { path: [], route: '' };
};

// Change game over state
const gameOver = (state) => {
  GAME_STATE.gameOver = state;
  if (!state) {
    document.body.classList.remove('game-over');
    return;
  }
  state && document.body.classList.add('game-over');
  drawTextCentered('GAME OVER', 64, 0, BOARD_CONFIG.colors.gameOver.color1, BOARD_CONFIG.colors.gameOver.color2);
  drawTextCentered(isMobile ? 'TOUCH TO START' : 'PRESS ANY KEY TO START', 24, 16, BOARD_CONFIG.colors.anyKey.color1, BOARD_CONFIG.colors.anyKey.color2);
};

// Reset game state (type = 'new-game' / 'next-level' / 'new-live')
const resetGameState = ({ onDie, onEatPill, type = 'new-game' }) => {
  // Pill reset allways
  GAME_STATE.powerPillUntil = 0;
  // Start game
  if (type === 'new-game') Object.assign(GAME_STATE, INITIAL_STATE);
  // Next level
  else if (type === 'next-level') {
    GAME_STATE.level++;
    GAME_STATE.score += 100;
    GAME_STATE.updateStats = true;
  }
  // Get new map
  if (type === 'new-game' || type === 'next-level') GAME_STATE.map = getMap(GAME_STATE.level - 1);
  // Initialize board (Only in new game)
  if (type === 'new-game') initBoard();
  // Get pills and foods count
  const pills = GAME_STATE.map.reduce((acc, row) => acc + row.split('').filter((col) => col === '4').length, 0);
  const foods = GAME_STATE.map.reduce((acc, row) => acc + row.split('').filter((col) => col === '1').length, 0);
  GAME_STATE.eated = { pill: 0, food: 0, startFoods: foods, startPills: pills };
  // Initialize pacman (Reset position)
  GAME_STATE.pacman = initPacman({ ...GAME_STATE.pacmanStart, onDie, onEatPill });
  // Clean current ghosts
  GAME_STATE.ghosts.forEach((ghost) => ghost.destroy());
  drawBoard({ clearBoard: true });
  // Initialize ghosts
  GAME_STATE.ghosts = [...GAME_STATE.ghostIniPos.map((pos, idx) => initGhost({ x: pos[0], y: pos[1], id: idx }))];
  // Draw board
  drawBoard();
  // Continue...
  GAME_STATE.pause = false;
};

// Draw text on center of the board
const drawTextCentered = (text, fontSize, marginTop, color1, color2) => {
  const [x, y] = [(BOARD.width - measureText(BOARD.context_2d, text, fontSize).width) / 2, (BOARD.height - fontSize) / 2];
  createText(BOARD.context_2d, text, x - 1, y + marginTop, color1);
  createText(BOARD.context_2d, text, x, y + marginTop, color2);
};

// Measure text
const measureText = (ctx2d, text, fontSize) => {
  ctx2d.font = `${fontSize}px Arial`;
  return ctx2d.measureText(text);
};

// Create text
const createText = (ctx2d, text, x, y, color, fontSize, backcolor = BOARD_CONFIG.colors.background) => {
  fontSize && createRect(ctx2d, x, y - fontSize, x + measureText(ctx2d, text, fontSize).width, y, backcolor);
  ctx2d.fillStyle = color;
  ctx2d.fillText(text, x, y);
};

// Create rectangle
const createRect = (ctx2d, x, y, width, height, color) => {
  ctx2d.fillStyle = color;
  ctx2d.fillRect(x, y, width, height);
};

// Create line
const createLine = (ctx2d, x1, y1, x2, y2, color) => {
  ctx2d.strokeStyle = color;
  ctx2d.beginPath();
  ctx2d.moveTo(x1, y1);
  ctx2d.lineTo(x2, y2);
  ctx2d.stroke();
};

// Create circle
const createEllipse = (ctx2d, x, y, radiusX, radiusY, startAngle = 0, endAngle = 2 * Math.PI, color) => {
  ctx2d.fillStyle = color;
  ctx2d.beginPath();
  ctx2d.ellipse(x, y, radiusX, radiusY, 0, startAngle, endAngle);
  ctx2d.fill();
};

// Init Ghost
const initGhost = ({ id, x, y, color, walkableItems = ['1', '2', '3', '4', '5'] }) => {
  const ghost = new Ghost({
    id,
    x: x * CHARACTERS.ghost.width,
    y: y * CHARACTERS.ghost.height,
    width: CHARACTERS.ghost.width,
    height: CHARACTERS.ghost.height,
    speed: CHARACTERS.ghost.speed,
    marginX: BOARD_CONFIG.margins.left,
    marginY: BOARD_CONFIG.margins.top,
    walkableItems,
    color,
  });
  return ghost;
};

// Init pacman
const initPacman = ({ x, y, walkableItems = ['1', '4', '5'], onDie, onEatPill }) => {
  const pacman = new Pacman({
    x: x * CHARACTERS.pacman.width,
    y: y * CHARACTERS.pacman.height,
    width: CHARACTERS.pacman.width,
    height: CHARACTERS.pacman.height,
    speed: CHARACTERS.pacman.speed,
    marginX: BOARD_CONFIG.margins.left,
    marginY: BOARD_CONFIG.margins.top,
    walkableItems,
    onDie,
    onEatPill,
  });
  return pacman;
};

// Try to move the character
const tryMove = (direction, that, walkableItems, speedCorrection) => {
  let [x, y] = [that.x, that.y];
  const [correctY, correctX] = [Math.floor(y / that.height) * that.height, Math.floor(x / that.width) * that.width];
  const maxX = (GAME_STATE.map[0].length - 1) * that.width + BOARD_CONFIG.margins.left;
  const currentSpeed = that.speed + (speedCorrection ?? 0);
  let isValid = false;

  walkableItems = walkableItems || that.walkableItems;

  switch (direction) {
    case MOVEMENTS.RIGHT:
      x += currentSpeed;
      if (x > maxX) x = 0; // -> teleport to left
      isValid = walkableItems.includes(getItemOnMap({ y, x: x + that.width - currentSpeed, that }));
      y = correctY;
      break;

    case MOVEMENTS.LEFT:
      x -= currentSpeed;
      if (x < 0) x = maxX; // -> teleport to right
      isValid = walkableItems.includes(getItemOnMap({ y, x, that }));
      y = correctY;
      break;

    case MOVEMENTS.DOWN:
      y += currentSpeed;
      isValid = walkableItems.includes(getItemOnMap({ y: y + that.height - currentSpeed, x, that }));
      x = Math.floor(x / that.width) * that.width;
      break;

    case MOVEMENTS.UP:
      y -= currentSpeed;
      isValid = walkableItems.includes(getItemOnMap({ y, x, that }));
      x = correctX;
      break;
  }

  if (isValid) {
    // Valid new position - do the movement
    that.draw({ x, y, oldX: that.x, oldY: that.y });
    Object.assign(that, { x, y });
  }

  return isValid;
};

export {
  tryMove,
  getItemOnMap,
  gameOver,
  initGhost,
  measureText,
  completeWithZero,
  isMobile,
  resetGameState,
  createRect,
  createLine,
  createEllipse,
  initPacman,
  createText,
  findPathTo,
  getPosOnMap,
  drawTextCentered,
};
