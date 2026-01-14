import { database } from './firebase-config.js';
import { ref, get, update, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { listenToUsername } from './auth.js';
import { CHARACTER_ICONS, renderDeedCard } from './monopoly-board.js';

import { PARTY_CODE, PLAYER_UUID } from './game.js';
import { showPlayerOptions } from './trade-functions.js';

import { renderInventory, sendTrade } from './trade-functions.js';

const deedMenu = document.getElementById('deed-menu');

export const MONOPOLY_BOARD = [
    // bottom-end
    { id: 0, name: "GO", type: "corner", group: "start", price: 0 },
    { id: 1, name: "OLD KENT ROAD", type: "property", group: "brown", price: 60, rent: [2, 4, 10, 30, 90, 160, 250] },
    { id: 2, name: "COMMUNITY CHEST", type: "card", group: "white" },
    { id: 3, name: "WHITECHAPEL ROAD", type: "property", group: "brown", price: 60, rent: [4, 8, 20, 60, 180, 320, 450] },
    { id: 4, name: "INCOME TAX", type: "tax", cost: 100, group: "tax" },
    { id: 5, name: "KING'S CROSS STATION", type: "railroad", group: "railroad", price: 200, rent: 25 },
    { id: 6, name: "THE ANGEL, ISLINGTON", type: "property", group: "lightblue", price: 100, rent: [6, 12, 30, 90, 270, 400, 550] },
    { id: 7, name: "CHANCE", type: "card", group: "white" },
    { id: 8, name: "EUSTON ROAD", type: "property", group: "lightblue", price: 100, rent: [6, 12, 30, 90, 270, 400, 550] },
    { id: 9, name: "PENTONVILLE ROAD", type: "property", group: "lightblue", price: 120, rent: [8, 16, 40, 100, 300, 450, 600] },

    // left-end
    { id: 10, name: "JAIL", type: "corner", group: "jail" },
    { id: 11, name: "PALL MALL", type: "property", group: "pink", price: 140, rent: [10, 20, 50, 150, 450, 625, 750] },
    { id: 12, name: "ELECTRIC COMPANY", type: "utility", group: "utility", price: 150, rent: 4 },
    { id: 13, name: "WHITEHALL", type: "property", group: "pink", price: 140, rent: [10, 20, 50, 150, 450, 625, 750] },
    { id: 14, name: "NORTHUMB'ND AVENUE", type: "property", group: "pink", price: 160, rent: [12, 24, 60, 180, 500, 700, 900] },
    { id: 15, name: "MARYLEBONE STATION", type: "railroad", group: "railroad", price: 200, rent: 25 },
    { id: 16, name: "BOW STREET", type: "property", group: "orange", price: 180, rent: [14, 28, 70, 200, 550, 750, 950] },
    { id: 17, name: "COMMUNITY CHEST", type: "card", group: "white" },
    { id: 18, name: "MARLBOROUGH STREET", type: "property", group: "orange", price: 180, rent: [14, 28, 70, 200, 550, 750, 950] },
    { id: 19, name: "VINE STREET", type: "property", group: "orange", price: 200, rent: [16, 32, 80, 220, 600, 800, 1000] },

    // top-end
    { id: 20, name: "FREE PARKING", type: "corner", group: "free-parking" },
    { id: 21, name: "THE STRAND", type: "property", group: "red", price: 220, rent: [18, 36, 90, 250, 700, 875, 1050] },
    { id: 22, name: "CHANCE", type: "card", group: "white" },
    { id: 23, name: "FLEET STREET", type: "property", group: "red", price: 220, rent: [18, 36, 90, 250, 700, 875, 1050] },
    { id: 24, name: "TRAFALGAR SQUARE", type: "property", group: "red", price: 240, rent: [20, 40, 100, 300, 750, 925, 1100] },
    { id: 25, name: "FENCHURCH ST STATION", type: "railroad", group: "railroad", price: 200, rent: 25 },
    { id: 26, name: "LEICESTER SQUARE", type: "property", group: "yellow", price: 260, rent: [22, 44, 110, 330, 800, 975, 1150] },
    { id: 27, name: "COVENTRY STREET", type: "property", group: "yellow", price: 260, rent: [22, 44, 110, 330, 800, 975, 1150] },
    { id: 28, name: "WATER WORKS", type: "utility", group: "utility", price: 150, rent: 4 },
    { id: 29, name: "PICCADILLY", type: "property", group: "yellow", price: 280, rent: [24, 48, 120, 360, 850, 1025, 1200] },

    // right-end
    { id: 30, name: "GO TO JAIL", type: "corner", group: "go-to-jail" },
    { id: 31, name: "REGENT STREET", type: "property", group: "green", price: 300, rent: [26, 52, 130, 390, 900, 1100, 1275] },
    { id: 32, name: "OXFORD STREET", type: "property", group: "green", price: 300, rent: [26, 52, 130, 390, 900, 1100, 1275] },
    { id: 33, name: "COMMUNITY CHEST", type: "card", group: "white" },
    { id: 34, name: "BOND STREET", type: "property", group: "green", price: 320, rent: [28, 56, 150, 450, 1000, 1200, 1400] },
    { id: 35, name: "LIVERPOOL STREET STATION", type: "railroad", group: "railroad", price: 200, rent: 25 },
    { id: 36, name: "CHANCE", type: "card", group: "white" },
    { id: 37, name: "PARK LANE", type: "property", group: "darkblue", price: 350, rent: [35, 70, 175, 500, 1100, 1300, 1500] },
    { id: 38, name: "SUPER TAX", type: "tax", cost: 200, group: "tax" },
    { id: 39, name: "MAYFAIR", type: "property", group: "darkblue", price: 400, rent: [50, 100, 200, 600, 1400, 1700, 2000] }
];

export async function movePlayer(spaces) {
    try {
        const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`);
        const gameRef = ref(database, `parties/${PARTY_CODE}/game`)
        const snapshot = await get(playerRef);

        if (!snapshot.exists()) {
            console.error('Player not found in party.');
            return;
        }

        const playerData = snapshot.val();
        const isInJail = playerData.inJail || false;

        if (isInJail) {
            console.log('Player is in jail, cannot move.');
            return;
        }

        const oldPosition = playerData.position;
        let currentPosition = oldPosition;

        for (let i = 0; i < Math.abs(spaces); i++) {
            await new Promise(resolve => setTimeout(resolve, 300));

            if (spaces > 0) {
                currentPosition = (currentPosition + 1) % MONOPOLY_BOARD.length;
            } else {
                currentPosition = (currentPosition - 1 + MONOPOLY_BOARD.length) % MONOPOLY_BOARD.length;
            }
            
            await update(playerRef, { position: currentPosition });
            await update(gameRef, { phase: 'moving' })
        }

        const newPosition = (oldPosition + spaces) % MONOPOLY_BOARD.length;

        if (newPosition < 0) {
            newPosition += MONOPOLY_BOARD.length;
        }

        let passedGo = false;

        if (spaces > 0 && newPosition < oldPosition) {
            passedGo = true;
        }

        if (passedGo) {
            await collectGo();
        }

        await update(playerRef, { position: newPosition});
        await detectPosition(newPosition);
        
    } catch (error) {
        console.error('Error moving player:', error);
        return;
    }
}

export async function rollDiceAndMove() {
    try {
        const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
        const snapshot = await get(gameRef);

        if (!snapshot.exists()) {
            console.error('Game not found.');
            return;
        }

        const gameData = snapshot.val();

        if (gameData.currentPlayer !== PLAYER_UUID) {
            console.error('Not your turn.');
            return;
        }

        if (gameData.phase !== 'rolling') {
            console.error(`Cannot roll in phase: ${gameData.phase}`);
            return;
        }

        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const total = die1 + die2;
        const isDoubles = die1 === die2;

        console.log(`Die 1: ${die1}, die 2: ${die2}, total: ${total}, ${isDoubles ? '(doubles)' : ''}`);

        const playerData = gameData.players[PLAYER_UUID];
        const isInJail = playerData.inJail || false;

        await update(gameRef, { lastRoll: [die1, die2] });

        if (isInJail) {
            const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`);

            if (isDoubles) {
                await update(playerRef, {
                    inJail: false,
                    doublesInARow: 0,
                    rolledDouble: false
                });

                console.log('Rolled double; sending you OUT of jail NOW.');

                await movePlayer(total);
                return;
            } else {
                await endTurn(); // in jail, cannot move
                return;
            }
        }

        await movePlayer(total);

        const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`)

        if (isDoubles) {
            const playerData = gameData.players[PLAYER_UUID];
            const doublesCount = (playerData.doublesInARow || 0) + 1

            if (doublesCount >= 3) {
                console.log('rolled three doubles in a row, sending to jail now')
                await goToJail();
            } else {
                await update(playerRef, {doublesInARow: doublesCount, rolledDouble: true});
            }
        } else {
            await update(playerRef, {rolledDouble: false});
        }

    } catch (error) {
        console.error('Error rolling dice:', error);
        return;
    }
}

export async function detectPosition(position) {
    const landedTile = MONOPOLY_BOARD.find(tile => tile.id === position);

    if (!landedTile) {
        console.error(`Error: Landed on invalid position ID ${position}`);
        return;
    }

    const gameRef = ref(database, `parties/${PARTY_CODE}/game`);

    if (landedTile.type === 'property' || landedTile.type === 'utility' || landedTile.type === 'railroad') {
        const landedTileId = landedTile.id
        const propertyRef = ref(database, `parties/${PARTY_CODE}/game/properties/${landedTileId}`);
        const propertySnapshot = await get(propertyRef);

        if (!propertySnapshot.exists()) {
            console.error('Property not found.');
            return;
        }

        const propertyData = propertySnapshot.val();
        const unclaimed = !propertyData.ownerId;
        const ownedByMe = propertyData.ownerId === PLAYER_UUID;

        if (unclaimed) {
            await update(gameRef, { phase: 'decision' })
            await showDeedCard(landedTileId, propertyData.ownerId);
            console.log('unclaimed!');
            return;
        } else if (ownedByMe) {
            await endTurn();
            console.log('you own this');
            return;
        } else {
            await rentProperty(landedTileId);
            console.log('pay rent on this property');
            return;
        }
    }

    if (landedTile.type === 'card') {
        await giveCard(landedTile.type);
        return;
    }

    if (landedTile.type === 'tax') {
        await getTaxedBozo(landedTile.cost);
        console.log('pay the tax');
        return;
    }

    if (landedTile.type === 'corner') {
        if (landedTile.name.includes('GO TO JAIL')) {
            await endTurn();
            console.log('going to jail');
            return;
        } else {
            await endTurn();
            console.log('just a corner, end turn');
            return;
        }
    }
}

export async function endTurn() {
   const gameRef = ref(database, `parties/${PARTY_CODE}/game`);

    try {
        await runTransaction(gameRef, (currentData) => {
            if (!currentData) return currentData;

            const playersData = currentData.players || {};
            const currentPlayerId = currentData.currentPlayer;
            const player = playersData[currentPlayerId];

            let nextPlayer = currentPlayerId;

            // Check if they rolled a double
            if (player && player.rolledDouble) {
                console.log('Rolled double; staying on current player.');
                // Optional: Reset the double flag here so they don't get infinite turns
                // player.rolledDouble = false; 
            } else {
                // Logic to move to the next player
                console.log('no double; moving to next player')
                const playerEntries = Object.entries(playersData)
                    .sort((a, b) => a[1].turnOrder - b[1].turnOrder);
                
                const currentIndex = playerEntries.findIndex(([uuid]) => uuid === currentPlayerId);
                const nextIndex = (currentIndex + 1) % playerEntries.length;
                nextPlayer = playerEntries[nextIndex][0];
            }

            // Update the game state
            currentData.currentPlayer = nextPlayer;
            currentData.currentTurn = (currentData.currentTurn || 0) + 1;
            currentData.phase = 'rolling';

            return currentData;
        });
    } catch (error) {
        console.error("Transaction failed: ", error);
    }
}

async function collectGo() {
    const reward = 200;

    const bankRef = ref(database, `parties/${PARTY_CODE}/game/bank`);
    const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`);

    const [bankSnapshot, playerSnapshot] = await Promise.all([get(bankRef), get(playerRef)]);

    const bankData = bankSnapshot.val();
    const playerData = playerSnapshot.val();

    if (!bankData || !playerData) {
        console.error('Bank or player data not found.');
        return;
    }

    const denominations = [100, 50, 20, 10, 5, 1];

    let remaining = reward;
    const billsToTake = {};

    for (const denom of denominations) {
        if (remaining === 0) break;

        const availableBills = bankData[denom] || 0;
        const neededBills = Math.floor(remaining / denom);
        const billsTaken = Math.min(availableBills, neededBills);

        if (billsTaken > 0) {
            billsToTake[denom] = billsTaken;
            remaining -= billsTaken * denom;
        }
    }

    if (remaining > 0) {
        console.error('THE BANK IS FUCKING BROKE! CANNOT PAY GO REWARD!');
        return;
    }

    const bankUpdates = {};

    for (const [denom, count] of Object.entries(billsToTake)) {
        bankUpdates[denom] = bankData[denom] - count;
    }

    const playerUpdates = {};

    for (const [denom, count] of Object.entries(billsToTake)) {
        const currentCount = playerData.money.bills[denom] || 0;
        playerUpdates[`money/bills/${denom}`] = currentCount + count;
    }

    playerUpdates['money/total'] = (playerData.money.total || 0) + reward;

    await Promise.all([
        update(bankRef, bankUpdates),
        update(playerRef, playerUpdates)
    ]);

    console.log(`Player ${PLAYER_UUID} collected ₩${reward} for passing GO.`);
    return true;
}

