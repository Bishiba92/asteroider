let joystick = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    radius: 50,
    angle: 0,
    distance: 0
};

function addJoystickToCanvas(canvas) {
    // Add event listeners for both mouse and touch events
    canvas.addEventListener('mousedown', startJoystick);
    canvas.addEventListener('touchstart', startJoystick);

    canvas.addEventListener('mousemove', moveJoystick);
    canvas.addEventListener('touchmove', moveJoystick);

    canvas.addEventListener('mouseup', endJoystick);
    canvas.addEventListener('touchend', endJoystick);
}

// Function to start the joystick when the user clicks or touches
function startJoystick(e) {
    let rect = canvas.getBoundingClientRect();
    joystick.startX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    joystick.startY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    joystick.currentX = joystick.startX;
    joystick.currentY = joystick.startY;
    joystick.active = true;
    joystick.distance = 0;  // Reset distance
}

// Function to move the joystick based on mouse or touch movement
function moveJoystick(e) {
    if (!joystick.active) return;

    let rect = canvas.getBoundingClientRect();
    joystick.currentX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    joystick.currentY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    let dx = joystick.currentX - joystick.startX;
    let dy = joystick.currentY - joystick.startY;
    joystick.distance = Math.sqrt(dx * dx + dy * dy);

    // Limit joystick movement to within its radius
    if (joystick.distance > joystick.radius) {
        let angle = Math.atan2(dy, dx);
        joystick.currentX = joystick.startX + Math.cos(angle) * joystick.radius;
        joystick.currentY = joystick.startY + Math.sin(angle) * joystick.radius;
        joystick.distance = joystick.radius; // Cap the distance
    }

    // Calculate joystick angle
    joystick.angle = Math.atan2(joystick.currentY - joystick.startY, joystick.currentX - joystick.startX);
}

// Function to stop the joystick when the mouse or touch is released
function endJoystick() {
    joystick.active = false;
    joystick.distance = 0;  // Reset distance when joystick is released
}

// Function to draw the joystick on the canvas
function drawJoystick() {
    if (joystick.active) {
        // Draw joystick base
        ctx.beginPath();
        ctx.arc(joystick.startX, joystick.startY, joystick.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.closePath();

        // Draw joystick handle
        ctx.beginPath();
        ctx.arc(joystick.currentX, joystick.currentY, 30, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        ctx.closePath();
    }
}

// Function to move the player based on the joystick position
function updatePlayerFromJoystick() {
    if (joystick.active && joystick.distance > 0) {
        let speed = (joystick.distance / joystick.radius) * player.speed;
        player.x += Math.cos(joystick.angle) * speed * timeScale;
        player.y += Math.sin(joystick.angle) * speed * timeScale;
    }
}
