const gameVersion = "1.0";

const audioPlayer = new AudioPlayer();
audioPlayer.preloadMusic(['bgm1']);
audioPlayer.preloadSFX(['star', 'explosion1', 'gameover', 'shieldGain']);
// audioPlayer.preloadBGS(['bgs1']);
// audioPlayer.playSFX('sfx1');
// audioPlayer.playBGS('bgs1');
const shipImages = [new Image(), new Image()];
shipImages[0].src = 'ship0.png';
shipImages[1].src = 'ship1.png';

const playerShieldImage = new Image();
playerShieldImage.src = 'shield.png';

const playerShieldGlowImage = new Image();
playerShieldGlowImage.src = 'shieldGlow.png';

let fps = 0; // Store the current FPS
let fpsCounter = 0; // Counts the number of frames in a given second
let fpsLastTime = performance.now(); // Track the last time we calculated the FPS
let fpsTimeInterval = 1000; // Calculate FPS every 1000 ms (1 second)

let progressionSpeed = 0.00005; // How much faster the game gets as the game progresses


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvasToWindow() {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvasToWindow();
addJoystickToCanvas(canvas);

let player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    radius: 35,
    scale: 0.4,
    width: 30,
    height: 30,
    speed: 5,
    angle: 0,
    shields: 3,
    isImmortal: false,
    immortalTime: 0,
    hasShield: false,
    selectedShipImage: shipImages[0]
};

player.selectedShipImage = shipImages[Math.floor(Math.random() * shipImages.length)];

let obstacles = [];
let stars = [];
let particles = [];
let shields = [];
let goldStars = [];
let score = 0;
let isGameOver = false;
let time = 0;
let timeScale = 1;
const keysPressed = {};

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y); // Move the context to the player's position
    ctx.rotate(player.angle); // Rotate the context to match the player's angle

    // Apply transparency effect if the player is immortal and doesn't have a shield
    if (player.isImmortal && !player.hasShield) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5; // Flashing effect
    }

    // Assuming the player's image is preloaded and stored in `player.selectedShipImage`
    const img = player.selectedShipImage;

    // Scale the width and height of the image based on the player's scale factor
    const imgWidth = img.width * player.scale;
    const imgHeight = img.height * player.scale;

    // Draw the player's image at the center, taking into account the scaled size
    ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);

    ctx.restore(); // Restore the context's state to avoid affecting other drawings
    ctx.globalAlpha = 1.0; // Reset transparency
}

function createParticleExplosion(x, y, particleCount = 150, radiusMod = 2, lifetimeMod = 1.5, explosiveForce = 5000, colors = ['#FF4500', '#FFD700', '#FF6347', '#FFFFFF']) {
    for (let i = 0; i < particleCount; i++) {
        let angle = Math.random() * Math.PI * 2; // Random angle for direction
        let radius = Math.random() * radiusMod; // Random initial offset from center (explosion point)
        let speed = explosiveForce * (0.5 + Math.random() * 0.5); // Random speed for each particle
        let lifespan = 1 * lifetimeMod; // Adjust lifespan by the mod variable

        // Calculate particle position based on radius and angle
        let particleX = x + Math.cos(angle) * radius;
        let particleY = y + Math.sin(angle) * radius;

        // Pick a random color from the provided color array
        let color = colors[Math.floor(Math.random() * colors.length)];
        let size = Math.random() * 3 + 2; // Random size for the particles

        // Create particle with calculated values and push it to the particles array
        let direction = angle; // Direction is the angle away from the explosion point
        let particle = new Particle(particleX, particleY, color, size, lifespan, direction);
        particle.speed = speed; // Assign the calculated speed
        particles.push(particle); // Add the particle to the array
    }
}
function createParticles() {
    let intensity = keysPressed['ArrowUp'] || keysPressed['w'] ? 10 : keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['ArrowRight'] || keysPressed['d'] ? 5 : 2;
    intensity *= timeScale * timeScale;
    for (let i = 0; i < intensity; i++) {
        let color = ['#00FFFF', '#0000FF', '#800080'][Math.floor(Math.random() * 3)];
        let size = Math.random() * 2 + 1;
        let xOffset = Math.random() * 10 - 5;
        let direction = Math.PI / 2 + (Math.random() - 0.5) * 0.2; // General downward direction with slight randomness
        particles.push(new Particle(player.x + xOffset, player.y + 15, color, size, 0.5, direction));
    }
}

function updateParticles() {
    particles = particles.filter(particle => particle.isAlive());
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
}

function createObstacle() {
    const x = Math.random() * (canvas.width - 30);
    const y = -30;
    const obstacle = new Obstacle(x, y);
    obstacles.push(obstacle);
}

function createShield() {
    const x = Math.random() * (canvas.width - 30);
    const y = -30;
    shields.push(new Shield(x, y));
}

