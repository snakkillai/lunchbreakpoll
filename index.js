// ==========================================
// FIREBASE CONFIGURATION AND IMPORTS
// ==========================================

// Import Firebase modules from the CDN
// We're using Firebase v11.9.1 for the latest features and security updates
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push, 
    onValue, 
    update, 
    serverTimestamp,
    off,
    get
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

// Firebase project configuration
// This connects our app to your specific Firebase Realtime Database project
const firebaseConfig = {
    apiKey: "AIzaSyD7qJ3BZ3ppoA9zvT264OzOMkD9L7ls0-Q",
    authDomain: "lunchbreakpoll-c4ecc.firebaseapp.com",
    databaseURL: "https://lunchbreakpoll-c4ecc-default-rtdb.firebaseio.com",
    projectId: "lunchbreakpoll-c4ecc",
    storageBucket: "lunchbreakpoll-c4ecc.firebasestorage.app",
    messagingSenderId: "143579801004",
    appId: "1:143579801004:web:cf8d2dbc25b12a9ae5c609"
};

// ==========================================
// FIREBASE INITIALIZATION
// ==========================================

let app, db, placesRef;

try {
    // Initialize Firebase app with our configuration
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');

    // Get a reference to the Realtime Database
    // This allows us to read and write data in real-time
    db = getDatabase(app);
    console.log('Database reference obtained');

    // Create a reference to the "lunchPlaces" node in our database
    // This is where all lunch place data will be stored
    placesRef = ref(db, "lunchPlaces");
    console.log('Places reference created');

} catch (error) {
    console.error('Firebase initialization error:', error);
    alert('Failed to connect to Firebase. Please check your internet connection and refresh the page.');
}

// ==========================================
// DOM ELEMENT REFERENCES
// ==========================================

// Get references to all the HTML elements we'll interact with
const placeForm = document.getElementById("placeForm");           // Form for adding new places
const placeInput = document.getElementById("placeInput");         // Input field for place name
const addBtn = document.getElementById("addBtn");                 // Submit button
const testBtn = document.getElementById("testBtn");               // Test button for debugging
const placesList = document.getElementById("placesList");         // Container for place list
const loadingIndicator = document.getElementById("loadingIndicator"); // Loading message
const errorMessage = document.getElementById("errorMessage");     // Error message container
const emptyState = document.getElementById("emptyState");         // Empty state message

// ==========================================
// APPLICATION STATE
// ==========================================

// Track the current state of our application
let appState = {
    isLoading: true,              // Whether we're loading data
    places: {},                   // Current places data from Firebase
    isSubmitting: false,          // Whether we're currently adding a place
    votingInProgress: new Set(),  // Track which places are being voted on
    isConnected: true             // Track Firebase connection status
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Shows an error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    console.error('LunchVote Error:', message);
    
    // Auto-hide error after 8 seconds
    setTimeout(() => {
        hideError();
    }, 8000);
}

/**
 * Hides the error message
 */
function hideError() {
    errorMessage.style.display = 'none';
}

/**
 * Shows success feedback to the user
 * @param {string} message - The success message to log
 */
function showSuccess(message) {
    console.log('LunchVote Success:', message);
    // You could add a success message UI element here if desired
}

/**
 * Validates a place name before adding it to the database
 * @param {string} name - The place name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validatePlaceName(name) {
    // Check if name is empty or just whitespace
    if (!name || name.trim().length === 0) {
        showError("Please enter a lunch place name!");
        return false;
    }
    
    // Check if name is too short
    if (name.trim().length < 2) {
        showError("Place name must be at least 2 characters long!");
        return false;
    }
    
    // Check if name is too long
    if (name.trim().length > 50) {
        showError("Place name must be 50 characters or less!");
        return false;
    }
    
    return true;
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string
 */
