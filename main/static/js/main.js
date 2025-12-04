import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, get, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { initializeGameState } from './game.js';

const firebaseConfig = {
    apiKey: "AIzaSyB1QFZFfNnT0bjJQ9CRufC3P9T2LLT8QI0",
    authDomain: "final-project-d8148.firebaseapp.com",
    projectId: "final-project-d8148",
    storageBucket: "final-project-d8148.firebasestorage.app",
    messagingSenderId: "156143968602",
    appId: "1:156143968602:web:937989f65b486acbf1d363",
    measurementId: "G-CLDPJH0G5L",
    databaseURL: "https://final-project-d8148-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ui functions

function togglePartyView(viewName) {
    const creationMenu = document.getElementById('party-creation-menu'); 
    const listMenu = document.getElementById('party-list-menu'); 
    const lobbyMenu = document.getElementById('party-lobby-menu'); 
    const title = document.getElementById('title');

    if (!listMenu || !creationMenu || !lobbyMenu) return;

    listMenu.classList.add('hidden');
    creationMenu.classList.add('hidden');
    lobbyMenu.classList.add('hidden');

    if (viewName === 'listMenu') {
        listMenu.classList.remove('hidden');
        title.textContent = 'List of ongoing games';
    } else if (viewName === 'createMenu') {
        creationMenu.classList.remove('hidden');
        title.textContent = 'Creating game';
    } else if (viewName === 'lobbyMenu') {
        lobbyMenu.classList.remove('hidden');
        title.textContent = 'Party lobby';
    } else {
        listMenu.classList.remove('hidden'); 
        title.textContent = 'List of ongoing games';
    }
}

const PLAYER_UUID = window.PLAYER_UUID || 'None';
console.log('PLAYER_UUID:', PLAYER_UUID);

const PLAYER = {
    uuid: window.PLAYER_UUID,
    username: null
}

function createOrJoin() {
    const codeInput = document.getElementById('join-code-input');
    const joinBtn = document.getElementById('join-party-btn');
    const createBtn = document.getElementById('create-party-btn');

    if (!codeInput || !joinBtn || !createBtn) {
        return;
    }

    const code = codeInput.value.trim().toUpperCase();

    if (code.length > 0) {
        createBtn.classList.add('hidden');
        joinBtn.classList.remove('hidden');

        joinBtn.disabled = code.length !== 6;
        joinBtn.textContent = (code.length === 6) ? 'Join party' : `Join (${code.length}/6)`;

    } else {
        createBtn.classList.remove('hidden');
        joinBtn.classList.add('hidden');
        createBtn.disabled = false;
    }
}

let messageTimeout = null;

function showMessage(message, messageType, duration) {
    const messageElement = document.getElementById('messageNotif');

    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }

    if(messageElement) {
        if (messageType === 0) { // 0 = error, 1 = success
            messageElement.classList.remove('hidden');
            messageElement.textContent = message;
            messageElement.style.backgroundColor = '#d03737ff';
        }

        if (messageType === 1) {
            messageElement.classList.remove('hidden');
            messageElement.textContent = message;
            messageElement.style.backgroundColor = '#4CAF50';
        }

        const durationSeconds = duration * 1000;

        messageTimeout = setTimeout(() => {
            messageElement.classList.add('hidden');
        }, durationSeconds);
    }
}

// for handling real time changes n stuff idk

function renderPartyList(allParties) {
    const currentPartyList = document.getElementById('parties');

    if (!currentPartyList) {
        return;
    }

    currentPartyList.innerHTML = '';

    if (!allParties || Object.keys(allParties).length === 0) {
        currentPartyList.innerHTML = '<p>no active parties rn</p>';
        return;
    }

    for (const [code, party] of Object.entries(allParties)) {
        const partyButton = document.createElement('button');

        partyButton.className = 'party-item'
        partyButton.addEventListener('click', async () => {
            await joinParty(code);
        });

        const currentPlayers = party.members ? party.members.length : 0;
        const maxPlayers = party.playerCount;
        const isFull = currentPlayers >= maxPlayers;

        partyButton.innerHTML = `
            <div class="party-info">
                <div class="party-name">${party.partyName}</div>
                <div class="party-details">
                    <span class="party-code">Code: ${party.partyCode}</span>
                    <span class="party-players ${isFull ? 'full' : ''}">
                        ${currentPlayers}/${maxPlayers} players
                    </span>
                </div>
            </div>
        `;

        if (isFull) {
            partyButton.disabled = true;
            partyButton.classList.add('full');
        }

        currentPartyList.appendChild(partyButton);
    }
}

