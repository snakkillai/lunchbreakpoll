// ==========================================
// FIREBASE CONFIGURATION AND IMPORTS
// ==========================================

// Firebase project configuration - same as debug script
const firebaseConfig = {
    apiKey: "AIzaSyD7qJ3BZ3ppoA9zvT264OzOMkD9L7ls0-Q",
    authDomain: "lunchbreakpoll-c4ecc.firebaseapp.com",
    databaseURL: "https://lunchbreakpoll-c4ecc-default-rtdb.firebaseio.com",
    projectId: "lunchbreakpoll-c4ecc",
    storageBucket: "lunchbreakpoll-c4ecc.firebasestorage.app",
    messagingSenderId: "143579801004",
    appId: "1:143579801004:web:cf8d2dbc25b12a9ae5c609"
};

// Global variables for Firebase - same pattern as debug script
let firebaseApp = null;
let firebaseDb = null;
let placesRef = null;
let firebaseImports = null;

// ==========================================
// DOM ELEMENT REFERENCES
// ==========================================

// Get references to all the HTML elements we'll interact with
const placeForm = document.getElementById("placeForm");           // Form for adding new places
const placeInput = document.getElementById("placeInput");         // Input field for place name
const addBtn = document.getElementById("addBtn");                 // Submit button
const placesList = document.getElementById("placesList");         // Container for place list
const loadingIndicator = document.getElementById("loadingIndicator"); // Loading message
const errorMessage = document.getElementById("errorMessage");     // Error message container
const emptyState = document.getElementById("emptyState");         // Empty state message
const leadingPlace = document.getElementById("leadingPlace");     // Leading place display
const leadingName = document.getElementById("leadingName");       // Leading place name
const leadingStats = document.getElementById("leadingStats");     // Leading place stats

// ==========================================
// APPLICATION STATE
// ==========================================

