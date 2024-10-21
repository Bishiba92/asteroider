const gameVersion = "1.07";
let isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

let textDefaults = {
	font: "Audiowide",
	fontSize: 22,
	fontColor: "white",
}
const textButtonColors = ['white', '#FFFF00', '#FFD700'];


const audioPlayer = new AudioPlayer();
audioPlayer.preloadMusic(['bgm1']);
audioPlayer.preloadSFX(['star', 'explosion1', 'gameover', 'shieldGain']);
// audioPlayer.preloadBGS(['bgs1']);
// audioPlayer.playSFX('sfx1');
// audioPlayer.playBGS('bgs1');

let currentShipIndex = 0;

// Function to show the next ship image
function nextShip() {
	if (isSelectOnCooldown()) return;
	optionCooldown();
   currentShipIndex = (currentShipIndex + 1) % ships.length;
	player.ship = ships[currentShipIndex];
	playerShipImage.changeImage(player.ship.imgName);
}

// Function to show the previous ship image
function previousShip() {
	if (isSelectOnCooldown()) return;
	optionCooldown();
   currentShipIndex = (currentShipIndex - 1 + ships.length) % ships.length;
	player.ship = ships[currentShipIndex];
	playerShipImage.changeImage(player.ship.imgName);
}

const playerShieldImage = new Image();
playerShieldImage.src = 'img/shield.png';

const playerShieldGlowImage = new Image();
playerShieldGlowImage.src = 'img/shieldGlow.png';

let fpsCap = 60; // Target FPS
let fpsInterval = 1000 / fpsCap; // Calculate the time interval between frames for the target FPS
let lastFrameTime = performance.now(); // Track the time of the last frame
let fps = 0; // Current FPS
let fpsCounter = 0; // Number of frames rendered in the last second
let fpsLastTime = performance.now(); // Track the last time we calculated the FPS

let progressionSpeed = 0.0006; // How much faster the game gets as the game progresses
let timeMod = 1;

let objectDensity = 800; // Change this to change density of spawning objects (Currently only affects asteroids)
let objectSpawnTimer = 0; // Changing this value has no bearing on the game, it is set by other factors
let objectSpawnRateByWidthOfScreen = 10; // Changing this value has no bearing on the game, it is set by other factors

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.font = `${textDefaults.fontSize}px ${textDefaults.font}`;
	
let fontScale = 1;

let time = 1;
let timeScale = 1;

let randomSeed = 4612;
function simpleRNG(iteration, seed, min, max) {
    // Some arbitrary prime numbers for better distribution
    const state = iteration * 74755 + seed * 65933;

    // Get the random int using Xorshift
    const randomInt = xorshift(state);

    // Normalize to [0, 1)
    const value = randomInt / 0xFFFFFFFF;

    // Scale the result to [min, max)
    return value * (max - min) + min;
}

// Implementing Xorshift (32-bit variant)
function xorshift(state) {
    let x = Math.floor(state); // Convert to integer for bitwise operations
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return x >>> 0; // Convert back to unsigned 32-bit integer
}

function getRandom() {
    return simpleRNG(time, randomSeed, 0, 1);
}
function resizeCanvasToWindow() {
    const canvas = document.getElementById('gameCanvas');
    
    // Use visualViewport for more accurate sizing on mobile
    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    
    // Desired aspect ratio (9:16, approximately 0.5625)
    const aspectRatio = 9 / 16;
    
    // Define the max height (800px) for non-mobile
    const maxHeight = 1800; // Max height for non-mobile
    
    let canvasHeight, canvasWidth;
    
    if (!isMobile) {
        // Force the height to always be the viewport height or the maxHeight (whichever is smaller)
        canvasHeight = Math.min(viewportHeight, maxHeight);
        
        // Calculate the corresponding width to maintain the 9:16 aspect ratio
        canvasWidth = canvasHeight * aspectRatio;
        
        // Adjust canvas dimensions
        canvas.height = canvasHeight;
        canvas.width = canvasWidth;
    } else {
        // For mobile, use full viewport dimensions (no constraints)
        canvas.width = viewportWidth;
        canvas.height = viewportHeight;
		// Force the height to always be the viewport height or the maxHeight (whichever is smaller)
        canvasHeight = Math.min(viewportHeight, maxHeight);
        
        // Calculate the corresponding width to maintain the 9:16 aspect ratio
        canvasWidth = canvasHeight * aspectRatio;
    }

    // Adjust game logic based on the new canvas size
    objectSpawnRateByWidthOfScreen = objectDensity / canvas.width;

    // Ensure the canvas element scales up to fill the height of the viewport while maintaining aspect ratio
    // This can be achieved using CSS transformations for scaling
    const scaleFactor = viewportHeight / canvasHeight;
    canvas.style.transform = `scale(${scaleFactor})`;
    canvas.style.transformOrigin = 'top left'; // Scale from the top-left corner
    canvas.style.position = 'absolute'; // Ensure it stays positioned properly
    canvas.style.top = '0';
    canvas.style.left = '50%';
    canvas.style.transform += ' translateX(-50%)'; // Center the canvas horizontally
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
	 ship: null
};