async function listenToParties() {
    const partiesRef = ref(database, `parties`);

    onValue(partiesRef, (snapshot) => {
        if (snapshot.exists()) {
            const allParties = snapshot.val();
            renderPartyList(allParties);
        } else {
            renderPartyList(null);
        }
    });
}

async function renderPartyLobby() { // renders the party lobby, including member list, party code, player count, and party name
    try {
        const partiesRef = ref(database, `parties`);
        const snapshot = await get(partiesRef);

        if (!snapshot.exists()) {
            console.log('no parties found');
            return;
        }

        const allParties = snapshot.val()
        let userParty = null;
        let userPartyCode = null;

        for (const [code, party] of Object.entries(allParties)) {
            if (party.members && Array.isArray(party.members)) {
                const isInParty = party.members.some(m => m.id === PLAYER_UUID);

                if (isInParty) {
                    userParty = party;
                    userPartyCode = code;
                    break;
                }
            }
        }

        if (!userParty) {
            console.log('user is not in any party atm');
            return;
        }

        await populatePartyLobby(userParty, userPartyCode);
        togglePartyView('lobbyMenu')

        listenToPartyChanges(userPartyCode);

    } catch (error) {
        console.error('something went horribly wrong', error);
    }
}

function listenToPartyChanges(partyCode) {
    const partyRef = ref(database, `parties/${partyCode}`);

    onValue(partyRef, async (snapshot) => {
        try {
            if(snapshot.exists()) {
                const partyData = snapshot.val();

                if (partyData.status === 1) {
                    console.log('Party started, redirecting to game...');
                    window.location.href = `/game/${partyCode}/`;
                    return;
                }
                
                await populatePartyLobby(partyCode, partyData);
            } else {
                console.log('something went wrong');
            }
        } catch (error) {
            console.error(error);
        }
    });
}

async function populatePartyLobby(partyCode, partyData) {
    const partyNameCode = document.getElementById('party-name-code');

    if (partyNameCode) {
        partyNameCode.textContent = (`${partyData.partyName} | ${partyCode}`);
    }

    const currentPlayerCount = partyData.members ? partyData.members.length : 0;
    const maxPlayers = partyData.playerCount || 10;
    const partyPlayerCount = document.getElementById('party-player-count');

    if (partyPlayerCount) {
        partyPlayerCount.textContent = `${currentPlayerCount}/${maxPlayers} Players`
    }

    await renderMembersList(partyData.members);

    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        const isHost = partyData.hostUUID === PLAYER_UUID;
        if (isHost) {
            startBtn.style.display = 'block';
            startBtn.disabled = currentPlayerCount < 2;
        } else {
            startBtn.style.display = 'none';
        }
    }
}

async function renderMembersList(members) {
    const memberList = document.getElementById('party-members-list');

    if (!memberList || !members || !Array.isArray(members)) {
        return;
    }

    memberList.innerHTML = '';
    stopAllUsernameListeners();

    const memberDivs = members.map((member) => {
        const uuid = member.id;
        
        // 2. Create the DOM element
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member-item';
        memberDiv.dataset.memberId = uuid;

        // Use the cache for the initial load, or a placeholder
        const initialUsername = usernameCache[uuid]

        // 3. Set up the initial HTML structure
        memberDiv.innerHTML = `
            <span class="member-name" id="username-${uuid}">${initialUsername}</span>
            ${member.isHost ? '<span class="host-badge">👑 Host</span>' : ''}
            ${member.id === PLAYER_UUID ? '<span class="you-badge">(You)</span>' : ''}
        `;
        
        // 4. Attach the listener for live updates
        listenToUsername(uuid, (newUsername) => {
            const usernameSpan = document.getElementById(`username-${uuid}`);
            if (usernameSpan) {
                usernameSpan.textContent = newUsername; // Update the DOM instantly
            }
        });

        // 5. Append the div to the list
        memberList.appendChild(memberDiv);
        
        return memberDiv;
    });
}

