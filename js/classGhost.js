import { BOARD, BOARD_CONFIG, createRect, drawItem } from './board.js';
import { CHARACTERS, GAME_STATE, MOVEMENTS } from './constant.js';
import { findPathTo, getItemOnMap, getPosOnMap, tryMove } from './tools.js';

const MOVEMENTS_NUMBERS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
const DIRECTIONS_NAME = [MOVEMENTS.UP, MOVEMENTS.RIGHT, MOVEMENTS.DOWN, MOVEMENTS.LEFT];
const ANIMATION = { width: 126, height: 115 };
const HOUSE_WALKABLE = ['1', '2', '3', '4', '5'];
const NORMAL_WALKABLE = ['1', '4', '5'];
const CHASE_RANGE = 240;
const GHOST_EATEN = 200;
const GHOST_EATEN_PLUS = 1000;

class Ghost {
  constructor({ id, x, y, width, height, speed, marginX, marginY, walkableItems = ['1', '2', '3', '4', '5'], direction = MOVEMENTS.RIGHT }) {
    Object.assign(this, { id, x, y, width, height, speed, marginX, marginY, walkableItems, direction });
    Object.assign(this, { frameCount: ANIMATION.frameCount, animationState: false, moveBuffer: [], antidotUntil: 0, dead: false });
    this.interval = setInterval(() => (this.animationState = !this.animationState), 250);
    // Getters
    this.isDead = () => this.dead;
    this.getAntidotUntil = () => this.antidotUntil;
  }

  die() {
    this.dead = true;
    GAME_STATE.score += GHOST_EATEN;
    // Check if all ghosts are dead then apply bonus
    let count = 0;
    GAME_STATE.ghosts.forEach((ghost) => {
      if (ghost.isDead() || ghost.getAntidotUntil() === GAME_STATE.powerPillUntil) count++;
    });
    if (count == GAME_STATE.ghosts.length) GAME_STATE.score += GHOST_EATEN_PLUS;
    // Update stats
    GAME_STATE.updateStats = true;
  }

  move() {
    const pacman = GAME_STATE.pacman;
    const ghostPos = getPosOnMap({ y: this.y, x: this.x, height: this.height, width: this.width });
    const pacManPos = getPosOnMap({ y: pacman.y, x: pacman.x, height: pacman.height, width: pacman.width });
    const housePos = { y: 14, x: 13 };
    const mapCopy = [...GAME_STATE.map];
    const isInHouse = ['3', '2'].includes(getItemOnMap({ y: this.y, x: this.x, that: this }));

    // Walkable items in diferent situations
    const walkableItems = isInHouse ? HOUSE_WALKABLE : NORMAL_WALKABLE;

    // Start moving in current direction (If we are in house, try to exit with up direction)
    let nextDirection = isInHouse ? 0 : MOVEMENTS_NUMBERS[this.direction];

    // Recover from dead (And save the current pill available to for use as antidot)
    if (isInHouse && this.dead) {
      this.antidotUntil = GAME_STATE.powerPillUntil;
      this.dead = false;
    }

    // If dead, move to house to revive
    if (this.dead) {
      const route = findPathTo(ghostPos, housePos, mapCopy, '0', HOUSE_WALKABLE).route?.[0] ?? 'R';
      nextDirection = ['U', 'R', 'D', 'L'].indexOf(route);
      // Move to house or stay in current direction
      if (tryMove(DIRECTIONS_NAME[nextDirection], this, HOUSE_WALKABLE)) this.direction = DIRECTIONS_NAME[nextDirection];
      else this.draw({ x: this.x, y: this.y });
      return; // exit, ghost already moved
    }

    // In range trace path to pacman
    let chaseRange = Math.sqrt((pacman.x - this.x) ** 2 + (pacman.y - this.y) ** 2) <= CHASE_RANGE;
    if (chaseRange && !isInHouse && !GAME_STATE.isPowerPill()) {
      nextDirection = ['U', 'R', 'D', 'L'].indexOf(findPathTo(ghostPos, pacManPos, mapCopy, '0', walkableItems).route?.[0] ?? 'R');
    }

    // Move next direction (4 times, to prove all directions)
    let validMove = tryMove(DIRECTIONS_NAME[nextDirection], this, walkableItems, GAME_STATE.isPowerPill() ? -2 : -1);
    if (!validMove) {
      if (!chaseRange) {
        nextDirection = parseInt(Math.random() * 4);
        if (isInHouse) {
          // Minimize fluctuation in home. Try to exit with up direction
          const buffer = this.addToBuffer(nextDirection);
          if (buffer.indexOf('1212') > 0) nextDirection = MOVEMENTS_NUMBERS[MOVEMENTS.UP];
        }
      }
      // Check if we can move in other direction
      for (let i = 0; i < 3; i++) {
        nextDirection++;
        if (nextDirection > 3) nextDirection = 0;
        validMove = tryMove(DIRECTIONS_NAME[nextDirection], this, walkableItems, GAME_STATE.isPowerPill() ? -2 : -1);
        if (validMove) break;
      }
    }

    // Check if hit pacman
    if (pacman.x < this.x + this.width && pacman.x + pacman.width > this.x && pacman.y < this.y + this.height && pacman.y + pacman.height > this.y) {
      if (GAME_STATE.isPowerPill() && GAME_STATE.powerPillUntil !== this.antidotUntil) this.die();
      else pacman.die();
    }

    // If we can't move, stay in current direction else change direction
    if (validMove) this.direction = DIRECTIONS_NAME[nextDirection];
    else this.draw({ x: this.x, y: this.y });
  }

