const textSettings = {
    font: 'Arial',
    fontSize: 30,
    color: 'white'
};

const texts = []; // Array holding all text objects

class TextObject {
    constructor(
        text,
        anchor = 'center',
        offset = { x: 0, y: 0 },
        fontSize = textSettings.fontSize,
        color = textSettings.color,
        font = textSettings.font,
        parentWindow = null,
        backgroundColor = 'transparent',
        selectedColor = 'gray',
        fadeInPeriod = 1000,  // Duration for fade-in (milliseconds)
        fadeOutPeriod = 1000, // Duration for fade-out (milliseconds)
        lifeSpan = 5000,      // Total lifespan (milliseconds)
        target = { x: 0, y: 0 }, // Target position to move toward
        action = undefined     // Action to trigger when clicked
    ) {
        this.text = text;
        this.anchor = anchor;
        this.offset = offset;
        this.fontSize = fontSize;
        this.color = color;
        this.font = font;
        this.parentWindow = parentWindow;
        this.backgroundColor = backgroundColor;
        this.selectedColor = selectedColor;
        this.fadeInPeriod = fadeInPeriod;
        this.fadeOutPeriod = fadeOutPeriod;
        this.lifeSpan = lifeSpan;
        this.target = target;
        this.action = action;  // The click action for this object
        this.isSelected = false;
        this.hitbox = { x: 0, y: 0, width: 0, height: 0 };

        this.startTime = Date.now(); // When the object was created
        this.opacity = 0;            // Initial opacity
        texts.push(this);            // Add the text object to the global texts array
    }

    draw(ctx) {
        const parent = this.parentWindow || ctx.canvas;
        const parentWidth = parent.width;
        const parentHeight = parent.height;

        ctx.font = `${this.fontSize}px "${this.font}"`;
        const textWidth = ctx.measureText(this.text).width;
        const textHeight = this.fontSize; // Simplified approximation of text height

        let x = 0;
        let y = 0;

        // Handle horizontal anchor points
        if (this.anchor.includes('left')) {
            x = 0;
        } else if (this.anchor.includes('center')) {
            x = parentWidth / 2 - textWidth / 2;
        } else if (this.anchor.includes('right')) {
            x = parentWidth - textWidth;
        }

        // Handle vertical anchor points
        if (this.anchor.includes('top')) {
            y = textHeight; // Start at text height since y refers to the baseline
        } else if (this.anchor.includes('center')) {
            y = parentHeight / 2 + textHeight / 2;
        } else if (this.anchor.includes('bottom')) {
            y = parentHeight - textHeight / 4; // Adjust for descenders
        }

        // Apply offsets to x and y
        x += this.offset.x;
        y += this.offset.y;

        // Calculate time elapsed
        const elapsedTime = Date.now() - this.startTime;

        // Fade-in logic
        if (elapsedTime < this.fadeInPeriod) {
            this.opacity = elapsedTime / this.fadeInPeriod;
        }
        // Move logic during lifetime
        else if (elapsedTime < this.lifeSpan - this.fadeOutPeriod) {
            this.opacity = 1; // Fully visible during main lifetime

            // Calculate progress toward the target
            const progress = (elapsedTime - this.fadeInPeriod) / (this.lifeSpan - this.fadeInPeriod - this.fadeOutPeriod);
            x = x + (this.target.x - x) * progress;
            y = y + (this.target.y - y) * progress;
        }
        // Fade-out logic
        else if (elapsedTime < this.lifeSpan) {
            const fadeOutTime = elapsedTime - (this.lifeSpan - this.fadeOutPeriod);
            this.opacity = 1 - fadeOutTime / this.fadeOutPeriod;
        }
        // After lifeSpan is completed
        else {
            this.removeText();
            return; // Stop drawing the text
        }

        // Set hitbox for interaction detection
        this.hitbox = {
            x: x,
            y: y - textHeight, // Move hitbox up since text is drawn from the baseline
            width: textWidth,
            height: textHeight
        };

        // Check for hover and selection (click)
        if (this.isInsideHitbox(mousePosition)) {
            // If hovering, change color to selectedColor
            this.isSelected = true;

            // Handle click and trigger action
            if (isClicking && this.action) {
                this.action();  // Trigger the action if clicked
            }
        } else {
            this.isSelected = false;
        }

        // Draw background (hitbox) if visibleBackground is true
        if (this.backgroundColor !== 'transparent') {
            ctx.fillStyle = this.backgroundColor;
            ctx.globalAlpha = this.opacity; // Apply opacity for fade in/out
            ctx.fillRect(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
        }

        // Set text color based on selection state
        if (this.isSelected) {
            ctx.fillStyle = this.selectedColor;
        } else {
            ctx.fillStyle = this.color;
        }

        // Set opacity for text
        ctx.globalAlpha = this.opacity;

        // Draw the text on the canvas
        ctx.fillText(this.text, x, y);

        // Reset globalAlpha after drawing
        ctx.globalAlpha = 1;
    }

    // Utility function to check if the mouse/tap is inside the hitbox
    isInsideHitbox(mousePosition) {
        return (
            mousePosition.x >= this.hitbox.x &&
            mousePosition.x <= this.hitbox.x + this.hitbox.width &&
            mousePosition.y >= this.hitbox.y &&
            mousePosition.y <= this.hitbox.y + this.hitbox.height
        );
    }

    // Remove this text from the global texts array
    removeText() {
        const index = texts.indexOf(this);
        if (index > -1) {
            texts.splice(index, 1); // Remove the text from the texts array
        }
    }
}

// Function to draw all texts
function drawTexts(ctx) {
    texts.forEach(t => t.draw(ctx));
}

// Example functions to create different types of text objects
function writeText(text, anchor = "center", offset = { x: 0, y: 0 }, color = textSettings.color) {
    return new TextObject(text, anchor, offset, textSettings.fontSize, color, textSettings.font);
}

function writePopup(text, origin, target, lifeSpan, color = textSettings.color) {
    return new TextObject(text, 'center', origin, textSettings.fontSize, color, textSettings.font, null, 'transparent', 'gray', 1000, 1000, lifeSpan, target);
}

function writeButton(text, onClickAction, anchor = 'center', offset = { x: 0, y: 0 }, colors = ['white', 'gray', 'black']) {
    return new TextObject(text, anchor, offset, textSettings.fontSize, colors[0], textSettings.font, null, 'transparent', colors[1], 0, 0, Infinity, { x: 0, y: 0 }, onClickAction);
}
