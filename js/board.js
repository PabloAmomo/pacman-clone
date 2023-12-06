import { FREE_LIFE_SCORE, GAME_STATE } from './constant.js';
import { completeWithZero, createEllipse, createLine, createRect, createText, measureText } from './tools.js';

const BOARD = document.getElementById('board');
const BOARD_ITEMS = {
  score: { fontSize: 32 },
  level: { fontSize: 32 },
  wall: { width: 24, height: 24 },
  food: { width: 4, height: 4 },
  pill: { width: 8, height: 8 },
};
const BOARD_COLORS = {
  wall: '#51a7ff',
  food: '#c7bc87',
  pill: '#ffaa00',
  'pill-pulse': '#ffccaa',
  background: '#000',
  score: '#fff',
  level: '#fff',
  scoreLabel: '#95fffc',
  levelLabel: '#95fffc',
  gameOver: { color1: '#333333', color2: '#fff' },
  anyKey: { color1: '#333333', color2: '#ffff00' },
};
const BOARD_MARGIN = { top: 48, bottom: 48, left: 0, right: 0 };
const BOARD_CONFIG = { blockSize: { x: 24, y: 24 }, margins: { ...BOARD_MARGIN }, ...BOARD_ITEMS, colors: { ...BOARD_COLORS }, addToChar: { x: 6, y: 6 } };
const PILL_ANIMATION = { last: 0, puled: false, inteval: 400 };

// Animate pill - Pulse color
const redrawPills = () => {
  if (new Date().getTime() - PILL_ANIMATION.last < PILL_ANIMATION.inteval) return;
  Object.assign(PILL_ANIMATION, { last: new Date().getTime(), puled: !PILL_ANIMATION.puled });
  GAME_STATE.pills.forEach((pill) =>
    drawItem({ ...pill, item: 'pill', type: 'ellipse', color: PILL_ANIMATION.puled ? BOARD_CONFIG.colors.pill : BOARD_CONFIG.colors['pill-pulse'] })
  );
};

const updateBoardStats = () => {
  if (!GAME_STATE.updateStats) return;
  GAME_STATE.updateStats = false;
  // New free life ! Add the life, and set the next step...
  if (GAME_STATE.score >= GAME_STATE.nextFreeLifeScore) {
    GAME_STATE.lives++;
    GAME_STATE.nextFreeLifeScore = FREE_LIFE_SCORE[FREE_LIFE_SCORE.indexOf(GAME_STATE.nextFreeLifeScore) + 1];
  }
  // Continue drawing stats
  const fontSize = 32;
  const [score, level] = [completeWithZero(GAME_STATE.score, 6), completeWithZero(GAME_STATE.level, 2)];
  const boardWidth = BOARD_CONFIG.margins.left + BOARD_CONFIG.blockSize.x * GAME_STATE.map[0].length;
  const scroreLabelWidth = measureText(BOARD.context_2d, 'SCORE ', BOARD_CONFIG.score.fontSize).width;
  const levelTextWidth = measureText(BOARD.context_2d, '00', BOARD_CONFIG.level.fontSize).width + 4;
  createText(BOARD.context_2d, score, scroreLabelWidth, BOARD_CONFIG.score.fontSize, BOARD_COLORS.score, fontSize);
  createText(BOARD.context_2d, level, boardWidth - levelTextWidth, BOARD_CONFIG.score.fontSize, BOARD_COLORS.level, fontSize);
  // Lives
  const liveSize = 32;
  const livesTopPos = BOARD.height - BOARD_CONFIG.margins.bottom + 12;
  createRect(BOARD.context_2d, boardWidth - 3 * (liveSize + 10), livesTopPos, (liveSize + 10) * 3, liveSize, BOARD_CONFIG.colors.background);
  for (let i = 0; i < GAME_STATE.lives; i++) {
    GAME_STATE.pacman.drawPacman(boardWidth - (i + 1) * (liveSize + 10), livesTopPos, liveSize, liveSize);
  }
};

const initBoard = () => {
  BOARD.context_2d = BOARD.getContext('2d');
  Object.assign(BOARD, {
    ...BOARD_CONFIG,
    width: BOARD_CONFIG.blockSize.x * GAME_STATE.map[0].length + BOARD_CONFIG.margins.left + BOARD_CONFIG.margins.right,
    height: BOARD_CONFIG.blockSize.y * GAME_STATE.map.length + BOARD_CONFIG.margins.top + BOARD_CONFIG.margins.bottom,
  });
  BOARD.style.width = `${BOARD.width}px`;
  BOARD.style.height = `${BOARD.height}px`;
};

