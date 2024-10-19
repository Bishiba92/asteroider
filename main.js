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
			radius: 20,
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
        
		class Particle {
			constructor(x, y, color, size, lifespan, direction) {
				this.x = x;
				this.y = y;
				this.color = color;
				this.size = size;
				this.lifespan = lifespan * (0.9 + Math.random() * 0.2); // Vary lifespan by 10%
				this.life = this.lifespan;
				this.direction = direction + (Math.random() - 0.5) * 0.2; // Slightly randomize the direction
				this.speed = 1; // Default speed, to be modified by the explosion function
			}

			draw() {
				ctx.globalAlpha = Math.max(0, this.life / this.lifespan); // Reduce flickering by limiting alpha to minimum 0.2
				ctx.fillStyle = this.color;
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1.0;
			}

			update() {
				this.life -= 0.02 * timeScale;
				const lifeRatio = this.life / this.lifespan;
				
				// Cubic easing for size fade-out: starts slow, accelerates near the end
				//this.size = Math.max(0, this.size * (lifeRatio ** 2)); 
				
				// Use this.speed to move the particle
				this.x += Math.cos(this.direction) * this.speed * timeScale;
				this.y += Math.sin(this.direction) * this.speed * timeScale;
			}

			isAlive() {
				return this.life > 0;
			}
		}

	class Obstacle {
		constructor(x, y) {
			this.x = x;
			this.y = y;

			// Select a random asteroid image from asteroid0.png to asteroid9.png
			const randomIndex = Math.floor(Math.random() * 10);
			this.image = new Image();
			this.image.src = `asteroid${randomIndex}.png`;

			// Set initial size and scale factor (randomized by ±5%)
			this.baseSize = 50; // Example base size, you can adjust this
			this.scale = 0.95 + Math.random() * 0.1; // Random scale factor between 0.95 to 1.05
			this.width = this.baseSize * this.scale;
			this.height = this.baseSize * this.scale;

			// Rotation per tick (randomized between 0 to 0.1 degrees per tick)
			this.rotationSpeed = Math.random() * 0.1; // Rotation speed per tick in degrees
			this.rotationAngle = Math.random() * 360 - 180; // Initial rotation angle

			this.speed = 2 + Math.random() * 2;
			this.speed *= 1 + time * 0.00001;
			this.isActive = true;
		}

		// Update method for movement and rotation
		update() {
			this.y += this.speed * timeScale;

			// Update rotation
			this.rotationAngle += this.rotationSpeed * timeScale;

			// Check if obstacle moves off the screen
			if (this.y > canvas.height && this.isActive) {
				createObstacle();
				obstacles = obstacles.filter(item => item !== this);
				this.isActive = false;
			}
		}

		// Draw method to render the asteroid image with rotation
		draw() {
			ctx.save(); // Save current context
			ctx.translate(this.x + this.width / 2, this.y + this.height / 2); // Move to the center of the asteroid
			ctx.rotate((this.rotationAngle * Math.PI) / 180); // Rotate based on rotationAngle
			ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height); // Draw image
			ctx.restore(); // Restore original context
		}

		// Collision detection method using object's radius and scaled size
		checkCollision(object) {
			// Calculate the center of the asteroid
			const asteroidCenterX = this.x + this.width / 2;
			const asteroidCenterY = this.y + this.height / 2;

			// Calculate distance between the asteroid center and the object's (player's) center
			const dx = asteroidCenterX - object.x;
			const dy = asteroidCenterY - object.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			// Calculate the radius of the asteroid using the larger of width or height
			const asteroidRadius = Math.max(this.width, this.height) / 2;

			// Debug logging
			console.log("Asteroid Center:", asteroidCenterX, asteroidCenterY);
			console.log("Player Position:", object.x, object.y);
			console.log("Distance:", distance);
			console.log("Asteroid Radius:", asteroidRadius);
			console.log("Player Radius:", object.radius);

			// Check for collision
			if (distance <= object.radius + asteroidRadius) {
				console.log('Collision detected');
				return true; // Collision detected
			}
			console.log('No collision detected');
			return false; // No collision
		}

	}

		class Shield {
			constructor(x, y) {
				this.x = x;
				this.y = y;
				this.speed = 2 + Math.random() * 2;
				this.scale = 1;
				this.baseSize = 50;

				// Load the base shield, glow, and shine images
				this.image = new Image();
				this.image.src = 'shield.png'; // Base shield

				this.glowImage = new Image();
				this.glowImage.src = 'shieldGlow.png'; // Glowing overlay

				this.shineImage = new Image();
				this.shineImage.src = 'shieldShine.png'; // Extra feathered glow

				// Default dimensions
				this.width = this.baseSize * this.scale;
				this.height = this.baseSize * this.scale;

				// Alpha values for smooth pulsing (use sine wave over time)
				this.pulseSpeed = 0.05; // Control how fast both effects pulse
				this.pulseTime = 0;
				this.alphaDrift = 1.0; // Initial alpha for the main glow
				this.shineAlphaDrift = 1.0; // Initial alpha for the secondary shine
			}

			// Draw the shield with both glowing and shine overlays
			draw() {
				ctx.save(); // Save current context
				ctx.translate(this.x, this.y); // Move to the shield's position

				// Draw the base shield image if it's loaded
				if (this.image.complete) {
					ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
				}

				// Smooth pulsing effect for the glow using a sine wave
				this.pulseTime += this.pulseSpeed;
				this.alphaDrift = 0.7 + Math.sin(this.pulseTime) * 0.3; // Alpha value between 0.7 and 1.0 for the glow
				this.shineAlphaDrift = 0.5 + Math.sin(this.pulseTime * 0.8) * 0.2; // Lower alpha for the shine, between 0.5 and 0.7

				// Draw the main glow overlay (shieldGlow.png)
				ctx.globalCompositeOperation = 'screen'; // Blend mode for soft glow
				ctx.globalAlpha = this.alphaDrift; // Alpha for the main glow
				if (this.glowImage.complete) {
					ctx.drawImage(this.glowImage, -this.width / 2, -this.height / 2, this.width, this.height);
				}

				// Draw the secondary shine overlay (shieldShine.png) with lower alpha
				ctx.globalAlpha = this.shineAlphaDrift; // Lower alpha for the secondary shine
				if (this.shineImage.complete) {
					ctx.drawImage(this.shineImage, -this.width / 2, -this.height / 2, this.width, this.height);
				}

				// Reset context settings
				ctx.globalAlpha = 1.0;
				ctx.globalCompositeOperation = 'source-over'; // Reset to default composition mode
				ctx.restore(); // Restore original context
			}

			update() {
				this.y += this.speed * timeScale;
				if (this.y > canvas.height) {
					this.y = -30;
					this.x = Math.random() * (canvas.width - 30);
				}
			}
		}
		
        class GoldStar {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.speed = 2 + Math.random() * 2;
            }
			draw() {
				ctx.fillStyle = 'gold';
				ctx.beginPath();

				// Variables for star points
				const outerRadius = 15;
				const innerRadius = 7;
				const points = 5;
				const step = Math.PI / points;

				// Draw a 5-pointed star
				for (let i = 0; i < 2 * points; i++) {
					const radius = i % 2 === 0 ? outerRadius : innerRadius;
					const angle = i * step;
					const x = this.x + Math.cos(angle) * radius;
					const y = this.y + Math.sin(angle) * radius;
					ctx.lineTo(x, y);
				}
				        
				ctx.closePath();
				ctx.fill();
			}
            update() {
                this.y += this.speed * timeScale;
                if (this.y > canvas.height) {
                    this.y = -30;
                    this.x = Math.random() * (canvas.width - 30);
                }
            }
        }
        
        // function drawPlayer() {
            // ctx.save();
            // ctx.translate(player.x, player.y);
            // ctx.rotate(player.angle);
            // if (player.isImmortal && !player.hasShield) {
                // ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5; // Flashing effect
            // }
            // ctx.fillStyle = 'white';
            // ctx.beginPath();
            // ctx.moveTo(0, -20); // Tip of the spaceship
            // ctx.lineTo(-15, 15); // Left wing
            // ctx.lineTo(-5, 10);
            // ctx.lineTo(0, 15);
            // ctx.lineTo(5, 10);
            // ctx.lineTo(15, 15); // Right wing
            // ctx.closePath();
            // ctx.fill();
            // ctx.fillStyle = 'red';
            // ctx.beginPath();
            // ctx.moveTo(-5, 10);
            // ctx.lineTo(0, -10);
            // ctx.lineTo(5, 10);
            // ctx.closePath();
            // ctx.fill();
            // ctx.fillStyle = 'teal';
            // ctx.beginPath();
            // ctx.arc(0, -5, 4, 0, Math.PI * 2); // Cockpit
            // ctx.fill();
            // ctx.restore();
            // ctx.globalAlpha = 1.0; // Reset transparency
        // }
		
		// Draw player as PNG
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
            if (Math.random() < 0.001) { // 5% chance of spawning
                const x = Math.random() * (canvas.width - 30);
                const y = -30;
                shields.push(new Shield(x, y));
            }
        }

        function createGoldStar() {
            if (Math.random() < 0.004) { // 3% chance of spawning
                const x = Math.random() * (canvas.width - 30);
                const y = -30;
                goldStars.push(new GoldStar(x, y));
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
				
                if (distance <80) {
					createParticleExplosion(star.x, star.y, 100, 1, 0.5, 2, ['#FFD700', '#FFD700', '#FFD700', '#FF4500']);
                    handleGoldStarPickup(index);
                }
            });
        }

        function handleCollision(obstacle, index) {
            if (player.shields > 0) {
                if (!player.isImmortal) player.shields -= 1;
                createExplosion(obstacle.x, obstacle.y);
                obstacles.splice(index, 1); // Remove the obstacle on impact
				createObstacle();
                if (!player.isImmortal) grantImmortality();
				audioPlayer.playSFX('explosion1');
                if (player.shields === 0) {
                    isGameOver = true;
					createParticleExplosion(player.x, player.y, 100, 1, 0.5, 2, ['#FFD700', '#FFD700', '#FFD700', '#FF4500']);
					audioPlayer.playSFX('gameover');
					timeScale = 0.01;
					
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
            grantImmortality(60*6);
			player.hasShield = true;
        }

        function handleGoldStarPickup(index) {
			audioPlayer.playSFX('star');
            score += 10;
            goldStars.splice(index, 1);
        }

        function grantImmortality(t = 2) {
			t *= 60;
			if (t > player.immortalTime) player.immortalTime = t;
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
				speed *= 1 + time * 0.00001
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
		
		function writeText(text, x, y, fontSize = 30, color = 'white', align = 'left') {
			ctx.fillStyle = color;                      // Set the color for the text
			ctx.font = `${fontSize}px Arial`;           // Set the font size and font family
			const textWidth = ctx.measureText(text).width; // Measure the width of the text

			// Adjust the x position based on the alignment
			if (align === 'center') {
				x = x - textWidth / 2;  // Center align by moving x to the left by half the text width
			} else if (align === 'right') {
				x = x - textWidth;  // Right align by moving x to the left by the full text width
			}

			ctx.fillText(text, x, y);                   // Write the text at the specified (x, y) coordinates
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


		let gameoverMessage = "Game Over! Press R to Restart";
        function draw() {
			drawBackground();
			updateParticles();
			drawObstacles();
			drawShields();
			drawGoldStars();
			drawPlayer();
			drawShieldCircle();
			drawRemainingShields();
			writeText(score, 35, 120);

			if (isGameOver) {
				writeText(gameoverMessage, canvas.width / 2, canvas.height / 2, 30, "red", "center");
			}

			// Draw the joystick if active
			drawJoystick();
		}

		function gameLoop() {
			resizeCanvasToWindow();
			keepPlayerInBounds();
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Update the player based on joystick input
			updatePlayerFromJoystick();

			draw();
			if (!isGameOver) {
				time++;
				if (time % 30 == 0) score++;
				immortalTimer();
				if (time % 3000 == 0) createObstacle();
				checkCollision();
				updatePlayerPosition();
				createParticles();
				createShield();
				createGoldStar();

				// Draw virtual joystick (if active)
				drawJoystick();
			}
			
			requestAnimationFrame(gameLoop);
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
        function startGame() {
			if (restartInt++ > 0) location.reload();
			canvas.removeEventListener('mousedown', startGame);
			canvas.removeEventListener('touchstart', startGame);
			canvas.addEventListener('mousedown', startJoystick);
			canvas.addEventListener('touchstart', startJoystick);
			
			timeScale = 1;
			audioPlayer.playMusic('bgm1')
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
            for (let i = 0; i < 5; i++) {
                createObstacle();
            }
            gameLoop();
        }

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