import { Grid } from "./grid.js";
import { Tile } from "./tile.js";

const gameBoard = document.getElementById("game-board");
const restartButton = document.getElementById("restart-button");

let grid = new Grid(gameBoard);
let gameStarted = false;

// Переменные для сенсорных жестов
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function startGame() {
  // Очищаем игровое поле
  gameBoard.innerHTML = "";
  
  // Создаем новую сетку
  grid = new Grid(gameBoard);
  
  // Добавляем два начальных тайла
  grid.getRandomEmptyCell().linkTile(new Tile(gameBoard));
  grid.getRandomEmptyCell().linkTile(new Tile(gameBoard));
  
  // Скрываем кнопку перезапуска
  restartButton.style.display = "none";
  
  // Настраиваем обработчик ввода
  setupInputOnce();
  gameStarted = true;
}

// Начинаем игру
startGame();

// Обработчик кнопки перезапуска
restartButton.addEventListener("click", startGame);


function setupInputOnce() {
  // Обработчик клавиатуры
  window.addEventListener("keydown", handleInput, { once: true });
  
  // Обработчики сенсорных событий
  gameBoard.addEventListener("touchstart", handleTouchStart, { passive: true });
  gameBoard.addEventListener("touchend", handleTouchEnd, { passive: true });
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

// Функции для обработки сенсорных событий
function handleTouchStart(event) {
  if (!gameStarted) return;
  
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
  if (!gameStarted) return;
  
  const touch = event.changedTouches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;
  
  handleSwipe();
}

function handleSwipe() {
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const minSwipeDistance = 50; // Минимальное расстояние для свайпа
  
  // Определяем направление свайпа
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Горизонтальный свайп
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Свайп вправо
        executeMove("ArrowRight");
      } else {
        // Свайп влево
        executeMove("ArrowLeft");
      }
    }
  } else {
    // Вертикальный свайп
    if (Math.abs(deltaY) > minSwipeDistance) {
      if (deltaY > 0) {
        // Свайп вниз
        executeMove("ArrowDown");
      } else {
        // Свайп вверх
        executeMove("ArrowUp");
      }
    }
  }
}

async function executeMove(direction) {
  // Не обрабатываем ввод, если игра не активна
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
    
    // Показываем кнопку перезапуска при окончании игры
    restartButton.style.display = "block";
    gameStarted = false;
    
    return;
  }

  setupInputOnce();
}