const drawItem = ({ x, y, item, marginX, marginY, color, width, height, correctWidth = 0, correctHeight = 0, type = 'rectangle' }) => {
  const [blockWidth, blockHeight] = [BOARD_CONFIG.blockSize.x, BOARD_CONFIG.blockSize.y];
  const margin = {
    x: marginX ?? (blockWidth - BOARD_CONFIG[item].width) / 2,
    y: marginY ?? (blockHeight - BOARD_CONFIG[item].height) / 2,
  };
  const xVal = x + margin.x + BOARD_CONFIG.margins.left;
  const yVal = y + margin.y + BOARD_CONFIG.margins.top;
  const xCorr = (width ?? blockWidth - margin.x * 2) + correctWidth;
  const yCorr = (height ?? blockHeight - margin.y * 2) + correctHeight;
  color = color ?? BOARD_CONFIG.colors[item];
  if (type === 'line') createLine(BOARD.context_2d, xVal, yVal, xVal + xCorr, yVal + yCorr, color);
  else if (type === 'ellipse') createEllipse(BOARD.context_2d, xVal, yVal, xCorr, yCorr, 0, 2 * Math.PI, color);
  else createRect(BOARD.context_2d, xVal, yVal, xCorr, yCorr, color);
};

const externalCorner = ({ x, y, basic, values } = {}) => {
  drawItem({ ...basic, x: x ?? basic.x, height: values.y2 });
  drawItem({ ...basic, y: y ?? basic.y, width: +values.x2, correctHeight: -values.y2 });
};

const portalCorner = ({ y1, y2, x1, x2, basic, values } = {}) => {
  drawItem({ ...basic, height: values.y2, x: x1 ?? basic.x });
  drawItem({ ...basic, y: y1 ?? basic.yy2, width: values.x2, correctHeight: -values.y2 });
  drawItem({ ...basic, x: basic.xx, height: values.y, y: y2 ?? basic.y });
  drawItem({ ...basic, x: x2 ?? basic.xx, y: basic.yy, width: +values.x, correctHeight: -values.y2 });
};

const portalExitEnd = ({ x1, y1, y2, y3, basic, values } = {}) => {
  drawItem({ ...basic, width: values.x2, correctHeight: -values.y2, y: y1 ?? basic.y });
  drawItem({ ...basic, height: values.y, y: y2 ?? basic.y, x: x1 ?? basic.x });
  drawItem({ ...basic, y: y3 ?? basic.yy, width: values.x2, correctHeight: -values.y2 });
};

const normalCorner = ({ basic, values, condition, y1, y2, x1 } = {}) => {
  condition && drawItem({ ...basic, x: basic.xx, height: values.y, y: y1 ?? basic.y });
  drawItem({ ...basic, x: x1 ?? basic.xx, y: y2 ?? basic.yy, width: values.x, correctHeight: -values.y2 });
};

const innerCorner = ({ x1, y1, basic, values } = {}) => {
  drawItem({ ...basic, x: basic.xx, y: y1 ?? basic.y, height: values.y });
  drawItem({ ...basic, x: x1 ?? basic.x, y: basic.yy, width: values.x, correctHeight: -values.y2 });
};

const ghostHouseAndPortal = ({ basic, values, x1, top1 }) => {
  top1 && drawItem({ ...basic, x: basic.xx, y: basic.yy, height: +values.y });
  drawItem({ ...basic, x: x1 ?? basic.x, y: basic.yy, width: +values.x, correctHeight: -values.y2 });
  drawItem({ ...basic, x: x1 ?? basic.x, y: basic.yy2, width: +values.x, correctHeight: -values.y2 });
};

const singleWallHorizontal = ({ basic, values, left, right }) => {
  const [y14, x14] = [values.y / 4, values.x / 4];
  if (left) {
    drawItem({ ...basic, x: basic.xx - x14, y: basic.yy - y14, width: values.x2 - x14 * 3, correctHeight: -values.y2 });
    drawItem({ ...basic, x: basic.xx - x14, y: basic.yy2 - y14 * 3, width: values.x2 - x14 * 3, correctHeight: -values.y2 });
    drawItem({ ...basic, x: basic.xx - x14, y: basic.yy - y14, height: values.y - y14 * 2 });
  } else if (right) {
    drawItem({ ...basic, y: basic.yy - y14, width: values.x2 - x14 * 2 - 1, correctHeight: -values.y2 });
    drawItem({ ...basic, y: basic.yy2 - y14 * 3, width: values.x2 - x14 * 2 - 1, correctHeight: -values.y2 });
    drawItem({ ...basic, x: basic.xx2 - x14 * 2 - 1, y: basic.yy - y14, height: values.y - y14 * 2 });
  }
};

