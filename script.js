import { Grid } from "./grid.js";
import { Tile } from "./tile.js";

const gameBoard = document.getElementById("game-board");
const restartButton = document.getElementById("restart-button");

let grid = new Grid(gameBoard);
let gameStarted = false;

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isTouchActive = false;


function startGame() {

  gameBoard.innerHTML = "";
  
  grid = new Grid(gameBoard);
  
  grid.getRandomEmptyCell().linkTile(new Tile(gameBoard));
  grid.getRandomEmptyCell().linkTile(new Tile(gameBoard));
  
  restartButton.style.display = "none";
  
  setupInputOnce();
  gameStarted = true;
}

startGame();

restartButton.addEventListener("click", startGame);

document.addEventListener("touchmove", function(event) {
  if (isTouchActive) {
    event.preventDefault();
  }
}, { passive: false });

document.addEventListener("contextmenu", function(event) {
  event.preventDefault();
});


function setupInputOnce() {
  window.addEventListener("keydown", handleInput, { once: true });
  
  gameBoard.addEventListener("touchstart", handleTouchStart, { passive: false });
  gameBoard.addEventListener("touchmove", handleTouchMove, { passive: false });
  gameBoard.addEventListener("touchend", handleTouchEnd, { passive: false });
}

async function handleInput(event) {
  await executeMove(event.key);
}

async function moveUp() {
  await slideTiles(grid.cellsGroupedByColumn);
}

async function moveDown() {
  await slideTiles(grid.cellsGroupedByReversedColumn);
}

async function moveLeft() {
  await slideTiles(grid.cellsGroupedByRow);
}

async function moveRight() {
  await slideTiles(grid.cellsGroupedByReversedRow);
}

async function slideTiles(groupedCells) {
  const promises = [];

  groupedCells.forEach(group => slideTilesInGroup(group, promises));

  await Promise.all(promises);
  grid.cells.forEach(cell => {
    cell.hasTileForMerge() && cell.mergeTiles()
  });
}

function slideTilesInGroup(group, promises) {
  for (let i = 1; i < group.length; i++) {
    if (group[i].isEmpty()) {
      continue;
    }

    const cellWithTile = group[i];

    let targetCell;
    let j = i - 1;
    while (j >= 0 && group[j].canAccept(cellWithTile.linkedTile)) {
      targetCell = group[j];
      j--;
    }

    if (!targetCell) {
      continue;
    }

    promises.push(cellWithTile.linkedTile.waitForTransitionEnd());

    if (targetCell.isEmpty()) {
      targetCell.linkTile(cellWithTile.linkedTile);
    } else {
      targetCell.linkTileForMerge(cellWithTile.linkedTile);
    }

    cellWithTile.unlinkTile();
  }
}

function canMoveUp() {
  return canMove(grid.cellsGroupedByColumn);
}

function canMoveDown() {
  return canMove(grid.cellsGroupedByReversedColumn);
}

function canMoveLeft() {
  return canMove(grid.cellsGroupedByRow);
}

function canMoveRight() {
  return canMove(grid.cellsGroupedByReversedRow);
}

function canMove(groupedCells) {
  return groupedCells.some(group => canMoveInGroup(group));
}

function canMoveInGroup(group) {
  return group.some((cell, index) => {
    if (index === 0) {
      return false;
    }

    if (cell.isEmpty()) {
      return false;
    }

    const targetCell = group[index - 1];
    return targetCell.canAccept(cell.linkedTile);
  });
}

function handleTouchStart(event) {
  if (!gameStarted) return;
  
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  isTouchActive = true;
  
  event.preventDefault();
}

function handleTouchMove(event) {
  if (!gameStarted || !isTouchActive) return;
  
  event.preventDefault();
}

function handleTouchEnd(event) {
  if (!gameStarted || !isTouchActive) return;
  
  const touch = event.changedTouches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;
  
  event.preventDefault();
  
  handleSwipe();
  isTouchActive = false;
}

function handleSwipe() {
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const minSwipeDistance = 30;
  const maxSwipeDistance = 200;
  
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance < minSwipeDistance || distance > maxSwipeDistance) {
    return;
  }
  
  const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
  
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (angle > -45 && angle < 45) {
      executeMove("ArrowRight");
    } else if (angle > 135 || angle < -135) {
      executeMove("ArrowLeft");
    }
  } else {
    if (angle > 45 && angle < 135) {
      executeMove("ArrowDown");
    } else if (angle > -135 && angle < -45) {
      executeMove("ArrowUp");
    }
  }
}

async function executeMove(direction) {
  if (!gameStarted) {
    setupInputOnce();
    return;
  }
  
  switch (direction) {
    case "ArrowUp":
      if (!canMoveUp()) {
        setupInputOnce();
        return;
      }
      await moveUp();
      break;
    case "ArrowDown":
      if (!canMoveDown()) {
        setupInputOnce();
        return;
      }
      await moveDown();
      break;
    case "ArrowLeft":
      if (!canMoveLeft()) {
        setupInputOnce();
        return;
      }
      await moveLeft();
      break;
    case "ArrowRight":
      if (!canMoveRight()) {
        setupInputOnce();
        return;
      }
      await moveRight();
      break;
    default:
      setupInputOnce();
      return;
  }

  const newTile = new Tile(gameBoard);
  grid.getRandomEmptyCell().linkTile(newTile);

  if (!canMoveUp() && !canMoveDown() && !canMoveLeft() && !canMoveRight()) {
    await newTile.waitForAnimationEnd();
    
    restartButton.style.display = "block";
    gameStarted = false;
    
    return;
  }

  setupInputOnce();
}