export async function listenToDeedCards() {
    MONOPOLY_BOARD.forEach(tile => {
        if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
            const tileElement = document.querySelector(`.space${tile.id}`);

            if (tileElement) {
                tileElement.addEventListener('click', async () => {
                    const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
                    const snapshot = await get(gameRef);

                    if (!snapshot.exists()) {
                        console.error('Game not found.');
                        return;
                    }

                    const gameData = snapshot.val();

                    const currentPos = gameData.players[PLAYER_UUID]?.position;
                    const isMyTurn = gameData.currentPlayer === PLAYER_UUID;
                    const isLandedOnThis = currentPos === tile.id;
                    const moving = gameData.phase === 'decision';

                    if (isMyTurn && moving && !isLandedOnThis) {
                        console.log('Interaction locked: please decide on your tile first!');
                        return;
                    }

                    const ownerId = gameData.properties[tile.id]?.ownerId

                    showDeedCard(tile.id, ownerId);
                    console.log('Showed deed for property', tile.id);
                });

            } else {
                console.error('Tile not found.');
            }
        }
    });
}

export async function showDeedCard(tileId, ownerId) {
    localStorage.setItem('deedMenuState', 'opened');
    localStorage.setItem('deedMenuId', tileId);

    const deedHeader = document.getElementById('deed-header');

    const ownedBtns = document.getElementById('if-owned');
    const unownedBtns = document.getElementById('if-unowned');

    if (!ownerId) {
        deedHeader.textContent = 'No one owns this yet!';
        ownedBtns.classList.add('hidden');
        unownedBtns.classList.remove('hidden');
        console.log('Unclaimed.');
    } else if (ownerId === PLAYER_UUID) {
        deedHeader.textContent = 'You own this property!'
        ownedBtns.classList.remove('hidden');
        unownedBtns.classList.add('hidden');
        console.log('Owned.');
    } else {
        listenToUsername(ownerId, (newUsername) => {
            deedHeader.textContent = `This property belongs to ${newUsername}!`
        });
        ownedBtns.classList.add('hidden');
        unownedBtns.classList.add('hidden');
        console.log('Claimed by another player!');
    }

    const deedTemplate = await renderDeedCard(tileId);
    const deedContent = document.getElementById('deed-content');

    deedContent.innerHTML = deedTemplate;

    if (deedMenu) {
        deedMenu.classList.remove('hidden');
    }
}