// Get de walls around position
const getAroundWalls = (i, j, theMap) => ({
  top: (theMap[i - 1]?.[j] ?? '1') == '0',
  topLeft: (theMap[i - 1]?.[j - 1] ?? '1') == '0',
  topRight: (theMap[i - 1]?.[j + 1] ?? '1') == '0',
  bottom: (theMap[i + 1]?.[j] ?? '1') == '0',
  bottomLeft: (theMap[i + 1]?.[j - 1] ?? '1') == '0',
  bottomRight: (theMap[i + 1]?.[j + 1] ?? '1') == '0',
  left: (theMap[i]?.[j - 1] ?? '1') == '0',
  right: (theMap[i]?.[j + 1] ?? '1') == '0',
  top3: (theMap[i - 1]?.[j] ?? '0') === '3' || (theMap[i - 1]?.[j] ?? '0') === '8',
  bottom3: (theMap[i + 1]?.[j] ?? '0') === '3' || (theMap[i + 1]?.[j] ?? '0') === '8',
  left3: (theMap[i]?.[j - 1] ?? '0') === '3' || (theMap[i]?.[j - 1] ?? '0') === '8',
  right3: (theMap[i]?.[j + 1] ?? '0') === '3' || (theMap[i]?.[j + 1] ?? '0') === '8',
  top2: (theMap[i - 1]?.[j] ?? '0') === '2',
  bottom2: (theMap[i + 1]?.[j] ?? '0') === '2',
  left2: (theMap[i]?.[j - 1] ?? '0') === '2',
  right2: (theMap[i]?.[j + 1] ?? '0') === '2',
  top1: (theMap[i - 1]?.[j] ?? '0') === '1',
  bottom1: (theMap[i + 1]?.[j] ?? '0') === '1',
});

