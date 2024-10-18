let gamepadIndex = null;

// Listen for gamepad connection
window.addEventListener('gamepadconnected', (e) => {
    gamepadIndex = e.gamepad.index;
    console.log('Gamepad connected at index ' + gamepadIndex);
});

// Listen for gamepad disconnection
window.addEventListener('gamepaddisconnected', () => {
    console.log('Gamepad disconnected');
    gamepadIndex = null;
});

// Update gamepad inputs
function handleGamepadInput() {
    if (gamepadIndex !== null) {
        let gamepad = navigator.getGamepads()[gamepadIndex];

        // Get the left analog stick values (axes[0] = left-right, axes[1] = up-down)
        let leftX = gamepad.axes[0];
        let leftY = gamepad.axes[1];

        // Apply deadzone for stick drift
        if (Math.abs(leftX) > 0.1 || Math.abs(leftY) > 0.1) {
            // Apply movement
            player.x += leftX * player.speed * timeScale;
            player.y += leftY * player.speed * timeScale;
        }
    }
}