function createGoldStar() {
    const x = Math.random() * (canvas.width - 30);
    const y = -30;
    goldStars.push(new GoldStar(x, y));
}

function drawShields() {
    shields.forEach(shield => {
        shield.draw();
        shield.update();
    });
}

function drawGoldStars() {
    goldStars.forEach(star => {
        star.draw();
        star.update();
    });
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        obstacle.draw();
        obstacle.update();
    });
}

function drawShieldCircle() {
    if (player.hasShield) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(player.x, player.y, 40, 0, Math.PI * 2); // Circle with radius 40
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.restore();
    }
}
let isMainMenu = true;
let selectedMenuOption = 0; // 0 for "Start Game", 1 for "Options"
let titleOpacity = 0; // Opacity for fading effect
let titleY = -100; // Starting Y position for the title (off-screen)
let titleSpeed = 1.5; // Speed for panning down the title
let menuOptions = ["Start Game", "Options", "Leaderboard"];

// Function to draw the main menu
function drawMainMenu() {
    drawBackground(); // Draw stars background

    // Animate the title panning down and fading in
    if (titleY < canvas.height / 4) {
        titleY += titleSpeed; // Move the title down
    }
    if (titleOpacity < 1) {
        titleOpacity += 0.02; // Increase opacity for fade-in
    }

    ctx.save();
    ctx.globalAlpha = titleOpacity; // Apply the opacity for the title
    writeText("Asteroider", "top-center", { x: 0, y: titleY }, 60, "white");
    ctx.restore();

    // Draw the menu options with dynamic positioning
    for (let i = 0; i < menuOptions.length; i++) {
        writeText(menuOptions[i], "center", { x: 0, y: i * 60 }, 40, selectedMenuOption === i ? "yellow" : "white");
    }
}

// Handle menu selection based on current option
function handleMenuSelection() {
    if (selectedMenuOption === 0) {
        startGame(); // Start the game
        isMainMenu = false; // Exit the menu
    } else if (selectedMenuOption === 1) {
        // Handle options menu (not implemented here)
        console.log("Options selected");
    } else if (selectedMenuOption === 2) {
        // Handle leaderboard (not implemented here)
        console.log("Leaderboard selected");
    }
}
// Mouse click handling for menu selection
canvas.addEventListener('click', function (event) {
    if (isMainMenu) {
        const clickX = event.clientX;
        const clickY = event.clientY;

        // Check if any of the menu options were clicked
        for (let i = 0; i < menuOptions.length; i++) {
            const optionY = canvas.height / 2 + i * 60;
            if (clickY > optionY - 20 && clickY < optionY + 20) {
                selectedMenuOption = i;
                handleMenuSelection();
            }
        }
    }
});
// Event listener for keyboard menu navigation
document.addEventListener('keydown', (e) => {
    if (isMainMenu) {
        if (e.key === 'ArrowUp' || e.key === 'w') {
            selectedMenuOption = (selectedMenuOption - 1 + menuOptions.length) % menuOptions.length; // Navigate up
        } else if (e.key === 'ArrowDown' || e.key === 's') {
            selectedMenuOption = (selectedMenuOption + 1) % menuOptions.length; // Navigate down
        } else if (e.key === 'Enter') {
            handleMenuSelection();
        }
    }
});
function checkCollision() {
    obstacles.forEach((obstacle, index) => {
        if (obstacle.checkCollision(player)) {
            console.log("collision")
            handleCollision(obstacle, index); // Handle the obstacle collision
        }
    });

    shields.forEach((shield, index) => {
        const distX = shield.x - player.x;
        const distY = shield.y - player.y;

        const distance = Math.sqrt(distX * distX + distY * distY);
        if (distance < 110) {
            createParticleExplosion(shield.x, shield.y, 100, 0.5, 0.5, 2, ['#00FFFF', '#00FFFF', '#00FFFF', '#0000FF']);
            handleShieldPickup(index);
        }
    });

    goldStars.forEach((star, index) => {
        const distX = star.x - player.x;
        const distY = star.y - player.y;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < 80) {
            createParticleExplosion(star.x, star.y, 100, 1, 0.5, 2, ['#FFD700', '#FFD700', '#FFD700', '#FF4500']);
            handleGoldStarPickup(index);
        }
    });
}

