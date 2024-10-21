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
			this.image.src = `img/asteroid${randomIndex}.png`;

			// Set initial size and scale factor (randomized by ±5%)
			this.baseSize = 50; // Example base size, you can adjust this
			this.scale = 0.95 + Math.random() * 0.1; // Random scale factor between 0.95 to 1.05
			this.width = this.baseSize * this.scale;
			this.height = this.baseSize * this.scale;

			// Rotation per tick (randomized between 0 to 0.1 degrees per tick)
			this.rotationSpeed = Math.random() * 0.1; // Rotation speed per tick in degrees
			this.rotationAngle = Math.random() * 360 - 180; // Initial rotation angle

			this.speed = 2 + Math.random() * 2;
			this.speed *= timeMod;
			this.isActive = true;
		}

		// Update method for movement and rotation
		update() {
			this.y += this.speed * timeScale;

			// Update rotation
			this.rotationAngle += this.rotationSpeed * timeScale;

			// Check if obstacle moves off the screen
			if (this.y > canvas.height + 50 && this.isActive) {
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
				this.speed *= timeMod;
				this.scale = 1;
				this.baseSize = 50;

				// Load the base shield, glow, and shine images
				this.image = new Image();
				this.image.src = 'img/shield.png'; // Base shield

				this.glowImage = new Image();
				this.glowImage.src = 'img/shieldGlow.png'; // Glowing overlay

				this.shineImage = new Image();
				this.shineImage.src = 'img/shieldShine.png'; // Extra feathered glow

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
				if (this.y > canvas.height + 50) {
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
					this.speed *= timeMod;
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
                if (this.y > canvas.height + 50) {
                    this.y = -30;
                    this.x = Math.random() * (canvas.width - 30);
                }
            }
        }
class ImageObject {
    constructor(imgName, pos, scale = 1, rotation = 0) {
        this.imgName = imgName;
        this.img = new Image();
        this.img.src = `img/${imgName}.png`; // Base image path
        this.pos = { ...pos }; // {x, y} position
        this.scale = scale;
        this.rotation = rotation;
        this.width = 0;
        this.height = 0;

        // Preloaded images (initialized first to prevent accidental overwriting)
        this.selectedImg = null;
        this.clickedImg = null;

        // Flags for selected and clicked states
        this.isSelected = false;
        this.isClicked = false;

        // Initially set hasSelected and hasClicked to false
        this.hasSelected = false;
        this.hasClicked = false;

        // Preload the selected and clicked images if they exist
        this.preloadImage(`${imgName}_Selected`, 'selectedImg', 'hasSelected');
        this.preloadImage(`${imgName}_Clicked`, 'clickedImg', 'hasClicked');

        // Allow override to disable click and select checks
        this.overrideClickSelect = false;

        // Load the base image to get the dimensions
        this.img.onload = () => {
            this.width = this.img.width * this.scale;
            this.height = this.img.height * this.scale;
        };

        // For transitions
        this.moveFrames = 0;
        this.moveFrameCount = 0;
        this.startPos = { x: 0, y: 0 };
        this.targetPos = { x: 0, y: 0 };

        this.scaleFrames = 0;
        this.scaleFrameCount = 0;
        this.startScale = 1;
        this.targetScale = 1;

        this.rotateFrames = 0;
        this.rotateFrameCount = 0;
        this.startRotation = 0;
        this.targetRotation = 0;
		
		  this.onClick = null;
    }

    // Preload an image, and set the respective image and flag properties if the image exists
    preloadImage(imagePath, imageProperty, flagProperty) {
        const img = new Image();
        img.src = `img/${imagePath}.png`;

        img.onload = () => {
            if (img.complete && img.naturalHeight !== 0) {
                this[imageProperty] = img; // Set the preloaded image
                this[flagProperty] = true; // Set the flag to true if the image exists
            }
        };

        img.onerror = () => {
            this[flagProperty] = false; // Set the flag to false if the image does not exist
        };
    }

    // Method to programmatically set the selected state (for keyboard input)
    setSelected(selected) {
        this.isSelected = selected;
    }
	
	    changeImage(newImgName) {
        this.imgName = newImgName;
        this.img.src = `img/${newImgName}.png`; // Change the base image

        // Preload the new selected and clicked images (reset previous state)
        this.hasSelected = false;
        this.hasClicked = false;
        this.selectedImg = null;
        this.clickedImg = null;

        // Preload the selected and clicked versions of the new image
        this.preloadImage(`${newImgName}_Selected`, 'selectedImg', 'hasSelected');
        this.preloadImage(`${newImgName}_Clicked`, 'clickedImg', 'hasClicked');
    }

    // Draws the image on the canvas, applying the correct image based on selection/click states
    draw() {
        if (this.width === 0 || this.height === 0) return; // Prevent drawing before the image is loaded

        this.update(); // Update the image state for this frame

        ctx.save(); // Save the canvas state
        ctx.translate(this.pos.x, this.pos.y); // Move the canvas origin to the position
        ctx.rotate(this.rotation); // Apply rotation

        // Choose the image to draw based on selected/clicked state
        let imageToDraw = this.img;

        // Use the preloaded selected or clicked images if applicable
        if (this.isClicked && this.hasClicked) {
            imageToDraw = this.clickedImg;
        } else if (this.isSelected && this.hasSelected) {
            imageToDraw = this.selectedImg;
        }

        ctx.drawImage(
            imageToDraw,
            -this.width / 2, // Offset x by half width to center
            -this.height / 2, // Offset y by half height to center
            this.width,
            this.height
        );
        ctx.restore(); // Restore the canvas state
    }

    // Updates the image's selected and clicked states
    update() {
        // Update position, scale, and rotation transitions
        this.updateTransitions();

        // If overrideClickSelect is true, do not check for selection or clicking
        if (!this.overrideClickSelect) {
            // Update selected and clicked states only if applicable
            if (this.hasSelected) {
                this.isSelected = this.checkIfSelected(); // Only update if not selected via keyboard
            }
            if (this.hasClicked) {
                this.isClicked = this.isSelected && isClicking;
					if (this.isClicked && this.onClick != null) this.onClick();
            }
        }
    }

    // Updates transitions (position, scale, rotation) based on frame count
    updateTransitions() {
        // Handle position transition (if moveFrames > 0, the transition is active)
        if (this.moveFrames > 0) {
            this.moveFrameCount++;
            const fraction = Math.min(this.moveFrameCount / this.moveFrames, 1);

            this.pos.x = this.startPos.x + (this.targetPos.x - this.startPos.x) * fraction;
            this.pos.y = this.startPos.y + (this.targetPos.y - this.startPos.y) * fraction;

            if (fraction === 1) {
                this.moveFrames = 0; // End transition
            }
        }

        // Handle scale transition
        if (this.scaleFrames > 0) {
            this.scaleFrameCount++;
            const fraction = Math.min(this.scaleFrameCount / this.scaleFrames, 1);

            this.scale = this.startScale + (this.targetScale - this.startScale) * fraction;
            this.width = this.img.width * this.scale;
            this.height = this.img.height * this.scale;

            if (fraction === 1) {
                this.scaleFrames = 0; // End transition
            }
        }

        // Handle rotation transition
        if (this.rotateFrames > 0) {
            this.rotateFrameCount++;
            const fraction = Math.min(this.rotateFrameCount / this.rotateFrames, 1);

            this.rotation = this.startRotation + (this.targetRotation - this.startRotation) * fraction;

            if (fraction === 1) {
                this.rotateFrames = 0; // End transition
            }
        }
    }

    // Checks if the image is selected based on the mouse position
    checkIfSelected() {
        const left = this.pos.x - this.width / 2;
        const right = this.pos.x + this.width / 2;
        const top = this.pos.y - this.height / 2;
        const bottom = this.pos.y + this.height / 2;

        return (
            mousePosition.x >= left &&
            mousePosition.x <= right &&
            mousePosition.y >= top &&
            mousePosition.y <= bottom
        );
    }

    // Method to move the image to a new position over a specified number of frames
    moveToPoint(targetPos, transitionFrames = 1) {
        this.startPos = { ...this.pos }; // Store the starting position
        this.targetPos = { ...targetPos }; // Set the target position
        this.moveFrames = transitionFrames; // Number of frames for transition
        this.moveFrameCount = 0; // Reset frame counter
    }

    // Method to scale the image to a new scale over a specified number of frames
    scaleToSize(targetScale, transitionFrames = 1) {
        this.startScale = this.scale; // Store the current scale
        this.targetScale = targetScale; // Set the target scale
        this.scaleFrames = transitionFrames; // Number of frames for transition
        this.scaleFrameCount = 0; // Reset frame counter
    }

    // Method to rotate the image to a new angle over a specified number of frames
    rotateToAngle(targetRotation, transitionFrames = 1) {
        this.startRotation = this.rotation; // Store the current rotation
        this.targetRotation = targetRotation; // Set the target rotation
        this.rotateFrames = transitionFrames; // Number of frames for transition
        this.rotateFrameCount = 0; // Reset frame counter
    }
}