function sanitizeInput(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Checks if a place name already exists (case-insensitive)
 * @param {string} newName - The name to check
 * @returns {boolean} - True if name already exists
 */
function doesPlaceExist(newName) {
    const normalizedNewName = newName.trim().toLowerCase();
    
    for (const placeId in appState.places) {
        const existingName = appState.places[placeId].name.toLowerCase();
        if (existingName === normalizedNewName) {
            return true;
        }
    }
    
    return false;
}

/**
 * Updates the UI based on current application state
 */
function updateUI() {
    const hasPlaces = Object.keys(appState.places).length > 0;
    
    // Show/hide loading indicator
    loadingIndicator.style.display = appState.isLoading ? 'block' : 'none';
    
    // Show/hide empty state
    emptyState.style.display = (!appState.isLoading && !hasPlaces) ? 'block' : 'none';
    
    // Show/hide places list
    placesList.style.display = (!appState.isLoading && hasPlaces) ? 'block' : 'none';
}

// ==========================================
// ADDING NEW LUNCH PLACES
// ==========================================

/**
 * Handles the form submission for adding new lunch places
 * This function is called when the user clicks "Add Place" or presses Enter
 */
async function handleAddPlace(e) {
    // Prevent the default form submission behavior (page reload)
    e.preventDefault();
    
    console.log('🍽️ Starting add place process...');
    
    // Check if Firebase is properly initialized
    if (!placesRef) {
        console.error('❌ Places reference not available');
        showError("Database connection not available. Please refresh the page.");
        return;
    }
    
    console.log('✅ Firebase references OK');
    
    // Get the place name from the input field and remove extra whitespace
    const placeName = placeInput.value.trim();
    console.log('📝 Place name entered:', placeName);
    
    // Validate the input before proceeding
    if (!validatePlaceName(placeName)) {
        console.log('❌ Validation failed');
        return; // Exit if validation fails
    }
    
    console.log('✅ Validation passed');
    
    // Check if place already exists
    if (doesPlaceExist(placeName)) {
        console.log('❌ Place already exists');
        showError("This lunch place already exists!");
        placeInput.focus();
        return;
    }
    
    console.log('✅ Place name is unique');
    
    // Prevent multiple submissions
    if (appState.isSubmitting) {
        console.log('⏳ Already submitting, ignoring request');
        return;
    }
    
    try {
        // Update state to prevent double submissions
        appState.isSubmitting = true;
        console.log('🔄 Setting submitting state');
        
        // Update UI to show loading state
        addBtn.disabled = true;
        addBtn.textContent = "Adding...";
        console.log('🔄 UI updated to loading state');
        
        // Hide any previous errors
        hideError();
        
        console.log('🚀 Attempting to add place:', placeName);
        console.log('📍 Database path:', placesRef.toString());
        
        // Create a new lunch place object
        const newPlace = {
            name: sanitizeInput(placeName),     // Sanitized place name
            votes: 0,                           // Start with zero votes
            createdAt: serverTimestamp(),       // Firebase server timestamp
            lastVoted: null                     // Track when last vote was cast
        };
        
        console.log('📦 New place object created:', newPlace);
        console.log('🔗 Database reference:', db);
        console.log('📍 Places reference:', placesRef);
        
        // Test write permissions first
        console.log('🧪 Testing write permissions...');
        
        // Push the new place to Firebase Realtime Database
        // The push() function automatically generates a unique key for each place
        console.log('📤 Calling push() function...');
        const result = await push(placesRef, newPlace);
        
        console.log('🎉 Push successful! Result:', result);
        console.log('🆔 New place ID:', result.key);
        
        // Clear the input field after successful submission
        placeInput.value = "";
        console.log('🧹 Input field cleared');
        
        // Show success feedback
        showSuccess(`Successfully added: ${placeName}`);
        console.log('✅ Success message shown');
        
        // Focus back on input for better UX
        placeInput.focus();
        
        console.log('🎯 Process completed successfully');
        
    } catch (error) {
        // Handle any errors that occur during the database operation
        console.error("💥 ERROR ADDING PLACE:");
        console.error("Error object:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error stack:", error.stack);
        
        // Log Firebase-specific error details
        if (error.code) {
            console.error("🔥 Firebase error code:", error.code);
            
            switch (error.code) {
                case 'PERMISSION_DENIED':
                    console.error("🔒 PERMISSION DENIED - Your Firebase security rules are blocking writes");
                    console.error("🛠️ SOLUTION: Go to Firebase Console → Realtime Database → Rules");
                    console.error("📝 Set rules to: {\"rules\": {\".read\": true, \".write\": true}}");
                    showError("❌ Permission denied! Please update your Firebase security rules to allow write access.");
                    break;
                    
                case 'NETWORK_ERROR':
                    console.error("🌐 Network error - check internet connection");
                    showError("Network error. Please check your internet connection and try again.");
                    break;
                    
                case 'INVALID_ARGUMENT':
                    console.error("📝 Invalid data format");
                    showError("Invalid data format. Please try again.");
                    break;
                    
                default:
                    console.error("❓ Unknown Firebase error");
                    showError("Failed to add place. Error: " + error.message);
            }
        } else {
            console.error("❓ Non-Firebase error");
            showError("Failed to add place. Please try again! Error: " + error.message);
        }
        
        // Log current app state for debugging
        console.error("📊 Current app state:", appState);
        console.error("🔗 Firebase app:", app);
        console.error("💾 Database reference:", db);
        console.error("📍 Places reference:", placesRef);
        
    } finally {
        // Reset the submit button state regardless of success or failure
        console.log('🔄 Resetting button state');
        appState.isSubmitting = false;
        addBtn.disabled = false;
        addBtn.textContent = "Add Place";
        console.log('✅ Button state reset complete');
    }
}

// ==========================================
// VOTING FUNCTIONALITY
// ==========================================

/**
 * Handles voting for a lunch place
 * @param {string} placeId - The unique ID of the place to vote for
 */
async function handleVote(placeId) {
    // Check if Firebase is properly initialized
    if (!placesRef) {
        showError("Database connection not available. Please refresh the page.");
        return;
    }
    
    // Prevent multiple votes on the same place simultaneously
    if (appState.votingInProgress.has(placeId)) {
        return;
    }
    
    // Check if the place still exists
    if (!appState.places[placeId]) {
        showError("This place no longer exists!");
        return;
    }
    
    try {
        // Add this place to the voting-in-progress set
        appState.votingInProgress.add(placeId);
        
        // Find the vote button and update its state
        const voteBtn = document.querySelector(`[data-id="${placeId}"]`);
        if (voteBtn) {
            voteBtn.disabled = true;
            voteBtn.textContent = "Voting...";
            voteBtn.classList.add('voting');
        }
        
        console.log('Attempting to vote for place:', placeId);
        
        // Get reference to the specific place in the database
        const placeRef = ref(db, `lunchPlaces/${placeId}`);
        
        // Get the current data for this place to ensure we have the latest vote count
        const snapshot = await get(placeRef);
        
        if (!snapshot.exists()) {
            throw new Error("Place no longer exists");
        }
        
        const currentPlace = snapshot.val();
        const currentVotes = currentPlace.votes || 0;
        
        console.log('Current votes for place:', currentVotes);
        
        // Prepare the update object
        const updates = {
            votes: currentVotes + 1,           // Increment vote count
            lastVoted: serverTimestamp()       // Update last voted timestamp
        };
        
        console.log('Updating with:', updates);
        
        // Update the vote count in Firebase
        await update(placeRef, updates);
        
        console.log('Vote recorded successfully');
        
        // Show success feedback
        showSuccess(`Voted for: ${currentPlace.name}`);
        
    } catch (error) {
        // Handle any errors that occur during voting
        console.error("Error voting:", error);
        console.error("Error details:", {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        if (error.code === 'PERMISSION_DENIED') {
            showError("Permission denied. Please check your Firebase security rules.");
        } else if (error.code === 'NETWORK_ERROR') {
            showError("Network error. Please check your internet connection and try again.");
        } else {
            showError("Failed to record your vote. Please try again! Error: " + error.message);
        }
        
        // Reset button state on error
        const voteBtn = document.querySelector(`[data-id="${placeId}"]`);
        if (voteBtn) {
            voteBtn.disabled = false;
            voteBtn.textContent = "Vote";
            voteBtn.classList.remove('voting');
        }
    } finally {
        // Remove this place from the voting-in-progress set
        appState.votingInProgress.delete(placeId);
    }
}

// ==========================================
// REAL-TIME DATA RENDERING
// ==========================================

/**
 * Renders a single place item in the list
 * @param {string} placeId - The unique ID of the place
 * @param {Object} placeData - The place data from Firebase
 * @returns {HTMLElement} - The created list item element
 */
function createPlaceElement(placeId, placeData) {
    // Create the main list item element
    const li = document.createElement("li");
    li.className = "place-item";
    li.setAttribute('data-place-id', placeId);
    
    // Create the place info section
    const placeInfo = document.createElement("div");
    placeInfo.className = "place-info";
    
    // Create and set up the place name element
    const placeName = document.createElement("div");
    placeName.className = "place-name";
    placeName.textContent = placeData.name;
    
    // Create and set up the vote count element
    const voteCount = document.createElement("div");
    voteCount.className = "vote-count";
    const votes = placeData.votes || 0;
    const pluralText = votes === 1 ? 'vote' : 'votes';
    voteCount.innerHTML = `<strong>${votes}</strong> ${pluralText}`;
    
    // Add elements to place info container
    placeInfo.appendChild(placeName);
    placeInfo.appendChild(voteCount);
    
    // Create the vote button
    const voteBtn = document.createElement("button");
    voteBtn.className = "vote-btn";
    voteBtn.textContent = "Vote";
    voteBtn.setAttribute('data-id', placeId);
    voteBtn.setAttribute('aria-label', `Vote for ${placeData.name}`);
    
    // Check if voting is in progress for this place
    if (appState.votingInProgress.has(placeId)) {
        voteBtn.disabled = true;
        voteBtn.textContent = "Voting...";
        voteBtn.classList.add('voting');
    }
    
    // Add click event listener for voting
    voteBtn.addEventListener('click', () => handleVote(placeId));
    
    // Assemble the complete list item
    li.appendChild(placeInfo);
    li.appendChild(voteBtn);
    
    return li;
}

/**
 * Renders the complete list of places
 * This function is called whenever the data changes in Firebase
 * @param {Object} placesData - The places data from Firebase
 */
function renderPlaces(placesData) {
    console.log('Rendering places:', placesData);
    
    // Clear the existing list
    placesList.innerHTML = "";
    
    // Update application state
    appState.places = placesData || {};
    appState.isLoading = false;
    
    // Update UI based on whether we have places
    updateUI();
    
    // If no places exist, we're done (empty state will be shown)
    if (!placesData) {
        console.log('No places to display');
        return;
    }
    
    // Convert the places object to an array and sort by vote count (descending)
    const placesArray = Object.entries(placesData).map(([id, data]) => ({
        id,
        ...data
    }));
    
    console.log('Places array:', placesArray);
    
    // Sort places by vote count (highest first), then by creation time (newest first)
    placesArray.sort((a, b) => {
        // First sort by votes (descending)
        if (b.votes !== a.votes) {
            return (b.votes || 0) - (a.votes || 0);
        }
        // If votes are equal, sort by creation time (newest first)
        return (b.createdAt || 0) - (a.createdAt || 0);
    });
    
    // Create and append each place element
    placesArray.forEach(place => {
        const placeElement = createPlaceElement(place.id, place);
        placesList.appendChild(placeElement);
    });
    
    console.log('Rendered', placesArray.length, 'places');
}

// ==========================================
// REAL-TIME DATABASE LISTENER
// ==========================================

/**
 * Sets up the real-time listener for database changes
 * This function will be called whenever data in Firebase changes
 */
function setupRealtimeListener() {
    if (!placesRef) {
        console.error('Places reference not available');
        showError('Database connection not available. Please refresh the page.');
        appState.isLoading = false;
        updateUI();
        return;
    }
    
    console.log('Setting up real-time listener...');
    console.log('Database URL:', firebaseConfig.databaseURL);
    console.log('Places reference path:', placesRef.toString());
    
    // Set a timeout to catch if the listener never responds
    const timeoutId = setTimeout(() => {
        console.error('Database listener timeout - no response after 10 seconds');
        showError('Database connection timeout. Please check your Firebase configuration and try refreshing the page.');
        appState.isLoading = false;
        updateUI();
    }, 10000);
    
    // Listen for changes to the lunchPlaces node in Firebase
    // onValue() sets up a real-time listener that fires whenever data changes
    onValue(placesRef, (snapshot) => {
        try {
            // Clear the timeout since we got a response
            clearTimeout(timeoutId);
            
            console.log('✅ Database snapshot received successfully');
            console.log('Snapshot exists:', snapshot.exists());
            
            // Get the data from the snapshot
            const data = snapshot.val();
            
            console.log('Raw snapshot data:', data);
            console.log('Data type:', typeof data);
            
            // Update connection status
            appState.isConnected = true;
            
            // Always call renderPlaces, even with null data (shows empty state)
            renderPlaces(data);
            
            const placeCount = data ? Object.keys(data).length : 0;
            console.log('✅ Successfully loaded', placeCount, 'lunch places');
            
            if (placeCount === 0) {
                console.log('No lunch places found - showing empty state');
            }
            
        } catch (error) {
            // Clear timeout and handle processing errors
            clearTimeout(timeoutId);
            console.error("❌ Error processing places data:", error);
            showError("Failed to process lunch places data. Please refresh the page.");
            appState.isLoading = false;
            updateUI();
        }
    }, (error) => {
        // Clear timeout and handle connection errors
        clearTimeout(timeoutId);
        console.error("❌ Database connection error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        appState.isConnected = false;
        appState.isLoading = false;
        
        if (error.code === 'PERMISSION_DENIED') {
            showError("❌ Permission denied! Please update your Firebase security rules to allow read access.");
            console.error("🔧 Fix: Go to Firebase Console → Realtime Database → Rules and set read permissions");
        } else if (error.code === 'NETWORK_ERROR') {
            showError("❌ Network error. Please check your internet connection.");
        } else {
            showError(`❌ Database error: ${error.message}. Please refresh the page.`);
        }
        
        updateUI();
    });
}

// ==========================================
// EVENT LISTENERS
// ==========================================

/**
 * Sets up all event listeners for the application
 */
function setupEventListeners() {
    // Form submission for adding new places
    placeForm.addEventListener("submit", handleAddPlace);
    
    // Test button for Firebase debugging
    testBtn.addEventListener("click", async () => {
        testBtn.disabled = true;
        testBtn.textContent = "🧪 Testing...";
        
        const success = await window.testFirebaseConnection();
        
        testBtn.disabled = false;
        testBtn.textContent = success ? "✅ Test Passed!" : "❌ Test Failed!";
        
        setTimeout(() => {
            testBtn.textContent = "🧪 Test Firebase Connection";
        }, 3000);
    });
    
    // Input field enhancements
    placeInput.addEventListener('input', () => {
        // Hide error when user starts typing
        if (errorMessage.style.display === 'block') {
            hideError();
        }
    });
    
    // Handle Enter key in input field (already handled by form submit, but good for clarity)
    placeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !appState.isSubmitting) {
            handleAddPlace(e);
        }
    });
    
    // Handle page visibility changes to manage database connections
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page hidden - maintaining database connection');
        } else {
            console.log('Page visible - ensuring database connection');
        }
    });
    
    // Handle online/offline status
    window.addEventListener('online', () => {
        console.log('Connection restored');
        appState.isConnected = true;
        hideError();
    });
    
    window.addEventListener('offline', () => {
        console.log('Connection lost');
        appState.isConnected = false;
        showError('You are offline. Changes will be saved when connection is restored.');
    });
}

