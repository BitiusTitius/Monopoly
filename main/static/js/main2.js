// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    addDoc,
    deleteDoc,
    onSnapshot, 
    collection, 
    query, 
    where, 
    runTransaction,
    getDocs, 
    setLogLevel,
    limit
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";



const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
window.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Variables initialized by Django/Canvas (must be injected in home.html)
window.userId = window.INITIAL_USER_ID || 'loading...'; 
let initialUsername = window.INITIAL_USERNAME || 'Guest'; 
window.isAuthReady = false; 

let app;
let db;
let auth;
const PARTY_COLLECTION_PATH = `/artifacts/${window.appId}/public/data/parties`;

// Global state for real-time listener cleanup
let unsubscribeParties = null; 

// Global variable to track the party the user is currently viewing/in
let currentPartyCode = null; 
let lastPartyViewPlayers = ''; 


// --- HELPER FUNCTIONS ---

// FOR RESCALING PURPOSES (Retained from original file)
function debounce(func, delay = 200) {
    let timeoutId;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

function setResponsiveUnits() {
    const root = document.documentElement.style;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    const oneVw_in_px = viewportWidth / 100;
    const oneVh_in_px = viewportHeight / 100;

    root.setProperty('--scale-unit-w', `${oneVw_in_px}px`);
    root.setProperty('--scale-unit-h', `${oneVh_in_px}px`);
    
    window.requestAnimationFrame(() => {
        void root.getPropertyValue('--scale-unit-w'); 
        window.requestAnimationFrame(() => {});
    });
}

// gets a cookie value (used for Django's CSRF token)
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// generates party code
function generatePartyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// toggles visibility of the different menus (party list, party creation, party lobby)
function togglePartyView(viewName) {
    const creationMenu = document.getElementById('party-creation-menu'); 
    const listMenu = document.getElementById('party-list-menu'); 
    const lobbyMenu = document.getElementById('party-lobby-menu'); 

    if (!listMenu || !creationMenu || !lobbyMenu) return;

    listMenu.classList.add('hidden');
    creationMenu.classList.add('hidden');
    lobbyMenu.classList.add('hidden');

    if (viewName === 'lobby') {
        listMenu.classList.remove('hidden');
        currentPartyCode = null; 
    } else if (viewName === 'create') {
        creationMenu.classList.remove('hidden');
        currentPartyCode = null; 
    } else if (viewName === 'party') {
     lobbyMenu.classList.remove('hidden');
    } else {
        listMenu.classList.remove('hidden'); 
        currentPartyCode = null;
    }
}

function toggleCreationMenu(show) {
    togglePartyView(show ? 'create' : 'lobby');
}

/**
 * Updates the display area with the current username and UUID.
 */
function updateNameDisplay(username, user_uuid) {
    initialUsername = username; 
    
    const displayDiv = document.getElementById('current-name-display'); 
    if (displayDiv) {
        const fullUuid = user_uuid; 
        
        if (username && user_uuid) {
            displayDiv.innerHTML = `
                <p class="text-sm">Current Nickname:</p>
                <p class="font-bold text-lg">${username}</p>
                <p class="text-xs mt-2 opacity-75">User ID (for cross-play):</p>
                <p class="text-sm user-uuid-text break-words">${fullUuid}</p>
            `;
        } else {
            displayDiv.innerHTML = '<p class="text-sm italic">Nickname not set for this session.</p>';
        }
    }
}

/**
 * Handles the logic for dynamically swapping the 'Create Game' and 'Join Party' buttons
 * based on the content of the party code input field. 
 */
function checkJoinCodeInput() {
    const joinCodeInput = document.getElementById('join-code-input');
    const createBtn = document.getElementById('create-party-btn');
    const joinBtn = document.getElementById('join-party-btn');
    
    if (!joinCodeInput || !createBtn || !joinBtn) {
        return;
    }

    const code = joinCodeInput.value.trim().toUpperCase();

    if (code.length > 0) {
        createBtn.classList.add('hidden');
        joinBtn.classList.remove('hidden');

        joinBtn.disabled = code.length !== 6;
        joinBtn.textContent = (code.length === 6) ? 'Join Party' : `Join (${code.length}/6)`;

    } else {
        createBtn.classList.remove('hidden');
        joinBtn.classList.add('hidden');
        createBtn.disabled = false;
    }
}

/**
 * Renders a single party item to the list. 
 */
function renderPartyItem(party) {
    const partyElement = document.createElement('button');
    partyElement.className = 'party-item';
    
    let creationTime = 'Unknown Time';
    try {
        // Use ISO string to create Date object
        creationTime = new Date(party.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        // use default
    }

    partyElement.innerHTML = `
        <div class="party-name">${party.name} <span class="party-code">(${party.code})</span></div>
        <div class="party-details">
            Host: ${party.hostName} | Players: ${party.playerCount}/${party.maxPlayers}
            <span class="creation-time"> | Created: ${creationTime}</span>
        </div>
    `;
    partyElement.dataset.partyCode = party.code;
    
    // Add click listener to join the party when clicking the item
    partyElement.addEventListener('click', () => window.joinParty(party.code));

    return partyElement;
}

/**
 * Renders the entire list of parties to the UI.
 * @param {Array<object>} allParties - The list of parties from Firestore.
 */
function renderParties(allParties) {
    const currentPartiesList = document.getElementById('parties'); 
    const currentLoadingPartiesMsg = document.getElementById('loading-parties-msg');
    
    if (!currentPartiesList) {
        return;
    }

    let parties = allParties.filter(partyData => 
        partyData.status === 'LOBBY' && partyData.playerCount < partyData.maxPlayers
    );
    
    // Sort parties by creation time (newest first for now)
    parties.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
    });

    currentPartiesList.innerHTML = '';
    if (currentLoadingPartiesMsg) currentLoadingPartiesMsg.classList.add('hidden');

    if (parties.length === 0) {
        currentPartiesList.innerHTML = '<p class="text-center italic mt-4">No parties found. Be the first to create one!</p>';
        return;
    }

    parties.forEach(party => {
        currentPartiesList.appendChild(renderPartyItem(party));
    });
}

