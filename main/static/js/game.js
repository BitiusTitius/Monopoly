// will serve as the main JS file for the game page

import { getDatabase, ref, onValue, set, get, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { buildMonopolyBoard, renderDeedCard } from './monopoly-board.js';
import { database } from './firebase-config.js';

import { 
    renderPlayer,
    movePlayer,
    initializePlayerPieces,
    listenToPlayerMovement,
    rollDiceAndMove,
    listenToMoneyChanges,
    listenToGamePlayers,
    listenToTurns,
    listenToDeedCards,
    MONOPOLY_BOARD,
    buyProperty
} from './game-functions.js';

export const PARTY_CODE = window.PARTY_CODE;
export const PLAYER_UUID = window.PLAYER_UUID;

// debugging stuff

window.movePlayer = (uuid, spaces) => movePlayer(PARTY_CODE, uuid || PLAYER_UUID, spaces);

// rest of the code

export function initializeGameState(members) {
    const players = {};

    members.forEach((member, index) => {
        players[member.id] = {
            character: member.character || null,
            position: 0,
            money: {
                bills: {
                    500: 2,
                    100: 2,
                    50: 2,
                    20: 6,
                    10: 5,
                    5: 5,
                    1: 5
                },
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
        properties: initializePropertyState(),
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

function initializePropertyState() {
    const properties = {};
    
    MONOPOLY_BOARD.forEach(tile => {
        if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
            //const safeName = tile.name.toUpperCase().replace(/\s/g, '_');
            //const newKey = `${tile.id}_${safeName}`;

            properties[tile.id] = {
                propertName: tile.name.toUpperCase().replace(/\s/g, '_'),
                ownerId: null,
                rentValues: tile.rent,
                houses: 0,
                hotels: 0,
                mortgaged: false
            };
        }
    });

    return properties;
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

async function loadInitialGameState() {
    const partyRef = ref(database, `parties/${PARTY_CODE}/game`);
    const snapshot = await get(partyRef);

    if (snapshot.exists()) {
        const gameData = snapshot.val();
        await initializePlayerPieces(gameData.players);

        Object.keys(gameData.players).forEach(playerUUID => {
            listenToPlayerMovement(playerUUID);
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {

    buildMonopolyBoard();
    listenToGamePlayers();
    listenToMoneyChanges();
    listenToTurns();
    listenToDeedCards(PARTY_CODE, PLAYER_UUID);

    await loadInitialGameState();

    const rollDiceBtn = document.getElementById('dice-roller');

    if (rollDiceBtn) {
        rollDiceBtn.addEventListener('click', async () => {
            await rollDiceAndMove();
        });
    }

    const leaveGameBtn = document.getElementById('leave-the-game');

    if (leaveGameBtn) {
        leaveGameBtn.addEventListener('click', leaveParty);
    }



    const purchaseBtn = document.getElementById('purchase-btn')

    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', async () => {
            await buyProperty();
        });
    }
});