// ==========================================
// APPLICATION INITIALIZATION
// ==========================================

/**
 * Initializes the LunchVote application
 * This function is called when the page loads
 */
function initializeApp() {
    try {
        console.log('🚀 Initializing LunchVote app...');
        console.log('Firebase config:', firebaseConfig);
        
        // Verify Firebase initialization
        if (!app) {
            throw new Error('Firebase app not initialized');
        }
        console.log('✅ Firebase app initialized');
        
        if (!db) {
            throw new Error('Firebase database not initialized');
        }
        console.log('✅ Firebase database initialized');
        
        if (!placesRef) {
            throw new Error('Places reference not initialized');
        }
        console.log('✅ Places reference initialized');
        
        // Test basic connectivity
        console.log('🔗 Testing Firebase connectivity...');
        
        // Set up event listeners
        setupEventListeners();
        console.log('✅ Event listeners set up');
        
        // Set up real-time database listener
        setupRealtimeListener();
        console.log('✅ Database listener set up');
        
        // Focus on the input field for better UX
        placeInput.focus();
        
        console.log('🎉 LunchVote app initialization complete!');
        
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        showError('Failed to initialize the app. Please check the console for details and refresh the page.');
        appState.isLoading = false;
        updateUI();
    }
}

// ==========================================
// CLEANUP AND ERROR HANDLING
// ==========================================