/**
 * Renders the party lobby view when a user joins or creates a party. 
 */
function renderPartyLobby(party) {
    const partyLobbyMenu = document.getElementById('party-lobby-menu');
    if (!partyLobbyMenu) return;

    currentPartyCode = party.code; 

    document.getElementById('party-lobby-name').textContent = party.name;
    document.getElementById('party-lobby-code').textContent = party.code;
    document.getElementById('party-player-count').textContent = `${party.playerCount}/${party.maxPlayers} Players`;

    // Render members list
    const membersList = document.getElementById('party-members-list');
    membersList.innerHTML = ''; 

    const isHost = party.hostId === window.userId;
    const startGameBtn = document.getElementById('start-game-btn');

    if (startGameBtn) {
        startGameBtn.disabled = !isHost || party.playerCount < 2; 
        startGameBtn.textContent = isHost ? 
            (party.playerCount < 2 ? 'Need 2+ Players to Start' : 'Start Game') : 
            'Start Game (Host Only)';
    }

    // Defensive copy and sort for rendering
    const sortedPlayers = [...party.players].sort((a, b) => {
        // Host always first
        if (a.isHost && !b.isHost) return -1;
        if (!a.isHost && b.isHost) return 1;
        // Current user (if not host) next
        if (a.id === window.userId && a.id !== party.hostId) return -1;
        if (b.id === window.userId && b.id !== party.hostId) return 1;
        // Alphabetical by name otherwise
        return a.name.localeCompare(b.name);
    });

    sortedPlayers.forEach(player => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member-item';
        
        const isYou = player.id === window.userId ? ' (You)' : '';
        const userDisplay = player.name + isYou;

        memberDiv.innerHTML = `
            <span class="truncate" title="${userDisplay}">${userDisplay}</span>
            ${player.isHost ? '<span class="host-tag">HOST</span>' : ''}
        `;
        membersList.appendChild(memberDiv);
    });
    
    const joinCodeInput = document.getElementById('join-code-input');
    if (joinCodeInput) joinCodeInput.value = '';
    checkJoinCodeInput(); 

    togglePartyView('party');
}


