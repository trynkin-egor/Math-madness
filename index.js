document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreSpan = document.getElementById('scoreValue');
    const recordSpan = document.getElementById('recordValue');
    const startMenu = document.getElementById('startMenu');
    const modal = document.getElementById('gameOverModal');
    const modalMessage = document.getElementById('modalMessage');
    const questionZone = document.getElementById('questionZone');
    const algebraQuestion = document.getElementById('algebraQuestion');
    const answerInput = document.getElementById('answerInput');
    const submitAnswerBtn = document.getElementById('submitAnswerBtn');
    const restartBtn = document.getElementById('restartFromStartBtn');
    const solveBtn = document.getElementById('solveToContinueBtn');
    const mainMenuBtn = document.getElementById('mainMenuBtn');
    const playButton = document.getElementById('playButton');
    const settingsToggleBtn = document.getElementById('settingsToggleBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const menuBgSelect = document.getElementById('menuBgSelect');
    const menuSkinSelect = document.getElementById('menuSkinSelect');
    const BASE_W = 1050;
    const BASE_H = 650;
    let W = BASE_W, H = BASE_H;

    let BIRD_RADIUS = 22;
    const BIRD_START_X = 150;
    let GRAVITY = 0.28;
    let JUMP_FORCE = -5.8;
    let OBSTACLE_W = 55;
    const INVINCIBLE_DURATION = 25;

    let bird = { x: BIRD_START_X, y: H / 2, vy: 0, radius: BIRD_RADIUS };
    let skinColor = 'dark';
    let obstacles = [];
    let score = 0;
    let bestScore = 0;
    let gameActive = false;
    let isGameStarted = false;
    let animationId = null;
    let invincibleFrames = 0;
    let killerObstacleIndex = -1;
    let frameCounter = 0;
    let afterResolvePause = false;
    let currentDifficulty = 'medium';
    let currentSpeed = 3.5;
    let currentGap = 165;
    let spawnDelay = 100;
    const difficultySettings = {
        easy: { speed: 2.8, gap: 190, spawnDelay: 120, name: 'Медленная' },
        medium: { speed: 3.5, gap: 165, spawnDelay: 100, name: 'Средняя' },
        hard: { speed: 4.5, gap: 140, spawnDelay: 80, name: 'Быстрая' }
    };

    let bgColor = "#1a2a3a";

    const mathFormulas = [
        "E=mc²", "a²+b²=c²", "sin²α+cos²α=1",
        "∫ x² dx", "π ≈ 3.14159", "e = 2.71828",
        "√(a²+b²)", "∑(n²)", "lim f(x)",
        "x = [-b±√Δ]/2a", "ctg α * tg α = 1", "∂f/∂x"
    ];

    let currentEquation = { text: "", answer: 0 };

    function resizeCanvas() {
        const container = canvas.parentElement;
        const maxWidth = container.clientWidth - 40;
        const maxHeight = window.innerHeight - 120;
        const scale = Math.min(maxWidth / BASE_W, maxHeight / BASE_H, 1.2);
        let newWidth = BASE_W * scale;
        let newHeight = BASE_H * scale;
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
        canvas.width = BASE_W;
        canvas.height = BASE_H;
        W = BASE_W;
        H = BASE_H;
        bird.x = BIRD_START_X;
        bird.y = H / 2;
        bird.radius = BIRD_RADIUS;
        for (let obs of obstacles) {
            obs.width = OBSTACLE_W;
        }
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    function loadBestScore() {
        const saved = localStorage.getItem('mathMadnessBestScore');
        bestScore = saved ? parseInt(saved) : 0;
        updateBestScoreUI();
    }

    function saveBestScore() {
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('mathMadnessBestScore', bestScore);
            updateBestScoreUI();
        }
    }

    function updateBestScoreUI() {
        if (recordSpan) recordSpan.innerText = bestScore;
    }

    function updateScoreUI() {
        if (scoreSpan) scoreSpan.innerText = score;
    }

    function generateAlgebraProblem() {
        const a = Math.floor(Math.random() * 6) + 2;
        const b = Math.floor(Math.random() * 21) - 10;
        let xAns = Math.floor(Math.random() * 19) - 5;
        const c = a * xAns + b;
        const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
        const eqText = `${a}·x ${signB} = ${c}`;
        currentEquation = { text: eqText, answer: xAns };
        return { text: eqText, answer: xAns };
    }

    function applyDifficultyParameters() {
        const settings = difficultySettings[currentDifficulty];
        currentSpeed = settings.speed;
        currentGap = settings.gap;
        spawnDelay = settings.spawnDelay;
    }

    function setDifficulty(diff) {
        currentDifficulty = diff;
        applyDifficultyParameters();
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-diff-menu') === diff) {
                btn.classList.add('active');
            }
        });
    }

    function spawnObstacle() {
        const minGapFromTop = 80;
        const maxGapFromBottom = H - currentGap - 80;
        let topHeight = Math.min(
            Math.max(minGapFromTop, Math.random() * (maxGapFromBottom - minGapFromTop) + minGapFromTop),
            H - currentGap - 50
        );
        const bottomY = topHeight + currentGap;
        obstacles.push({
            x: W,
            topHeight: topHeight,
            bottomY: bottomY,
            width: OBSTACLE_W,
            passed: false,
            symbol: Math.random() > 0.7 ? "π" : "e"
        });
    }

    function updateObstacles() {
        for (let i = 0; i < obstacles.length; i++) {
            obstacles[i].x -= currentSpeed;
            if (!obstacles[i].passed && obstacles[i].x + OBSTACLE_W < bird.x) {
                obstacles[i].passed = true;
                score++;
                updateScoreUI();
                saveBestScore();
            }
        }
        obstacles = obstacles.filter(obs => obs.x + OBSTACLE_W > 0);
    }

    function updateBird() {
        if (!gameActive) return;
        bird.vy += GRAVITY;
        bird.y += bird.vy;

        if (bird.y - BIRD_RADIUS <= 0) {
            gameOver();
            return;
        }
        if (bird.y + BIRD_RADIUS >= H) {
            gameOver();
            return;
        }
    }

    function checkCollisions() {
        if (!gameActive || invincibleFrames > 0) {
            if (invincibleFrames > 0) invincibleFrames--;
            return false;
        }
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const topRect = { x: obs.x, y: 0, w: OBSTACLE_W, h: obs.topHeight };
            const bottomRect = { x: obs.x, y: obs.bottomY, w: OBSTACLE_W, h: H - obs.bottomY };
            const collide = (rect) => {
                const closestX = Math.max(rect.x, Math.min(bird.x, rect.x + rect.w));
                const closestY = Math.max(rect.y, Math.min(bird.y, rect.y + rect.h));
                const dx = bird.x - closestX;
                const dy = bird.y - closestY;
                return (dx * dx + dy * dy) < BIRD_RADIUS * BIRD_RADIUS;
            };
            if (collide(topRect) || collide(bottomRect)) {
                killerObstacleIndex = i;
                gameOver();
                return true;
            }
        }
        return false;
    }

    function handleSpawning() {
        if (!gameActive) return;
        frameCounter++;
        if (frameCounter >= spawnDelay) {
            frameCounter = 0;
            spawnObstacle();
            if (currentDifficulty === 'hard' && Math.random() < 0.2 && gameActive) {
                spawnObstacle();
            }
        }
    }

    function jump() {
        if (gameActive && !afterResolvePause) {
            bird.vy = JUMP_FORCE;
        }
    }

    function hideModal() {
        modal.style.visibility = 'hidden';
        questionZone.style.display = 'none';
        modalMessage.style.display = 'block';
        answerInput.value = '';
    }

    function showDeathModal() {
        if (!gameActive && !afterResolvePause) {
            modal.style.visibility = 'visible';
            modalMessage.style.display = 'block';
            questionZone.style.display = 'none';
            modalMessage.innerText = `💥 СТОЛКНОВЕНИЕ! 💥\nВаш счёт: ${score}`;
        }
    }

    function activateSolveMode() {
        const prob = generateAlgebraProblem();
        algebraQuestion.innerText = prob.text;
        modalMessage.style.display = 'none';
        questionZone.style.display = 'block';
        answerInput.value = '';
        answerInput.focus();
    }

    function checkSolution() {
        const userAnswer = parseFloat(answerInput.value);
        if (isNaN(userAnswer)) {
            alert("Введите число!");
            return;
        }
        if (Math.abs(userAnswer - currentEquation.answer) < 0.01) {
            if (killerObstacleIndex >= 0 && killerObstacleIndex < obstacles.length) {
                obstacles.splice(killerObstacleIndex, 1);
            }
            killerObstacleIndex = -1;
            invincibleFrames = INVINCIBLE_DURATION;
            hideModal();
            afterResolvePause = true;
            gameActive = false;
            setTimeout(() => {
                afterResolvePause = false;
                gameActive = true;
            }, 1000);
        } else {
            alert(`❌ Неверно! Ответ: ${currentEquation.answer}`);
            const newProb = generateAlgebraProblem();
            algebraQuestion.innerText = newProb.text;
            answerInput.value = '';
        }
    }

    function gameOver() {
        if (!gameActive) return;
        gameActive = false;
        saveBestScore();
        showDeathModal();
    }

    function fullReset() {
        applyDifficultyParameters();
        gameActive = true;
        afterResolvePause = false;
        score = 0;
        invincibleFrames = 0;
        killerObstacleIndex = -1;
        obstacles = [];
        bird.y = H / 2;
        bird.vy = 0;
        frameCounter = 0;
        updateScoreUI();
        hideModal();
    }

    function startGame() {
        bgColor = menuBgSelect.value;
        skinColor = menuSkinSelect.value;
        resizeCanvas();
        fullReset();
        startMenu.style.display = 'none';
        isGameStarted = true;
        if (!animationId) {
            gameLoop();
        }
    }

    function returnToMainMenu() {
        gameActive = false;
        isGameStarted = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        hideModal();
        startMenu.style.display = 'flex';
    }

    function drawBackground() {
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, bgColor);
        gradient.addColorStop(1, adjustColor(bgColor, -30));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        ctx.font = "bold 14px 'Courier New', monospace";
        for (let i = 0; i < mathFormulas.length; i++) {
            let x = (i * 87) % (W + 100) - 50;
            let y = (i * 73) % H;
            ctx.fillStyle = "#ffffff30";
            ctx.fillText(mathFormulas[i], x, y);
            ctx.fillStyle = "#aaccff40";
            ctx.fillText(mathFormulas[(i + 5) % mathFormulas.length], x + 45, y + 25);
        }
    }

    function adjustColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + percent));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }

    function drawBird() {
        ctx.save();
        const calcW = BIRD_RADIUS * 1.8;
        const calcH = BIRD_RADIUS * 2.2;
        const calcX = bird.x - calcW / 2;
        const calcY = bird.y - calcH / 2;

        if (skinColor === 'dark') {
            ctx.fillStyle = "#3a3f4a";
            ctx.strokeStyle = "#2c2f36";
            ctx.fillStyle = "#e6f7ff";
            ctx.fillStyle = "#000";
            ctx.fillStyle = "#c0c4cc";
            ctx.fillStyle = "#1a1a1a";
            ctx.fillStyle = "#f5a623";
        } else {
            ctx.fillStyle = "#f5e6c8";
            ctx.strokeStyle = "#d4b88c";
            ctx.fillStyle = "#fff8e7";
            ctx.fillStyle = "#553b1f";
            ctx.fillStyle = "#e0d6c0";
            ctx.fillStyle = "#3e2a1a";
            ctx.fillStyle = "#dd8844";
        }

        ctx.beginPath();
        ctx.roundRect(calcX, calcY, calcW, calcH, 8);
        if (skinColor === 'dark') ctx.fillStyle = "#3a3f4a";
        else ctx.fillStyle = "#f5e6c8";
        ctx.fill();
        if (skinColor === 'dark') ctx.strokeStyle = "#2c2f36";
        else ctx.strokeStyle = "#d4b88c";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const dispW = calcW * 0.7;
        const dispH = calcH * 0.25;
        const dispX = calcX + (calcW - dispW) / 2;
        const dispY = calcY + 6;
        if (skinColor === 'dark') ctx.fillStyle = "#e6f7ff";
        else ctx.fillStyle = "#fff8e7";
        ctx.fillRect(dispX, dispY, dispW, dispH);
        if (skinColor === 'dark') ctx.fillStyle = "#000";
        else ctx.fillStyle = "#553b1f";
        ctx.font = `bold ${Math.floor(dispH * 0.6)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText("88:88", dispX + dispW / 2, dispY + dispH * 0.75);

        const btnW = calcW * 0.2;
        const btnH = calcH * 0.12;
        const startX = calcX + calcW * 0.1;
        const startY = dispY + dispH + 6;
        const gapX = calcW * 0.07;
        const gapY = 4;
        const buttonSymbols = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

        ctx.font = `${Math.floor(btnH * 0.7)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < buttonSymbols.length; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const btnX = startX + col * (btnW + gapX);
            const btnY = startY + row * (btnH + gapY);
            if (skinColor === 'dark') ctx.fillStyle = "#c0c4cc";
            else ctx.fillStyle = "#e0d6c0";
            ctx.fillRect(btnX, btnY, btnW, btnH);
            if (skinColor === 'dark') ctx.fillStyle = "#1a1a1a";
            else ctx.fillStyle = "#3e2a1a";
            ctx.fillText(buttonSymbols[i], btnX + btnW / 2, btnY + btnH / 2);
        }
    }

    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.moveTo(x+r, y);
            this.lineTo(x+w-r, y);
            this.quadraticCurveTo(x+w, y, x+w, y+r);
            this.lineTo(x+w, y+h-r);
            this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
            this.lineTo(x+r, y+h);
            this.quadraticCurveTo(x, y+h, x, y+h-r);
            this.lineTo(x, y+r);
            this.quadraticCurveTo(x, y, x+r, y);
            return this;
        };
    }

    function drawObstacles() {
        obstacles.forEach(obs => {
            const centerX = obs.x + obs.width / 2;
            const topCenterY = obs.topHeight - 20;
            const bottomCenterY = obs.bottomY + 30;
            ctx.font = `bold 52px 'Courier New', monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            for (let yPos of [topCenterY, bottomCenterY]) {
                const gradient = ctx.createLinearGradient(obs.x, yPos - 20, obs.x + obs.width, yPos + 20);
                gradient.addColorStop(0, "#FF5733");
                gradient.addColorStop(1, "#C70039");
                ctx.fillStyle = gradient;
                ctx.fillText(obs.symbol, centerX, yPos);
                ctx.fillStyle = "#FFD700";
                ctx.fillText(obs.symbol, centerX - 2, yPos - 2);
            }
        });
    }

    function gameLoop() {
        if (!isGameStarted) return;
        drawBackground();
        drawObstacles();
        drawBird();
        if (gameActive && !afterResolvePause) {
            updateBird();
            handleSpawning();
            updateObstacles();
            checkCollisions();
        }
        animationId = requestAnimationFrame(gameLoop);
    }

    function handleKeydown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            jump();
        }
        if (e.key === 'Enter' && questionZone.style.display === 'block') {
            e.preventDefault();
            checkSolution();
        }
    }

    function handleCanvasClick() {
        jump();
    }

    function setupMenuHandlers() {
        settingsToggleBtn.addEventListener('click', function () {
            const menuCard = document.querySelector('.menu-card');
            menuCard.classList.toggle('settings-open');
            if (settingsPanel.style.display === 'none' || settingsPanel.style.display === '') {
                settingsPanel.style.display = 'block';
            } else {
                settingsPanel.style.display = 'none';
            }
        });
        document.querySelectorAll('.diff-menu-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const diff = this.getAttribute('data-diff-menu');
                setDifficulty(diff);
            });
        });
        menuBgSelect.addEventListener('change', function () {
            bgColor = this.value;
        });
        menuSkinSelect.addEventListener('change', function () {
            skinColor = this.value;
        });
    }

    window.toggleTheme = function() {
        document.body.classList.toggle('light-theme');
        localStorage.setItem('game-theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    };

    function initTheme() {
        const saved = localStorage.getItem('game-theme');
        if (saved === 'light') document.body.classList.add('light-theme');
        else if (saved === 'dark') document.body.classList.remove('light-theme');
        else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.body.classList.add('light-theme');
    }

    function init() {
        loadBestScore();
        applyDifficultyParameters();
        setupMenuHandlers();
        playButton.addEventListener('click', startGame);
        restartBtn.addEventListener('click', () => {
            hideModal();
            fullReset();
        });
        solveBtn.addEventListener('click', activateSolveMode);
        mainMenuBtn.addEventListener('click', returnToMainMenu);
        submitAnswerBtn.addEventListener('click', checkSolution);
        document.addEventListener('keydown', handleKeydown);
        canvas.addEventListener('click', handleCanvasClick);
        modal.style.visibility = 'hidden';
        settingsPanel.style.display = 'none';
        initTheme();
        resizeCanvas();
    }

    init();
});