// Track the current state of our application
let appState = {
    isLoading: true,              // Whether we're loading data
    places: {},                   // Current places data from Firebase
    isSubmitting: false,          // Whether we're currently adding a place
    votingInProgress: new Set(),  // Track which places are being voted on
    isConnected: false,           // Track Firebase connection status
    isInitialized: false,         // Track if Firebase is fully initialized
    userVote: null                // Track which place the user has voted for
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

// ==========================================
// USER VOTE TRACKING
// ==========================================

/**
 * Gets the user's current vote from localStorage
 * @returns {string|null} - The place ID the user voted for, or null if no vote
 */
function getUserVote() {
    try {
        return localStorage.getItem('lunchVoteChoice');
    } catch (error) {
        console.warn('localStorage not available:', error);
        return appState.userVote;
    }
}

/**
 * Saves the user's vote to localStorage
 * @param {string|null} placeId - The place ID to save, or null to clear vote
 */
function saveUserVote(placeId) {
    try {
        if (placeId) {
            localStorage.setItem('lunchVoteChoice', placeId);
        } else {
            localStorage.removeItem('lunchVoteChoice');
        }
        appState.userVote = placeId;
    } catch (error) {
        console.warn('localStorage not available:', error);
        appState.userVote = placeId;
    }
}

/**
 * Checks if the user has already voted
 * @returns {boolean} - True if user has voted
 */
function hasUserVoted() {
    const userVote = getUserVote();
    return userVote !== null && appState.places[userVote];
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
 * Updates the leading place display
 * @param {Array} placesArray - Sorted array of places
 */
function updateLeadingPlace(placesArray) {
    if (!placesArray || placesArray.length === 0) {
        // Hide leading place display if no places
        leadingPlace.style.display = 'none';
        return;
    }
    
    // Get the place with the most votes (first in sorted array)
    const leader = placesArray[0];
    const leaderVotes = leader.votes || 0;
    
    // Only show leading place if there are votes
    if (leaderVotes === 0) {
        leadingPlace.style.display = 'none';
        return;
    }
    
    // Check if there's a tie for first place
    const tiePlaces = placesArray.filter(place => (place.votes || 0) === leaderVotes);
    
    if (tiePlaces.length > 1) {
        // Handle tie scenario
        leadingName.textContent = `${tiePlaces.length}-Way Tie!`;
        leadingStats.textContent = `${tiePlaces.length} places tied with ${leaderVotes} ${leaderVotes === 1 ? 'vote' : 'votes'} each`;
    } else {
        // Single leader
        leadingName.textContent = leader.name;
        
        // Calculate lead margin
        let leadMargin = '';
        if (placesArray.length > 1) {
            const secondPlace = placesArray[1];
            const secondVotes = secondPlace.votes || 0;
            const margin = leaderVotes - secondVotes;
            
            if (margin > 0) {
                leadMargin = ` • Leading by ${margin} ${margin === 1 ? 'vote' : 'votes'}`;
            }
        }
        
        leadingStats.textContent = `${leaderVotes} ${leaderVotes === 1 ? 'vote' : 'votes'}${leadMargin}`;
    }
    
    // Show the leading place display
    leadingPlace.style.display = 'flex';
}

// ==========================================
// FIREBASE INITIALIZATION - Using Debug Script Pattern
// ==========================================

/**
 * Initialize Firebase using the same pattern as the debug script
 */
async function initializeFirebase() {
    try {
        console.log('🔄 Initializing Firebase...');
        
        // Import Firebase modules - same as debug script
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js");
        const { getDatabase, ref, push, onValue, get, update } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js");
        
        console.log('✅ Firebase modules imported');
        
        // Store imports globally - same as debug script
        firebaseImports = {
            initializeApp,
            getDatabase,
            ref,
            push,
            onValue,
            get,
            update
        };
        
        // Initialize Firebase app - same as debug script
        firebaseApp = firebaseImports.initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
        
        // Get database reference - same as debug script
        firebaseDb = firebaseImports.getDatabase(firebaseApp);
        console.log('✅ Database reference obtained');
        
        // Create places reference - same as debug script
        placesRef = firebaseImports.ref(firebaseDb, "lunchPlaces");
        console.log('✅ Places reference created');
        
        // Test connection - same as debug script
        const snapshot = await firebaseImports.get(placesRef);
        console.log('✅ Database connection test successful');
        console.log('📊 Existing data:', snapshot.val());
        
        // Mark as initialized
        appState.isInitialized = true;
        appState.isConnected = true;
        
        console.log('🎉 Firebase initialization complete!');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'PERMISSION_DENIED') {
            showError('❌ Permission denied! Please check your Firebase security rules.');
        } else {
            showError('❌ Failed to connect to Firebase: ' + error.message);
        }
        
        appState.isInitialized = false;
        appState.isConnected = false;
        return false;
    }
}

// ==========================================
// ADDING NEW LUNCH PLACES - Using Debug Script Pattern
// ==========================================

/**
 * Handles the form submission for adding new lunch places
 * Using the same pattern as the debug script
 */
async function handleAddPlace(e) {
    // Prevent the default form submission behavior (page reload)
    e.preventDefault();
    
    console.log('🍽️ Starting add place process...');
    
    // Check if Firebase is properly initialized
    if (!appState.isInitialized || !placesRef || !firebaseImports) {
        showError("Firebase not initialized. Please refresh the page.");
        return;
    }
    
    // Get the place name from the input field and remove extra whitespace
    const placeName = placeInput.value.trim();
    console.log('📝 Place name entered:', placeName);
    
    // Validate the input before proceeding
    if (!validatePlaceName(placeName)) {
        return;
    }
    
    // Check if place already exists
    if (doesPlaceExist(placeName)) {
        showError("This lunch place already exists!");
        placeInput.focus();
        return;
    }
    
    // Prevent multiple submissions
    if (appState.isSubmitting) {
        return;
    }
    
    try {
        // Update state to prevent double submissions
        appState.isSubmitting = true;
        
        // Update UI to show loading state
        addBtn.disabled = true;
        addBtn.textContent = "Adding...";
        
        // Hide any previous errors
        hideError();
        
        console.log('🚀 Adding place:', placeName);
        
        // Create a new lunch place object - same as debug script
        const newPlace = {
            name: sanitizeInput(placeName),     // Sanitized place name
            votes: 0,                           // Start with zero votes
            createdAt: Date.now(),              // Current timestamp
            lastVoted: null                     // Track when last vote was cast
        };
        
        console.log('📦 New place object:', newPlace);
        
        // Push the new place to Firebase - same as debug script
        const result = await firebaseImports.push(placesRef, newPlace);
        
        console.log('🎉 Place added successfully with ID:', result.key);
        
        // Clear the input field after successful submission
        placeInput.value = "";
        
        // Show success feedback
        showSuccess(`Successfully added: ${placeName}`);
        
        // Focus back on input for better UX
        placeInput.focus();
        
    } catch (error) {
        // Handle any errors that occur during the database operation
        console.error("💥 Error adding place:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        if (error.code === 'PERMISSION_DENIED') {
            showError("❌ Permission denied! Please check your Firebase security rules.");
        } else {
            showError("Failed to add place: " + error.message);
        }
        
    } finally {
        // Reset the submit button state regardless of success or failure
        appState.isSubmitting = false;
        addBtn.disabled = false;
        addBtn.textContent = "Add Place";
    }
}

// ==========================================
// VOTING FUNCTIONALITY - Using Debug Script Pattern
// ==========================================

/**
 * Handles voting for a lunch place with vote tracking
 * @param {string} placeId - The unique ID of the place to vote for
 */
async function handleVote(placeId) {
    // Check if Firebase is properly initialized
    if (!appState.isInitialized || !placesRef || !firebaseImports) {
        showError("Firebase not initialized. Please refresh the page.");
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
    
    const currentUserVote = getUserVote();
    const isChangingVote = currentUserVote && currentUserVote !== placeId;
    const isVotingSamePlace = currentUserVote === placeId;
    
    // Don't allow voting for the same place twice
    if (isVotingSamePlace) {
        showError("You've already voted for this place!");
        return;
    }
    
    try {
        // Add this place to the voting-in-progress set
        appState.votingInProgress.add(placeId);
        
        // Find the vote button and update its state
        const voteBtn = document.querySelector(`[data-id="${placeId}"]`);
        if (voteBtn) {
            voteBtn.disabled = true;
            voteBtn.textContent = isChangingVote ? "Changing..." : "Voting...";
            voteBtn.classList.add('voting');
        }
        
        console.log('🗳️ Processing vote for place:', placeId);
        console.log('📊 Current user vote:', currentUserVote);
        console.log('🔄 Is changing vote:', isChangingVote);
        
        // If user is changing their vote, we need to decrement the old place first
        if (isChangingVote && appState.places[currentUserVote]) {
            console.log('📉 Removing vote from previous place:', currentUserVote);
            
            const oldPlaceRef = firebaseImports.ref(firebaseDb, `lunchPlaces/${currentUserVote}`);
            const oldSnapshot = await firebaseImports.get(oldPlaceRef);
            
            if (oldSnapshot.exists()) {
                const oldPlace = oldSnapshot.val();
                const oldVotes = Math.max(0, (oldPlace.votes || 0) - 1); // Ensure votes don't go below 0
                
                await firebaseImports.update(oldPlaceRef, {
                    votes: oldVotes,
                    lastVoted: oldVotes > 0 ? Date.now() : null
                });
                
                console.log('✅ Previous vote removed');
            }
        }
        
        // Now add vote to the new place
        console.log('📈 Adding vote to new place:', placeId);
        
        const placeRef = firebaseImports.ref(firebaseDb, `lunchPlaces/${placeId}`);
        const snapshot = await firebaseImports.get(placeRef);
        
        if (!snapshot.exists()) {
            throw new Error("Place no longer exists");
        }
        
        const currentPlace = snapshot.val();
        const currentVotes = currentPlace.votes || 0;
        
        // Prepare the update object
        const updates = {
            votes: currentVotes + 1,           // Increment vote count
            lastVoted: Date.now()              // Update last voted timestamp
        };
        
        // Update the vote count in Firebase
        await firebaseImports.update(placeRef, updates);
        
        // Save user's vote choice
        saveUserVote(placeId);
        
        console.log('✅ Vote recorded successfully');
        
        // Show success feedback
        if (isChangingVote) {
            showSuccess(`Changed your vote to: ${currentPlace.name}`);
        } else {
            showSuccess(`Voted for: ${currentPlace.name}`);
        }
        
    } catch (error) {
        // Handle any errors that occur during voting
        console.error("❌ Error voting:", error);
        showError("Failed to record your vote: " + error.message);
        
        // Reset button state on error
        const voteBtn = document.querySelector(`[data-id="${placeId}"]`);
        if (voteBtn) {
            voteBtn.disabled = false;
            updateVoteButtonState(voteBtn, placeId);
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
 * Updates the vote button state based on user's voting status
 * @param {HTMLElement} button - The vote button element
 * @param {string} placeId - The place ID
 */
function updateVoteButtonState(button, placeId) {
    try {
        console.log('🔄 Updating button state for place:', placeId);
        
        const userVote = getUserVote();
        const hasVoted = userVote !== null;
        const votedForThis = userVote === placeId;
        
        console.log('📊 Button state data:', { userVote, hasVoted, votedForThis, placeId });
        
        if (votedForThis) {
            // User has voted for this place
            button.textContent = "✓ Your Vote";
            button.className = "vote-btn voted";
            button.disabled = true;
            button.setAttribute('aria-label', `You voted for ${appState.places[placeId]?.name || 'this place'}`);
        } else if (hasVoted) {
            // User has voted for a different place
            button.textContent = "Change Vote";
            button.className = "vote-btn change-vote";
            button.disabled = false;
            button.setAttribute('aria-label', `Change your vote to ${appState.places[placeId]?.name || 'this place'}`);
        } else {
            // User hasn't voted yet
            button.textContent = "Vote";
            button.className = "vote-btn";
            button.disabled = false;
            button.setAttribute('aria-label', `Vote for ${appState.places[placeId]?.name || 'this place'}`);
        }
        
        // Handle voting in progress state
        if (appState.votingInProgress.has(placeId)) {
            button.disabled = true;
            button.textContent = hasVoted ? "Changing..." : "Voting...";
            button.classList.add('voting');
        }
        
        console.log('✅ Button state updated successfully');
    } catch (error) {
        console.error('❌ Error updating button state:', error);
        // Fallback to basic state
        button.textContent = "Vote";
        button.className = "vote-btn";
        button.disabled = false;
    }
}

/**
 * Renders a single place item in the list
 * @param {string} placeId - The unique ID of the place
 * @param {Object} placeData - The place data from Firebase
 * @returns {HTMLElement} - The created list item element
 */
function createPlaceElement(placeId, placeData) {
    try {
        console.log('🏗️ Creating element for place:', placeId, placeData);
        
        // Create the main list item element
        const li = document.createElement("li");
        li.className = "place-item";
        li.setAttribute('data-place-id', placeId);
        
        // Add special styling if user voted for this place
        const userVote = getUserVote();
        if (userVote === placeId) {
            li.classList.add('user-voted');
        }
        
        // Create the place info section
        const placeInfo = document.createElement("div");
        placeInfo.className = "place-info";
        
        // Create and set up the place name element
        const placeName = document.createElement("div");
        placeName.className = "place-name";
        
        // Safely set place name
        const safePlaceName = placeData.name || 'Unknown Place';
        placeName.textContent = safePlaceName;
        
        // Add user vote indicator to name if this is their choice
        if (userVote === placeId) {
            placeName.innerHTML = `${safePlaceName} <span class="user-vote-indicator">👤 Your Choice</span>`;
        }
        
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
        voteBtn.setAttribute('data-id', placeId);
        
        // Update button state based on user's voting status
        updateVoteButtonState(voteBtn, placeId);
        
        // Add click event listener for voting
        voteBtn.addEventListener('click', () => handleVote(placeId));
        
        // Assemble the complete list item
        li.appendChild(placeInfo);
        li.appendChild(voteBtn);
        
        console.log('✅ Element created successfully for:', safePlaceName);
        return li;
        
    } catch (error) {
        console.error('❌ Error creating place element:', error);
        console.error('Place ID:', placeId);
        console.error('Place data:', placeData);
        
        // Return a simple error element
        const errorLi = document.createElement("li");
        errorLi.className = "place-item error-item";
        errorLi.innerHTML = `
            <div class="place-info">
                <div class="place-name">Error loading place</div>
                <div class="vote-count">Please refresh</div>
            </div>
        `;
        return errorLi;
    }
}

/**
 * Renders the complete list of places
 * @param {Object} placesData - The places data from Firebase
 */
function renderPlaces(placesData) {
    console.log('🔄 Starting renderPlaces function');
    console.log('📊 Places data received:', placesData);
    console.log('📊 Data type:', typeof placesData);
    console.log('📊 Is null?', placesData === null);
    console.log('📊 Is undefined?', placesData === undefined);
    
    try {
        // Clear the existing list
        placesList.innerHTML = "";
        console.log('🧹 Cleared existing places list');
        
        // Update application state
        appState.places = placesData || {};
        appState.isLoading = false;
        console.log('📊 Updated app state with places:', Object.keys(appState.places).length, 'places');
        
        // Load user's vote from storage
        const storedVote = getUserVote();
        console.log('👤 User stored vote:', storedVote);
        
        // Check if user's stored vote still exists in the data
        if (storedVote && placesData && !placesData[storedVote]) {
            console.log('🧹 User voted place no longer exists, clearing vote');
            saveUserVote(null);
        }
        
        // Update UI based on whether we have places
        updateUI();
        console.log('✅ UI updated');
        
        // If no places exist, we're done (empty state will be shown)
        if (!placesData) {
            console.log('📭 No places data to display');
            // Hide leading place display
            leadingPlace.style.display = 'none';
            return;
        }
        
        // Convert the places object to an array
        console.log('🔄 Converting places object to array...');
        const placesArray = [];
        
        for (const [id, data] of Object.entries(placesData)) {
            console.log('🔄 Processing place:', id, data);
            
            // Validate place data
            if (!data) {
                console.warn('⚠️ Empty place data for ID:', id);
                continue;
            }
            
            placesArray.push({
                id,
                name: data.name || 'Unknown Place',
                votes: data.votes || 0,
                createdAt: data.createdAt || 0,
                lastVoted: data.lastVoted || null
            });
        }
        
        console.log('✅ Places array created:', placesArray.length, 'places');
        
        // Sort places by vote count (highest first), then by creation time (newest first)
        console.log('🔄 Sorting places...');
        placesArray.sort((a, b) => {
            // First sort by votes (descending)
            if (b.votes !== a.votes) {
                return (b.votes || 0) - (a.votes || 0);
            }
            // If votes are equal, sort by creation time (newest first)
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
        console.log('✅ Places sorted');
        
        // Update the leading place display
        console.log('🔄 Updating leading place display...');
        updateLeadingPlace(placesArray);
        console.log('✅ Leading place updated');
        
        // Create and append each place element
        console.log('🔄 Creating place elements...');
        let elementsCreated = 0;
        
        placesArray.forEach((place, index) => {
            try {
                console.log(`🏗️ Creating element ${index + 1}/${placesArray.length}:`, place.name);
                const placeElement = createPlaceElement(place.id, place);
                placesList.appendChild(placeElement);
                elementsCreated++;
            } catch (elementError) {
                console.error('❌ Error creating individual place element:', elementError);
                console.error('Problem place:', place);
            }
        });
        
        console.log('✅ Created', elementsCreated, 'place elements');
        
        const userVoteName = getUserVotedPlaceName();
        if (userVoteName) {
            console.log('👤 User has voted for:', userVoteName);
        }
        
        console.log('🎉 renderPlaces completed successfully!');
        
    } catch (error) {
        console.error("💥 CRITICAL ERROR in renderPlaces:");
        console.error("Error object:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("Places data that caused error:", placesData);
        console.error("App state:", appState);
        
        // Show user-friendly error
        showError("Failed to display lunch places. Please refresh the page.");
        
        // Reset loading state
        appState.isLoading = false;
        updateUI();
        
        // Try to show at least the basic UI
        try {
            leadingPlace.style.display = 'none';
            placesList.innerHTML = '<li class="place-item error-item"><div class="place-info"><div class="place-name">Error loading places</div><div class="vote-count">Please refresh the page</div></div></li>';
        } catch (fallbackError) {
            console.error("❌ Even fallback UI failed:", fallbackError);
        }
    }
}

// ==========================================
// REAL-TIME DATABASE LISTENER - Using Debug Script Pattern
// ==========================================

/**
 * Sets up the real-time listener for database changes
 */
function setupRealtimeListener() {
    if (!appState.isInitialized || !placesRef || !firebaseImports) {
        console.error('❌ Firebase not initialized for listener');
        return;
    }
    
    console.log('🔄 Setting up real-time listener...');
    
    // Listen for changes to the lunchPlaces node in Firebase - same as debug script
    firebaseImports.onValue(placesRef, (snapshot) => {
        try {
            console.log('✅ Database snapshot received');
            
            // Get the data from the snapshot
            const data = snapshot.val();
            console.log('📊 Snapshot data:', data);
            
            // Update connection status
            appState.isConnected = true;
            
            // Render the places with the new data
            renderPlaces(data);
            
            const placeCount = data ? Object.keys(data).length : 0;
            console.log('✅ Successfully loaded', placeCount, 'lunch places');
            
        } catch (error) {
            console.error("❌ Error processing places data:", error);
            showError("Failed to process lunch places data.");
            appState.isLoading = false;
            updateUI();
        }
    }, (error) => {
        console.error("❌ Database listener error:", error);
        appState.isConnected = false;
        appState.isLoading = false;
        
        if (error.code === 'PERMISSION_DENIED') {
            showError("❌ Permission denied! Please check your Firebase security rules.");
        } else {
            showError("❌ Database connection error: " + error.message);
        }
        
        updateUI();
    });
}

// ==========================================
// CONNECTION TEST - Same as Debug Script
// ==========================================

/**
 * Test Firebase connection - same as debug script
 */
window.testFirebaseConnection = async function() {
    try {
        if (!appState.isInitialized || !placesRef || !firebaseImports) {
            console.log('❌ Firebase not initialized');
            return false;
        }

        console.log('🧪 Testing Firebase connection...');
        
        // Test read
        const snapshot = await firebaseImports.get(placesRef);
        console.log('✅ Read test successful');
        console.log('📊 Current data:', snapshot.val());
        
        // Test write
        const testData = {
            name: "Connection Test " + Date.now(),
            votes: 0,
            createdAt: Date.now()
        };
        
        const result = await firebaseImports.push(placesRef, testData);
        console.log('✅ Write test successful, ID:', result.key);
        
        console.log('🎉 Firebase connection test passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
        return false;
    }
};

// ==========================================
// EVENT LISTENERS
// ==========================================

/**
 * Sets up all event listeners for the application
 */
function setupEventListeners() {
    // Form submission for adding new places
    placeForm.addEventListener("submit", handleAddPlace);
    
    // Input field enhancements
    placeInput.addEventListener('input', () => {
        // Hide error when user starts typing
        if (errorMessage.style.display === 'block') {
            hideError();
        }
    });
    
    // Handle online/offline status
    window.addEventListener('online', () => {
        console.log('🌐 Connection restored');
        appState.isConnected = true;
        hideError();
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 Connection lost');
        appState.isConnected = false;
        showError('You are offline. Changes will be saved when connection is restored.');
    });
}

// ==========================================
// APPLICATION INITIALIZATION - Using Debug Script Pattern
// ==========================================

/**
 * Initializes the LunchVote application
 */
async function initializeApp() {
    try {
        console.log('🚀 Initializing LunchVote app...');
        
        // Set up event listeners first
        setupEventListeners();
        console.log('✅ Event listeners set up');
        
        // Initialize Firebase - same as debug script
        const firebaseSuccess = await initializeFirebase();
        
        if (!firebaseSuccess) {
            throw new Error('Firebase initialization failed');
        }
        
        // Set up real-time database listener
        setupRealtimeListener();
        console.log('✅ Database listener set up');
        
        // Focus on the input field for better UX
        placeInput.focus();
        
        console.log('🎉 LunchVote app initialized successfully!');
        
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showError('Failed to initialize the app. Please refresh the page.');
        appState.isLoading = false;
        updateUI();
    }
}

// ==========================================
// START THE APPLICATION - Same as Debug Script
// ==========================================

// Initialize the app when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already loaded
    initializeApp();
}