// --- FIREBASE INITIALIZATION AND AUTH ---

/**
 * Initializes Firebase, authenticates the user, and sets up the listener.
 */
async function initializeFirebase() {
    console.log("Initializing Firebase...");
    try {
        setLogLevel('debug'); 

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // --- Authentication ---
        // If initialAuthToken is defined, use it for custom sign-in
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // Otherwise, sign in anonymously (required for Firestore security rules)
            await signInAnonymously(auth);
        }

        // --- Auth State Change Listener ---
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // IMPORTANT: Firebase UID is the true user identifier
                window.userId = user.uid; 
                window.isAuthReady = true;
                console.log("Firebase Auth Ready. User ID:", window.userId);
                
                // Update display with the now-confirmed UUID
                updateNameDisplay(initialUsername, window.userId);
                
                // Start listening for parties ONLY after auth is ready
                window.listenForParties();
            } else {
                window.isAuthReady = false;
                window.userId = 'anonymous';
                if(unsubscribeParties) unsubscribeParties();
            }
        });

    } catch (error) {
        console.error("Firebase initialization or authentication failed:", error);
    }
}

// --- DJANGO INTERACTION ---

async function setUsername() {
    const usernameInput = document.getElementById('username-input');
    if (!usernameInput) return;

    const newUsername = usernameInput.value.trim();

    if (newUsername.length < 3) {
        showMessage("Nickname must be at least 3 characters long.", true);
        return;
    }
    
    // Check if services are ready
    if (!auth?.currentUser || !db) {
        showMessage("Connection not ready. Please wait a moment.", true);
        return;
    }
    
    const userId = auth.currentUser.uid;

    try {
        // 1. Update UI
        updateNameDisplay(newUsername, userId);
        
        // 2. Sync to Firebase Profile (Private Data)
        // Path: /artifacts/{appId}/users/{userId}/profile/data
        const userRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
        await setDoc(userRef, { username: newUsername, lastActive: Date.now() }, { merge: true });
        
        showMessage(`Nickname set to ${newUsername}!`, false);
        
    } catch (error) {
        console.error("Error setting nickname:", error);
        showMessage(`Failed to set nickname: ${error.message}`, true);
    }
}

// --- FIREBASE PARTY MANAGEMENT ---

/**
 * Sets up the real-time Firestore listener for all active parties.
 */
window.listenForParties = function() {
    if (!db || !window.isAuthReady) {
        console.warn("Firestore not ready. Cannot start listener.");
        return;
    }
    
    if (unsubscribeParties) {
        unsubscribeParties();
    }
    
    const partiesRef = collection(db, PARTY_COLLECTION_PATH);
    const q = query(partiesRef, where('status', '==', 'LOBBY'));
    
    unsubscribeParties = onSnapshot(q, (snapshot) => {
        
        const allParties = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderParties(allParties);
        
        // If the user is currently in a party lobby, check for updates to that specific party
        if (currentPartyCode) {
            const partyInView = allParties.find(p => p.code === currentPartyCode);
            
            if (partyInView) {
                const currentPlayersJson = JSON.stringify(partyInView.players);
                // Only re-render the lobby if the player list changed, to prevent jitter
                if (currentPlayersJson !== lastPartyViewPlayers) {
                    renderPartyLobby(partyInView);
                    lastPartyViewPlayers = currentPlayersJson;
                }
            } else {
                // The party was deleted or started while the user was viewing it
                currentPartyCode = null;
                lastPartyViewPlayers = '';
                togglePartyView('lobby');
                const messageDiv = document.getElementById('user-message');
                if (messageDiv) {
                     messageDiv.textContent = 'The party you were in has been disbanded or started.';
                     messageDiv.style.color = 'var(--warning-color)';
                     setTimeout(() => { messageDiv.textContent = ''; }, 3000);
                }
            }
        }
        
    }, (error) => {
        console.error("Firestore snapshot listener failed:", error);
        const currentPartiesList = document.getElementById('parties');
        if (currentPartiesList) {
             currentPartiesList.innerHTML = '<p class="text-center italic mt-4 text-red-500">Error connecting to game data.</p>';
        }
    });

    console.log("Firestore real-time listener started.");
};


