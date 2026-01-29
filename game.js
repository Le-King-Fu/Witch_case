// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const GAME_SPEED = 150; // ms between updates

// Letter sequence pattern
const PATTERN = 'pascal_';

// Game state
let canvas, ctx;
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let targetLetter = null;
let currentLetterIndex = 0;
let pascalCount = 0;
let score = 0;
let bestScore = 0;
let lastScore = 0;
let gameRunning = false;
let gameLoop = null;

// DOM elements
let currentScoreEl, bestScoreEl, lastScoreEl;
let startBtn;
let bonusOverlay, bonusImage, bonusText;

// Initialize game
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    currentScoreEl = document.getElementById('current-score');
    bestScoreEl = document.getElementById('best-score');
    lastScoreEl = document.getElementById('last-score');
    startBtn = document.getElementById('start-btn');
    bonusOverlay = document.getElementById('bonus-overlay');
    bonusImage = document.getElementById('bonus-image');
    bonusText = document.getElementById('bonus-text');

    // Load scores from localStorage
    bestScore = parseInt(localStorage.getItem('witchcase_bestScore')) || 0;
    lastScore = parseInt(localStorage.getItem('witchcase_lastScore')) || 0;
    updateScoreDisplay();

    // Event listeners
    startBtn.addEventListener('click', toggleGame);
    document.addEventListener('keydown', handleKeydown);

    // D-pad controls
    document.querySelectorAll('.d-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = btn.dataset.direction;
            setDirection(dir);
        });
        // Touch support
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const dir = btn.dataset.direction;
            setDirection(dir);
        });
    });

    // Initial draw
    draw();
}

function toggleGame() {
    if (gameRunning) {
        stopGame();
    } else {
        startGame();
    }
}

function startGame() {
    // Reset state
    snake = [{
        x: Math.floor(GRID_SIZE / 2),
        y: Math.floor(GRID_SIZE / 2),
        letter: 'P'
    }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    currentLetterIndex = 1; // Start at 'a' (index 1 of "pascal_")
    pascalCount = 0;
    score = 0;
    gameRunning = true;
    startBtn.textContent = 'Stop';

    updateScoreDisplay();
    spawnLetter();

    // Start game loop
    gameLoop = setInterval(update, GAME_SPEED);
}

function stopGame() {
    gameRunning = false;
    clearInterval(gameLoop);
    gameLoop = null;
    startBtn.textContent = 'Start';

    // Save scores
    if (score > 0) {
        lastScore = score;
        localStorage.setItem('witchcase_lastScore', lastScore);

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('witchcase_bestScore', bestScore);
        }
        updateScoreDisplay();
    }
}

function gameOver() {
    stopGame();
    // Flash effect
    ctx.fillStyle = 'rgba(233, 69, 96, 0.5)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function update() {
    // Apply next direction
    direction = { ...nextDirection };

    // Calculate new head position
    const head = snake[0];
    const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y,
        letter: head.letter
    };

    // Check wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE) {
        gameOver();
        return;
    }

    // Check self collision
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
            gameOver();
            return;
        }
    }

    // Check letter collection
    if (targetLetter && newHead.x === targetLetter.x && newHead.y === targetLetter.y) {
        collectLetter(newHead);
    } else {
        // Move snake (remove tail)
        snake.pop();
    }

    // Add new head
    snake.unshift(newHead);

    draw();
}

function collectLetter(position) {
    // Add letter to snake at the new position
    const letter = targetLetter.letter;
    snake.unshift({
        x: position.x,
        y: position.y,
        letter: letter
    });

    // Update score
    score += 100;

    // Check for bonuses
    checkBonuses();

    // Move to next letter
    currentLetterIndex = (currentLetterIndex + 1) % PATTERN.length;

    updateScoreDisplay();
    spawnLetter();
}

function checkBonuses() {
    // Build current snake string
    const snakeString = snake.map(s => s.letter).join('');

    // Count complete "Pascal" and "_pascal" patterns
    // Pattern starts with "P", then adds "ascal" to make "Pascal" (6 chars)
    // Then adds "_pascal" (7 chars each) for "Pascal_pascal", etc.

    const newPascalCount = countPascals(snakeString);

    if (newPascalCount > pascalCount) {
        if (newPascalCount === 1) {
            // First "Pascal" completed - small bonus
            score += 500;
            showBonus(true, 'Pascal!');
        } else {
            // Additional "_pascal" completed - big bonus
            score += 1000;
            showBonus(false, 'Snaaaaaaaake!');
        }
        pascalCount = newPascalCount;
    }
}

function countPascals(str) {
    // Check how many complete "Pascal" words we have
    // First one is "Pascal" (6 chars), subsequent are "_pascal" (7 chars each)

    if (str.length < 6) return 0;

    // Check if starts with "Pascal"
    if (str.substring(0, 6) !== 'Pascal') return 0;

    let count = 1;
    let pos = 6;

    // Check for additional "_pascal" patterns
    while (pos + 7 <= str.length) {
        if (str.substring(pos, pos + 7) === '_pascal') {
            count++;
            pos += 7;
        } else {
            break;
        }
    }

    return count;
}

function showBonus(showImage, text) {
    bonusOverlay.classList.remove('hidden');
    bonusText.textContent = text;

    if (showImage) {
        bonusImage.classList.remove('hidden');
    } else {
        bonusImage.classList.add('hidden');
    }

    // Hide after delay
    setTimeout(() => {
        bonusOverlay.classList.add('hidden');
        bonusImage.classList.add('hidden');
    }, 1500);
}

function spawnLetter() {
    const letter = PATTERN[currentLetterIndex];
    let x, y;
    let attempts = 0;

    // Find empty position
    do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
        attempts++;
    } while (isOccupied(x, y) && attempts < 100);

    targetLetter = { x, y, letter };
}

function isOccupied(x, y) {
    return snake.some(segment => segment.x === x && segment.y === y);
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid lines (subtle)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }

    // Draw target letter
    if (targetLetter) {
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow effect
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;

        ctx.fillText(
            targetLetter.letter,
            targetLetter.x * CELL_SIZE + CELL_SIZE / 2,
            targetLetter.y * CELL_SIZE + CELL_SIZE / 2
        );

        ctx.shadowBlur = 0;
    }

    // Draw snake
    snake.forEach((segment, index) => {
        const isHead = index === 0;

        // Background
        ctx.fillStyle = isHead ? '#e94560' : '#c73e54';
        ctx.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );

        // Letter
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            segment.letter,
            segment.x * CELL_SIZE + CELL_SIZE / 2,
            segment.y * CELL_SIZE + CELL_SIZE / 2
        );
    });
}

function handleKeydown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
        e.preventDefault();
    }

    switch (e.key) {
        case 'ArrowUp':
            setDirection('up');
            break;
        case 'ArrowDown':
            setDirection('down');
            break;
        case 'ArrowLeft':
            setDirection('left');
            break;
        case 'ArrowRight':
            setDirection('right');
            break;
        case ' ':
        case 'Space':
            toggleGame();
            break;
    }
}

function setDirection(dir) {
    if (!gameRunning) return;

    const newDir = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
    }[dir];

    if (!newDir) return;

    // Prevent 180-degree turns
    if (direction.x + newDir.x !== 0 || direction.y + newDir.y !== 0) {
        nextDirection = newDir;
    }
}

function updateScoreDisplay() {
    currentScoreEl.textContent = score;
    bestScoreEl.textContent = bestScore;
    lastScoreEl.textContent = lastScore;
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
