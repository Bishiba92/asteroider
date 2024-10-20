// CacheManager.js
var Managers = Managers || {};

let db;

const DB_NAME = "AsteroiderDatabase";
const OBJECT_STORE_NAME = "MyObjectStore";
const DB_VERSION = 1; // Change this if you need to upgrade the database

// Open the database connection
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        db.createObjectStore(OBJECT_STORE_NAME, { keyPath: "id" });
      }
    };

    openRequest.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    openRequest.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

// Save to storage
const saveToStorage = async (id, data, objectCacheType) => {
  const db = await openDatabase();
  data.objectCacheType = objectCacheType || data.objectCacheType || "baseType";
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OBJECT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    const putRequest = store.put({ id, data }); // Save the data in an object with the given id

    putRequest.onsuccess = () => {
      resolve(putRequest.result);
    };

    putRequest.onerror = () => {
      reject(putRequest.error);
    };
  }).then((data) => {
    setStorageSize();
    return data;
  });
};

// Load from storage
const loadFromStorage = async (id) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OBJECT_STORE_NAME, "readonly");
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      if (getRequest.result && getRequest.result.data) {
        resolve(getRequest.result.data); // Extract the data from the object
      } else resolve();
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  }).then(setStorageSize());
};

// Get all objects of a specific objectCacheType from storage
const loadAllOfTypeFromStorage = async (objectCacheType) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OBJECT_STORE_NAME, "readonly");
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    const cursorRequest = store.openCursor();

    let results = [];

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.data && cursor.value.data.objectCacheType === objectCacheType) {
          results.push(cursor.value.data);
        }
        cursor.continue();
      } else {
        // No more entries
        resolve(results);
      }
    };

    cursorRequest.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

// Delete from storage
const deleteFromStorage = async (id) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OBJECT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    const deleteRequest = store.delete(id);

    deleteRequest.onsuccess = () => {
      resolve(deleteRequest.result);
    };

    deleteRequest.onerror = () => {
      reject(deleteRequest.error);
    };
  });
};

// Clear storage
const clearStorage = async () => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OBJECT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      resolve(clearRequest.result);
    };

    clearRequest.onerror = () => {
      reject(clearRequest.error);
    };
  });
};

// Get storage size
const setStorageSize = async () => {
  const db = await openDatabase();
  new Promise((resolve, reject) => {
    const transaction = db.transaction(OBJECT_STORE_NAME, "readonly");
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    const cursorRequest = store.openCursor();

    let size = 0;

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const storedObject = cursor.value;
        const jsonString = JSON.stringify(storedObject);
        size += new Blob([jsonString]).size;
        cursor.continue();
      } else {
        // no more results, return size
        resolve(size);
      }
    };

    cursorRequest.onerror = () => {
      reject(cursorRequest.error);
    };
  }).then((size) => (CacheManager.size = `${size / 1000000} MB`));
};

// Check if a document exists in storage
const existsInStorage = async (id) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OBJECT_STORE_NAME, "readonly");
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        resolve(true); // The document exists
      } else {
        resolve(false); // The document does not exist
      }
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
};

// Updated Help function for CacheManager
const helpCacheManager = () => {
  console.log("CacheManager Help Guide");
  console.log("----------------------");
  console.log("The CacheManager object provides methods to interact with the indexedDB storage.");
  console.log();
  console.log("Methods:");
  console.log("1. save(id, data, objectCacheType): Saves data with a specified id to the storage.");
  console.log("   - id: A unique identifier for the data.");
  console.log("   - data: The data to be saved.");
  console.log("   - objectCacheType (optional): A type identifier for the data. If data already has 'objectCacheType', it won't be overwritten.");
  console.log();
  console.log("2. load(id): Loads data from the storage using the specified id.");
  console.log("   - id: The identifier of the data to be loaded.");
  console.log();
  console.log("3. loadTypes(objectCacheType): Retrieves all objects of a specified objectCacheType.");
  console.log("   - objectCacheType: The type identifier of the objects to retrieve.");
  console.log();
  console.log("4. delete(id): Deletes data from the storage with the specified id.");
  console.log("   - id: The identifier of the data to be deleted.");
  console.log();
  console.log("5. clear(): Clears all data from the storage.");
  console.log();
  console.log("6. exists(id): Checks if data with the specified id exists in the storage.");
  console.log("   - id: The identifier of the data to check.");
  console.log();
  console.log("7. size: Displays the current size of the storage in MB.");
};


// Add the new function to the StorageManager
const CacheManager = {
  save: saveToStorage,
  load: loadFromStorage,
  loadTypes: loadAllOfTypeFromStorage,
  delete: deleteFromStorage,
  clear: clearStorage,
  exists: existsInStorage,
  help: helpCacheManager,
  size: "0 MB",
};

Managers.Cache = CacheManager;