/**
 * Creates a new party document in Firestore.
 */
async function createParty() {
    if (!db || !window.isAuthReady) {
        console.error("Firestore not ready. Cannot create party.");
        return;
    }
    const partyNameInput = document.getElementById('party-name-input');
    const maxPlayersInput = document.getElementById('max-players-input');
    const messageArea = document.getElementById('creation-message');

    const name = partyNameInput.value.trim();
    const maxPlayers = parseInt(maxPlayersInput.value, 10);
    const hostId = window.userId;
    const hostName = initialUsername;

    if (!name || name.length < 3) {
        messageArea.textContent = 'Game name must be at least 3 characters.';
        messageArea.style.color = 'var(--danger-color)';
        return;
    }
    if (maxPlayers < 2 || maxPlayers > 6) {
        messageArea.textContent = 'Max players must be between 2 and 6.';
        messageArea.style.color = 'var(--danger-color)';
        return;
    }

    try {
        let uniqueCode = generatePartyCode();
        let codeIsUnique = false;
        
        // Ensure code is unique (simple check)
        while (!codeIsUnique) {
            const existingParties = await getDocs(query(getPartiesCollectionRef(), where('code', '==', uniqueCode), limit(1)));
            // FIX: The user's code had a typo: 'existingParting' -> 'existingParties'
            if (existingParties.empty) { 
                codeIsUnique = true;
            } else {
                uniqueCode = generatePartyCode(); // Regenerate if conflict
            }
        }
        
        const newPartyData = {
            partyCode: uniqueCode,
            name: name,
            maxPlayers: maxPlayers,
            hostId: hostId,
            status: 'lobby', // lobby, active, finished
            createdAt: new Date().toISOString(),
            members: [{ 
                id: hostId, 
                isHost: true 
            }]
        };

        const docRef = doc(getPartiesCollectionRef(), uniqueCode); // Use code as document ID
        await setDoc(docRef, newPartyData);

        messageArea.textContent = `Game created with code: ${uniqueCode}`;
        messageArea.style.color = 'var(--success-color)';
        
        // Immediately join the created party view
        joinParty(uniqueCode);

    } catch (error) {
        console.error("Error creating party:", error);
        messageArea.textContent = 'Failed to create game. Check console for details.';
        messageArea.style.color = 'var(--danger-color)';
    }
}


function showMessage(message, isError = false) {
    const messageDiv = document.getElementById('user-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        // Use custom CSS variables for color feedback
        messageDiv.style.color = isError ? 'var(--danger-color, red)' : 'var(--success-color, green)'; 
        messageDiv.style.fontWeight = 'bold';
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.style.fontWeight = 'normal';
        }, 5000); 
    }
}

function getPartiesCollectionRef() {
    // Path: /artifacts/{appId}/public/data/parties
    const path = `/artifacts/${window.appId}/public/data/parties`;
    return collection(db, path);
}

