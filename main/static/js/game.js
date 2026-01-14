// will serve as the main JS file for the game page

import { getDatabase, ref, onValue, set, get, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { 
    buildMonopolyBoard, 
    resizeBoard,
    initializePlayerPieces,
    listenToPlayerMovement
} from './monopoly-board.js';

import { database } from './firebase-config.js';

import { 
    rollDiceAndMove,
    listenToGamePlayers,
    listenToTurns,
    listenToDeedCards,
    MONOPOLY_BOARD,
    showDeedCard,
    endTurn,
    buyProperty,
    listenToInventory,
    showTurnMessage
} from './game-functions.js';

import { 
    listenToIncomingTrades, 
    listenToTheirInventory, 
    sendTrade
} from './trade-functions.js';

export const PARTY_CODE = window.PARTY_CODE;
export const PLAYER_UUID = window.PLAYER_UUID;

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
            properties[tile.id] = {
                propertName: tile.name.toUpperCase().replace(/\s/g, '_'),
                ownerId: null,
                mortgaged: false
            };

            if (tile.type === 'property') {
                properties[tile.id].houses = 0;
                properties[tile.id].hotel = false;
                properties[tile.id].rentLevel = 0;
            }
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

const deedMenu = document.getElementById('deed-menu')

document.addEventListener('DOMContentLoaded', async () => {

    resizeBoard();
    buildMonopolyBoard();
    listenToInventory();
    listenToGamePlayers();
    listenToTurns();
    listenToDeedCards();
    listenToIncomingTrades();
    
    await showTurnMessage();
    await loadInitialGameState();

    window.addEventListener('resize', resizeBoard);

    const selectedPlayer = localStorage.getItem('selectedPlayer');

    if (selectedPlayer) {
        listenToTheirInventory(selectedPlayer);
    }

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

    const deedMenuState = localStorage.getItem('deedMenuState');
    const savedDeedId = localStorage.getItem('deedMenuId');

    if (deedMenuState === 'opened' && savedDeedId !== null) {
        const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
        
        try {
            const snapshot = await get(gameRef);
            
            if (snapshot.exists()) {
                const gameData = snapshot.val();
                const ownerId = gameData.properties[savedDeedId]?.ownerId;
                
                await showDeedCard(parseInt(savedDeedId), ownerId);
            } else {
                localStorage.removeItem('deedMenuState');
                localStorage.removeItem('deedMenuId');
                deedMenu.classList.add('hidden');
            }

        } catch (error) {
            console.error('Error restoring deed card:', error);
            deedMenu.classList.add('hidden');
        }

    } else {
        deedMenu.classList.add('hidden');
    }

    const closeDeedMenuBtn = document.getElementById('close-deed-menu');

    if (closeDeedMenuBtn) {
        closeDeedMenuBtn.addEventListener('click', () => {
            localStorage.setItem('deedMenuState', 'closed');
            deedMenu.classList.add('hidden');
        });
    }

    const purchaseBtn = document.getElementById('purchase-btn');

    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', async () => {
            await buyProperty();
        });
    }

    const mortgageBtn = document.getElementById('mortgage-btn');

    if (mortgageBtn) {
        mortgageBtn.addEventListener('click', async () => {
            //await mortgageProperty();
        });
    }

    const sendTradeBtn = document.getElementById('send-trade-btn');

    if (sendTradeBtn) {
        sendTradeBtn.addEventListener('click', async () => {
            sendTrade("trade", null, null);
        });
    }
});