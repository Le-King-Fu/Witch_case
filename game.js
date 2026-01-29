// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const GAME_SPEED = 150; // ms between updates
const DECOY_COUNT = 4; // Number of wrong letters to display

// Letter sequence pattern
const PATTERN = 'pascal_';
const PASCAL_LETTERS = 'pascal_'; // Letters used for hard mode decoys
const ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz_';

// Difficulty levels: 'easy', 'medium', 'hard'
let difficulty = 'easy';

// Game state
let canvas, ctx;
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let letters = []; // Array of {x, y, letter, isTarget}
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
let difficultySelect;

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
    difficultySelect = document.getElementById('difficulty');

    // Load scores from localStorage
    bestScore = parseInt(localStorage.getItem('witchcase_bestScore')) || 0;
    lastScore = parseInt(localStorage.getItem('witchcase_lastScore')) || 0;
    difficulty = localStorage.getItem('witchcase_difficulty') || 'easy';

    if (difficultySelect) {
        difficultySelect.value = difficulty;
        difficultySelect.addEventListener('change', (e) => {
            difficulty = e.target.value;
            localStorage.setItem('witchcase_difficulty', difficulty);
        });
    }

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
    letters = [];
    gameRunning = true;
    startBtn.textContent = 'Stop';

    // Disable difficulty change during game
    if (difficultySelect) {
        difficultySelect.disabled = true;
    }

    updateScoreDisplay();
    spawnLetters();

    // Start game loop
    gameLoop = setInterval(update, GAME_SPEED);
}

function stopGame() {
    gameRunning = false;
    clearInterval(gameLoop);
    gameLoop = null;
    startBtn.textContent = 'Start';

    // Re-enable difficulty change
    if (difficultySelect) {
        difficultySelect.disabled = false;
    }

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
    const newHeadX = head.x + direction.x;
    const newHeadY = head.y + direction.y;

    // Check wall collision
    if (newHeadX < 0 || newHeadX >= GRID_SIZE ||
        newHeadY < 0 || newHeadY >= GRID_SIZE) {
        gameOver();
        return;
    }

    // Check self collision (exclude tail as it will move away)
    for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === newHeadX && snake[i].y === newHeadY) {
            gameOver();
            return;
        }
    }

    // Check letter collision
    const hitLetter = letters.find(l => l.x === newHeadX && l.y === newHeadY);
    let collected = false;

    if (hitLetter) {
        if (hitLetter.isTarget) {
            // Correct letter - collect it
            collectLetter(hitLetter, true);
        } else {
            // Wrong letter - collect but reset sequence to 'P'
            collectLetter(hitLetter, false);
        }
        collected = true;
    }

    // Store old tail position (needed if we collected a letter)
    const oldTailPos = { x: snake[snake.length - 1].x, y: snake[snake.length - 1].y };

    // Move snake: shift positions from tail to head
    // Each segment takes the position of the one in front of it
    for (let i = snake.length - 1; i > 0; i--) {
        snake[i].x = snake[i - 1].x;
        snake[i].y = snake[i - 1].y;
        // Letters stay with their segments!
    }

    // Move head to new position
    snake[0].x = newHeadX;
    snake[0].y = newHeadY;

    // If we collected a letter, add new segment at old tail position
    if (collected) {
        snake.push({
            x: oldTailPos.x,
            y: oldTailPos.y,
            letter: hitLetter.letter
        });
    }

    draw();
}

function collectLetter(letterObj, isCorrect) {
    // Update score
    score += 100;

    if (isCorrect) {
        // Check for bonuses (need to check AFTER adding the letter)
        // We'll check in a moment after the letter is added to snake
        setTimeout(() => checkBonuses(), 0);

        // Move to next letter in pattern
        currentLetterIndex = (currentLetterIndex + 1) % PATTERN.length;
    } else {
        // Wrong letter collected - reset to 'P'
        currentLetterIndex = 0;
    }

    updateScoreDisplay();
    spawnLetters();
}

function checkBonuses() {
    // Build current snake string (lowercase for case-insensitive comparison)
    const snakeString = snake.map(s => s.letter).join('');

    // Count complete "Pascal" and "_pascal" patterns (case-insensitive)
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
        updateScoreDisplay();
    }
}

function countPascals(str) {
    // Check how many complete "Pascal" words we have (case-insensitive)
    // First one is "Pascal" (6 chars), subsequent are "_pascal" (7 chars each)

    if (str.length < 6) return 0;

    // Case-insensitive check if starts with "Pascal"
    if (str.substring(0, 6).toLowerCase() !== 'pascal') return 0;

    let count = 1;
    let pos = 6;

    // Check for additional "_pascal" patterns (case-insensitive)
    while (pos + 7 <= str.length) {
        if (str.substring(pos, pos + 7).toLowerCase() === '_pascal') {
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

function spawnLetters() {
    letters = [];

    // Get the target letter
    // Index 0 = 'P' (uppercase for new sequence start), otherwise follow pattern
    let targetLetter;
    if (currentLetterIndex === 0) {
        targetLetter = 'P'; // Uppercase P to start a new sequence
    } else {
        targetLetter = PATTERN[currentLetterIndex];
    }

    // Spawn the correct target letter
    const targetPos = findEmptyPosition();
    letters.push({
        x: targetPos.x,
        y: targetPos.y,
        letter: targetLetter,
        isTarget: true
    });

    // Spawn decoy letters based on difficulty
    for (let i = 0; i < DECOY_COUNT; i++) {
        const pos = findEmptyPosition();
        if (pos) {
            let decoyLetter;

            if (difficulty === 'hard') {
                // Hard mode: decoys are only pascal_ letters
                do {
                    decoyLetter = PASCAL_LETTERS[Math.floor(Math.random() * PASCAL_LETTERS.length)];
                } while (decoyLetter.toLowerCase() === targetLetter.toLowerCase());
            } else {
                // Easy/Medium mode: decoys are random letters
                do {
                    decoyLetter = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
                } while (decoyLetter.toLowerCase() === targetLetter.toLowerCase());
            }

            letters.push({
                x: pos.x,
                y: pos.y,
                letter: decoyLetter,
                isTarget: false
            });
        }
    }
}

function findEmptyPosition() {
    let attempts = 0;
    let x, y;

    do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
        attempts++;
    } while (isOccupied(x, y) && attempts < 100);

    if (attempts >= 100) return null;
    return { x, y };
}

function isOccupied(x, y) {
    // Check snake
    if (snake.some(segment => segment.x === x && segment.y === y)) {
        return true;
    }
    // Check existing letters
    if (letters.some(letter => letter.x === x && letter.y === y)) {
        return true;
    }
    return false;
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

    // Draw letters
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    letters.forEach(letterObj => {
        // Color based on difficulty
        if (difficulty === 'easy') {
            // Easy: green for target, red for decoys
            if (letterObj.isTarget) {
                ctx.fillStyle = '#00ff88';
                ctx.shadowColor = '#00ff88';
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = '#ff6b6b';
                ctx.shadowColor = '#ff6b6b';
                ctx.shadowBlur = 5;
            }
        } else {
            // Medium & Hard: all letters same color (yellow/gold)
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 8;
        }

        ctx.fillText(
            letterObj.letter,
            letterObj.x * CELL_SIZE + CELL_SIZE / 2,
            letterObj.y * CELL_SIZE + CELL_SIZE / 2
        );

        ctx.shadowBlur = 0;
    });

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
