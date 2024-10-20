// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "AIzaSyD6O9AD-sjEOS5rjnJncN2BZq4XRLqlJ0A",

  authDomain: "asteroider-3abfb.firebaseapp.com",

  projectId: "asteroider-3abfb",

  storageBucket: "asteroider-3abfb.appspot.com",

  messagingSenderId: "632296815864",

  appId: "1:632296815864:web:98531e81231a8ed2de0f0d",

  measurementId: "G-RR6PEV6Y08"

};


// Initialize Firebase

const app = firebase.initializeApp(firebaseConfig);
const firebaseDatabase = firebase.firestore(); // Initialize Firestore

// Function to set a specific field in a document
async function setField(collectionName, docId, fieldName, value) {
  try {
    console.log("setField:");
    console.table({ collectionName, docId, fieldName, value });

    const docRef = firebaseDatabase.doc(`${collectionName}/${docId}`);
    return await docRef.set({ [fieldName]: value }, { merge: true })
      .then(() => {
        console.log("Document successfully updated!");
      })
      .catch((error) => {
        console.error("Error updating document: ", error);
      });
  } catch (err) {
    console.error(`setField error: ${err}`);
    throw new Error(
      `setField failed. collectionName: ${collectionName} | docId: ${docId} | fieldName: ${fieldName} | value: ${value} | error: ${err}`,
    );
  }
}

async function updateLeaderboard(player, score) {
  const collectionName = "leaderboard";
  const docId = "list";
  const fieldName = player.name;

  try {
    console.log("Checking if score update is needed...");

    // Get the current player's data (if exists)
    const docRef = firebaseDatabase.doc(`${collectionName}/${docId}`);
    const docSnapshot = await docRef.get();
    
    let currentData = null;

    if (docSnapshot.exists) {
      const leaderboardData = docSnapshot.data();
      currentData = leaderboardData[fieldName];
    }

    // Check if the player already has a score
    if (currentData && currentData.score >= score) {
      // If the current score is greater than or equal to the new score, don't update
      console.log("Player already has a higher or equal score, no update required.");
      return;
    }

    // If no score exists or the new score is higher, update the leaderboard
    console.log("New high score! Updating leaderboard...");

    const newValue = { score: score, ship: player.ship };
	currentRecord = score;
    await setField(collectionName, docId, fieldName, newValue);
	
  } catch (error) {
    console.error("Error updating leaderboard: ", error);
  }
}

async function getRecord(playerName) {
  const collectionName = "leaderboard";
  const docId = "list";
  const fieldName = playerName;

  try {
    console.log(`Fetching record for player: ${playerName}`);

    // Reference to the leaderboard document
    const docRef = firebaseDatabase.doc(`${collectionName}/${docId}`);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      // Retrieve the data for the specific player
      const leaderboardData = docSnapshot.data();
      const playerData = leaderboardData[fieldName];

      if (playerData) {
        console.log(`Record found for player: ${playerName}`);
        console.table(playerData);
        return playerData; // Return the player's data (e.g., score, ship, etc.)
      } else {
        console.log(`No record found for player: ${playerName}`);
        return null; // Return null if the player does not exist in the leaderboard
      }
    } else {
      console.log("Leaderboard document does not exist.");
      return null; // Return null if the leaderboard document doesn't exist
    }
  } catch (error) {
    console.error(`Error fetching record for player: ${playerName}`, error);
    return null;
  }
}
/**
 * Fetches the leaderboard from the server and stores it in the global `leaderboard` variable.
 */
async function getLeaderboard() {
  const collectionName = "leaderboard";
  const docId = "list";

  try {
    console.log("Fetching the entire leaderboard...");

    // Reference to the leaderboard document
    const docRef = firebaseDatabase.doc(`${collectionName}/${docId}`);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      const leaderboardData = docSnapshot.data();

      // Convert the leaderboard object into an array for sorting
      leaderboard = Object.keys(leaderboardData).map((key) => {
        return { name: key, ...leaderboardData[key] };
      });

      // Sort the array by score in descending order
      leaderboard.sort((a, b) => b.score - a.score);

      console.log("Leaderboard successfully fetched and stored.");
    } else {
      console.log("No leaderboard data found.");
      leaderboard = []; // Reset the global leaderboard to an empty array if no data is found
    }
  } catch (error) {
    console.error("Error fetching leaderboard: ", error);
    leaderboard = []; // Handle error by resetting leaderboard to an empty array
  }
}

/**
 * Displays the leaderboard stored in the global `leaderboard` variable.
 */
function displayLeaderboard() {
  if (leaderboard.length === 0) {
    console.log("No leaderboard data available to display.");
    return;
  }

  console.log("Displaying leaderboard:");
  leaderboard.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.name}   ${entry.ship}   ${entry.score}`);
  });
}

// Function to set a cookie
function setCookie(name, value, minutes) {
  const d = new Date();
  d.setTime(d.getTime() + minutes * 60 * 1000);
  const expires = "expires=" + d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

// Function to get a cookie
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}
