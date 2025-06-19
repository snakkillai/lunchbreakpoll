// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyD7qJ3BZ3ppoA9zvT264OzOMkD9L7ls0-Q",
    authDomain: "lunchbreakpoll-c4ecc.firebaseapp.com",
    databaseURL: "https://lunchbreakpoll-c4ecc-default-rtdb.firebaseio.com",
    projectId: "lunchbreakpoll-c4ecc",
    storageBucket: "lunchbreakpoll-c4ecc.firebasestorage.app",
    messagingSenderId: "143579801004",
    appId: "1:143579801004:web:cf8d2dbc25b12a9ae5c609"
};

// Global variables for Firebase - exactly like debug script
window.firebaseApp = null;
window.firebaseDb = null;
window.placesRef = null;
window.firebaseImports = null;

// ==========================================
// DOM ELEMENT REFERENCES
// ==========================================

const placeForm = document.getElementById("placeForm");
const placeInput = document.getElementById("placeInput");
const addBtn = document.getElementById("addBtn");
const placesList = document.getElementById("placesList");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");
const emptyState = document.getElementById("emptyState");
const leadingPlace = document.getElementById("leadingPlace");
const leadingName = document.getElementById("leadingName");
const leadingStats = document.getElementById("leadingStats");

// ==========================================
// APPLICATION STATE
// ==========================================