function handleCollision(obstacle, index) {
    if (player.shields > 0) {
        if (!player.isImmortal)
            player.shields -= 1;
        createExplosion(obstacle.x, obstacle.y);
        obstacles.splice(index, 1); // Remove the obstacle on impact
        createObstacle();
        if (!player.isImmortal)
            grantImmortality();
        audioPlayer.playSFX('explosion1');
        if (player.shields === 0) {
            isGameOver = true;
            endJoystick();
            createParticleExplosion(player.x, player.y, 100, 1, 0.5, 2, ['#FFD700', '#FFD700', '#FFD700', '#FF4500']);
            audioPlayer.playSFX('gameover');
            timeScale = 0.03;

            canvas.removeEventListener('mousedown', startJoystick);
            canvas.removeEventListener('touchstart', startJoystick);
            canvas.addEventListener('mousedown', startGame);
            canvas.addEventListener('touchstart', startGame);
        }
        player.hasShield = false;
        player.immortalTime = 10;
    }
}

function handleShieldPickup(index) {
    audioPlayer.playSFX('shieldGain');
    if (player.shields < 3) {
        player.shields += 1;
    }
    score += 5;
    shields.splice(index, 1);
    grantImmortality(60 * 6);
    player.hasShield = true;
}

function handleGoldStarPickup(index) {
    audioPlayer.playSFX('star');
    score += 10;
    goldStars.splice(index, 1);
}

function grantImmortality(t = 2) {
    t *= 60;
    if (t > player.immortalTime)
        player.immortalTime = t;
}

function createExplosion(x, y) {
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();
    setTimeout(() => {
        ctx.clearRect(x - 55, y - 55, 110, 110);
    }, 200); // Explosion effect lasts for 200ms
}

function drawBackground() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, 2, 2);
        let speed = star.speed;
        speed *= 1 + time * progressionSpeed;
        star.y += speed * timeScale;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function createStars() {
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * 2 + 1
        });
    }
}

function immortalTimer() {
    if (player.immortalTime > 0) {
        player.immortalTime--;
        player.isImmortal = true;
    } else if (player.immortalTime == 0) {
        player.isImmortal = false;
        player.hasShield = false;
    }
}

function writeText(text, anchor, offset = {
        x: 0,
        y: 0
    }, fontSize = 30, color = 'white') {
    const canvasWidth = ctx.canvas.width; // Get canvas width
    const canvasHeight = ctx.canvas.height; // Get canvas height
    ctx.fillStyle = color; // Set the color for the text
    ctx.font = `${fontSize}px Arial`; // Set the font size and font family
    const textWidth = ctx.measureText(text).width; // Measure the width of the text
    const textHeight = fontSize; // Simplified approximation of text height (based on font size)

    let x = 0;
    let y = 0;

    // Handle horizontal anchor points
    if (anchor.includes('left')) {
        x = 0;
    } else if (anchor.includes('center')) {
        x = canvasWidth / 2 - textWidth / 2;
    } else if (anchor.includes('right')) {
        x = canvasWidth - textWidth;
    }

    // Handle vertical anchor points
    if (anchor.includes('top')) {
        y = textHeight; // Start at text height since y refers to the baseline
    } else if (anchor.includes('center')) {
        y = canvasHeight / 2 + textHeight / 2;
    } else if (anchor.includes('bottom')) {
        y = canvasHeight - textHeight / 4; // Adjust to leave some space for descenders
    }

    // Apply offsets to x and y
    x += offset.x;
    y += offset.y;

    // Draw the text on the canvas
    ctx.fillText(text, x, y);
}

function drawRemainingShields() {
    const iconSize = 40; // Size of the shield icons
    const iconSpacing = 10; // Spacing between the shield icons
    const startX = 30; // Starting X position
    const startY = 30; // Starting Y position

    // Iterate through the player's shield count and draw the shields
    for (let i = 0; i < player.shields; i++) {
        const x = startX + i * (iconSize + iconSpacing); // Calculate X position for each shield

        // Draw the base shield icon (shield.png)
        if (playerShieldImage.complete) {
            ctx.drawImage(playerShieldImage, x, startY, iconSize, iconSize);
        }

        // Draw the shield glow icon (shieldGlow.png)
        if (playerShieldGlowImage.complete) {
            ctx.drawImage(playerShieldGlowImage, x, startY, iconSize, iconSize);
        }
    }
}

let gameoverMessage = "Game Over!";
let restartMessage = "Press R or tap to Restart";

function draw() {
    drawBackground();
    if (isGameOver)
        drawPlayer();
    updateParticles();
    drawObstacles();
    drawShields();
    drawGoldStars();
    if (!isGameOver)
        drawPlayer();
    drawShieldCircle();
    drawRemainingShields();
    if (!isGameOver)
        writeText(score, "top-left", {
            x: 35,
            y: 80
        }, 30, "yellow");

    if (isGameOver) {
        writeText(gameoverMessage, "center", {
            x: 0,
            y: -50
        }, 30, "red", "center");
        writeText(`Final score: ${score}`, "center", {
            x: 0,
            y: 0
        }, 30, "yellow", "center");
        writeText(restartMessage, "center", {
            x: 0,
            y: 50
        }, 30, "green", "center");
        writeText(`version: ${gameVersion}`, "bottom-right", {
            x: 0,
            y: 0
        }, 24, "white", "center");
    }

    // Draw the joystick if active
    drawJoystick();
}