// user handling

async function loadUser() {
    if (PLAYER.username) {
        return PLAYER;
    }

    try {
        const userRef = ref(database, `users/${PLAYER.uuid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            PLAYER.uuid = userData.uuid;
            PLAYER.username = userData.username;
            
            showMessage(`Welcome back, ${userData.username}`, 1, 6);
            console.log('You exist! Sugoi!');
            console.log('Username:', PLAYER.username, 'UUID:', PLAYER.uuid);
            return PLAYER;
        } else {
            console.log('User does not exit. Set a nickname kudasai!')
            return null;
        }

    } catch (error) {
        console.error('Error loading user');
        return null;
    }
}

async function setUsername() {
    const usernameInput = document.getElementById('username-input');
    const formattedName = usernameInput.value.trim();

    if (!formattedName) {
        showMessage(`You didn't type anything.`, 0, 4);
        console.log('bro entered nun');
        return;
    }

    if (formattedName.length < 3) {
        showMessage('Username must be at least 3 characters long.', 0, 4);
        console.log('Username must be at least 3 characters long.');
        return;
    }

    try {
        const userRef = ref(database, `users/${PLAYER.uuid}`);
        const snapshot = await get(userRef);
        const userData = {
            uuid: PLAYER.uuid,
            username: formattedName,
        }
        
        if (snapshot.exists()) {
            await update(userRef, userData);
            showMessage(`Your are now: ${userData.username}.`, 1, 4);
            console.log('Username with UUID {} updated successfully.'.replace("{}", PLAYER_UUID));
        } else {
            await set(userRef, userData);
            showMessage(`Pleased to meet you, ${userData.username}.`, 1, 4);
            console.log('User created successfully.');
        }

        PLAYER.username = formattedName
        clearUsernameCache(PLAYER_UUID);

    } catch (error) {
        showMessage('Could not set username.', 0, 4);
        console.error('Error setting username:', error);
    }
}

const usernameCache = {};
const activeListeners = {};

async function getUsernameByUUID(uuid) {
    if (usernameCache[uuid]) {
        return usernameCache[uuid];
    }

    try {
        const userRef = ref(database, `users/${uuid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const username = snapshot.val().username;
            usernameCache[uuid] = username;
            return username;
        } else {
            return 'Unknown User';
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        return 'Unknown User';
    }
}

function clearUsernameCache(uuid) {
    delete usernameCache[uuid];
}

function listenToUsername(uuid, callback) {
    const userRef = ref(database, `users/${uuid}/username`);
    
    onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const username = snapshot.val();
            usernameCache[uuid] = username; // Update cache
            callback(username);
        }
    });
}

export function stopAllUsernameListeners() {
    for (const uuid in activeListeners) {
        if (activeListeners[uuid].callback) {
            off(activeListeners[uuid].ref, activeListeners[uuid].callback); 
        }
    }

    Object.keys(activeListeners).forEach(key => delete activeListeners[key]);
}

// party handling

function generatePartyCode() { // generates a randomized 6-character alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

async function createParty() { // it create a party lol
    const partyName = (document.getElementById('party-name-input')).value.trim();
    const playerCount = parseInt((document.getElementById('max-players-input')).value, 10);
    const host = await loadUser();

    if (!host || !host.username) {
        showMessage(`Set your nickname first.`, 0, 4);
        console.log('Set your nickname first.');
        return;
    }

    if (!partyName || partyName.length < 3) {
        showMessage(`Party name must have more than 3 characters.`, 0, 4);
        console.log('Party name must be more than 3 characters.');
        return;
    }

    const partiesRef = ref(database, `parties`);
    const snapshot = await get(partiesRef);

    if (snapshot.exists()) {
        const allParties = snapshot.val();
            
        for (const [code, party] of Object.entries(allParties)) {
            const isInParty = party.members.some(m => m.id === host.uuid);

            if (isInParty) {
                showMessage(`You're in a party already, dude.`, 0, 4);
                console.log('cant create a new party if u are in one already gng');
                return;
            }
        }
    }

    try {
        const partyCode = generatePartyCode();
        const partyRef = ref(database, `parties/${partyCode}`);

        const partyData = {
            partyName: partyName,
            partyCode: partyCode,
            hostUUID: host.uuid,
            playerCount: playerCount,
            status: 0, // 0 = waiting, 1 = in progress
            members: [{
                id: host.uuid,
                isHost: true
            }]
        };

        await set(partyRef, partyData);
        showMessage(`Party successfully created`, 1, 4);
        console.log('Party successfully created.', partyData);
        await renderPartyLobby();

    } catch (error) {
        showMessage('Could not create party.', 0, 4);
        console.error('Could not create party because no.', error);
    }
}