let appState = {
    isLoading: true,
    places: {},
    isSubmitting: false,
    votingInProgress: new Set(),
    isConnected: false,
    isInitialized: false,
    userVote: null
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    console.error('LunchVote Error:', message);
    
    setTimeout(() => {
        hideError();
    }, 8000);
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showSuccess(message) {
    console.log('LunchVote Success:', message);
}

function validatePlaceName(name) {
    if (!name || name.trim().length === 0) {
        showError("Please enter a lunch place name!");
        return false;
    }
    
    if (name.trim().length < 2) {
        showError("Place name must be at least 2 characters long!");
        return false;
    }
    
    if (name.trim().length > 50) {
        showError("Place name must be 50 characters or less!");
        return false;
    }
    
    return true;
}

function sanitizeInput(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

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

function updateUI() {
    const hasPlaces = Object.keys(appState.places).length > 0;
    
    loadingIndicator.style.display = appState.isLoading ? 'block' : 'none';
    emptyState.style.display = (!appState.isLoading && !hasPlaces) ? 'block' : 'none';
    placesList.style.display = (!appState.isLoading && hasPlaces) ? 'block' : 'none';
}

// ==========================================
// USER VOTE TRACKING
// ==========================================

function getUserVote() {
    try {
        return localStorage.getItem('lunchVoteChoice');
    } catch (error) {
        console.warn('localStorage not available:', error);
        return appState.userVote;
    }
}

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

function hasUserVoted() {
    const userVote = getUserVote();
    return userVote !== null && appState.places[userVote];
}

function getUserVotedPlaceName() {
    const userVote = getUserVote();
    if (userVote && appState.places[userVote]) {
        return appState.places[userVote].name;
    }
    return null;
}

// ==========================================
// FIREBASE INITIALIZATION - EXACT DEBUG PATTERN
// ==========================================

async function initializeFirebase() {
    try {
        console.log('🔄 Initializing Firebase using debug pattern...');
        
        // Step 1: Import Firebase modules - exactly like debug script
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js");
        console.log('✅ Firebase app imported');
        
        const { getDatabase, ref, push, onValue, get, update } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js");
        console.log('✅ Firebase database imported');
        
        // Step 2: Store imports globally - exactly like debug script
        window.firebaseImports = {
            initializeApp,
            getDatabase,
            ref,
            push,
            onValue,
            get,
            update
        };
        console.log('✅ Firebase imports stored globally');
        
        // Step 3: Initialize Firebase app - exactly like debug script
        window.firebaseApp = window.firebaseImports.initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
        
        // Step 4: Get database reference - exactly like debug script
        window.firebaseDb = window.firebaseImports.getDatabase(window.firebaseApp);
        console.log('✅ Database reference obtained');
        
        // Step 5: Create places reference - exactly like debug script
        window.placesRef = window.firebaseImports.ref(window.firebaseDb, "lunchPlaces");
        console.log('✅ Places reference created');
        
        // Step 6: Test connection - exactly like debug script
        console.log('🔄 Testing database connection...');
        const snapshot = await window.firebaseImports.get(window.placesRef);
        console.log('✅ Database connection test successful');
        console.log('📊 Data exists:', snapshot.exists());
        console.log('📊 Current data:', snapshot.val());
        
        // Step 7: Mark as initialized
        appState.isInitialized = true;
        appState.isConnected = true;
        
        console.log('🎉 Firebase initialization complete using debug pattern!');
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
// ADDING PLACES - USING DEBUG PATTERN
// ==========================================

async function handleAddPlace(e) {
    e.preventDefault();
    
    if (!window.placesRef || !window.firebaseImports) {
        showError("Firebase not initialized. Please refresh the page.");
        return;
    }
    
    const placeName = placeInput.value.trim();
    
    if (!validatePlaceName(placeName)) {
        return;
    }
    
    if (doesPlaceExist(placeName)) {
        showError("This lunch place already exists!");
        placeInput.focus();
        return;
    }
    
    if (appState.isSubmitting) {
        return;
    }
    
    try {
        appState.isSubmitting = true;
        addBtn.disabled = true;
        addBtn.textContent = "Adding...";
        hideError();
        
        console.log('🔄 Adding place using debug pattern:', placeName);
        
        // Create new place object - exactly like debug script
        const newPlace = {
            name: sanitizeInput(placeName),
            votes: 0,
            createdAt: Date.now()
        };
        
        console.log('📝 New place data:', newPlace);
        
        // Push to Firebase - exactly like debug script
        const result = await window.firebaseImports.push(window.placesRef, newPlace);
        console.log('✅ Place added with ID:', result.key);
        
        placeInput.value = "";
        showSuccess(`Successfully added: ${placeName}`);
        placeInput.focus();
        
    } catch (error) {
        console.error("Error adding place:", error);
        console.error("Error code:", error.code);
        
        if (error.code === 'PERMISSION_DENIED') {
            showError("❌ Permission denied! Please check your Firebase security rules.");
        } else {
            showError("Failed to add place: " + error.message);
        }
        
    } finally {
        appState.isSubmitting = false;
        addBtn.disabled = false;
        addBtn.textContent = "Add Place";
    }
}

// ==========================================
// VOTING FUNCTIONALITY - USING DEBUG PATTERN
// ==========================================

async function handleVote(placeId) {
    if (!window.placesRef || !window.firebaseImports) {
        showError("Firebase not initialized. Please refresh the page.");
        return;
    }
    
    if (appState.votingInProgress.has(placeId)) {
        return;
    }
    
    if (!appState.places[placeId]) {
        showError("This place no longer exists!");
        return;
    }
    
    const currentUserVote = getUserVote();
    const isChangingVote = currentUserVote && currentUserVote !== placeId;
    const isVotingSamePlace = currentUserVote === placeId;
    
    if (isVotingSamePlace) {
        showError("You've already voted for this place!");
        return;
    }
    
    try {
        appState.votingInProgress.add(placeId);
        
        const voteBtn = document.querySelector(`[data-id="${placeId}"]`);
        if (voteBtn) {
            voteBtn.disabled = true;
            voteBtn.textContent = isChangingVote ? "Changed" : "Voting...";
            voteBtn.classList.add('voting');
        }
        
        console.log('🗳️ Processing vote using debug pattern for place:', placeId);
        
        // Remove old vote if changing - using debug pattern
        if (isChangingVote && appState.places[currentUserVote]) {
            console.log('📉 Removing previous vote from:', currentUserVote);
            
            const oldPlaceRef = window.firebaseImports.ref(window.firebaseDb, `lunchPlaces/${currentUserVote}`);
            const oldSnapshot = await window.firebaseImports.get(oldPlaceRef);
            
            if (oldSnapshot.exists()) {
                const oldPlace = oldSnapshot.val();
                const oldVotes = Math.max(0, (oldPlace.votes || 0) - 1);
                
                await window.firebaseImports.update(oldPlaceRef, {
                    votes: oldVotes,
                    lastVoted: oldVotes > 0 ? Date.now() : null
                });
                
                console.log('✅ Previous vote removed');
            }
        }
        
        // Add new vote - using debug pattern
        console.log('📈 Adding vote to place:', placeId);
        
        const placeRef = window.firebaseImports.ref(window.firebaseDb, `lunchPlaces/${placeId}`);
        const snapshot = await window.firebaseImports.get(placeRef);
        
        if (!snapshot.exists()) {
            throw new Error("Place no longer exists");
        }
        
        const currentPlace = snapshot.val();
        const currentVotes = currentPlace.votes || 0;
        
        const updates = {
            votes: currentVotes + 1,
            lastVoted: Date.now()
        };
        
        await window.firebaseImports.update(placeRef, updates);
        
        saveUserVote(placeId);
        
        console.log('✅ Vote recorded successfully');
        
        if (isChangingVote) {
            showSuccess(`Changed to: ${currentPlace.name}`);
        } else {
            showSuccess(`Voted for: ${currentPlace.name}`);
        }
        
    } catch (error) {
        console.error("❌ Error voting:", error);
        showError("Failed to record your vote: " + error.message);
        
        const voteBtn = document.querySelector(`[data-id="${placeId}"]`);
        if (voteBtn) {
            voteBtn.disabled = false;
            updateVoteButtonState(voteBtn, placeId);
        }
    } finally {
        appState.votingInProgress.delete(placeId);
    }
}

// ==========================================
// UI COMPONENTS
// ==========================================

function updateLeadingPlace(placesArray) {
    if (!placesArray || placesArray.length === 0) {
        leadingPlace.style.display = 'none';
        return;
    }
    
    const leader = placesArray[0];
    const leaderVotes = leader.votes || 0;
    
    if (leaderVotes === 0) {
        leadingPlace.style.display = 'none';
        return;
    }
    
    const tiePlaces = placesArray.filter(place => (place.votes || 0) === leaderVotes);
    
    if (tiePlaces.length > 1) {
        leadingName.textContent = `${tiePlaces.length}-Way Tie!`;
        leadingStats.textContent = `${tiePlaces.length} places tied with ${leaderVotes} ${leaderVotes === 1 ? 'vote' : 'votes'} each`;
    } else {
        leadingName.textContent = leader.name;
        
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
    
    leadingPlace.style.display = 'flex';
}

function updateVoteButtonState(button, placeId) {
    try {
        const userVote = getUserVote();
        const hasVoted = userVote !== null;
        const votedForThis = userVote === placeId;
        
        if (votedForThis) {
            button.textContent = "✓ Your Vote";
            button.className = "vote-btn voted";
            button.disabled = true;
            button.setAttribute('aria-label', `You voted for ${appState.places[placeId]?.name || 'this place'}`);
        } else if (hasVoted) {
            button.textContent = "Change Vote";
            button.className = "vote-btn change-vote";
            button.disabled = false;
            button.setAttribute('aria-label', `Change your vote to ${appState.places[placeId]?.name || 'this place'}`);
        } else {
            button.textContent = "Vote";
            button.className = "vote-btn";
            button.disabled = false;
            button.setAttribute('aria-label', `Vote for ${appState.places[placeId]?.name || 'this place'}`);
        }
        
        if (appState.votingInProgress.has(placeId)) {
            button.disabled = true;
            button.textContent = hasVoted ? "Changed" : "Voting...";
            button.classList.add('voting');
        }
        
    } catch (error) {
        console.error('❌ Error updating button state:', error);
        button.textContent = "Vote";
        button.className = "vote-btn";
        button.disabled = false;
    }
}

function createPlaceElement(placeId, placeData) {
    try {
        const li = document.createElement("li");
        li.className = "place-item";
        li.setAttribute('data-place-id', placeId);
        
        const userVote = getUserVote();
        if (userVote === placeId) {
            li.classList.add('user-voted');
        }
        
        const placeInfo = document.createElement("div");
        placeInfo.className = "place-info";
        
        const placeName = document.createElement("div");
        placeName.className = "place-name";
        
        const safePlaceName = placeData.name || 'Unknown Place';
        placeName.textContent = safePlaceName;
        
        if (userVote === placeId) {
            placeName.innerHTML = `${safePlaceName} <span class="user-vote-indicator">👤 Your Choice</span>`;
        }
        
        const voteCount = document.createElement("div");
        voteCount.className = "vote-count";
        const votes = placeData.votes || 0;
        const pluralText = votes === 1 ? 'vote' : 'votes';
        voteCount.innerHTML = `<strong>${votes}</strong> ${pluralText}`;
        
        placeInfo.appendChild(placeName);
        placeInfo.appendChild(voteCount);
        
        const voteBtn = document.createElement("button");
        voteBtn.setAttribute('data-id', placeId);
        
        updateVoteButtonState(voteBtn, placeId);
        
        voteBtn.addEventListener('click', () => handleVote(placeId));
        
        li.appendChild(placeInfo);
        li.appendChild(voteBtn);
        
        return li;
        
    } catch (error) {
        console.error('❌ Error creating place element:', error);
        
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

function renderPlaces(placesData) {
    try {
        console.log('🔄 Rendering places using debug pattern:', placesData);
        
        placesList.innerHTML = "";
        
        appState.places = placesData || {};
        appState.isLoading = false;
        
        const storedVote = getUserVote();
        
        if (storedVote && placesData && !placesData[storedVote]) {
            saveUserVote(null);
        }
        
        updateUI();
        
        if (!placesData) {
            console.log('📭 No places data - showing empty state');
            leadingPlace.style.display = 'none';
            return;
        }
        
        const placesArray = [];
        
        for (const [id, data] of Object.entries(placesData)) {
            if (!data) {
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
        
        placesArray.sort((a, b) => {
            if (b.votes !== a.votes) {
                return (b.votes || 0) - (a.votes || 0);
            }
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
        
        updateLeadingPlace(placesArray);
        
        placesArray.forEach(place => {
            try {
                const placeElement = createPlaceElement(place.id, place);
                placesList.appendChild(placeElement);
            } catch (elementError) {
                console.error('❌ Error creating individual place element:', elementError);
            }
        });
        
        console.log('✅ Successfully rendered', placesArray.length, 'places');
        
    } catch (error) {
        console.error("💥 CRITICAL ERROR in renderPlaces:", error);
        showError("Failed to display lunch places. Please refresh the page.");
        appState.isLoading = false;
        updateUI();
    }
}

// ==========================================
// FIREBASE LISTENER - USING DEBUG PATTERN
// ==========================================

function setupRealtimeListener() {
    if (!window.placesRef || !window.firebaseImports) {
        console.error('❌ Firebase not initialized for listener');
        showError('Database connection not available. Please refresh the page.');
        appState.isLoading = false;
        updateUI();
        return;
    }
    
    console.log('🔄 Setting up real-time listener using debug pattern...');
    
    const timeoutId = setTimeout(() => {
        console.error('⏰ Database listener timeout');
        showError('Database connection timeout. Please refresh the page.');
        appState.isLoading = false;
        updateUI();
    }, 10000);
    
    try {
        // Use the exact same onValue pattern as debug script
        window.firebaseImports.onValue(window.placesRef, (snapshot) => {
            try {
                clearTimeout(timeoutId);
                console.log('✅ Database snapshot received using debug pattern!');
                console.log('📊 Snapshot exists:', snapshot.exists());
                
                const data = snapshot.val();
                console.log('📊 Raw data:', data);
                
                appState.isConnected = true;
                
                renderPlaces(data);
                
                const placeCount = data ? Object.keys(data).length : 0;
                console.log('🎉 Successfully processed', placeCount, 'lunch places');
                
            } catch (error) {
                clearTimeout(timeoutId);
                console.error("💥 CRITICAL ERROR in database listener:", error);
                showError("Failed to process lunch places data. Please refresh the page.");
                appState.isLoading = false;
                updateUI();
            }
        }, (error) => {
            clearTimeout(timeoutId);
            console.error("❌ DATABASE LISTENER CONNECTION ERROR:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            
            appState.isConnected = false;
            appState.isLoading = false;
            
            if (error.code === 'PERMISSION_DENIED') {
                console.error("🔒 PERMISSION DENIED! Update Firebase security rules");
                showError("❌ Permission denied! Please update your Firebase security rules.");
            } else if (error.code === 'NETWORK_ERROR') {
                showError("❌ Network error. Please check your internet connection.");
            } else {
                showError(`❌ Database connection error: ${error.message}`);
            }
            
            updateUI();
        });
        
        console.log('✅ Firebase listener attached using debug pattern');
        
    } catch (setupError) {
        clearTimeout(timeoutId);
        console.error('❌ Error setting up Firebase listener:', setupError);
        showError('Failed to setup database connection. Please refresh the page.');
        appState.isLoading = false;
        updateUI();
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    placeForm.addEventListener("submit", handleAddPlace);
    
    placeInput.addEventListener('input', () => {
        if (errorMessage.style.display === 'block') {
            hideError();
        }
    });
    
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
// DEBUG FUNCTIONS - SAME AS DEBUG SCRIPT
// ==========================================

window.testFirebaseDirectly = async function() {
    console.log('🧪 === DIRECT FIREBASE TEST ===');
    
    try {
        if (!window.firebaseImports || !window.placesRef) {
            console.log('❌ Firebase not properly initialized');
            return false;
        }
        
        console.log('🔄 Testing database read...');
        const snapshot = await window.firebaseImports.get(window.placesRef);
        console.log('✅ Read operation completed');
        console.log('📊 Data exists:', snapshot.exists());
        console.log('📊 Data:', JSON.stringify(snapshot.val(), null, 2));
        
        console.log('🔄 Testing database write...');
        const testData = {
            name: 'Test Place ' + Date.now(),
            votes: 0,
            createdAt: Date.now()
        };
        
        const result = await window.firebaseImports.push(window.placesRef, testData);
        console.log('✅ Write operation completed');
        console.log('🆔 New ID:', result.key);
        
        console.log('🎉 All Firebase tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Direct test failed:', error);
        console.error('Error code:', error.code);
        
        if (error.code === 'PERMISSION_DENIED') {
            console.error('🔒 PERMISSION DENIED!');
            console.error('🛠️ Go to Firebase Console → Realtime Database → Rules');
            console.error('📝 Set: {"rules": {".read": true, ".write": true}}');
        }
        
        return false;
    }
};

window.restartFirebaseListener = function() {
    console.log('🔄 Restarting Firebase listener...');
    
    if (window.placesRef && window.firebaseImports) {
        setupRealtimeListener();
        console.log('✅ Listener restarted');
    } else {
        console.log('❌ Firebase not ready for restart');
        initializeApp();
    }
};

// ==========================================
// INITIALIZATION - USING DEBUG PATTERN
// ==========================================

async function initializeApp() {
    try {
        console.log('🚀 Initializing LunchVote app using debug pattern...');
        
        setupEventListeners();
        console.log('✅ Event listeners set up');
        
        const firebaseSuccess = await initializeFirebase();
        
        if (!firebaseSuccess) {
            throw new Error('Firebase initialization failed');
        }
        
        setupRealtimeListener();
        console.log('✅ Database listener set up');
        
        placeInput.focus();
        
        console.log('🎉 LunchVote app initialized successfully using debug pattern!');
        
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showError('Failed to initialize the app. Please refresh the page.');
        appState.isLoading = false;
        updateUI();
    }
}

// ==========================================
// START APPLICATION - SAME AS DEBUG SCRIPT
// ==========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}