export async function buyProperty() {
    try {
        const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
        const gameSnapshot = await get(gameRef);
        
        if (!gameSnapshot.exists()) {
            console.error('Game not found.')
        }

        const gameData = gameSnapshot.val();
        const isMyTurn = gameData.currentPlayer === PLAYER_UUID;

        if (!isMyTurn) {
            console.log('Wait for your turn first.');
            return;
        }

        const decision = gameData.phase === 'decision'

        if (!decision) {
            console.log('Roll your dice first.');
            return;
        }

        const isInjail = gameData.players[PLAYER_UUID]?.inJail || false;

        if (isInjail) {
            console.log('Cannot buy property if in jail.');
            return;
        }

        const tileId = gameData.players[PLAYER_UUID]?.position;
        const propertyData = gameData.properties[tileId];

        if (!propertyData.ownerId) {
            const formattedData = {
                id: tileId,
                price: MONOPOLY_BOARD[tileId]?.price
            }

            sendTrade('buy', formattedData, null);

            await update(gameRef, { phase: 'buying' });

            localStorage.setItem('deedMenuState', 'closed');
            deedMenu.classList.add('hidden');
        } else if (propertyData.ownerId === PLAYER_UUID) {
            console.log(`Can't purchase - you already own this.`);
            return;
        } else {
            console.log(`Can't purchase - someone else owns it.`);
        }

    } catch (error) {
        console.error('Could not buy property.', error);
        return;
    }
}