const drawBoard = ({ clearBoard, drawWalls, drawFoods, drawPills } = { clearBoard: true, drawWalls: true, drawFoods: true, drawPills: true }) => {
  let x, y, xx2, yy2, xx, yy;
  let firstColum, lastColumn, firstRow, lastRow;
  let walls = {};
  const [blockWidth, blockHeight] = [BOARD_CONFIG.blockSize.x, BOARD_CONFIG.blockSize.y];
  const values = { x: blockWidth / 2, y: blockHeight / 2, x2: blockWidth, y2: blockHeight };
  const basic = { x, y, item: 'wall', type: 'line', width: 0 };
  const theMap = GAME_STATE.map;

  // Must clear board?
  if (clearBoard) {
    // Clear pills positions
    GAME_STATE.pills = [];
    // Clear board
    const boardHeight = BOARD.height - BOARD_CONFIG.margins.top - BOARD_CONFIG.margins.bottom;
    createRect(BOARD.context_2d, 0, BOARD_CONFIG.margins.top - 1, BOARD.width, boardHeight + 2, BOARD_CONFIG.colors.background);
    // Draw score and level labels
    const boardWidth = BOARD_CONFIG.margins.left + blockWidth * GAME_STATE.map[0].length;
    const level00Width = measureText(BOARD.context_2d, 'LEVEL 00', BOARD_CONFIG.level.fontSize).width + 4;
    createText(BOARD.context_2d, `SCORE `, 0, BOARD_CONFIG.level.fontSize, BOARD_CONFIG.colors.scoreLabel, BOARD_CONFIG.level.fontSize);
    createText(BOARD.context_2d, `LEVEL `, boardWidth - level00Width - BOARD_CONFIG.margins.right, BOARD_CONFIG.level.fontSize, BOARD_CONFIG.colors.levelLabel);
  }

  // Draw board
  for (let i = 0; i < theMap.length; i++) {
    for (let j = 0; j < theMap[i].length; j++) {
      [x, y] = [j * blockWidth, i * blockHeight];
      [yy2, xx2, xx, yy] = [y + values.y2, x + values.x2, x + values.x, y + values.y];
      [firstColum, lastColumn, firstRow, lastRow] = [j === 0, j === theMap[i].length - 1, i === 0, i === theMap.length - 1];
      Object.assign(basic, { x, y, xx2, yy2, xx, yy });

      // Foods
      if (theMap[i][j] === '1' && drawFoods) {
        drawItem({ x, y, item: 'food' });
        continue;
      }

      // Pills
      if (theMap[i][j] === '4' && drawPills) {
        clearBoard && GAME_STATE.pills.push({ x: x + BOARD_CONFIG.pill.width / 2, y: y + BOARD_CONFIG.pill.height / 2 });
        drawItem({ x: x + BOARD_CONFIG.pill.width / 2, y: y + BOARD_CONFIG.pill.height / 2, item: 'pill', type: 'ellipse' });
        continue;
      }

      // Walls (Continue if not draw walls)
      if (theMap[i][j] !== '0' || !drawWalls) continue;

      // Get de walls around
      walls = getAroundWalls(i, j, theMap);

      // Vertical external line
      if (!firstRow && !lastRow) {
        if (firstColum && walls.bottom != walls.top3 && walls.top != walls.bottom3) drawItem({ ...basic });
        else if (lastColumn && walls.bottom != walls.top3 && walls.top != walls.bottom3) drawItem({ ...basic, x: xx2 });
      }
      // Horizontal external line
      if (!firstColum && !lastColumn) {
        if (firstRow) drawItem({ ...basic, height: 0, width: null });
        else if (lastRow) drawItem({ ...basic, y: yy2, height: 0, width: null });
      }
      // Single wall (Horizontal)
      if (!firstRow && !lastRow && !walls.top3 && !walls.bottom3 && !walls.top && !walls.bottom) {
        if (!walls.left) singleWallHorizontal({ basic, values, left: true });
        else if (!walls.right) singleWallHorizontal({ basic, values, right: true });
        else if (walls.left && walls.right) singleWallHorizontal({ basic, values, left: false, right: false });
        continue;
      }
      if (firstRow && !walls.top && walls.bottom) {
        !walls.left && walls.right && externalCorner({ values, basic });
        !walls.right && walls.left && externalCorner({ values, basic, x: xx2 });
      }
      if (lastRow && !walls.bottom && walls.top) {
        !walls.left && walls.right && externalCorner({ values, basic, y: yy2 });
        !walls.right && walls.left && externalCorner({ values, basic, x: xx2, y: yy2 });
      }
      if (((walls.left2 && walls.right) || (walls.left && walls.right2)) && !walls.top && !walls.bottom && walls.bottom3) {
        ghostHouseAndPortal({ basic, values, x1: walls.left2 ? xx : x, top1: walls.top1 });
        continue;
      }
      if (walls.top && walls.bottom3) {
        walls.right && portalCorner({ values, basic });
        walls.left && portalCorner({ values, basic, x1: xx2, x2: x });
        continue;
      }
      if (walls.bottom && walls.top3) {
        walls.right && portalCorner({ values, basic, y1: y, y2: yy });
        walls.left && portalCorner({ values, basic, x1: xx2, x2: x, y1: y, y2: yy });
        continue;
      }
      if (walls.top3 && !walls.bottom && !walls.left) {
        portalExitEnd({ values, basic });
        continue;
      }
      if (walls.top3 && !walls.bottom && !walls.right) {
        portalExitEnd({ values, basic, x1: xx2 });
        continue;
      }
      if (walls.bottom3 && !walls.left && !walls.top1) {
        portalExitEnd({ values, basic, y1: yy, y2: yy, y3: yy2 });
        continue;
      }
      if (walls.bottom3 && !walls.right && !walls.bottom1) {
        portalExitEnd({ values, basic, x1: xx2, y1: yy, y2: yy, y3: yy2 });
        continue;
      }
      if (!walls.top && walls.bottom && !walls.left && walls.right) {
        normalCorner({ basic, values, condition: j > 0 || firstRow || lastRow, y1: yy });
        continue;
      }
      if (!walls.top && walls.bottom && !walls.right && walls.left) {
        let condition = !lastColumn || firstRow || lastRow;
        normalCorner({ basic, values, condition, x1: basic.x, y1: yy, y2: yy });
        continue;
      }
      if (!walls.bottom && walls.top && !walls.left && walls.right) {
        normalCorner({ basic, values, condition: j > 0 || lastRow });
        continue;
      }
      if (!walls.bottom && walls.top && !walls.right && walls.left) {
        let condition = !firstColum || firstRow || lastRow;
        normalCorner({ basic, values, condition, x1: basic.x, y1: basic.y, y2: yy });
        continue;
      }
      if (walls.top && walls.left && !walls.topLeft) {
        innerCorner({ values, basic });
        continue;
      }
      if (walls.top && walls.right && !walls.topRight) {
        innerCorner({ values, basic, x1: xx });
        continue;
      }
      if (walls.bottom && walls.left && !walls.bottomLeft) {
        innerCorner({ values, basic, y1: yy });
        continue;
      }
      if (walls.bottom && walls.right && !walls.bottomRight) {
        innerCorner({ values, basic, x1: xx, y1: yy });
        continue;
      }
      if (firstColum && walls.right && walls.bottomRight) {
        drawItem({ ...basic, x: x + 2 });
        continue;
      }
      if (lastColumn && walls.left && walls.bottomLeft) {
        drawItem({ ...basic, correctWidth: -2 });
        continue;
      }
      // Vertical line
      if (walls.top && walls.bottom && (!walls.left || !walls.right)) {
        drawItem({ ...basic, x: xx });
        walls.right3 && drawItem({ ...basic, x: xx2 });
        walls.left3 && drawItem({ ...basic });
        continue;
      }
      // Horizontal line
      if (walls.left && walls.right && (!walls.top || !walls.bottom)) {
        drawItem({ ...basic, width: null, y: yy, height: 0 });
        walls.bottom3 && drawItem({ ...basic, width: null, y: yy2, height: 0 });
        walls.top3 && drawItem({ ...basic, width: null, height: 0 });
        continue;
      }
    }
  }
};