async function joinParty(code) {
    if (!window.isAuthReady) { return; }

    const joinCodeInput = document.getElementById('join-code-input');
    const partyCode = (code || (joinCodeInput ? joinCodeInput.value.trim() : '')).toUpperCase();
    const messageDiv = document.getElementById('user-message') || document.getElementById('creation-message'); 
    
    if (!messageDiv) return;

    const currentUsername = initialUsername;
    if (!currentUsername || currentUsername === 'Guest') { 
        messageDiv.textContent = 'Please set a nickname first.';
        messageDiv.style.color = 'var(--danger-color)';
        setTimeout(() => { messageDiv.textContent = ''; }, 3000);
        return; 
    }
    
    const partyDocRef = doc(db, PARTY_COLLECTION_PATH, partyCode);
    
    messageDiv.textContent = 'Joining party...';
    messageDiv.style.color = 'var(--warning-color)';

    try {
        await runTransaction(db, async (transaction) => {
            const partyDoc = await transaction.get(partyDocRef);

            if (!partyDoc.exists()) {
                throw new Error(`Party with code ${partyCode} not found.`);
            }

            const party = partyDoc.data();
            
            if (party.status !== 'LOBBY') {
                throw new Error("Game has already started or finished.");
            }
            if (party.playerCount >= party.maxPlayers) {
                throw new Error("Party is full.");
            }
            
            const isAlreadyInParty = party.players.some(p => p.id === window.userId);

            if (isAlreadyInParty) {
                // Use error to exit transaction and signal success
                renderPartyLobby(party); 
                throw new Error("Already in party!");
            }

            const newPlayer = { id: window.userId, name: currentUsername, isHost: false };
            const updatedPlayers = [...party.players, newPlayer];

            transaction.update(partyDocRef, {
                players: updatedPlayers,
                playerCount: party.playerCount + 1,
            });
        });

        messageDiv.textContent = `Joined party ${partyCode}!`;
        messageDiv.style.color = 'var(--success-color)';
        
    } catch (error) {
        const isAlreadyIn = error.message.includes("Already in party!");
        if (!isAlreadyIn) {
            console.error("Error joining party:", error.message);
            messageDiv.textContent = error.message;
            messageDiv.style.color = 'var(--danger-color)';
        } else {
             messageDiv.textContent = `You are already in party ${partyCode}!`;
             messageDiv.style.color = 'var(--success-color)';
        }
    } finally {
        setTimeout(() => { messageDiv.textContent = ''; }, 3000);
    }
}

/**
 * Handles a user leaving the party, and deletes the party if it becomes empty.
 * This function is exposed globally as `window.leaveParty`.
 */