async function rentProperty(tileId) {
    try {
        const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
        const gameSnapshot = await get(gameRef);
        
        if (!gameSnapshot.exists()) {
            console.error('Game not found.')
        }

        const gameData = gameSnapshot.val();

        const propertyData = gameData.properties[tileId];
        const propertyStaticData = MONOPOLY_BOARD[tileId];
        let rent = 0;
        
        if (propertyStaticData && propertyStaticData.rent) {
            rent = Array.isArray(propertyStaticData.rent)
                ? propertyStaticData.rent[propertyData.rentLevel]
                : propertyStaticData.rent;
        }

        const formattedData = {
            id: tileId,
            rent: rent,
            ownerId: propertyData.ownerId,
        }

        sendTrade('rent', formattedData, null);

        await update(gameRef, { phase: 'renting' });

    } catch (error) {
        console.error('Could not rent property.', error);
        return;
    }
}

async function getTaxedBozo(amount) {
    try {
        console.log('taxed', amount);
        await endTurn();
        /*const gameRef = ref(database, `parties/${PARTY_CODE}/game`);

        sendTrade('tax', null, amount);

        await update(gameRef, { phase: 'taxing' });*/
    } catch (error) {
        console.error('Could not tax player.', error);
        return;
    }
}

async function giveCard(type) {
    console.log('hello');
    endTurn();
    return;
}

