let gamepadIndex = null;
let gamepadConnected = false;

// Listen for gamepad connection
window.addEventListener('gamepadconnected', (e) => {
    gamepadIndex = e.gamepad.index;
	gamepadConnected = true;
    console.log('Gamepad connected at index ' + gamepadIndex);
});

// Listen for gamepad disconnection
window.addEventListener('gamepaddisconnected', () => {
    console.log('Gamepad disconnected');
	gamepadConnected = false;
    gamepadIndex = null;
});

// Handle gamepad input in the menu
function handleGamepadInput() {
    if (gamepadIndex !== null) {
        let gamepad = navigator.getGamepads()[gamepadIndex];

        if (gamepad.buttons[0].pressed) { // A button or X (on PS controllers)
            handleMenuSelection(); // Select current option
        }

        let leftY = gamepad.axes[1];

        if (leftY < -0.5) { // Navigate up
            selectedMenuOption = (selectedMenuOption - 1 + menuOptions.length) % menuOptions.length;
        } else if (leftY > 0.5) { // Navigate down
            selectedMenuOption = (selectedMenuOption + 1) % menuOptions.length;
        }
    }
}