async function leaveParty() {
    if (!window.isAuthReady) { return; }

    const messageDiv = document.getElementById('user-message');
    const partyToLeave = currentPartyCode; 
    
    if (!partyToLeave) {
        togglePartyView('lobby');
        if (messageDiv) messageDiv.textContent = 'Not currently in a party.';
        return;
    }
    
    const partyDocRef = doc(db, PARTY_COLLECTION_PATH, partyToLeave);
    
    messageDiv.textContent = 'Leaving party...';
    messageDiv.style.color = 'var(--warning-color)';

    try {
        await runTransaction(db, async (transaction) => {
            const partyDoc = await transaction.get(partyDocRef);

            if (!partyDoc.exists()) {
                currentPartyCode = null; 
                throw new Error("Party does not exist on server.");
            }

            const party = partyDoc.data();
            
            let updatedPlayers = party.players.filter(p => p.id !== window.userId);
            let newPlayerCount = updatedPlayers.length;

            if (newPlayerCount === 0) {
                transaction.delete(partyDocRef);
                currentPartyCode = null; 
            } else {
                let newHostId = party.hostId;
                let newHostName = party.hostName;
                
                // If the host is leaving, assign new host
                if (party.hostId === window.userId) {
                    const nextHost = updatedPlayers[0];
                    if (nextHost) {
                        newHostId = nextHost.id;
                        newHostName = nextHost.name;
                        // Mark the new host in the array
                        updatedPlayers = updatedPlayers.map(p => ({
                            ...p,
                            isHost: p.id === newHostId
                        }));
                    }
                }

                transaction.update(partyDocRef, {
                    players: updatedPlayers,
                    playerCount: newPlayerCount,
                    hostId: newHostId,
                    hostName: newHostName,
                });
            }
        });

        if (messageDiv) {
            messageDiv.textContent = `Left party ${partyToLeave}.`;
            messageDiv.style.color = 'var(--success-color)';
        }
        
        checkJoinCodeInput(); 
        togglePartyView('lobby');
        
    } catch (error) {
        if (!error.message.includes("Party does not exist on server.")) {
            console.error("Error leaving party:", error.message);
            if (messageDiv) {
                messageDiv.textContent = `Failed to leave party: ${error.message}`;
                messageDiv.style.color = 'var(--danger-color)';
            }
        }
    } finally {
        setTimeout(() => { if (messageDiv) messageDiv.textContent = ''; }, 3000);
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Start Firebase initialization (contains Auth & starts Firestore listener)
    initializeFirebase();

    setResponsiveUnits();
    window.addEventListener('resize', debounce(setResponsiveUnits, 200));

    // 2. Attach Listeners
    const setUsernameButton = document.getElementById('set-username-btn');
    const joinCodeInput = document.getElementById('join-code-input');
    const joinPartyButton = document.getElementById('join-party-btn');
    const createPartyBtn = document.getElementById('create-party-btn');
    const cancelCreationBtn = document.getElementById('cancel-creation-btn');
    const submitCreatePartyBtn = document.getElementById('submit-create-party-btn');
    const leavePartyButton = document.getElementById('leave-party-btn');
    const clearPartiesButton = document.getElementById('clear-all-parties-btn');

    if (setUsernameButton) {
        // Debounce setUsername
        setUsernameButton.addEventListener('click', debounce(setUsername, 300));
    }
    
    if (joinCodeInput) {
        checkJoinCodeInput(); 
        joinCodeInput.addEventListener('keyup', checkJoinCodeInput);
        joinCodeInput.addEventListener('change', checkJoinCodeInput); 
    }
    
    if (joinPartyButton) {
        // Debounce joinParty
        joinPartyButton.addEventListener('click', debounce(() => joinParty(), 500));
    }
    
    if (createPartyBtn) {
        createPartyBtn.addEventListener('click', () => {
            const currentUsername = initialUsername;
            if (!currentUsername || currentUsername === 'Guest') { 
                const messageDiv = document.getElementById('user-message');
                if (messageDiv) {
                    messageDiv.textContent = 'Please set a unique nickname before creating a party!';
                    messageDiv.style.color = 'var(--danger-color)';
                    setTimeout(() => { messageDiv.textContent = ''; }, 3000);
                }
                return;
            }
            toggleCreationMenu(true);
        });
    }
    if (cancelCreationBtn) {
        cancelCreationBtn.addEventListener('click', () => toggleCreationMenu(false));
    }
    if (submitCreatePartyBtn) {
        // Debounce createParty
        submitCreatePartyBtn.addEventListener('click', debounce(createParty, 500)); 
    }
    if (leavePartyButton) {
        // Debounce leaveParty
        leavePartyButton.addEventListener('click', debounce(leaveParty, 300));
    }
    if (clearPartiesButton) {
        // Debounce clearAllParties
         clearPartiesButton.addEventListener('click', debounce(clearAllParties, 500));
    }
    
    // Update initial display with the info from Django
    const usernameInput = document.getElementById('username-input');
    if (usernameInput && initialUsername && initialUsername !== 'Guest') {
        usernameInput.value = initialUsername;
    }
    updateNameDisplay(initialUsername, window.userId);
});

// Expose functions globally for simplicity
window.createParty = createParty;
window.joinParty = joinParty;
window.leaveParty = leaveParty;
window.clearAllParties = clearAllParties;
window.setUsername = setUsername;