async function goToJail() {
    const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`);
    
    await update(playerRef, {
        position: 10,
        inJail: true
    });

    endTurn();
}

let playerInventoryListener = null;

export function listenToInventory() {
    if (playerInventoryListener) {
        playerInventoryListener();
        playerInventoryListener = null;
    }

    let billsData = null;

    const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}/money`);

    const moneyDisplay = document.getElementById('currency-amount');
    const listElement = document.querySelector('.denomination-list');

    const unsubscribe = onValue(playerRef, (snapshot) => {
        if (snapshot.exists()) {
            const playerData = snapshot.val();

            billsData = playerData.bills;

            let totalMoney = 0;

            for (const [denom, count] of Object.entries(billsData)) {
                totalMoney += parseInt(denom) * count;
            }

            const formattedMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KRW', minimumFractionDigits: 0 }).format(totalMoney);

            if (moneyDisplay) {
                moneyDisplay.textContent = `${formattedMoney}`;
                console.log('Updated total money display:', formattedMoney);
            } else {
                console.error('Money display element not found.');
            }

            renderDenominations(billsData, listElement);
            renderInventory(PLAYER_UUID, 'user-inv');
        }
    });

    playerInventoryListener = () => {
        unsubscribe();
    }
}

function renderDenominations(bills) {
    const container = document.querySelector('.denomination-list');
    container.innerHTML = '';

    if (!bills) {
        console.log('No bills data to render.');
        return;
    }

    const denominations = Object.keys(bills).map(Number).sort((a, b) => b - a);

    denominations.forEach(denom => {
        const count = bills[denom] || 0;

        if (count > 0) {
            const denomElement = `
                <div class="denomination-item">
                    <div class="denomination-box">${denom}</div>
                    <div class="denomination-count">x${count}</div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', denomElement);
        }
    });
}

export function listenToGamePlayers() {
    const playersRef = ref(database, `parties/${PARTY_CODE}/game/players`);

    onValue(playersRef, (snapshot) => {
        if (snapshot.exists()) {
            const playersData = snapshot.val();
            const PLAYER_UUIDs = Object.keys(playersData);

            renderPlayersList(PLAYER_UUIDs, playersData);
            showPlayerOptions(PLAYER_UUIDs, playersData);
        }
    });
}

async function renderPlayersList(PLAYER_UUIDs, playersData) {
    const playerList = document.getElementById('player-list');

    if (!playerList) {
        console.log('Element not found.');
        return;
    }

    playerList.innerHTML = '';

    PLAYER_UUIDs.forEach(uuid => {
        const playerDiv = document.createElement('div');
        const character = playersData[uuid].character
        playerDiv.className = 'player-list-item display-row';
        playerDiv.dataset.uuid = uuid;

        playerDiv.innerHTML = `
            <div class="player-name-text" id="name-${uuid}">Loading...</div>
            <div class="player-status-text" id="status-${uuid}">${CHARACTER_ICONS[character]}</div>
        `;

        playerList.appendChild(playerDiv);

        listenToUsername(uuid, (newUsername) => {
            const nameElement = document.getElementById(`name-${uuid}`);

            if (nameElement) {
                nameElement.textContent = newUsername;
            }
        });
    });
}

export function listenToTurns() {
    const gameRef = ref(database, `parties/${PARTY_CODE}/game`);

    onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
            const gameData = snapshot.val();
            const diceButton = document.getElementById('dice-roller');

            if (diceButton) {
                const isYourTurn = gameData.currentPlayer === PLAYER_UUID;
                const canRoll = isYourTurn && gameData.phase === 'rolling';

                diceButton.disabled = !canRoll;
            }
        }
    });
}

export async function showTurnMessage() {
    const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
    const messageElement = document.getElementById('turn-message');

    if (!messageElement) {
        console.error('not found');
        return;
    }

    onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
            const gameData = snapshot.val();
            const phase = gameData.phase;
            const currentPlayer = gameData.currentPlayer
            const isMe = currentPlayer === PLAYER_UUID;
            const lastDiceRoll = gameData.lastRoll || [];
            const doubles = gameData.players[currentPlayer].rolledDouble || false
            messageElement.style.color = 'white'

            if (phase === 'rolling') {
                if (isMe) {
                    messageElement.textContent = `It's your turn! Roll now!`
                    messageElement.style.backgroundColor = `#1fb25a`
                } else {
                    listenToUsername(currentPlayer, (username) => {
                        messageElement.textContent = `It's ${username}'s turn!`
                        messageElement.style.backgroundColor = `#f7941d`
                    })
                }
            }

            if (phase === 'moving') {
                if (isMe) {
                    if (doubles) {
                        messageElement.textContent = `You rolled a double! (${lastDiceRoll[0]} and ${lastDiceRoll[1]})`
                        messageElement.style.backgroundColor = `#0072bb`
                    } else {
                        messageElement.textContent = `You rolled a ${lastDiceRoll[0] + lastDiceRoll[1]}! (${lastDiceRoll[0]} and ${lastDiceRoll[1]})`
                        messageElement.style.backgroundColor = `#f11c26`
                    }
                } else {
                    listenToUsername(currentPlayer, (username) => {
                        if (doubles) {
                            messageElement.textContent = `${username} rolled a double! (${lastDiceRoll[0]} and ${lastDiceRoll[1]})`
                        } else {
                            messageElement.textContent = `${username} rolled a ${lastDiceRoll[0] + lastDiceRoll[1]}! (${lastDiceRoll[0]} and ${lastDiceRoll[1]})`
                        }
                    })
                }
            }

            if (phase === 'decision') {
                if (isMe) {
                    messageElement.textContent = `Waiting for your decision...`
                    messageElement.style.backgroundColor = `#0072bb`
                } else {
                    listenToUsername(currentPlayer, (username) => {
                        messageElement.textContent = `${username} is deciding...`
                        messageElement.style.backgroundColor = `#f11c26`
                    })
                }
            }
        }
    });
}