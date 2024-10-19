class Particle {
			constructor(x, y, color, size, lifespan, direction, speedMod = 1) {
				this.x = x;
				this.y = y;
				this.color = color;
				this.size = size;
				this.lifespan = lifespan * (0.9 + Math.random() * 0.2); // Vary lifespan by 10%
				this.life = this.lifespan;
				this.direction = direction + (Math.random() - 0.5) * 0.2; // Slightly randomize the direction
				this.speed = 1; // Default speed, to be modified by the explosion function
				this.speed *= speedMod;
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
			this.speed *= 1 + time * progressionSpeed;
			this.isActive = true;
		}

		// Update method for movement and rotation
		update() {
			this.y += this.speed * timeScale;

			// Update rotation
			this.rotationAngle += this.rotationSpeed * timeScale;

			// Check if obstacle moves off the screen
			if (this.y > canvas.height && this.isActive) {
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

			// Check for collision
			if (distance <= object.radius + asteroidRadius) {
				return true; // Collision detected
			}
			return false; // No collision
		}

	}

		class Shield {
			constructor(x, y) {
				this.x = x;
				this.y = y;
				this.speed = 2 + Math.random() * 2;
				this.speed *= 1 + time * progressionSpeed;
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
					this.speed *= 1 + time * progressionSpeed;
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