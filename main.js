const audioPlayer = new AudioPlayer();
audioPlayer.preloadMusic(['bgm1']);
audioPlayer.preloadSFX(['star', 'explosion1', 'gameover', 'shieldGain']);
// audioPlayer.preloadBGS(['bgs1']);
// audioPlayer.playSFX('sfx1');
// audioPlayer.playBGS('bgs1');          

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
            width: 30,
            height: 30,
            speed: 5,
            angle: 0,
            shields: 3,
            isImmortal: false,
            immortalTime: 0,
			hasShield: false
        };

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
				ctx.globalAlpha = Math.max(0.2, this.life / this.lifespan); // Reduce flickering by limiting alpha to minimum 0.2
				ctx.fillStyle = this.color;
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1.0;
			}

			update() {
				this.life -= 0.02 * timeScale;
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
				this.vertices = this.generateVertices();
				this.speed = 2 + Math.random() * 2;
				this.speed *= 1 + time * 0.00001;
				this.color = '#8B4513';
				this.isDanger = true;
				this.index = -1;
				this.isActive = true;
			}

			generateVertices() {
				const vertices = [];
				const sides = 5 + Math.floor(Math.random() * 4);
				const angleStep = (Math.PI * 2) / sides;
				for (let i = 0; i < sides; i++) {
					const radius = 15 + Math.random() * 15;
					vertices.push({
						x: this.x + Math.cos(i * angleStep) * radius,
						y: this.y + Math.sin(i * angleStep) * radius
					});
				}
				return vertices;
			}

			draw() {
				ctx.fillStyle = this.color;
				ctx.beginPath();
				ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
				for (let i = 1; i < this.vertices.length; i++) {
					ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
				}
				ctx.closePath();
				ctx.fill();
			}

			update() {
				this.y += this.speed * timeScale;
				this.vertices.forEach(vertex => vertex.y += this.speed * timeScale);
				if (this.y > canvas.height && this.isActive) {
					createObstacle();
					obstacles = obstacles.filter(item => item !== this);
					this.isActive = false;
				}
			}

			// Collision checking function
			checkCollision(object) {
				for (let i = 0; i < this.vertices.length; i++) {
					const vertex = this.vertices[i];
					const dx = vertex.x - object.x;
					const dy = vertex.y - object.y;
					const distance = Math.sqrt(dx * dx + dy * dy);
					
					// Check if the distance between object center and vertex is less than or equal to object's radius
					if (distance <= object.radius) {
						return true; // Collision detected
					}
				}
				return false; // No collision detected
			}
		}

        class Shield {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.speed = 2 + Math.random() * 2;
            }
			draw(scale = 0.8) {  // Default scale of 1 (no scaling if not provided)
				ctx.fillStyle = 'cyan';
				ctx.beginPath();

				// Scale all the coordinates by the provided scale factor

				// Move to top center of the shield
				ctx.moveTo(this.x, this.y - 30 * scale);  // Scale the vertical distance by the factor

				// Left side of the shield
				ctx.lineTo(this.x - 25 * scale, this.y - 25 * scale); // top-left
				ctx.lineTo(this.x - 22 * scale, this.y + 10 * scale); // mid-left
				ctx.lineTo(this.x, this.y + 25 * scale);              // bottom point

				// Right side of the shield
				ctx.lineTo(this.x + 22 * scale, this.y + 10 * scale); // mid-right
				ctx.lineTo(this.x + 25 * scale, this.y - 25 * scale); // top-right

				ctx.closePath(); // Connect back to the top point
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
        
        function drawPlayer() {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.angle);
            if (player.isImmortal && !player.hasShield) {
                ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5; // Flashing effect
            }
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.moveTo(0, -20); // Tip of the spaceship
            ctx.lineTo(-15, 15); // Left wing
            ctx.lineTo(-5, 10);
            ctx.lineTo(0, 15);
            ctx.lineTo(5, 10);
            ctx.lineTo(15, 15); // Right wing
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(-5, 10);
            ctx.lineTo(0, -10);
            ctx.lineTo(5, 10);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'teal';
            ctx.beginPath();
            ctx.arc(0, -5, 4, 0, Math.PI * 2); // Cockpit
            ctx.fill();
            ctx.restore();
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

            // Backward movement - smaller particles facing forward
            if (keysPressed['ArrowDown'] || keysPressed['s']) {
                for (let i = 0; i < 3; i++) {
                    let color = ['#00FFFF', '#0000FF', '#800080'][Math.floor(Math.random() * 3)];
                    let size = Math.random() * 1.5 + 0.5;
                    let direction = -Math.PI / 2 + (Math.random() - 0.5) * 0.1; // General upward direction with slight randomness
                    particles.push(new Particle(player.x, player.y - 10, color, size, 0.3, direction));
                }
            }

            // Sideward movement - small particles from wing tips
            if (keysPressed['ArrowLeft'] || keysPressed['a']) {
                for (let i = 0; i < 3; i++) {
                    let color = ['#00FFFF', '#0000FF', '#800080'][Math.floor(Math.random() * 3)];
                    let size = Math.random() * 1.5 + 0.5;
                    let direction = Math.PI + (Math.random() - 0.5) * 0.2; // General leftward direction from right wing tip
                    particles.push(new Particle(player.x + 15, player.y + 15, color, size, 0.3, direction));
                }
            }
            if (keysPressed['ArrowRight'] || keysPressed['d']) {
                for (let i = 0; i < 3; i++) {
                    let color = ['#00FFFF', '#0000FF', '#800080'][Math.floor(Math.random() * 3)];
                    let size = Math.random() * 1.5 + 0.5;
                    let direction = 0 + (Math.random() - 0.5) * 0.2; // General rightward direction from left wing tip
                    particles.push(new Particle(player.x - 15, player.y + 15, color, size, 0.3, direction));
                }
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
                obstacle.vertices.forEach(vertex => {
                    const distX = vertex.x - player.x;
                    const distY = vertex.y - player.y;
                    const distance = Math.sqrt(distX * distX + distY * distY);
                    if (distance < 20) {
                        handleCollision(obstacle, index);
                    }
                });
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
				player.hasShield = false;
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
            }
        }

        function handleShieldPickup(index) {
			audioPlayer.playSFX('shieldGain');
            if (player.shields < 3) {
                player.shields += 1;
            }
            score += 5;
            shields.splice(index, 1);
            grantImmortality();
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

		let gameoverMessage = "Game Over! Press R to Restart";
        function draw() {
			drawBackground();
			updateParticles();
			drawObstacles();
			drawShields();
			drawGoldStars();
			drawPlayer();
			drawShieldCircle();
			writeText('🛡 '.repeat(player.shields), 30, 30);
			writeText(score, 35, 70);

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
            if ((keysPressed['ArrowLeft'] || keysPressed['a']) && player.x > 0) {
                player.x -= player.speed * timeScale;
                player.angle = -0.3;
            }
            if ((keysPressed['ArrowRight'] || keysPressed['d']) && player.x < canvas.width) {
                player.x += player.speed * timeScale;
                player.angle = 0.3;
            }
            if ((keysPressed['ArrowUp'] || keysPressed['w']) && player.y > 0) {
                player.y -= player.speed * timeScale;
            }
            if ((keysPressed['ArrowDown'] || keysPressed['s']) && player.y < canvas.height) {
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