player.ship = ships[Math.floor(Math.random() * ships.length)];

let obstacles = [];
let stars = [];
let particles = [];
let shields = [];
let goldStars = [];
let score = 0;
let isGameOver = false;

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
    let intensity = up ? 4 : left || right ? 3 : 1;
    intensity *= timeScale * timeScale;
    intensity *= timeMod * (1 + Math.random() * 2);
    for (let i = 0; i < intensity; i++) {
        let color = ['#00FFFF','#00FFFF', '#0000FF', '#800080'][Math.floor(Math.random() * 3)];
        let size = Math.random() * 1 + 0.5;
        let xOffset = Math.random() * 10 - 5;
        let direction = Math.PI / 2 + (Math.random() - 0.5) * 0.2; // General downward direction with slight randomness
        let speedMod = timeMod * (1 + Math.random() * 2);
        particles.push(new Particle(player.x + xOffset, player.y + 15, color, size, 0.5, direction, speedMod));
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
    const y = -150;
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
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y); // Move the context to the player's position
    ctx.rotate(player.angle); // Rotate the context to match the player's angle

    // Apply transparency effect if the player is immortal and doesn't have a shield
    if (player.isImmortal && !player.hasShield) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5; // Flashing effect
    }

    // Assuming the player's image is preloaded and stored in `player.selectedShipImage`
    const img = player.ship.img;

    // Scale the width and height of the image based on the player's scale factor
    const imgWidth = player.ship.img.width * player.scale;
    const imgHeight = player.ship.img.height * player.scale;

    // Draw the player's image at the center, taking into account the scaled size
    ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);

    ctx.restore(); // Restore the context's state to avoid affecting other drawings
    ctx.globalAlpha = 1.0; // Reset transparency
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
        if (distance < 80 * player.ship.size) {
            createParticleExplosion(shield.x, shield.y, 100, 0.5, 0.5, 2, ['#00FFFF', '#00FFFF', '#00FFFF', '#0000FF']);
            handleShieldPickup(index);
        }
    });

    goldStars.forEach((star, index) => {
        const distX = star.x - player.x;
        const distY = star.y - player.y;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < 50 * player.ship.size) {
            createParticleExplosion(star.x, star.y, 100, 1, 0.5, 2, ['#FFD700', '#FFD700', '#FFD700', '#FF4500']);
            handleGoldStarPickup(index);
        }
    });
}
let leaderboard = [];
let currentRecord = 0;
async function setCurrentRecord() {
	currentRecord = await getRecord(player.name);
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
          createParticleExplosion(player.x, player.y, 100, 1, 0.5, 2, ['#FFD700', '#FFD700', '#FFD700', '#FF4500']);
			audioPlayer.playSFX('gameover');
			setGameover();
        }
        player.hasShield = false;
        player.immortalTime = 10;
    }
}

function setGameover(inputStr = null) {
	isGameOver = true;
	if (inputStr != null) player.name = inputStr;
	endJoystick();
	timeScale = 0.03;
	canvas.removeEventListener('mousedown', startJoystick);
	canvas.removeEventListener('touchstart', startJoystick);   
	if (player.name == undefined) {
		openInputModal("Pilot Name", setGameover);
	} else {
		canvas.addEventListener('mousedown', startGame);
		canvas.addEventListener('touchstart', startGame);
		updateLeaderboard(player, score);					
	}	
}

