import { database } from './firebase-config.js';
import { ref, get, update, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { listenToUsername, PLAYER } from './auth.js';
import { renderDeedCard } from './monopoly-board.js';

import { PARTY_CODE, PLAYER_UUID } from './game.js';

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

export async function renderPlayer(targetUUID) {
    try {
        const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${targetUUID}`);
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

        document.querySelectorAll(`.player-piece[data-player-id="${targetUUID}"]`).forEach(p => p.remove());
        
        const playerPiece = document.createElement('div');
        playerPiece.className = 'player-piece';
        playerPiece.dataset.playerId = targetUUID;
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

export async function movePlayer(spaces) {
    try {
        const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`);
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

        if (passedGo) {
            await collectGo();
        }

        const landedTile = MONOPOLY_BOARD.find(tile => tile.id === newPosition)

        if (!landedTile) {
            console.error(`Error: Landed on invalid position ID ${newPosition}`);
            return;
        }

        switch (landedTile.type) {
            case 'property':
                showDeedCard(newPosition);
                console.log('You landed on property', newPosition);
                break;
            case 'railroad':
                showDeedCard(newPosition);
                console.log('You landed on property', newPosition);
                break;
            case 'utility':
                showDeedCard(newPosition);
                console.log('You landed on property', newPosition);
                break;
            case 'card':
                if (landedTile.name.includes('COMMUNITY CHEST')) {
                    await communityChest();
                    break;
                } else if (landedTile.name.includes('CHANCE')) {
                    await chanceCard();
                    break;
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
                    break;
                } else {
                    console.error(`Unknown card type: ${landedTile.name}`);
                }
                break;
            case 'corner':
                if (landedTile.name.includes('GO TO JAIL')) {
                    await goToJail();
                    return { oldPosition, newPosition: 10, passedGo: false };
                } else {
                    await endTurn();
                }
                break;
            default:
                console.log('You have landed on the default tile.');
                break;
        }

        await update(playerRef, { position: newPosition});
        return { oldPosition, newPosition, passedGo };
        
    } catch (error) {
        console.error('Error moving player:', error);
        return null;
    }
}

export async function initializePlayerPieces(players) {
    document.querySelectorAll('.player-piece').forEach(p => p.remove());

    const renderPromises = Object.keys(players).map(uuid => renderPlayer(uuid));

    await Promise.all(renderPromises);

    console.log('Initialized all player pieces on the board');
}


export function listenToPlayerMovement(targetUUID) {
    const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${targetUUID}`);

    onValue(playerRef, (snapshot) => {
        if (snapshot.exists()) {
            renderPlayer(targetUUID);
        }
    });
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

    console.log(`Player ${PLAYER_UUID} collected ₩${reward} for passing GO.`);
    return true;
}

async function getTaxedBozo(amount) {
    console.log(`You have been taxed ${amount}`);
    await endTurn();
    return;
}

async function communityChest() {
    console.log('Community Chest executed');
    await endTurn();
    return;
}

async function chanceCard() {
    console.log('Chance Card executed');
    await endTurn();
    return;
}

async function goToJail() {
    const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`);
    
    await update(playerRef, {
        position: 10,
        inJail: true
    });

    console.log('Successfully sent that motherfucker to jail.')
}

async function isMyTurn() {
    const currentPlayerRef = ref(database, `parties/${PARTY_CODE}/currentPlayer`);
    const snapshot = await get(currentPlayerRef);
    const currentPlayer = snapshot.val()

    if (currentPlayer === PLAYER_UUID) {
        return true;
    } else {
        return null;
    }
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
                    const isLandedOnThis = currentPos === tile.id;
                    const moving = gameData.phase === 'moving';

                    if (isMyTurn() && moving && !isLandedOnThis) {
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

    if (!ownerId) {
        deedHeader.textContent = 'No one owns this yet!';
        console.log('Unclaimed.');
    } else if (ownerId === PLAYER_UUID) {
        deedHeader.textContent = 'You own this property!'
        console.log('Owned.');
    } else {
        listenToUsername(ownerId, (newUsername) => {
            deedHeader.textContent = `This property belongs to ${newUsername}!`
        });
        console.log('Owned.');
    }

    const deedTemplate = await renderDeedCard(tileId);
    const deedContent = document.getElementById('deed-content');

    deedContent.innerHTML = deedTemplate;

    if (deedMenu) {
        deedMenu.classList.remove('hidden');
    }
}

export async function buyProperty(tileId, purchaseBtn = document.getElementById('purchase-btn')) {

    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', async () => {
            const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`);
            const propertyRef = ref(database, `parties/${PARTY_CODE}/game/properties/${tileId}`);

            const [playerSnapshot, propertySnapshot] = await Promise.all([get(playerRef), get(propertyRef)]);

            const playerData = playerSnapshot.val();
            const propertyData = propertySnapshot.val();

            if (!playerData || !propertyData) {
                console.error('Player or bank data not found.');
                return;
            }

            await endTurn();
        });
    }
}

async function rentPropety(tileId) {
    const rentPropertyResult = await rentPropertyMenu(tileId);

}

async function auctionProperty(tileId) {
    // wip
}

async function developProperty(tileId) {
    // wip
}

async function mortgageProperty(tileId) {
    // wip
}

// turn functions

export async function rollDiceAndMove() {
    try {
        const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
        const snapshot = await get(gameRef);

        if (!snapshot.exists()) {
            console.error('Game not found.');
            return null;
        }

        const gameData = snapshot.val();

        if (gameData.currentPlayer !== PLAYER_UUID) {
            console.error('Not your turn.');
            showTurnMessage(true);
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

        const playerData = gameData.players[PLAYER_UUID];
        const isInJail = playerData.inJail || false;

        if (isInJail) {
            const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`);

            if (isDoubles) {
                await update(playerRef, {
                    inJail: false,
                    doublesInARow: 0
                })

                const moveResult = await movePlayer(total);

                console.log('Rolled double; sending you OUT of jail NOW.');
                await endTurn();
                return { die1, die2, total, isDoubles, moveResult };
            } else {
                console.log('No doubles, yo ass is staying in jail.');
                await endTurn();
                return { die1, die2, total, isDoubles, moveResult };
            }
        }

        const moveResult = await movePlayer(total);

        if (isDoubles) {
            const playerData = gameData.players[PLAYER_UUID];
            const doublesCount = (playerData.doublesInARow || 0) + 1

            if (doublesCount >= 3) {
                await goToJail();
                await endTurn();
            } else {
                await update(ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`), {doublesInARow: doublesCount});
                await update(gameRef, { phase: 'rolling' });
            }
            
        } else {
            await update(ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}`), {doublesInARow: 0});
        }

        return { die1, die2, total, isDoubles, moveResult };

    } catch (error) {
        console.error('Error rolling dice:', error);
        return null;
    }
}

