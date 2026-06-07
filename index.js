document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            return this;
        };
    }
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
    let settingsToggleBtn = document.getElementById('settingsToggleBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const menuBgSelect = document.getElementById('menuBgSelect');
    const menuSkinSelect = document.getElementById('menuSkinSelect');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const bubbleContainer = document.getElementById('bubbleContainer');
    const showStatsBtn = document.getElementById('showStatsBtn');
    const statsModal = document.getElementById('statsModal');
    const closeStatsBtn = document.getElementById('closeStatsBtn');
    let bubbleInterval = null;

    function setGameStatsVisible(visible) {
        const elements = [scoreSpan, recordSpan, showStatsBtn];
        elements.forEach(el => {
            if (el) {
                el.style.display = visible ? '' : 'none';
            }
        });
    }

    function createBubble() {
        if (!gameActive || isPaused || !isGameStarted) return;

        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        bubble.style.left = Math.random() * maxX + 'px';
        bubble.style.top = Math.random() * maxY + 'px';

        const autoTimer = setTimeout(() => {
            if (bubble && bubble.parentNode) bubble.remove();
        }, 3000);
        bubble.autoRemoveTimer = autoTimer;

        bubble.addEventListener('click', () => popSingleBubble(bubble));

        bubbleContainer.appendChild(bubble);
    }

    function popSingleBubble(bubble) {
        if (!gameActive || isPaused || !isGameStarted) return;
        if (!bubble || !bubble.parentNode) return;
        if (bubble.autoRemoveTimer) clearTimeout(bubble.autoRemoveTimer);
        bubble.remove();
        score += 5;
        updateScoreUI();
        saveBestScore();
    }

    function popAllBubbles() {
        if (!gameActive || isPaused || !isGameStarted) return;
        const bubbles = document.querySelectorAll('.bubble');
        if (bubbles.length === 0) return;

        for (let bubble of bubbles) {
            if (bubble.autoRemoveTimer) clearTimeout(bubble.autoRemoveTimer);
            bubble.remove();
            score += 5;
        }
        updateScoreUI();
        saveBestScore();
    }

    function startBubbleGeneration() {
        if (bubbleInterval) clearInterval(bubbleInterval);
        bubbleInterval = setInterval(() => {
            if (gameActive && !isPaused && isGameStarted) {
                createBubble();
            }
        }, 4500);
    }

    function stopBubbleGeneration() {
        if (bubbleInterval) {
            clearInterval(bubbleInterval);
            bubbleInterval = null;
        }
        const bubbles = document.querySelectorAll('.bubble');
        bubbles.forEach(b => {
            if (b.autoRemoveTimer) clearTimeout(b.autoRemoveTimer);
            b.remove();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyO') {
            e.preventDefault();
            popAllBubbles();
        }
    });
    const BASE_W = 1050;
    const BASE_H = 650;

    let W = BASE_W, H = BASE_H;

    let BIRD_RADIUS = 22;
    const BIRD_START_X = 150;
    let GRAVITY = 0.28;
    let JUMP_FORCE = -5.8;
    let OBSTACLE_W = 55;
    const INVINCIBLE_DURATION = 25;

    let obstacles = [];
    let score = 0;
    let bestScore = 0;
    let gameActive = false;
    let isGameStarted = false;
    let animationId = null;
    let killerObstacleIndex = -1;
    let frameCounter = 0;
    let afterResolvePause = false;
    let isPaused = false;
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
    let skinColor = 'dark';

    const mathFormulas = [
        "E=mc²", "a²+b²=c²", "sin²α+cos²α=1", "∫ x² dx", "π ≈ 3.14159",
        "e = 2.71828", "√(a²+b²)", "∑(n²)", "lim f(x)", "x = [-b±√Δ]/2a",
        "ctg α * tg α = 1", "∂f/∂x", "logₐ(b)=ln(b)/ln(a)", "i² = -1",
        "F = ma", "E = hν", "PV = nRT", "sin²x+cos²x=1",
        "∫e^x dx = e^x", "(a+b)²=a²+2ab+b²", "y = kx + b"
    ];

    let currentEquation = { text: "", answer: 0 };
    let chalkFormulas = [];

    let gameScores = [];
    let chartInstance = null;

    class Bird {
        constructor(x, y, radius, gravity, jumpForce, canvasHeight) {
            this.x = x;
            this.y = y;
            this.vy = 0;
            this.radius = radius;
            this.gravity = gravity;
            this.jumpForce = jumpForce;
            this.canvasHeight = canvasHeight;
            this.invincibleFrames = 0;
        }

        update() {
            this.vy += this.gravity;
            this.y += this.vy;
        }

        jump() {
            this.vy = this.jumpForce;
        }

        isAlive() {
            return (this.y - this.radius > 0 && this.y + this.radius < this.canvasHeight);
        }

        reset(y) {
            this.y = y;
            this.vy = 0;
            this.invincibleFrames = 0;
        }

        setInvincible(duration) {
            this.invincibleFrames = duration;
        }

        decrementInvincible() {
            if (this.invincibleFrames > 0) this.invincibleFrames--;
        }

        draw(ctx, skinColor) {
            ctx.save();
            const calcW = this.radius * 1.8;
            const calcH = this.radius * 2.2;
            const calcX = this.x - calcW / 2;
            const calcY = this.y - calcH / 2;

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
            ctx.restore();
        }
    }

    let playerBird = null;

    function togglePause() {
        if (!isGameStarted || !gameActive || afterResolvePause) return;
        isPaused = !isPaused;
    }

    function generateRandomPositions() {
        chalkFormulas = [];
        const cols = 8;
        const rows = 5;
        const cellW = W / cols;
        const cellH = H / rows;
        let index = 0;
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const formula = mathFormulas[index % mathFormulas.length];
                const cellX = i * cellW + cellW / 2;
                const cellY = j * cellH + cellH / 2;
                const randomOffsetX = (Math.random() - 0.5) * cellW * 0.4;
                const randomOffsetY = (Math.random() - 0.5) * cellH * 0.4;
                chalkFormulas.push({
                    text: formula,
                    x: cellX + randomOffsetX,
                    y: cellY + randomOffsetY,
                    angle: (Math.random() - 0.5) * 0.25,
                    fontSize: 14 + Math.random() * 12,
                });
                index++;
            }
        }
    }

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
        if (playerBird) {
            playerBird.x = BIRD_START_X;
            playerBird.y = H / 2;
            playerBird.radius = BIRD_RADIUS;
            playerBird.canvasHeight = H;
        }
        for (let obs of obstacles) {
            obs.width = OBSTACLE_W;
        }
        generateRandomPositions();
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
            btn.classList.remove('active', 'button--difficulty-active');
            if (btn.getAttribute('data-diff-menu') === diff) {
                btn.classList.add('active', 'button--difficulty-active');
            }
        });
    }

    function spawnObstacle() {
        if (obstacles.length > 0) {
            const lastObstacle = obstacles[obstacles.length - 1];
            const minDistance = OBSTACLE_W + 120;
            if (lastObstacle.x + lastObstacle.width > W - minDistance) {
                return;
            }
        }
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
            if (!obstacles[i].passed && obstacles[i].x + OBSTACLE_W < playerBird.x) {
                obstacles[i].passed = true;
                score++;
                updateScoreUI();
                saveBestScore();
            }
        }
        obstacles = obstacles.filter(obs => obs.x + OBSTACLE_W > 0);
    }

    function checkCollisions() {
        if (!gameActive || playerBird.invincibleFrames > 0) {
            if (playerBird) playerBird.decrementInvincible();
            return false;
        }
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const topRect = { x: obs.x, y: 0, w: OBSTACLE_W, h: obs.topHeight };
            const bottomRect = { x: obs.x, y: obs.bottomY, w: OBSTACLE_W, h: H - obs.bottomY };
            const collide = (rect) => {
                const closestX = Math.max(rect.x, Math.min(playerBird.x, rect.x + rect.w));
                const closestY = Math.max(rect.y, Math.min(playerBird.y, rect.y + rect.h));
                const dx = playerBird.x - closestX;
                const dy = playerBird.y - closestY;
                return (dx * dx + dy * dy) < playerBird.radius * playerBird.radius;
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
        if (gameActive && !afterResolvePause && !isPaused && playerBird) {
            playerBird.jump();
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
            alert("❌ Введите число!");
            return;
        }
        if (Math.abs(userAnswer - currentEquation.answer) < 0.01) {
            if (killerObstacleIndex >= 0 && killerObstacleIndex < obstacles.length) {
                obstacles.splice(killerObstacleIndex, 1);
            }
            killerObstacleIndex = -1;
            if (playerBird) playerBird.setInvincible(INVINCIBLE_DURATION);
            hideModal();
            afterResolvePause = true;
            gameActive = false;
            setTimeout(() => {
                if (playerBird) {
                    playerBird.y = H / 2;
                    playerBird.vy = 0;
                }
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
        addGameResult(score);
        showDeathModal();
    }

    function fullReset() {
        applyDifficultyParameters();
        gameActive = true;
        afterResolvePause = false;
        score = 0;
        killerObstacleIndex = -1;
        obstacles = [];
        frameCounter = 0;
        isPaused = false;
        if (playerBird) playerBird.reset(H / 2);
        updateScoreUI();
        hideModal();
    }

    function startGame() {
        bgColor = menuBgSelect.value;
        skinColor = menuSkinSelect.value;
        resizeCanvas();
        if (!playerBird) {
            playerBird = new Bird(BIRD_START_X, H / 2, BIRD_RADIUS, GRAVITY, JUMP_FORCE, H);
        } else {
            playerBird.reset(H / 2);
            playerBird.radius = BIRD_RADIUS;
            playerBird.canvasHeight = H;
            playerBird.gravity = GRAVITY;
            playerBird.jumpForce = JUMP_FORCE;
        }
        fullReset();
        startMenu.style.display = 'none';
        isGameStarted = true;
        isPaused = false;
        if (!animationId) {
            gameLoop();
        }
        startBubbleGeneration();
        setGameStatsVisible(true);
    }

    function returnToMainMenu() {
        gameActive = false;
        isGameStarted = false;
        isPaused = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        hideModal();
        startMenu.style.display = 'flex';
        setGameStatsVisible(false);
    }

    function drawBackground() {
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, bgColor);
        gradient.addColorStop(1, adjustColor(bgColor, -30));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        const step = 50;
        for (let x = 0; x < W; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = 0; y < H; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        ctx.restore();

        for (let f of chalkFormulas) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.angle);
            ctx.font = `bold ${f.fontSize}px 'Courier New', monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.fillText(f.text, 0, 0);
            ctx.restore();
        }
    }

    function drawPauseOverlay() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.font = `bold ${Math.min(60, W / 8)}px 'Courier New', monospace`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⏸ ПАУЗА", W / 2, H / 2);
        ctx.font = `20px monospace`;
        ctx.fillStyle = "#cccccc";
        ctx.fillText("Нажмите P или ESC для продолжения", W / 2, H / 2 + 60);
    }

    function adjustColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + percent));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
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
        if (playerBird) playerBird.draw(ctx, skinColor);

        if (!isPaused && gameActive && !afterResolvePause && playerBird) {
            playerBird.update();
            if (!playerBird.isAlive()) gameOver();
            handleSpawning();
            updateObstacles();
            checkCollisions();
        } else if (isPaused && gameActive && !afterResolvePause) {
            drawPauseOverlay();
        }

        animationId = requestAnimationFrame(gameLoop);
    }

    function handleKeydown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            if (!isPaused) jump();
        }
        if (e.key === 'Enter' && questionZone.style.display === 'block') {
            e.preventDefault();
            checkSolution();
        }
        if (e.code === 'KeyP' || e.code === 'Escape') {
            e.preventDefault();
            togglePause();
        }
    }

    function handleCanvasClick() {
        if (!isPaused) jump();
    }

    function loadGameHistory() {
        const saved = localStorage.getItem('mathMadnessHistory');
        if (saved) {
            try {
                gameScores = JSON.parse(saved);
            } catch (e) { gameScores = []; }
        }
        if (!Array.isArray(gameScores)) gameScores = [];
        if (gameScores.length > 10) gameScores = gameScores.slice(-10);
    }

    function saveGameHistory() {
        localStorage.setItem('mathMadnessHistory', JSON.stringify(gameScores.slice(-10)));
    }

    function addGameResult(finalScore) {
        gameScores.push({
            date: new Date().toLocaleTimeString(),
            score: finalScore,
            difficulty: currentDifficulty
        });
        saveGameHistory();
        if (chartInstance && statsModal && statsModal.style.visibility === 'visible') {
            renderChart();
        }
    }

    function renderChart() {
        const chartCanvas = document.getElementById('statsChart');
        if (!chartCanvas) return;
        const ctxChart = chartCanvas.getContext('2d');
        if (!ctxChart) return;

        const lastGames = gameScores.slice(-10);
        const labels = lastGames.map((g, idx) => `Игра ${idx + 1}`);
        const data = lastGames.map(g => g.score);
        const isLight = document.body.classList.contains('light-theme');
        const barColor = isLight ? 'rgba(54, 162, 235, 0.7)' : 'rgba(75, 192, 192, 0.7)';
        const borderColor = isLight ? 'rgba(54, 162, 235, 1)' : 'rgba(75, 192, 192, 1)';

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctxChart, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Счёт',
                    data: data,
                    backgroundColor: barColor,
                    borderColor: borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Очки' } },
                    x: { title: { display: true, text: 'Игры' } }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const idx = context.dataIndex;
                                const game = lastGames[idx];
                                return `Счёт: ${game.score} (${game.difficulty})`;
                            }
                        }
                    }
                }
            }
        });
    }

    function setupMenuHandlers() {
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                settingsModal.classList.remove('modal--visible');
            });
        }

        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) settingsModal.classList.remove('modal--visible');
            });
        }

        document.querySelectorAll('.diff-menu-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const diff = this.getAttribute('data-diff-menu');
                setDifficulty(diff);
            });
        });

        if (menuBgSelect) {
            menuBgSelect.addEventListener('change', function () {
                bgColor = this.value;
            });
        }

        if (menuSkinSelect) {
            menuSkinSelect.addEventListener('change', function () {
                skinColor = this.value;
            });
        }

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', function () {
                document.body.classList.toggle('light-theme');
                const isLight = document.body.classList.contains('light-theme');
                localStorage.setItem('game-theme', isLight ? 'light' : 'dark');
                if (chartInstance && statsModal && statsModal.style.visibility === 'visible') {
                    renderChart();
                }
            });
        }

        if (showStatsBtn) {
            showStatsBtn.addEventListener('click', () => {
                renderChart();
                statsModal.style.visibility = 'visible';
            });
        }
        if (closeStatsBtn) {
            closeStatsBtn.addEventListener('click', () => {
                statsModal.style.visibility = 'hidden';
            });
        }
        if (statsModal) {
            statsModal.addEventListener('click', (e) => {
                if (e.target === statsModal) statsModal.style.visibility = 'hidden';
            });
        }
    }

    function initTheme() {
        const saved = localStorage.getItem('game-theme');
        if (saved === 'light') document.body.classList.add('light-theme');
        else if (saved === 'dark') document.body.classList.remove('light-theme');
        else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.body.classList.add('light-theme');
    }

    function init() {
        loadBestScore();
        loadGameHistory();
        applyDifficultyParameters();
        setupMenuHandlers();

        if (settingsToggleBtn) {
            settingsToggleBtn.removeEventListener('click', null);
            settingsToggleBtn.onclick = null;
            const newBtn = settingsToggleBtn.cloneNode(true);
            settingsToggleBtn.parentNode.replaceChild(newBtn, settingsToggleBtn);
            settingsToggleBtn = newBtn;
            settingsToggleBtn.addEventListener('click', function () {
                if (adviceDisplay && adviceDisplay.style.display === 'block') {
                    adviceDisplay.style.display = 'none';
                    if (window.adviceTimeout) clearTimeout(window.adviceTimeout);
                }
                if (settingsModal) settingsModal.classList.add('modal--visible');
            });
        }

        if (playButton) playButton.addEventListener('click', startGame);
        if (restartBtn) restartBtn.addEventListener('click', () => {
            hideModal();
            fullReset();
        });
        if (solveBtn) solveBtn.addEventListener('click', activateSolveMode);
        if (mainMenuBtn) mainMenuBtn.addEventListener('click', returnToMainMenu);
        if (submitAnswerBtn) submitAnswerBtn.addEventListener('click', checkSolution);
        document.addEventListener('keydown', handleKeydown);
        canvas.addEventListener('click', handleCanvasClick);
        if (modal) modal.style.visibility = 'hidden';
        initTheme();
        resizeCanvas();
        setGameStatsVisible(false);
    }

    const adviceBtn = document.getElementById('adviceBtn');
    const hideAdviceBtn = document.getElementById('hideAdviceBtn');
    const adviceDisplay = document.getElementById('adviceDisplay');
    window.adviceTimeout = null;

    async function translateText(text, targetLang = 'ru') {
        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.responseData.translatedText;
        } catch (error) {
            console.warn('Ошибка перевода:', error);
            return text;
        }
    }

    async function fetchRandomAdvice() {
        if (!adviceDisplay) return;

        adviceDisplay.style.display = 'block';
        adviceDisplay.innerHTML = '⏳ Загрузка совета...';

        try {
            const response = await fetch('https://api.adviceslip.com/advice');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            let adviceText = data.slip.advice;

            adviceDisplay.innerHTML = '🔄 Перевод...';
            const translatedText = await translateText(adviceText);

            adviceDisplay.innerHTML = `💬 «${translatedText}»`;
            if (window.adviceTimeout) clearTimeout(window.adviceTimeout);
            window.adviceTimeout = setTimeout(() => {
                if (adviceDisplay) adviceDisplay.style.display = 'none';
            }, 8000);
        } catch (error) {
            console.warn('Ошибка загрузки совета:', error);
            adviceDisplay.innerHTML = '❌ Не удалось загрузить совет. Попробуйте позже.';
            if (window.adviceTimeout) clearTimeout(window.adviceTimeout);
            window.adviceTimeout = setTimeout(() => {
                if (adviceDisplay) adviceDisplay.style.display = 'none';
            }, 3000);
        }
    }

    function hideAdvice() {
        if (adviceDisplay) {
            adviceDisplay.style.display = 'none';
            if (window.adviceTimeout) clearTimeout(window.adviceTimeout);
        }
    }

    if (adviceBtn) {
        adviceBtn.addEventListener('click', fetchRandomAdvice);
    }
    if (hideAdviceBtn) {
        hideAdviceBtn.addEventListener('click', hideAdvice);
    }
    init();
});