// Modify the game loop to include the menu display
function gameLoop() {
    resizeCanvasToWindow();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isMainMenu) {
        drawMainMenu();
		handleGamepadInput(); // Check for gamepad input
    } else {
        drawBackground();
        keepPlayerInBounds();
        updatePlayerFromJoystick();
        draw();
        updateGame();
    }
	calculateAndDisplayFPS(); // Calculate and display FPS
    requestAnimationFrame(gameLoop);
}

// Function to update the game (separated for clarity)
function updateGame() {
    if (!isGameOver) {
        time++;
        if (time % (Math.floor(30 / timeScale)) == 0) score += 1 + Math.floor(time * progressionSpeed);
        if (time % (Math.floor(200 / timeScale)) == 0) createGoldStar();
        if (time % (Math.floor(1000 / timeScale)) == 0) createShield();
        immortalTimer();
        if (time % (Math.floor(3000 / timeScale)) == 0) createObstacle();
        checkCollision();
        updatePlayerPosition();
        createParticles();
    }
}
// Function to calculate FPS and display it
function calculateAndDisplayFPS() {
    const now = performance.now(); // Get the current time
    const delta = now - fpsLastTime; // Time difference from the last FPS calculation

    fpsCounter++; // Increment frame counter

    if (delta >= fpsTimeInterval) { // If one second has passed
        fps = Math.round((fpsCounter * 1000) / delta); // Calculate FPS (frames per second)
        fpsLastTime = now; // Reset the last time
        fpsCounter = 0; // Reset the frame counter
    }

    // Display FPS in the top-right corner
    drawFPS();
}
// Function to display FPS on the canvas
function drawFPS() {
    const fpsText = `FPS: ${fps}`;
    ctx.fillStyle = 'white'; // Set the color for the FPS text
    ctx.font = '20px Arial'; // Set the font size and style
    ctx.textAlign = 'right'; // Align the text to the right
    ctx.fillText(fpsText, canvas.width - 10, 30); // Draw the FPS at the top-right corner
}

function keepPlayerInBounds(margin = 20) {
    // Ensure the player's x position doesn't go outside the canvas
    if (player.x - margin < 0) {
        player.x = margin;
    } else if (player.x + margin > canvas.width) {
        player.x = canvas.width - margin;
    }

    // Ensure the player's y position doesn't go outside the canvas
    if (player.y - margin < 0) {
        player.y = margin;
    } else if (player.y + margin > canvas.height) {
        player.y = canvas.height - margin;
    }
}

let restartInt = 0;
// Start the game function
function startGame() {
	 audioPlayer.playMusic("bgm1");
    canvas.removeEventListener('mousedown', startGame);
    canvas.removeEventListener('touchstart', startGame);
    canvas.addEventListener('mousedown', startJoystick);
    canvas.addEventListener('touchstart', startJoystick);

    timeScale = 1;
    audioPlayer.playMusic('bgm1');
    isGameOver = false;
    score = 0;
    time = 0;
    player.shields = 3;
    player.isImmortal = false;
    obstacles = [];
    shields = [];
    goldStars = [];
    stars = [];
    particles = [];
    createStars();
    for (let i = 0; i < 5; i++) createObstacle();
    gameLoop();
}

// Update player movement via gamepad during the game
function updatePlayerPosition() {
    if ((keysPressed['ArrowLeft'] || keysPressed['a'])) {
        player.x -= player.speed * timeScale;
        player.angle = -0.3;
    }
    if ((keysPressed['ArrowRight'] || keysPressed['d'])) {
        player.x += player.speed * timeScale;
        player.angle = 0.3;
    }
    if ((keysPressed['ArrowUp'] || keysPressed['w'])) {
        player.y -= player.speed * timeScale;
    }
    if ((keysPressed['ArrowDown'] || keysPressed['s'])) {
        player.y += player.speed * timeScale;
    }

    // Handle gamepad input for movement
    if (gamepadIndex !== null) {
        let gamepad = navigator.getGamepads()[gamepadIndex];
        let leftX = gamepad.axes[0];
        let leftY = gamepad.axes[1];

        // Apply deadzone for stick drift
        if (Math.abs(leftX) > 0.1 || Math.abs(leftY) > 0.1) {
            player.x += leftX * player.speed * timeScale;
            player.y += leftY * player.speed * timeScale;
        }
    }
}

document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
    if (isGameOver && (e.key === 'r' || e.key === 'R')) {
        startGame();
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd') {
        player.angle = 0;
    }
});

startGame();