export async function endTurn() {
    const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
    const snapshot = await get(gameRef);

    if (!snapshot.exists) {
        console.error('Game not found');
        return;
    }

    const gameData = snapshot.val()
    const players = Object.entries(gameData.players).sort((a, b) => a[1].turnOrder - b[1].turnOrder);
    const currentIndex = players.findIndex(([uuid]) => uuid === gameData.currentPlayer);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayer = players[nextIndex][0];

    await update(gameRef, {
        currentPlayer: nextPlayer,
        currentTurn: gameData.currentTurn + 1,
        phase: 'rolling'
    });
}

export function listenToPlayerInventory() {
    const gameRef = ref(database, `parties/${PARTY_CODE}/game/`);
    
    const moneyDisplay = document.getElementById('currency-amount');

    const possessionsDisplay = document.getElementById('user-possessions');
    const propertyElement = document.querySelector('.property-list');

    if (!gameRef) {
        console.error('Game not found.');
        return;
    }

    onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
            const gameData = snapshot.val();
            const playerData = gameData.players[PLAYER_UUID];

            const billsData = playerData?.money.bills;
            
            const totalMoney = calculateTotalMoney(billsData); // updating money counter
            const formattedMoney = formatCurrency(totalMoney);

            if (moneyDisplay) {
                moneyDisplay.textContent = `${formattedMoney}`;
                console.log('Updated total money display:', formattedMoney);
            } else {
                console.error('Money display element not found.');
            }

            const propertiesData = playerData?.propertiesOwned

            renderDenominations(billsData);
            // renderProperties(propertiesData, propertyElement);
            // renderToGiveMenu(billsData, propertiesData);
        }
    }, (error) => {
        console.error('Error listening to money changes:', error);
    });
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

export function listenToGamePlayers() {
    const playersRef = ref(database, `parties/${PARTY_CODE}/game/players`);

    onValue(playersRef, (snapshot) => {
        if (snapshot.exists()) {
            const playersData = snapshot.val();
            const PLAYER_UUIDs = Object.keys(playersData);

            renderPlayersList(PLAYER_UUIDs, playersData);
        }
    });
}

async function renderPlayersList(PLAYER_UUIDs) {
    const playerList = document.getElementById('player-list');

    if (!playerList) {
        console.log('Element not found.');
        return;
    }

    playerList.innerHTML = '';

    PLAYER_UUIDs.forEach(uuid => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-list-item';
        playerDiv.dataset.uuid = uuid;

        playerDiv.innerHTML = `
            <div class="player-name-text" id="name-${uuid}">Loading...</div>
            <div class="player-status-text" id="status-${uuid}">[--status-placeholder--]</div>
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

            showTurnMessage();

            const diceButton = document.getElementById('dice-roller');

            if (diceButton) {
                const isYourTurn = gameData.currentPlayer === PLAYER_UUID;
                const canRoll = isYourTurn && gameData.phase === 'rolling';

                diceButton.disabled = !canRoll;
            }
        }
    });
}

let activeTurnListenerUUID = null;

export async function showTurnMessage(notYourTurn = false) { //REWORK THIS
    const turnMessageEl = document.querySelector('.turn-message');
    if (!turnMessageEl) return;
    
    try {
        const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
        const snapshot = await get(gameRef);
        
        if (!snapshot.exists()) return;
        
        const gameState = snapshot.val();
        const currentPLAYER_UUID = gameState.currentPlayer;
        
        if (notYourTurn) {
            turnMessageEl.textContent = "It's not your turn.";
            turnMessageEl.style.backgroundColor = 'rgba(255, 51, 51, 1)';
            turnMessageEl.style.color = 'white';
            
            setTimeout(() => {
                showTurnMessage(PARTY_CODE, playerUUD);
            }, 3000);

            return;
        }
        
        activeTurnListenerUUID = currentPLAYER_UUID;

        if (currentPLAYER_UUID === PLAYER_UUID) {
            turnMessageEl.textContent = "It's your turn!";
            turnMessageEl.style.backgroundColor = 'rgb(10, 173, 10)';
            turnMessageEl.style.color = 'white';
        } else {
            listenToUsername(currentPLAYER_UUID, (newUsername) => {
                if (activeTurnListenerUUID === currentPLAYER_UUID) { 
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