const getMap = (level) => {
  if (level >= MAPS.length) level = level - Math.floor(level / MAPS.length) * MAPS.length;
  return JSON.parse(JSON.stringify(MAPS[level]));
};

const MAPS = [
  [
    '0000000000000000000000000000',
    '0111111111111001111111111110',
    '0100001000001001000001000010',
    '0400001000001001000001000040',
    '0100001000001001000001000010',
    '0111111111111111111111111110',
    '0100001001000000001001000010',
    '0100001001000000001001000010',
    '0111111001111001111001111110',
    '0000001000001001000001000000',
    '3333301000001001000001033333',
    '3333301001111111111001033333',
    '3333301001000220001001033333',
    '0000001001088338801001000000',
    '5555551111083333801111555555',
    '0000001001088888801001000000',
    '3333301001000000001001033333',
    '3333301001111111111001033333',
    '3333301001000000001001033333',
    '0000001001000000001001000000',
    '0111111111111001111111111110',
    '0100001000001001000001000010',
    '0100001000001001000001000010',
    '0411001111111511111111001140',
    '0001001001000000001001001000',
    '0001001001000000001001001000',
    '0111111001111001111001111110',
    '0100000000001001000000000010',
    '0100000000001001000000000010',
    '0111111111111111111111111110',
    '0000000000000000000000000000',
  ],
  [
    '0000000000000000000000000000',
    '0111111111111111111111111110',
    '0100001000001001000001000010',
    '0400001000001001000001000040',
    '0100001000001001000001000010',
    '0111111111111111111111111110',
    '0100001001000000001001000010',
    '0100001001000000001001000010',
    '0111111001111111111001111110',
    '0000001001000000001001000000',
    '3333301001000000001001033333',
    '3333301001111111111001000000',
    '3333301001000220001001555555',
    '3333301001088338801001000000',
    '3333301111083333801111033333',
    '0000001001088888801001033333',
    '5555551001000000001001033333',
    '0000001001111111111001033333',
    '3333301001000000001001033333',
    '0000001001000000001001000000',
    '0111111111111001111111111110',
    '0100001000001001000001000010',
    '0100001000001001000001000010',
    '0411001111111511111111001140',
    '0001001001000000001001001000',
    '0001001001000000001001001000',
    '0111111001111111111001111110',
    '0100000000001001000000000010',
    '0100000000001001000000000010',
    '0111111111111111111111111110',
    '0000000000000000000000000000',
  ],
  [
    '0000000000000000000000000000',
    '0111111111111111111111111110',
    '0100001000001001000001000010',
    '0400001000001001000001000040',
    '0100001000001001000001000010',
    '0111111111111111111111111110',
    '0000001001000000001001000010',
    '3333301001000000001001000010',
    '3333301001111111111001111110',
    '3333301001000000001001000000',
    '3333301001000000001001033333',
    '3333301001111111111001033333',
    '3333301001000220001001033333',
    '0000001001088338801001000000',
    '5555551111083333801111555555',
    '0000001001088888801001000000',
    '3333301001000000001001033333',
    '3333301001111111111001033333',
    '3333301001000000001001033333',
    '0000001001000000001001000000',
    '0111111111111001111111111110',
    '0100001000001001000001000010',
    '0100001000001001000001000010',
    '0411001111111511111111111140',
    '0001001000000000000001001000',
    '0001001000000000000001001000',
    '0111111111111111111111111110',
    '0100000010001001000100000010',
    '0100000010001001000100000010',
    '0111100111111111111110011110',
    '0000000000000000000000000000',
  ],
];

export { redrawPills, drawItem, createRect, BOARD, BOARD_CONFIG, getMap, drawBoard, initBoard, updateBoardStats };