/**
 * Cleanup function to properly disconnect from Firebase when page unloads
 */
function cleanup() {
    try {
        // Remove the database listener to prevent memory leaks
        if (placesRef) {
            off(placesRef);
            console.log('Cleaned up database listeners');
        }
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

// Set up cleanup when page unloads
window.addEventListener('beforeunload', cleanup);

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showError('An unexpected error occurred. Please try again.');
    event.preventDefault();
});

// Handle general errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showError('An unexpected error occurred. Please refresh the page.');
});

// ==========================================
// DATABASE CONNECTION TEST (FOR DEBUGGING)
// ==========================================

/**
 * Test function to verify Firebase connection and permissions
 * This runs automatically on app start and can be called manually
 */
window.testFirebaseConnection = async function() {
    try {
        console.log('🧪 Testing Firebase connection...');
        console.log('Database URL:', firebaseConfig.databaseURL);
        
        // Test basic read access to the places node
        console.log('Testing read access to lunchPlaces...');
        const snapshot = await get(placesRef);
        console.log('✅ Read access successful');
        console.log('Current data:', snapshot.val());
        
        // Test write access with a simple test entry
        console.log('Testing write access...');
        const testRef = ref(db, 'connectionTest');
        await push(testRef, {
            message: 'Connection test successful',
            timestamp: serverTimestamp()
        });
        console.log('✅ Write access successful');
        
        console.log('🎉 Firebase connection test passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'PERMISSION_DENIED') {
            console.error('🔒 SOLUTION: Update your Firebase Security Rules');
            console.error('Go to: Firebase Console → Realtime Database → Rules');
            console.error('Set rules to: {"rules": {".read": true, ".write": true}}');
        } else if (error.code === 'NETWORK_ERROR') {
            console.error('🌐 SOLUTION: Check your internet connection');
        } else {
            console.error('❓ Unknown error - check Firebase configuration');
        }
        
        return false;
    }
};

/**
 * Automatic connection test that runs on app start
 */
async function runStartupConnectionTest() {
    console.log('🔍 Running startup connection test...');
    
    // Wait a moment for Firebase to fully initialize
    setTimeout(async () => {
        const success = await window.testFirebaseConnection();
        if (!success) {
            showError('Firebase connection test failed. Check browser console for details.');
            appState.isLoading = false;
            updateUI();
        }
    }, 2000);
}

// ==========================================
// START THE APPLICATION
// ==========================================

// Initialize the app when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
        runStartupConnectionTest();
    });
} else {
    // DOM is already loaded
    initializeApp();
    runStartupConnectionTest();
}

// ==========================================
// EXPORT FOR TESTING (OPTIONAL)
// ==========================================

// Export functions for testing purposes (if needed)
// Uncomment the following lines if you want to test individual functions
// window.LunchV