async function joinParty(codeParam) {
    const codeInput = document.getElementById('join-code-input');
    
    let partyCode;
    if (typeof codeParam === 'string' && codeParam.length > 0) {
        partyCode = codeParam;
    } else if (codeInput) {
        partyCode = codeInput.value.trim();
    } else {
        partyCode = '';
    }
    
    const finalPartyCode = partyCode.toUpperCase();
    const member = await loadUser();

    if (!member || !member.username) {
        showMessage('Set your nickname first.', 0, 4);
        console.log('Set your nickname first.');
        return;
    }

    if (!finalPartyCode) {
        showMessage('Please enter a party code.', 0, 4);
        console.log('Please enter a party code.');
        return;
    }

    const partyRef = ref(database, `parties/${finalPartyCode}`);

    try {
        const snapshot = await get(partyRef);

        if (!snapshot.exists()) {
            showMessage('The party with that code does not exist.', 0, 4);
            console.log('the party with that code does not exist');
            return;
        }

        const partyData = snapshot.val();
        const currentMembers = partyData.members || []; 
        const isAlreadyMember = currentMembers.some(m => m.id === member.uuid);

        if (isAlreadyMember) {
            showMessage("You're in that party already.", 0, 4);
            console.log('boi u in dat party already');
            return;
        }

        if (currentMembers.length >= partyData.playerCount) {
            showMessage('That party is full.', 0, 4);
            console.log('that party is full');
            return;
        }

        const newMember = { id: member.uuid, isHost: false };
        const updateMemberList = [...currentMembers, newMember]; 

        await update(partyRef, { members: updateMemberList }); // replaces the 'members' key with the full, updated array
        
        showMessage(`You have joined ${partyData.partyName}.`, 1, 4);
        await renderPartyLobby(); 

    } catch (error) {
        showMessage('Could not join that party.', 0, 4);
        console.error('Error joining party:', error);
    }
}

async function leaveParty() {
    try {
        // Find which party the user is in
        const partiesRef = ref(database, 'parties');
        const snapshot = await get(partiesRef);

        if (!snapshot.exists()) {
            return;
        }

        const allParties = snapshot.val();
        
        for (const [code, party] of Object.entries(allParties)) {
            if (party.members && Array.isArray(party.members)) {
                const memberIndex = party.members.findIndex(m => m.id === PLAYER_UUID);
                
                if (memberIndex !== -1) {
                    const partyRef = ref(database, `parties/${code}`);
                    const updatedMembers = party.members.filter(m => m.id !== PLAYER_UUID);
                    
                    if (updatedMembers.length === 0) {
                        await remove(partyRef);
                        showMessage(`You have left; party has been deleted.`, 0, 4);
                        console.log('Party deleted (last person left)');
                    } else if (party.hostUUID === PLAYER_UUID) {
                        const newHost = updatedMembers[0];
                        newHost.isHost = true;
                        
                        await update(partyRef, {
                            members: updatedMembers,
                            hostUUID: newHost.id
                        });
                        showMessage(`You have left. Host has been transferred.`, 0, 4);
                        console.log('Left party and transferred host');
                    } else {
                        await update(partyRef, {
                            members: updatedMembers
                        });
                        showMessage(`You have left.`, 0, 4);
                        console.log('Left party');
                    }
                    
                    togglePartyView('listMenu');
                    return;
                }
            }
        }
        
        console.log('User not in any party');
        
    } catch (error) {
        showMessage('Could not leave party.', 0, 4);
        console.error('Error leaving party:', error);
    }
}