function handleShieldPickup(index) {
    audioPlayer.playSFX('shieldGain');
    if (player.shields < player.ship.health) {
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
        speed *= timeMod;
        star.y += speed * timeScale;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function createStars() {
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random(i) * canvas.width,
            y: Math.random(i) * canvas.height,
            speed: Math.random(i) * 2 + 1
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
function writeText(text, anchor, offset = { x: 0, y: 0 }, fontMod, color = 'white', align) {
    fontSize = textDefaults.fontSize * fontMod * fontScale;
    const canvasWidth = ctx.canvas.width;  // Get canvas width
    const canvasHeight = ctx.canvas.height;  // Get canvas height
    ctx.fillStyle = color;  // Set the color for the text
    ctx.font = `${fontSize}px ${textDefaults.font}`;  // Set the font size and font family

    const textHeight = fontSize;  // Simplified approximation of text height (based on font size)

    let x = 0;
    let y = 0;

    // Handle horizontal anchor points and set default alignment
    if (anchor.includes('left')) {
        x = 0;
        ctx.textAlign = align || "left";
    } else if (anchor.includes('center')) {
        x = canvasWidth / 2;
        ctx.textAlign = align || "center";
    } else if (anchor.includes('right')) {
        x = canvasWidth;
        ctx.textAlign = align || "right";
    }

    // Handle vertical anchor points (manually position y)
    if (anchor.includes('top')) {
        y = textHeight;  // Start at text height since y refers to the baseline
    } else if (anchor.includes('center')) {
        y = canvasHeight / 2 + textHeight / 2;
    } else if (anchor.includes('bottom')) {
        y = canvasHeight - textHeight / 4;  // Adjust to leave some space for descenders
    }

    // Apply offsets to x and y
    x += offset.x;
    y += offset.y;

    // Draw the text on the canvas
    ctx.fillText(text, x, y);
}
function writeMenuText(text, anchor, offset = { x: 0, y: 0 }, fontMod = 1, colors = ['white', 'lightgray', 'gray'], selected = false, align) {
    // Extract colors from the array with defaults
    const [normalColor, hoverColor, clickColor] = colors;

    const fontSize = textDefaults.fontSize * fontMod * fontScale;
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    const textHeight = fontSize;  // Simplified approximation of text height (based on font size)

    let x = 0;
    let y = 0;

    // Handle horizontal anchor points and set default alignment
    if (anchor.includes('left')) {
        x = 0;
    } else if (anchor.includes('center')) {
        x = canvasWidth / 2;
    } else if (anchor.includes('right')) {
        x = canvasWidth;
    }

    // Handle vertical anchor points
    if (anchor.includes('top')) {
        y = textHeight;  // Start at text height since y refers to the baseline
    } else if (anchor.includes('center')) {
        y = canvasHeight / 2 + textHeight / 2;
    } else if (anchor.includes('bottom')) {
        y = canvasHeight - textHeight / 4;  // Adjust to leave some space for descenders
    }

    // Apply offsets to x and y
    x += offset.x;
    y += offset.y;

    // Get the text metrics to calculate the text bounding box for mouse interactions
    const textWidth = ctx.measureText(text).width;

    // Calculate text bounding box
    const minX = x - (ctx.textAlign === "center" ? textWidth / 2 : ctx.textAlign === "right" ? textWidth : 0);
    const maxX = minX + textWidth;
    const minY = y - textHeight;
    const maxY = y;

    // Check if the mouse is hovering over (selected) the text
    let isSelected = mousePosition.x >= minX && mousePosition.x <= maxX && mousePosition.y >= minY && mousePosition.y <= maxY;

    // Determine the current color based on selection, hover, and click states
    let currentColor = normalColor;

    if (selected || isSelected) {
        // Highlight the item as selected (keyboard or mouse hover)
        currentColor = clickColor;  // You can use the clickColor for selection or define a special selectedColor if desired
    } else if (isSelected && isClicking) {
        currentColor = clickColor;
    } else if (isSelected) {
        currentColor = hoverColor;
    }

    // Call writeText to render the text using the determined color
    writeText(text, anchor, offset, fontMod, currentColor, align);

    // Return an object with isSelected and isClicked status
    return {
        isSelected: isSelected || selected, // True if the item is selected (by keyboard or hover)
        isClicked: isSelected && isClicking  // True if the item is clicked
    };
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

let whatToDraw = "Main";

let isMainMenu = true;
let selectedMenuOption = 0; // 0 for "Start Game", 1 for "Options"
let mainMenuOptions = ["Start Game", "Options", "Leaderboard"];

let titleOpacity = 0; // Opacity for fading effect
let titleY = -100; // Starting Y position for the title (off-screen)
let titleSpeed = 1.5; // Speed for panning down the title

let playerShipImage = new ImageObject(player.ship.imgName, {x:canvas.width/2,y:canvas.height/2+255});
playerShipImage.onClick = nextShip;
playerShipImage.scale = 0.5;
// Function to draw the main menu
function drawMainMenu() {	
    // Animate the title panning down and fading in
    if (titleY < canvas.height / 4) {
        titleY += titleSpeed; // Move the title down
    }
    if (titleOpacity < 1) {
        titleOpacity += 0.02; // Increase opacity for fade-in
    }

    ctx.save();

    ctx.globalAlpha = titleOpacity; // Apply the opacity for the title
    writeText("Asteroider", "top-center", {
        x: 0,
        y: titleY
    }, 4, "white");
    ctx.restore();
	
	playerShipImage.moveToPoint({x:canvas.width/2 - 40,y:canvas.height/2+255});
	playerShipImage.draw();
	
    // Draw the menu options with dynamic positioning
    for (let i = 0; i < mainMenuOptions.length; i++) {
        selectedMenuOption = writeMenuText(mainMenuOptions[i], "center", {
            x: 0,
            y: i * 60
        }, 1.6, textButtonColors, selectedMenuOption === i).isSelected ? i : selectedMenuOption;
    }
	let base = {x: canvas.width/2, y: canvas.height/2+255};
	let r = 1;
	let rh = 20;
	let shipOffset = {x: 20, y: -50};
	let colOffset = 60;
	
	writeText(player.ship.name, "top-left", {x: base.x + shipOffset.x, y: base.y + shipOffset.y}, 1, "yellow", "left");
	
	writeText(`Speed:`, "top-left", {x: base.x + shipOffset.x, y: base.y + shipOffset.y + rh * r}, 1, "white", "left");
	writeText(`${player.ship.speed}`, "top-left", {x: base.x + shipOffset.x + colOffset, y: base.y + shipOffset.y + rh * r++}, 1, "white", "left");
	
	writeText(`Steer:`, "top-left", {x: base.x + shipOffset.x, y: base.y + shipOffset.y + rh * r}, 1, "white", "left");
	writeText(`${player.ship.steering}`, "top-left", {x: base.x + shipOffset.x + colOffset, y: base.y + shipOffset.y + rh * r++}, 1, "white", "left");
	
	writeText(`Health:`, "top-left", {x: base.x + shipOffset.x, y: base.y + shipOffset.y + rh * r}, 1, "white", "left");
	writeText(`${player.ship.health}`, "top-left", {x: base.x + shipOffset.x + colOffset, y: base.y + shipOffset.y + rh * r++}, 1, "white", "left");
	
	writeText(`Size:`, "top-left", {x: base.x + shipOffset.x, y: base.y + shipOffset.y + rh * r}, 1, "white", "left");
	writeText(`${player.ship.size}`, "top-left", {x: base.x + shipOffset.x + colOffset, y: base.y + shipOffset.y + rh * r++}, 1, "white", "left");
	
	
}

// Mouse click handling for menu selection
canvas.addEventListener('click', function (event) {
    if (isMainMenu) {
        const clickX = event.clientX;
        const clickY = event.clientY;

        // Check if any of the menu options were clicked
        for (let i = 0; i < mainMenuOptions.length; i++) {
            const optionY = canvas.height / 2 + i * 60;
            if (clickY > optionY - 20 && clickY < optionY + 20) {
                selectedMenuOption = i;
					switch (whatToDraw) {
						case "Main": {
								handleMenuSelection(true);
								break;
							}
						case "Game": {
								//handleGameOptionsSelection(true);
								break;
							}
							case "Options": {
								handleGameOptionsSelection(true);
								break;
							}
							case "Leaderboard": {
								handleLeaderboardSelection(true);
								break;
							}
							case "NameInput": {
								break;
							}
							
						}
				
            }
        }
    }
});

let selectOptionCooldown = 0;
let selectOptionTimer = 30;
function optionCooldown() {
	selectOptionCooldown = selectOptionTimer;
}
function isSelectOnCooldown() {
	return selectOptionCooldown > 0;
}

// Event listener for keyboard menu navigation
function changeMenuOption(menuOptions, selectedMenuOption){
	if (isSelectOnCooldown()) return selectedMenuOption;
	if (up) {
		console.log(menuOptions)
		console.log("up")
		selectedMenuOption = (selectedMenuOption - 1 + menuOptions.length) % menuOptions.length; // Navigate up
		optionCooldown();
	} else if (down) {
		console.log("down")
		selectedMenuOption = (selectedMenuOption + 1) % menuOptions.length; // Navigate down
		optionCooldown();
	}
	return selectedMenuOption;
};
// Handle menu selection based on current option
function handleMenuSelection(fromClick = false) {
	if (isSelectOnCooldown()) return;
	if (enter || fromClick) {
    if (selectedMenuOption === 0) {
		optionCooldown()
        startGame(); // Start the game
        isMainMenu = false; // Exit the menu
    } else if (selectedMenuOption === 1) {
			isMobile ? showLeaderboard() : showOptions();
			optionCooldown()
    } else if (selectedMenuOption === 2) {
			showLeaderboard();
			optionCooldown()
    }
	}
}


let selectedGameOption = 0; // 0 for "Start Game", 1 for "Options"
let gameOptions = [];

function drawOptionsMenu() {
	let muted = audioPlayer.muteMusic ? "X" : "O";
	let mVol = (audioPlayer.musicVolume * 100).toFixed(0) + " %";
	let sVol = (audioPlayer.sfxVolume * 100).toFixed(0) + " %";
	gameOptions = ["Mute Audio: " + muted, "Music Volume: " + mVol, "SFX Volume: " + sVol];
    ctx.save();
    writeText("Asteroider", "top-center", {
        x: 0,
        y: titleY
    }, 4, "white");
    ctx.restore();

    // Draw the menu options with dynamic positioning
    for (let i = 0; i < gameOptions.length; i++) {
        selectedGameOption = writeMenuText(gameOptions[i], "center", {
            x: 0,
            y: i * 60
        }, 1.6, textButtonColors, selectedGameOption === i).isSelected ? i : selectedGameOption;
    }
}

function handleGameOptionsSelection(fromClick = false) {
	if (isSelectOnCooldown()) return;
	
    if (enter && selectedGameOption === 0) {
        audioPlayer.toggleMuteAll();
		optionCooldown();
    } else if (selectedGameOption === 1) {
			if (left) {
				optionCooldown();
				audioPlayer.changeVolume("music", -0.1);
			} else if (right) {
				optionCooldown();
				audioPlayer.changeVolume("music", 0.1);
			} 
    } else if (selectedGameOption === 2) {
			if (left) {
				optionCooldown();
				audioPlayer.changeVolume("sfx", -0.1);
			} else if (right) {
				optionCooldown();
				audioPlayer.changeVolume("sfx", 0.1);
			}
    }
	if (esc) {
		optionCooldown();
		showMainMenu();
	}	
}

function drawLeaderboard() {
  if (leaderboard.length === 0) {
    console.log("No leaderboard data available to draw.");
    return;
  }
	drawRectangle(canvas.width / 2, canvas.height / 2, canvas.width - 50, canvas.height - 50, "black", 0.6);
  ctx.save();
  let titleY = 50;

  // Draw the title for the leaderboard
  let titleText = isGameOver ? "Gameover!" : "Leaderboard";
  let titleColor = isGameOver ? "red" : "yellow";
  writeText(titleText, "top-center", {
    x: 0,
    y: titleY
  }, 2, titleColor);

  ctx.restore();

  // Set the starting Y position for the leaderboard items
  let startY = isMobile ? titleY + 100 : titleY + 140; // Some space below the title

  // Calculate column positions based on canvas width for dynamic alignment
  let canvasWidth = canvas.width;
  
  let col0Start = canvasWidth * 0.2;  // Rank column (10% of the canvas width)
  let col1Start = canvasWidth * 0.23;  // Name column (20% of the canvas width)
  let col2Start = canvasWidth * 0.5;  // Ship column (50% of the canvas width)
  let col3Start = canvasWidth * 0.8;  // Score column (80% of the canvas width)

  let rowHeight = isMobile ? 20 : 25;  // Adjust row height for better readability
  let fontSize = 1;
  let color = "white";

  // Track if the player is part of the top 25
  let playerInTop25 = false;
	let subtitle = isGameOver ? `Final score: ${score}` : "Leaderboard entries: " + leaderboard.length;
  writeText(subtitle, "top-center", { x: 0, y: startY - rowHeight * 2 }, fontSize, "yellow");

  // Draw the top 25 leaderboard entries
  for (let i = 0; i < Math.min(25, leaderboard.length); i++) {
    const entry = leaderboard[i];
    const rank = i + 1;

    // Highlight current player's entry in yellow
    if (entry.name === player.name) {
      color = "yellow";
      playerInTop25 = true;
    } else {
      color = "white";
    }

    // Draw the text for each entry, align columns dynamically based on the canvas width
    writeText(rank + ".", "left", { x: col0Start, y: startY + i * rowHeight }, fontSize, color, "right");
    writeText(entry.name, "left", { x: col1Start, y: startY + i * rowHeight }, fontSize, color, "left");
    writeText(entry.ship, "left", { x: col2Start, y: startY + i * rowHeight }, fontSize, color, "left");
    writeText(entry.score, "left", { x: col3Start, y: startY + i * rowHeight }, fontSize, color, "right");
  }

  // If the player is not in the top 25, display them at the bottom with their correct rank
  if (!playerInTop25) {
    // Find the player's position in the leaderboard
    const playerIndex = leaderboard.findIndex(entry => entry.name === player.name);

    if (playerIndex !== -1) {
      const playerEntry = leaderboard[playerIndex];
      const playerRank = playerIndex + 1;  // Player rank is their index + 1

      // Add some extra space to place the player's entry below the top 25
      const playerY = startY + 26 * rowHeight; // Place player's entry one row below the top 25

      // Draw the player's entry with the correct rank
      writeText(playerRank + ".", "left", { x: col0Start, y: playerY }, fontSize, "yellow", "right");
      writeText(playerEntry.name, "left", { x: col1Start, y: playerY }, fontSize, "yellow", "left");
      writeText(playerEntry.ship, "left", { x: col2Start, y: playerY }, fontSize, "yellow", "left");
      writeText(playerEntry.score, "left", { x: col3Start, y: playerY }, fontSize, "yellow", "right");
    }
  }
  if (isGameOver) {
	  writeText(restartMessage, "top-center", {
            x: 0,
            y: startY + 27 * rowHeight
        }, 0.9, "green", "center");
  }
}


function handleLeaderboardSelection(fromClick = false) {
	if (isSelectOnCooldown()) return;
	if (esc || fromClick) {
		optionCooldown();
		showMainMenu();
	}	
}

function showMainMenu() {
	whatToDraw = "Main";
}
function showOptions() {
	whatToDraw = "Options";
}
function showLeaderboard() {
	whatToDraw = "Leaderboard";
}

let gameoverMessage = "Game Over!";
let restartMessage = "Press R or tap to Restart";

function drawGame() {
    drawBackground();
    if (isGameOver) {
		if (player.name == undefined) {
			drawModal();
		}
        drawPlayer();
	}
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
        }, 2, "yellow");

    if (isGameOver) {
		drawLeaderboard();
    }

    // Draw the joystick if active
    drawJoystick();
}

function drawGameTestTexts() {
	let i = 1;
	let rowHeight = 24;
	let yOffset = 10;
	writeText(`Version: ${gameVersion}`,"top-right", {
        x: -8,
        y: yOffset + rowHeight * i++
    }, 0.4);
	writeText(`particles: ${particles.length}`, "top-right", {
        x: -8,
        y: yOffset + rowHeight * i++
    }, 0.4);
    writeText(`Spawn Timer: ${objectSpawnTimer.toFixed("3")}`, "top-right", {
        x: -8,
        y: yOffset + rowHeight * i++
    }, 0.4);
    writeText(`Mouse: ${mousePosition.x + ", " + mousePosition.y}`, "top-right", {
        x: -8,
        y: yOffset + rowHeight * i++
    }, 0.4);
	writeText(`Mobile: ${isMobile}`, "top-right", {
        x: -8,
        y: yOffset + rowHeight * i++
    }, 0.4);
}
let logo = new ImageObject("logo", {x:canvas.width/2,y:canvas.height/2-55});
logo.scale = 0.01;
isMobile ? logo.scaleToSize(0.25, 1000) : logo.scaleToSize(0.25, 1000);
let startMusicInt = 0;
function gameLoop(currentTime) {
	
	checkMouseMovedRecently();
    requestAnimationFrame(gameLoop); // Continue the loop
	isMobile = 'ontouchstart' in window;
	fontScale = 0.6;
    // Calculate the time difference between the current frame and the last frame
    let elapsedTime = currentTime - lastFrameTime;

    // If enough time has passed since the last frame (based on the FPS cap)
    if (elapsedTime > fpsInterval) {
		selectOptionCooldown = Math.max(selectOptionCooldown - 1, 0);
		
        // Adjust for any slight time deviation
        lastFrameTime = currentTime - (elapsedTime % fpsInterval);

        // Update and render the game
        resizeCanvasToWindow();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
			
			if (whatToDraw != "Game") {
				drawBackground();
				logo.moveToPoint({x:canvas.width/2,y:canvas.height/2-55});
				logo.draw();
			}
        switch (whatToDraw) {
        case "Main": {
					selectedMenuOption = changeMenuOption(mainMenuOptions, selectedMenuOption);
					handleMenuSelection();
                drawMainMenu();
                handleGamepadInput(); // Check for gamepad input
                break;
            }
        case "Game": {
                keepPlayerInBounds();
                drawGame();
                updateGame();
					if (showModal) {
						drawModal();
					}
					if (isGameOver && restart && !showModal) {
						startGame();
					}
                break;
            }
			case "Options": {
					selectedGameOption = changeMenuOption(gameOptions, selectedGameOption);
					handleGameOptionsSelection();
                drawOptionsMenu();
                break;
            }
			case "Leaderboard": {
					handleLeaderboardSelection();
                drawLeaderboard();				
                break;
            }
			case "NameInput": {
                drawModal();
                break;
            }
			
        }

        // Calculate and display FPS
        calculateAndDisplayFPS(currentTime);
		  //drawGameTestTexts();
		  if (whatToDraw != "Game") {
			  writeText(`Bishiba @ Patreon`, "bottom-left", {
				x: 3,
				y: 0
			}, 1, "white");
        writeText(`version: ${gameVersion}`, "bottom-right", {
				x: -3,
				y: 0
			}, 1, "white");
		  }
		  if (false) {
			  
		  writeText(`mouseMoved: ${mouseMoved}`, "bottom-right", {
				x: -3,
				y: -50
			}, 1, "white");
			writeText(`selectedMenuOption: ${selectedMenuOption}`, "bottom-right", {
				x: -3,
				y: -100
			}, 1, "white");
		  }
    }
}

// Function to update the game (separated for clarity)
function updateGame() {
	 calculateTimeMod();
    if (!isGameOver) {
        time++;
        if (time % (Math.floor(30 / timeScale)) == 0)
            score += Math.round(timeMod);
        if (time % (Math.floor(200 / timeScale)) == 0)
            createGoldStar();
        if (time % (Math.floor(1000 / timeScale)) == 0)
            createShield();
        objectSpawnTimer = Math.max(30 - Math.floor(time / 300), 10);
        if (time % (Math.floor(objectSpawnTimer * objectSpawnRateByWidthOfScreen / timeScale)) == 0)
            createObstacle();
        immortalTimer();
        if (time % (Math.floor(3000 / timeScale)) == 0)
            createObstacle();
        checkCollision();
        updatePlayerPosition();
        createParticles();
    }
}
function calculateTimeMod() {
    const maxValue = 7;
    const minValue = 0;
    const midpoint = 10000; // Time at which the curve is halfway
    const k = 0.0002; // Controls the steepness of the curve

    // Logistic growth formula
    timeMod = minValue + (maxValue - minValue) / (1 + Math.exp(-k * (time - midpoint)));

}
// Function to calculate and display FPS
function calculateAndDisplayFPS(currentTime) {
    fpsCounter++; // Increment frame count

    // If one second has passed, calculate FPS
    if (currentTime - fpsLastTime >= 1000) {
        fps = fpsCounter; // Set the current FPS to the number of frames in the last second
        fpsCounter = 0; // Reset the frame counter
        fpsLastTime = currentTime; // Reset the time for the next second
    }
    // text, anchor, offset = {x: 0, y: 0}, fontSize = 30, color = 'white'
    writeText(`FPS: ${fps}`, "top-right", {
        x: -8,
        y: 8
    }, 0.8);
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
function setupGame() {
	console.log(player.name);
	createStars();
    audioPlayer.setMasterVolume(0.3);
    canvas.addEventListener('mousedown', startJoystick);
    canvas.addEventListener('touchstart', startJoystick);
	
	 setupKeyListeners()
    gameLoop();
}
function setPlayerName() {
	getLeaderboard();
	Managers.Cache.load("playerName").then(data => {
		if (data != undefined) {
			player.name = data.name;
		}
		setupGame();
	});
}
function startGame() {
	whatToDraw = "Game";
	setCurrentRecord();
    canvas.removeEventListener('mousedown', startGame);
    canvas.removeEventListener('touchstart', startGame);
    canvas.addEventListener('mousedown', startJoystick);
    canvas.addEventListener('touchstart', startJoystick);
    timeScale = 1;
    isGameOver = false;
    score = 0;
    time = 0;
    player.shields = player.ship.health;
    player.isImmortal = false;
    obstacles = [];
    shields = [];
    goldStars = [];
    stars = [];
    particles = [];
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
	createStars();
}

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

function updatePlayerPosition() {
    const angleEaseSpeed = 0.1; // Adjust this for the desired easing speed
    const maxAngle = 0.4	; // Use the maxAngle property of the player, default to 0.3 if undefined
	const sideMax = 1.4;
	const thrust = 1 * player.ship.speed;
	

    // Keyboard movement
    if (left) {
        player.x -= player.speed * sideMax * timeScale;
        player.angle = lerp(player.angle, -maxAngle, angleEaseSpeed); // Use maxAngle for left rotation
    } else if (right) {
        player.x += player.speed * sideMax * timeScale;
        player.angle = lerp(player.angle, maxAngle, angleEaseSpeed); // Use maxAngle for right rotation
    } else {
        player.angle = lerp(player.angle, 0, angleEaseSpeed); // Ease back to 0 when no input
    }

    if (up) {
        player.y -= player.speed * thrust * timeScale;
    }
    if (down) {
        player.y += player.speed * thrust * timeScale;
    }

    // Virtual joystick movement
    if (joystick.active && joystick.distance > 0) {
        let speed = (joystick.distance / joystick.radius) * player.speed;
        player.x += Math.cos(joystick.angle) * speed * sideMax * timeScale;
        player.y += Math.sin(joystick.angle) * speed * thrust * timeScale;

        let joystickAngleX = Math.cos(joystick.angle); // X component of joystick angle
        player.angle = lerp(player.angle, joystickAngleX * maxAngle, angleEaseSpeed); // Scale angle between -maxAngle and maxAngle
    }

    // Handle gamepad input for movement
    if (gamepadIndex !== null) {
        let gamepad = navigator.getGamepads()[gamepadIndex];
        let leftX = gamepad.axes[0];
        let leftY = gamepad.axes[1];

        // Apply deadzone for stick drift
        if (Math.abs(leftX) > 0.1 || Math.abs(leftY) > 0.1) {
            player.x += leftX * player.speed * sideMax * timeScale;
            player.y += leftY * player.speed * thrust * timeScale;

            player.angle = lerp(player.angle, leftX * maxAngle, angleEaseSpeed); // Scale angle based on leftX axis using maxAngle
        } else {
            player.angle = lerp(player.angle, 0, angleEaseSpeed); // Ease back to 0 when no input
        }
    }
}

function drawRectangle(x, y, width, height, color, transparency = 1) {
    // Save the current canvas state
    ctx.save();

    // Set the transparency level (global alpha)
    ctx.globalAlpha = transparency;

    // Set the fill color
    ctx.fillStyle = color;

    // Calculate the top-left corner based on the center position
    const topLeftX = x - width / 2;
    const topLeftY = y - height / 2;

    // Draw the rectangle
    ctx.fillRect(topLeftX, topLeftY, width, height);

    // Restore the canvas state to avoid affecting other drawings
    ctx.restore();
}

let inputStr = '';
let isModalActive = true;
let allCaps = true;
let modalTextPrompt = "Pilot Name";
let maxTextInput = 8;

// Draw the modal with "MESSAGE" and the input area
function drawModal() {
	drawRectangle(canvas.width / 2, canvas.height / 2, 300, 200, "black", 0.9);
	writeText(modalTextPrompt, 'center', {x: 0, y: -35}, 2, "white");

	let displayText = inputStr;
	if (allCaps) displayText = displayText.toUpperCase();
	writeText(displayText.padEnd(maxTextInput, '_'), 'center', {x: 0, y: 0}, 2, "yellow");
	writeText("For online leaderboard", 'center', {x: 0, y: 50}, 1.4);
}
let showModal = false;
function openInputModal(text, callback = null, maxInput = 8, allCaps = true) {
    modalTextPrompt = text;
    inputStr = ''; // Initialize input string

    // Check if we're on mobile by detecting if the platform is touch-based
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    let hiddenInput;

    if (isMobile) {
        // Create a hidden input field for mobile keyboard interaction
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'text';
        hiddenInput.maxLength = maxInput;
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';  // Make the input invisible
        hiddenInput.style.pointerEvents = 'none';  // Disable interactions
        hiddenInput.style.zIndex = '-1';  // Send it to the back of the stack
        document.body.appendChild(hiddenInput);
        
        // Focus on the hidden input if the user clicks on the canvas
        canvas.addEventListener('click', () => {
            hiddenInput.focus();
        });

        // Sync hidden input with inputStr and handle mobile input
        hiddenInput.addEventListener('input', () => {
            inputStr = hiddenInput.value.slice(0, maxInput); // Limit input to maxInput length
            if (allCaps) inputStr = inputStr.toUpperCase();
        });
    }

    // Handle key inputs for PC (or mobile if virtual keyboard is not needed)
    function handleKeyInput(event) {
        if (event.key === 'Enter') {
				if (inputStr.length == 0) return;
            document.removeEventListener('keydown', handleKeyInput);
            if (isMobile && hiddenInput) {
                document.body.removeChild(hiddenInput); // Clean up the hidden input for mobile
                canvas.removeEventListener('click', handleCanvasClick); // Remove click listener
            }
            isModalActive = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            Managers.Cache.save("playerName", { name: inputStr }, "playerData");
            whatToDraw = "Game";
            optionCooldown();
			  showModal = false;
			  callback(inputStr);
        }
        if (event.key === 'Backspace') {
            inputStr = inputStr.slice(0, -1); // Remove last character
        } else if (inputStr.length < maxInput && /^[a-zA-Z]$/.test(event.key)) {
				console.log(event.key);
            inputStr += allCaps ? event.key.toUpperCase() : event.key; // Add character to inputStr
        }
    }

    // Add the keyboard input listener (for PC or fallback)
    document.addEventListener('keydown', handleKeyInput);

    // Helper function for canvas click
    function handleCanvasClick() {
        hiddenInput.focus();
    }
    
    if (isMobile) {
        // On mobile, focus on the input when the canvas is clicked
        canvas.addEventListener('click', handleCanvasClick);
    }
	showModal = true;
}


let mouseMoved = false;
let lastMouseMoveTime = 0;
let mouseMoveCheckDuration = 300;
let mousePosition = {
    x: 0,
    y: 0
};

// Time duration to check if the mouse has moved recently (in milliseconds)


// Event listener for mouse movement
canvas.addEventListener('mousemove', function (event) {
    // Get the bounding rectangle of the canvas
    const rect = canvas.getBoundingClientRect();

    // Update the mouse position relative to the canvas
    mousePosition.x = event.clientX - rect.left;
    mousePosition.y = event.clientY - rect.top;

    // Update the last mouse movement time
    lastMouseMoveTime = Date.now();
    mouseMoved = true;
});

// Function to check if the mouse has moved within the last `mouseMoveCheckDuration` milliseconds
function checkMouseMovedRecently() {
    const currentTime = Date.now();
    
    // Check if the mouse moved in the last `mouseMoveCheckDuration` ms
    if (currentTime - lastMouseMoveTime <= mouseMoveCheckDuration) {
        return true;
    } else {
        mouseMoved = false; // Reset the flag if the mouse hasn't moved recently
        return false;
    }
}


let isClicking = false;
let left = false;
let right = false;
let up = false;
let down = false;
let enter = false;
let esc = false;
let space = false;
let restart = false;


function setupKeyListeners() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

// Handle key down event
function handleKeyDown(event) {
    switch (event.key) {
        case 'a':
        case 'A':
        case 'ArrowLeft':
            left = true;
            break;
        case 'd':
        case 'D':
        case 'ArrowRight':
            right = true;
            break;
        case 'w':
        case 'W':
        case 'ArrowUp':
            up = true;
            break;
        case 's':
        case 'S':
        case 'ArrowDown':
            down = true;
            break;
        case 'Enter':
            enter = true;
            break;
        case 'Escape':
            esc = true;
            break;
        case ' ':
            space = true;
            break;
        case 'r':
        case 'R':
            restart = true;
            break;
        default:
            break;
    }
}

// Handle key up event
function handleKeyUp(event) {
    switch (event.key) {
        case 'a':
        case 'A':
        case 'ArrowLeft':
            left = false;
            break;
        case 'd':
        case 'D':
        case 'ArrowRight':
            right = false;
            break;
        case 'w':
        case 'W':
        case 'ArrowUp':
            up = false;
            break;
        case 's':
        case 'S':
        case 'ArrowDown':
            down = false;
            break;
        case 'Enter':
            enter = false;
            break;
        case 'Escape':
            esc = false;
            break;
        case ' ':
            space = false;
            break;
        case 'r':
        case 'R':
            restart = false;
            break;
        default:
            break;
    }
}

canvas.addEventListener('mousedown', function () {
    isClicking = true;
});

canvas.addEventListener('mouseup', function () {
    isClicking = false;
});

canvas.addEventListener('mouseleave', function () {
    isClicking = false;
});

// Handle touch events for mobile
canvas.addEventListener('touchstart', function () {
    isClicking = true;
});

canvas.addEventListener('touchend', function () {
    isClicking = false;
});

canvas.addEventListener('touchcancel', function () {
    isClicking = false;
});

function startMusicOnInteraction() {
    // Define the event listener function
    function playMusicOnce() {
        // Check the condition before starting the music
        if (!audioPlayer.muteMusic && !audioPlayer.isMusicMakingSound() && startMusicInt++ < 500) {
            console.log("Trying to play music");
            audioPlayer.nextMusic();

            // Remove the event listener after playing the music once
            canvas.removeEventListener('click', playMusicOnce);
            canvas.removeEventListener('touchstart', playMusicOnce);
        }
    }

    // Attach the event listener for both 'click' and 'touchstart' (for mobile support)
    canvas.addEventListener('click', playMusicOnce);
    canvas.addEventListener('touchstart', playMusicOnce);
}

startMusicOnInteraction();
setPlayerName();
