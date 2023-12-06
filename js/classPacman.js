import { BOARD, BOARD_CONFIG, createRect } from './board.js';
import { CHARACTERS, GAME_STATE, MOVEMENTS } from './constant.js';
import { tryMove } from './tools.js';

const rotations = { [MOVEMENTS.RIGHT]: 4, [MOVEMENTS.UP]: 3, [MOVEMENTS.LEFT]: 2, [MOVEMENTS.DOWN]: 1 };
const pacmanAnimation = { width: 20, height: 20, frameCount: 7 };

class Pacman {
  constructor({ x, y, width, height, speed, marginX, marginY, walkableItems = ['1', '4', '5'], direction = MOVEMENTS.RIGHT, onDie, onEatPill }) {
    Object.assign(this, { x, y, width, height, speed, marginX, marginY, walkableItems, direction, onDie, onEatPill });
    Object.assign(this, { nextDirection: direction, frameCount: pacmanAnimation.frameCount, currentFrame: 1 });
    setInterval(() => (this.currentFrame = this.currentFrame == this.frameCount ? 1 : this.currentFrame + 1), 100);
  }

  die() {
    if (GAME_STATE.cheats.notDie) return;
    this.onDie && this.onDie();
  }

  eatPill(x, y) {
    GAME_STATE.pills = GAME_STATE.pills.filter((pill) => x != parseInt(pill.x / this.width) || y != parseInt(pill.y / this.height));
    GAME_STATE.eated.pill++;
    this.onEatPill && this.onEatPill();
  }

  eat() {
    const [x, y] = [parseInt(this.x / this.width), parseInt(this.y / this.height)];
    const item = GAME_STATE.map[y][x];
    // Change eated item into a walkable item (5)
    if (['1', '4'].includes(item)) {
      const row = GAME_STATE.map[y];
      const newRow = row.substring(0, x) + '5' + row.substring(x + '5'.length);
      GAME_STATE.map[y] = newRow;
      GAME_STATE.score += 10;
      if (item == '1') GAME_STATE.eated.food++;
      else if (item == '4') this.eatPill(x, y);
      GAME_STATE.updateStats = true;
    }
  }

  draw({ x, y, oldX, oldY }) {
    const [addX, addY] = [BOARD_CONFIG.addToChar.x, BOARD_CONFIG.addToChar.y];
    const [width, height, marginX, marginY] = [this.width + addX * 2, this.height + addY * 2, this.marginX - addX, this.marginY - addY];
    const [left, top, oldLeft, oldTop] = [x + marginX, y + marginY, (oldX ?? x) + marginX, (oldY ?? y) + marginY];
    const [imgWidth, imgHeight] = [pacmanAnimation.width, pacmanAnimation.height];
    const imgIdx = (this.currentFrame - 1) * imgWidth;
    BOARD.context_2d.save();
    // Clean old position
    createRect(BOARD.context_2d, oldLeft, oldTop, width, height, BOARD_CONFIG.colors.background);
    // Rotate with the pacman direction
    BOARD.context_2d.translate(left + width / 2, top + height / 2);
    BOARD.context_2d.rotate((rotations[this.direction] * 90 * Math.PI) / 180);
    BOARD.context_2d.translate(-left - width / 2, -top - height / 2);
    // Draw pacman
    BOARD.context_2d.drawImage(CHARACTERS.pacman.animation, imgIdx, 0, imgWidth, imgHeight, left, top, width, height);
    BOARD.context_2d.restore();
  }

  // Draw pacman (On position)
  drawPacman(x, y, width, height) {
    const [imgWidth, imgHeight] = [pacmanAnimation.width, pacmanAnimation.height];
    BOARD.context_2d.drawImage(CHARACTERS.pacman.animation, 4 * imgWidth - 1, 0, imgWidth, imgHeight, x, y, width, height);
  }

  // Move rutine (First try to move to next direction, if not, try to move to current direction) then eat and check ghost collision
  move() {
    if (this.direction != this.nextDirection && tryMove(this.nextDirection, this)) {
      this.direction = this.nextDirection;
      this.eat();
      return;
    }
    if (!tryMove(this.direction, this)) this.draw({ x: this.x, y: this.y });
    this.eat();
  }
}

export { Pacman };
