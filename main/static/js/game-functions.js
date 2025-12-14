import { database } from './firebase-config.js';
import { ref, get, update, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { stopAllUsernameListeners, listenToUsername, clearUsernameCache } from './auth.js';

export const MONOPOLY_BOARD = [
    // bottom-end
    { id: 0, name: "GO", type: "corner", group: "start", price: 0 },
    { id: 1, name: "OLD KENT ROAD", type: "property", group: "brown", price: 60, rent: 2 },
    { id: 2, name: "COMMUNITY CHEST", type: "card", group: "white" },
    { id: 3, name: "WHITECHAPEL ROAD", type: "property", group: "brown", price: 60, rent: 4 },
    { id: 4, name: "INCOME TAX", type: "tax", cost: 200, group: "tax" },
    { id: 5, name: "KING'S CROSS STATION", type: "railroad", group: "railroad", price: 200, rent: 25 },
    { id: 6, name: "THE ANGEL, ISLINGTON", type: "property", group: "lightblue", price: 100, rent: 6 },
    { id: 7, name: "CHANCE", type: "card", group: "white" },
    { id: 8, name: "EUSTON ROAD", type: "property", group: "lightblue", price: 100, rent: 6 },
    { id: 9, name: "PENTONVILLE ROAD", type: "property", group: "lightblue", price: 120, rent: 8 },

    // left-end
    { id: 10, name: "JAIL", type: "corner", group: "jail" },
    { id: 11, name: "PALL MALL", type: "property", group: "pink", price: 140, rent: 10 },
    { id: 12, name: "ELECTRIC COMPANY", type: "utility", group: "utility", price: 150, rent: 4 },
    { id: 13, name: "WHITEHALL", type: "property", group: "pink", price: 140, rent: 10 },
    { id: 14, name: "NORTHUMB'ND AVENUE", type: "property", group: "pink", price: 160, rent: 12 },
    { id: 15, name: "MARYLEBONE STATION", type: "railroad", group: "railroad", price: 200, rent: 25 },
    { id: 16, name: "BOW STREET", type: "property", group: "orange", price: 180, rent: 14 },
    { id: 17, name: "COMMUNITY CHEST", type: "card", group: "white" },
    { id: 18, name: "MARLBOROUGH STREET", type: "property", group: "orange", price: 180, rent: 14 },
    { id: 19, name: "VINE STREET", type: "property", group: "orange", price: 200, rent: 16 },

    // top-end
    { id: 20, name: "FREE PARKING", type: "corner", group: "free-parking" },
    { id: 21, name: "THE STRAND", type: "property", group: "red", price: 220, rent: 18 },
    { id: 22, name: "CHANCE", type: "card", group: "white" },
    { id: 23, name: "FLEET STREET", type: "property", group: "red", price: 220, rent: 18 },
    { id: 24, name: "TRAFALGAR SQUARE", type: "property", group: "red", price: 240, rent: 20 },
    { id: 25, name: "FENCHURCH ST STATION", type: "railroad", group: "railroad", price: 200, rent: 25 },
    { id: 26, name: "LEICESTER SQUARE", type: "property", group: "yellow", price: 260, rent: 22 },
    { id: 27, name: "COVENTRY STREET", type: "property", group: "yellow", price: 260, rent: 22 },
    { id: 28, name: "WATER WORKS", type: "utility", group: "utility", price: 150, rent: 4 },
    { id: 29, name: "PICCADILLY", type: "property", group: "yellow", price: 280, rent: 24 },

    // right-end
    { id: 30, name: "GO TO JAIL", type: "corner", group: "go-to-jail" },
    { id: 31, name: "REGENT STREET", type: "property", group: "green", price: 300, rent: 26 },
    { id: 32, name: "OXFORD STREET", type: "property", group: "green", price: 300, rent: 26 },
    { id: 33, name: "COMMUNITY CHEST", type: "card", group: "white" },
    { id: 34, name: "BOND STREET", type: "property", group: "green", price: 320, rent: 28 },
    { id: 35, name: "LIVERPOOL STREET STATION", type: "railroad", group: "railroad", price: 200, rent: 25 },
    { id: 36, name: "CHANCE", type: "card", group: "white" },
    { id: 37, name: "PARK LANE", type: "property", group: "darkblue", price: 350, rent: 35 },
    { id: 38, name: "SUPER TAX", type: "tax", cost: 200, group: "tax" },
    { id: 39, name: "MAYFAIR", type: "property", group: "darkblue", price: 400, rent: 50 }
];

const CHARACTER_ICONS = {
    '1': '🐶',
    '2': '🐱',
    '3': '🐰',
    '4': '🦊',
    '5': '🐸',
    '6': '🐵',
    '7': '🐼',
    '8': '🦄'
};

// player movement and rendering

export async function renderPlayer(partyCode, playerUUID) {
    try {
        const playerRef = ref(database, `parties/${partyCode}/game/players/${playerUUID}`);
        const snapshot = await get(playerRef);

        if (!snapshot.exists()) {
            console.error('Player not found in party');
            return;
        }

        const playerData = snapshot.val();
        const { position, character } = playerData;
        const tileElement = document.querySelector(`.space${position}`);

        if (!tileElement) {
            console.error('Tile element not found for position:', position);
            return;
        }

        document.querySelectorAll(`.player-piece[data-player-id="${playerUUID}"]`).forEach(p => p.remove());
        
        const playerPiece = document.createElement('div');
        playerPiece.className = 'player-piece';
        playerPiece.dataset.playerId = playerUUID;
        playerPiece.dataset.character = character;
        playerPiece.textContent = CHARACTER_ICONS[character] || '❓';
        playerPiece.title = `Player ${character}`;

        const playerContent = tileElement.querySelector('.player-content');

        if (playerContent) {
            playerContent.appendChild(playerPiece);
        } else {
            console.error('Player content container not found in tile element');
            tileElement.appendChild(playerPiece);
        }

    } catch (error) {
        console.error('Error rendering player:', error);
    }
}

export async function movePlayer(partyCode, playerUUID, spaces) {
    try {
        const playerRef = ref(database, `parties/${partyCode}/game/players/${playerUUID}`);
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
        const newPosition = (oldPosition + spaces) % MONOPOLY_BOARD.length;

        if (newPosition < 0) {
            newPosition += MONOPOLY_BOARD.length;
        }

        let passedGo = false;

        if (spaces > 0 && newPosition < oldPosition) {
            passedGo = true;
        }

        const updates = { position: newPosition };

        if (passedGo) {
            await collectGo(partyCode, playerUUID);
        }

        const landedTile = MONOPOLY_BOARD.find(tile => tile.id === newPosition)

        if (!landedTile) {
            console.error(`Error: Landed on invalid position ID ${newPosition}`);
            return;
        }
        
        const propertyRef = ref(database, `parties/${partyCode}/game/properties/${newPosition}`)
        const propertySnapshot = await get(propertyRef);
        const propertyData = propertySnapshot.val();

        switch (landedTile.type) {
            case 'property':
                if (!propertyData.ownerId) {
                    console.log('No one owns this yet!')
                } else {
                    console.log('This property belongs to', propertyData.ownerId)
                }
                break;
            case 'railroad':
                if (!propertyData.ownerId) {
                    console.log('No one owns this yet!')
                } else {
                    console.log('This property belongs to', propertyData.ownerId)
                }
                break;
            case 'utility':
                if (!propertyData.ownerId) {
                    console.log('No one owns this yet!')
                } else {
                    console.log('This property belongs to', propertyData.ownerId)
                }
                break;
            case 'card':
                if (landedTile.name.includes('COMMUNITY CHEST')) {
                    await communityChest();
                    break;
                } else if (landedTile.name.includes('CHANCE')) {
                    await chanceCard();
                } else {
                    console.error(`Unknown card type: ${landedTile.name}`);
                }
                break;
            case 'tax':
                if (landedTile.name.includes('INCOME TAX')) {
                    await getTaxedBozo(100);
                    break;
                } else if (landedTile.name.includes('SUPER TAX')) {
                    await getTaxedBozo(200);
                } else {
                    console.error(`Unknown card type: ${landedTile.name}`);
                }
                break;
            case 'corner':
                if (landedTile.name.includes('GO TO JAIL')) {
                    await goToJail();
                    updates.position = 10;
                }
                break;
            default:
                console.log('You have landed on the default tile.');
                break;
        }

        await update(playerRef, updates);
        return { oldPosition, newPosition, passedGo };
        
    } catch (error) {
        console.error('Error moving player:', error);
        return null;
    }
}

export async function initializePlayerPieces(partyCode, players) {
    document.querySelectorAll('.player-piece').forEach(p => p.remove());

    const renderPromises = Object.keys(players).map(playerUUID => renderPlayer(partyCode, playerUUID));

    await Promise.all(renderPromises);

    console.log('Initialized all player pieces on the board');
}

export function listenToPlayerMovement(partyCode, playerUUID) {
    const playerRef = ref(database, `parties/${partyCode}/game/players/${playerUUID}`);

    onValue(playerRef, (snapshot) => {
        if (snapshot.exists()) {
            renderPlayer(partyCode, playerUUID);
        }
    });
}

// tile functions

async function collectGo(partyCode, playerUUID) {
    const reward = 200;

    const bankRef = ref(database, `parties/${partyCode}/game/bank`);
    const playerRef = ref(database, `parties/${partyCode}/game/players/${playerUUID}`);

    const [bankSnapshot, playerSnapshot] = await Promise.all([get(bankRef), get(playerRef)]);

    const bankData = bankSnapshot.val();
    const playerData = playerSnapshot.val();

    if (!bankData || !playerData) {
        console.error('Bank or player data not found.');
        return;
    }

    const denominations = [100, 50, 20, 10, 5, 1]; // 500 is not included because it is greater than 200 and im too lazy to implement denomination exchange between bank and player

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

    console.log(`Player ${playerUUID} collected ₩${reward} for passing GO.`);
    return true;
}

async function getTaxedBozo(amount) {
    console.log(`You have been taxes ${amount}`);
    return;
}

async function communityChest() {
    console.log('Community Chest executed');
    return;
}

async function chanceCard() {
    console.log('Chance Card executed');
    return;
}

async function goToJail() {
    console.log('Go to Jail executed');
    return;
}

// turn functions

export async function rollDiceAndMove(partyCode, playerUUID) {
    try {
        const gameRef = ref(database, `parties/${partyCode}/game`);
        const snapshot = await get(gameRef);

        if (!snapshot.exists()) {
            console.error('Game not found.');
            return null;
        }

        const gameData = snapshot.val();

        if (gameData.currentPlayer !== playerUUID) {
            console.error('Not your turn.');
            showTurnMessage(partyCode, playerUUID, true);
            return null;
        }

        if (gameData.phase !== 'rolling') {
            console.error(`Cannot roll in phase: ${gameData.phase}`);
            return null;
        }

        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const total = die1 + die2;
        const isDoubles = die1 === die2;

        console.log(`Die 1: ${die1}, die 2: ${die2}, total: ${total}, ${isDoubles ? '(Doubles!)' : ''}`);

        await update(gameRef, {
            'lastRoll': { die1, die2, total, isDoubles },
            'dice': [die1, die2],
            'phase': 'moving'
        });

        const moveResult = await movePlayer(partyCode, playerUUID, total);

        if (isDoubles) {
            const playerData = gameData.players[playerUUID];
            const doublesCount = (playerData.doublesInARow || 0) + 1

            if (doublesCount >= 3) {
                await goToJail();
                await endTurn(partyCode, gameData);
            } else {
                await update(ref(database, `parties/${partyCode}/game/players/${playerUUID}`), {doublesInARow: doublesCount});
                await update(gameRef, { phase: 'rolling' });
            }
            
        } else {
            await update(ref(database, `parties/${partyCode}/game/players/${playerUUID}`), {doublesInARow: 0});
            await endTurn(partyCode, gameData);
        }

        return { die1, die2, total, isDoubles, moveResult };

    } catch (error) {
        console.error('Error rolling dice:', error);
        return null;
    }
}

async function endTurn(partyCode, gameData) {
    const players = Object.entries(gameData.players).sort((a, b) => a[1].turnOrder - b[1].turnOrder);

    const currentIndex = players.findIndex(([uuid]) => uuid === gameData.currentPlayer);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayer = players[nextIndex][0];

    const gameRef = ref(database, `parties/${partyCode}/game`);

    await update(gameRef, {
        currentPlayer: nextPlayer,
        currentTurn: gameData.currentTurn + 1,
        phase: 'rolling'
    });
}

// real time updates and what have you

export function listenToMoneyChanges() {
    const billsRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}/money/bills`);
    const moneyDisplay = document.getElementById('currency-amount');
    const listElement = document.querySelector('.denomination-list');

    if (!moneyDisplay || !listElement) {
        console.error('Money display or denomination list element not found.');
        return;
    }

    if (!billsRef) {
        console.error('Bills reference is invalid.');
        return;
    }

    onValue(billsRef, (snapshot) => {
        if (snapshot.exists()) {
            const billsData = snapshot.val();
            const totalMoney = calculateTotalMoney(billsData);
            const formattedMoney = formatCurrency(totalMoney);

            if (moneyDisplay) {
                moneyDisplay.textContent = `${formattedMoney}`;
                console.log('Updated total money display:', formattedMoney);
            } else {
                console.error('Money display element not found.');
            }

            renderDenominations(billsData, listElement);
        }
    }, (error) => {
        console.error('Error listening to money changes:', error);
    });
}

function calculateTotalMoney(bills) {
    if (!bills) {
        return 0;
    }

    let total = 0;

    for (const [denom, count] of Object.entries(bills)) {
        total += parseInt(denom) * count;
    }

    return total;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KRW', minimumFractionDigits: 0 }).format(amount);
}

function renderDenominations(bills, container) {
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
            const playerUUIDs = Object.keys(playersData);

            renderPlayersList(playerUUIDs, playersData);
        }
    });
}

async function renderPlayersList(playerUUIDs, playersData) {
    const playerList = document.getElementById('player-list');

    if (!playerList) {
        console.log('Element not found.');
        return;
    }

    playerList.innerHTML = '';
    stopAllUsernameListeners();

    playerUUIDs.forEach(uuid => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-list-item';
        playerDiv.dataset.uuid = uuid;

        let playerStatus;



        playerDiv.innerHTML = `
            <div class="player-name-text" id="name-${uuid}">Loading...</div>
            <div class="player-status-text" id="status-${uuid}">...</div>
        `;

        playerList.appendChild(playerDiv);

        listenToUsername(uuid, (newUsername) => {
            const usernameDiv = document.getElementById(`name-${uuid}`);

            if (usernameDiv) {
                usernameDiv.textContent = newUsername;
            }
        });
    });
}

export function listenToTurns(partyCode, playerUUID) {
    const gameRef = ref(database, `parties/${partyCode}/game`);

    onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
            const gameData = snapshot.val();

            showTurnMessage(partyCode, playerUUID);

            const diceButton = document.getElementById('dice-roller');

            if (diceButton) {
                const isYourTurn = gameData.currentPlayer === playerUUID;
                const canRoll = isYourTurn && gameData.phase === 'rolling';

                diceButton.disabled = !canRoll;
            }
        }
    });
}

let activeTurnListenerUUID = null;

export async function showTurnMessage(partyCode, playerUUID, notYourTurn = false) {
    const turnMessageEl = document.querySelector('.turn-message');
    if (!turnMessageEl) return;
    
    try {
        const gameRef = ref(database, `parties/${partyCode}/game`);
        const snapshot = await get(gameRef);
        
        if (!snapshot.exists()) return;
        
        const gameState = snapshot.val();
        const currentPlayerUUID = gameState.currentPlayer;
        
        if (notYourTurn) {
            turnMessageEl.textContent = "It's not your turn.";
            turnMessageEl.style.backgroundColor = 'rgba(255, 51, 51, 1)';
            turnMessageEl.style.color = 'white';
            
            setTimeout(() => {
                showTurnMessage(partyCode, playerUUD);
            }, 3000);

            return;
        }
        
        activeTurnListenerUUID = currentPlayerUUID;

        if (currentPlayerUUID === playerUUID) {
            turnMessageEl.textContent = "It's your turn!";
            turnMessageEl.style.backgroundColor = 'rgb(10, 173, 10)';
            turnMessageEl.style.color = 'white';
        } else {
            listenToUsername(currentPlayerUUID, (newUsername) => {
                if (activeTurnListenerUUID === currentPlayerUUID) { 
                    turnMessageEl.textContent = `It's ${newUsername}'s turn.`;
                    turnMessageEl.style.backgroundColor = 'rgba(248, 246, 123, 1)';
                    turnMessageEl.style.color = 'black';
                }
            });
        }
        
    } catch (error) {
        console.error('Error updating turn message:', error);
    }
}