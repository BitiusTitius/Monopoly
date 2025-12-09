// will serve as the main JS file for the game page

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, get, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { setResponsiveUnits, debounce, togglePartyView } from './ui-utils.js';
import { buildMonopolyBoard } from './monopoly-board.js';

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

const PARTY_CODE = window.PARTY_CODE;
const PLAYER_UUID = window.PLAYER_UUID;

export function initializeGameState(members) {
    const players = {};

    members.forEach((member, index) => {
        players[member.id] = {
            position: 0,
            money: {
                total: 1500,
                bills: getInitialBills()
            },
            properties: [],
            inJail: false,
            turnOrder: index
        }
    });

    return {
        currentPlayer: members[0].id,
        currentTurn: 1,
        phase: 'rolling',
        lastRoll: null,
        players: players,
        bank: {
            500: 20,
            100: 30,
            50: 40,
            20: 50,
            10: 50,
            5: 50,
            1: 100
        }
    }
}

function getInitialBills() {
    return {
        500: 2,
        100: 4,
        50: 1,
        20: 1,
        10: 1,
        5: 1,
        1: 5
    }
}

// leave-rejoins

async function leaveParty() {
    if (!PARTY_CODE || !PLAYER_UUID) {
        console.error('Missing party info');
        window.location.href = '/';
        return;
    }

    const partyRef = ref(database, `parties/${PARTY_CODE}`);

    try {
        const snapshot = await get(partyRef);

        if (snapshot.exists()) {
            const partyData = snapshot.val();
            const updatedMembers = partyData.members.filter(m => m.id !== PLAYER_UUID);

            if (updatedMembers.length === 0) {
                await remove(partyRef);
                console.log('Party empty, deleted.');
            } 

            else {
                const updates = {};
                updates['members'] = updatedMembers;

                if (partyData.hostUUID === PLAYER_UUID) {
                    const newHost = updatedMembers[0];
                    newHost.isHost = true;
                    updates['hostUUID'] = newHost.id;
                }

                await update(partyRef, updates);
            }
        }

        window.location.href = '/';

    } catch (error) {
        console.error('Error leaving game:', error);
        window.location.href = '/';
    }
}

// the initializer

document.addEventListener('DOMContentLoaded', () => {

    buildMonopolyBoard();

    const leaveGameBtn = document.getElementById('leave-the-game');
    if (leaveGameBtn) {
        leaveGameBtn.addEventListener('click', leaveParty);
    }
});