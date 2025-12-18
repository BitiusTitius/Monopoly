import { database, PLAYER_UUID } from './firebase-config.js';
import { ref, get, set, update, onValue, off } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { showMessage } from './ui-utils.js';

export const PLAYER = {
    uuid: PLAYER_UUID,
    username: null
};

export const usernameCache = {};
export const activeListeners = {};

export async function loadUser() {
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
            console.log(`You exist, ${userData.username}! Sugoi!`);
            console.log('Username:', PLAYER.username, 'UUID:', PLAYER.uuid);
            return PLAYER;
        } else {
            showMessage('You do not exist yet - please set a nickname.', 0, 6);
            console.log(`You do not exist yet. Set a nickname kudasai!`);
            return null;
        }

    } catch (error) {
        console.error('Error loading user');
        return null;
    }
}

export async function setUsername() {
    const usernameInput = document.getElementById('username-input');
    const formattedName = usernameInput.value.trim();

    if (!formattedName) {
        showMessage(`You didn't type anything.`, 0, 4);
        console.log('bro entered nothing');
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
            showMessage(`You are now: ${userData.username}.`, 1, 4);
            console.log(`UUID ${[PLAYER_UUID]} has changed their name to ${userData.username}.`);
        } else {
            await set(userRef, userData);
            showMessage(`Pleased to meet you, ${userData.username}.`, 1, 4);
            console.log(`UUID ${[PLAYER_UUID]} has set their name to ${userData.username}.`);
        }

        PLAYER.username = formattedName;

    } catch (error) {
        showMessage('Could not set username.', 0, 4);
        console.error('Error setting username:', error);
    }
}

export async function getUsernameByUUID(uuid) {
    try {
        const userRef = ref(database, `users/${uuid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const username = snapshot.val().username;
            return username;
        } else {
            return 'Unknown User';
        }

    } catch (error) {
        console.error('Error fetching username:', error);
        return 'Unknown User';
    }
}

export function clearUsernameCache(uuid) {
    delete usernameCache[uuid];
}

export function listenToUsername(uuid, callback) {
    const userRef = ref(database, `users/${uuid}/username`);
    
    onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const username = snapshot.val();
            usernameCache[uuid] = username;
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