async function startParty() {
    try {
        const partiesRef = ref(database, 'parties');
        const snapshot = await get(partiesRef);

        if (!snapshot.exists()) {
            showMessage('No parties found.', 0, 4);
            return;
        }

        const allParties = snapshot.val();
        let hostParty = null;
        let hostPartyCode = null;

        for (const [code, party] of Object.entries(allParties)) {
            if (party.hostUUID === PLAYER_UUID) {
                hostParty = party;
                hostPartyCode = code;
                break;
            }
        }

        if (!hostParty) {
            showMessage('You are not the host of any party.', 0, 4);
            console.log('User is not a host');
            return;
        }

        if (hostParty.status === 1) {
            showMessage('That party has already started.', 0, 4);
            console.log('Party already started');
            return;
        }

        if (hostParty.status === 2) {
            showMessage('That party has already finished.', 0, 4);
            console.log('Party already finished');
            return;
        }

        const playerCount = hostParty.members ? hostParty.members.length : 0;
        if (playerCount < 2) {
            showMessage('Need at least 2 players to start!', 0, 4);
            console.log('Not enough players');
            return;
        }

        const partyRef = ref(database, `parties/${hostPartyCode}`);
        await update(partyRef, {
            status: 1, // in progress
            startedAt: Date.now(),
            game: initializeGameState(hostParty.members) // Initialize game state
        });

        showMessage('Party started!', 1, 4);
        console.log('Party started!');

        window.location.href = `/game/${hostPartyCode}/`;

    } catch (error) {
        showMessage('Could not start party.', 0, 4);
        console.error('Error starting party:', error);
    }
}

// FOR RESCALING PURPOSES. DO NOT TOUCH. EVER.

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

// initializes everything
document.addEventListener('DOMContentLoaded', () => {
    setResponsiveUnits();
    window.addEventListener('resize', debounce(setResponsiveUnits, 200));
    window.addEventListener('DOMContentLoaded', renderPartyLobby);

    listenToParties();
    loadUser();
    
    const codeInput = document.getElementById('join-code-input');
    if (codeInput) {
        createOrJoin(); 
        codeInput.addEventListener('keyup', createOrJoin);
        codeInput.addEventListener('change', createOrJoin); 
    };

    const joinPartyButton = document.getElementById('join-party-btn');
    joinPartyButton.addEventListener('click', async () => {
        joinParty(codeInput);
    });

    const leavePartyButton = document.getElementById('leave-party-btn');
    leavePartyButton.addEventListener('click', () => {
        leaveParty();
    });

    const startGameButton = document.getElementById('start-game-btn');
    startGameButton.addEventListener('click', () => {
        startParty();
    });

    const setUsernameButton = document.getElementById('create-user-btn');
    setUsernameButton.addEventListener('click', async () => {
        await setUsername();
    });

    const createPartyButton = document.getElementById('create-party-btn');
    createPartyButton.addEventListener('click', () => {
        togglePartyView('createMenu');
    });

    const confirmPartyCreation = document.getElementById('submit-create-party-btn');
    confirmPartyCreation.addEventListener('click', () => {
        createParty();
    })

    const cancelCreatePartyButton = document.getElementById('cancel-creation-btn');
    cancelCreatePartyButton.addEventListener('click', () => {
        togglePartyView('listMenu');
    });
});