  // Check if two rectangles are colliding
  isColliding({ x, y, width, height, x1, y1, width1, height1 }) {
    return x1 < x + width && x1 + width1 > x && y1 < y + height && y1 + height1 > y;
  }

  destroy() {
    clearInterval(this.interval);
    this.clearPosition();
    this.x = -100;
    this.y = -100;
  }

  addToBuffer(direction) {
    this.moveBuffer.push(direction);
    this.moveBuffer.length > 20 && this.moveBuffer.shift();
    return this.moveBuffer.join('');
  }

  drawItemOn({ x, y, that }) {
   const item = getItemOnMap({ x, y, that });
    if (['1', '4'].includes(item)) drawItem({ x, y, item: item == '1' ? 'food' : 'pill' });
  }

  // Clear the current position and replace pills and food
  clearPosition() {
    const [addX, addY] = [BOARD_CONFIG.addToChar.x, BOARD_CONFIG.addToChar.y];
    const [width, height] = [this.width + (addX * 2), this.height + (addY * 2)];
    const [left, top] = [this.x + this.marginX - addX, this.y + this.marginY - addY];
    let item;

    // Clean the current position
    createRect(BOARD.context_2d, left, top, width, height, BOARD_CONFIG.colors.background);

    // Replace pills and food
    const [blockWidth, blockHeight] = [BOARD_CONFIG.blockSize.x, BOARD_CONFIG.blockSize.y];
    let [x, y] = [parseInt(left / blockWidth) * blockWidth, parseInt(top / blockHeight) * blockHeight];

    // Moving left or right
    if (this.direction == MOVEMENTS.LEFT || this.direction == MOVEMENTS.RIGHT) {
      x = x + (this.direction == MOVEMENTS.LEFT ? blockWidth : 0);
      y = y - blockHeight;
    }
    // Moving up or down
    if (this.direction == MOVEMENTS.UP || this.direction == MOVEMENTS.DOWN) {
      x = x + blockWidth;
      y = y - (this.direction == MOVEMENTS.DOWN ? blockHeight * 2 : 0);
    }
    if (this.direction == MOVEMENTS.RIGHT) this.drawItemOn({ x: x - blockWidth, y: y + blockHeight, that: this });
    this.drawItemOn({ x, y, that: this });
  }

  // Draw the ghost
  draw({ x, y }) {
    const [addX, addY] = [BOARD_CONFIG.addToChar.x, BOARD_CONFIG.addToChar.y];
    const [width, height, marginX, marginY] = [this.width + addX * 2, this.height + addY * 2, this.marginX - addX, this.marginY - addY];
    const [left, top] = [x + marginX, y + marginY];
    const [imgWidth, imgHeight] = [ANIMATION.width, ANIMATION.height];
    let imgIdX = [0, 3, 1, 2].indexOf(MOVEMENTS_NUMBERS[this.direction]);
    let imgIdY = this.id * imgHeight + 1;
    // Check if we are running in power pill mode
    if (GAME_STATE.isPowerPill() && GAME_STATE.powerPillUntil != this.antidotUntil) {
      const leftTime = GAME_STATE.powerPillLeft();
      if (leftTime > 2000 || (leftTime <= 2000 && this.animationState)) {
        imgIdX = 4;
        imgIdY = 1;
      }
    }
    // Check if ghost is dead
    if (this.dead) {
      imgIdX = 5;
      imgIdY = 1;
    }
    // Draw the ghost
    imgIdX *= imgWidth;
    BOARD.context_2d.save();
    BOARD.context_2d.drawImage(CHARACTERS.ghost.animation, imgIdX, imgIdY, imgWidth, imgHeight, left, top, width, height);
    BOARD.context_2d.restore();
  }
}

export { Ghost };
