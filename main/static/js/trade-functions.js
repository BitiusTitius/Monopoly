import { database } from './firebase-config.js';
import { ref, get, update, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { listenToUsername } from "./auth.js";
import { PARTY_CODE, PLAYER_UUID } from './game.js';
import { MONOPOLY_BOARD } from './game-functions.js';
import { renderDeedCard } from './monopoly-board.js';

// list of things to show in property content: current rent, number of houses/hotels (will be implemented soon)

const propertiesToGive = JSON.parse(localStorage.getItem('propertiesToGive')) || [];
const propertiesToReceive = JSON.parse(localStorage.getItem('propertiesToReceive')) || [];

const moneyToGive = JSON.parse(localStorage.getItem('moneyToGive')) || [];
const moneyToReceive = JSON.parse(localStorage.getItem('moneyToReceive')) || [];

const proposeTradeMenu = document.getElementById('propose-trade');
const incomingTradeMenu = document.getElementById('incoming-trade')

export async function sendTrade(type, propertyData, taxData) { // types: buying property, paying rent, trading property
    try {
        const tradeId = `${PLAYER_UUID}-${Date.now()}`;
        const tradeRef = ref(database, `parties/${PARTY_CODE}/game/trades/${tradeId}`);
        let tradeData;

        if (type === 'trade') { //trade between players
            tradeData = {
                type: type,
                from: PLAYER_UUID,
                to: selectedValue,
                propertiesOffered: propertiesToGive,
                propertiesRequested: propertiesToReceive,
                /* denomsOffered:
                denomsRequested: */
                status: 'pending',
                timeSent: Date.now()
            };
        } else if (type === 'buy') { //buy property
            tradeData = {
                type: type,
                from: 'bank',
                to: PLAYER_UUID,
                propertiesOffered: propertyData.id,
                moneyRequested: propertyData.price,
                status: 'pending',
                timeSent: Date.now()
            };
        } else if (type === 'rent') { //rent property
            tradeData = {
                type: type,
                from: property.ownerId,
                to: PLAYER_UUID,
                propertiesOffered: null,
                moneyRequested: propertyData.rent,
                status: 'pending',
                timeSent: Date.now()
            };
        } else {
            console.error('Invalid trade type');
            return null;
        }

        await update(tradeRef, tradeData);

        console.log(`Successfully sent trade with id ${tradeId}`);

    } catch (error) {
        console.error('Could not send trade.', error);
        return null;
    }
}

export async function listenToIncomingTrades() {
    const tradesRef = ref(database, `parties/${PARTY_CODE}/game/trades/`);

    onValue(tradesRef, (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((trade) => {
                const tradeId = trade.key;
                const tradeData = trade.val();

                if (tradeData.type === 'buy' && tradeData.to === PLAYER_UUID && tradeData.status === 'pending') {
                    renderIncomingTrade(tradeId);
                    console.log('You have an unfinished transaction. Please complete it.');
                }
            })
        }
    }, (error) => {
        console.error('Error listening for trades.', error);
    });
}

export async function renderIncomingTrade(tradeId) {
    try {
        const tradeRef = ref(database, `parties/${PARTY_CODE}/game/trades/${tradeId}`);
        const tradeSnapshot = await get(tradeRef);

        if (!tradeSnapshot.exists()) {
            console.error('Trade does not exist');
            return null;
        }

        const tradeData = tradeSnapshot.val()

        const tradeActionBtns = document.getElementById('trade-action-btns');

        const userInv = document.getElementById('user-inv-incoming');
        const playerInv = document.getElementById('player-inv-incoming');

        if (!userInv || !playerInv) {
            console.error('Container elements not found.');
            return;
        }

        const tradeHeader = document.getElementById('incoming-trade-header')

        proposeTradeMenu.classList.add('hidden');
        incomingTradeMenu.classList.remove('hidden');

        const incomingInfo = document.getElementById('player-inv-incoming');

        if (tradeData.type === 'buy') {
            tradeActionBtns.classList.add('hidden');

            tradeHeader.textContent = 'Buying property'
            tradeHeader.style.backgroundColor = '#1fb25a'
            tradeHeader.style.color = 'white'
        }
    } catch (error) {
        console.error(error);
    }
}

export function renderTradeMoney(playerMoneyData, containerId) {
    const moneyInv = document.getElementById(containerId);

    if (!playerMoneyData || playerMoneyData.length === 0) {
        moneyInv.innerHTML = 'lmao u broke as hell'
    }

    if (!containerId) {
        console.error('Container ID not found.')
    }

    const denominations = Object.keys(playerMoneyData).map(Number).sort((a, b) => b - a);

    denominations.forEach(denom => {
        const count = playerMoneyData[denom] || 0;

        if (count > 0) {
            const denomItem = document.createElement('button');
            
            denomItem.className = 'trade-denom-item';
            denomItem.innerHTML = `
                <div class="trade-denom-type">${denom}</div>
                <div class="trade-denom-count">0/${count}</div>
            `;

            moneyInv.appendChild(denomItem);

            denomItem.addEventListener('click', () => {
                console.log('Selected!');
            });
        }
    });
}

export function renderTradeProperty(ownedPropertiesData, gamePropertiesData, containerId) {
    const userInv = document.getElementById(containerId);

    if (!ownedPropertiesData || ownedPropertiesData.length === 0) {
        userInv.innerHTML = "You've nothing in your possessions.";
    }

    userInv.innerHTML = '';

    ownedPropertiesData.forEach(tileId => {
        const propertyItem = document.createElement('button');
        const tile = MONOPOLY_BOARD[tileId]
        const propertyData = gamePropertiesData[tileId]

        propertyItem.className = 'user-property-item';

        const isSelected = (propertyData.ownerId !== PLAYER_UUID) 
            ? propertiesToReceive.includes(tileId) 
            : propertiesToGive.includes(tileId);

        if (isSelected) {
            propertyItem.classList.add('selected');
        } else {
            propertyItem.classList.remove('selected');
        }

        propertyItem.innerHTML = ` 
            <div class="trade-property-bar align-center ${tile.group}-group">${tile.name}</div>
            <div class="trade-property-content">
                <div class="trade-property-rent">Rent: ${tile.rent?.[propertyData.rentLevel] ?? tile.rent}</div>
            </div>
        `;

        userInv.appendChild(propertyItem);

        propertyItem.addEventListener('click', () => {
            let currentToGive = JSON.parse(localStorage.getItem('propertiesToGive')) || [];
            let currentToReceive = JSON.parse(localStorage.getItem('propertiesToReceive')) || [];

            if (propertyData.ownerId !== PLAYER_UUID) {
                const index = currentToReceive.indexOf(tileId);

                if (index > -1) {
                    currentToReceive.splice(index, 1);
                    propertyItem.classList.remove('selected');
                } else {
                    currentToReceive.push(tileId);
                    propertyItem.classList.add('selected');
                }

                if (currentToReceive.length === 0) {
                    localStorage.removeItem('propertiesToReceive');
                } else {
                    localStorage.setItem('propertiesToReceive', JSON.stringify(currentToReceive));
                }
            } else {
                const index = currentToGive.indexOf(tileId);
                
                if (index > -1) {
                    currentToGive.splice(index, 1);
                    propertyItem.classList.remove('selected');
                } else {
                    currentToGive.push(tileId);
                    propertyItem.classList.add('selected');
                }

                if (currentToGive.length === 0) {
                    localStorage.removeItem('propertiesToGive');
                } else {
                    localStorage.setItem('propertiesToGive', JSON.stringify(currentToGive));
                }
            }
        });
    });
}

let currentMoneyListener = null;
let currentPlayerListener = null;

export async function listenToTheirMoney(selectedValue) {
    if (currentMoneyListener) {
        currentMoneyListener();
        currentMoneyListener = null;
    }

    const billsRef = ref(database, `parties/${PARTY_CODE}/game/players/${selectedValue}/money/bills`);

    const unsubscribe = onValue(billsRef, (snapshot) => {
        if (snapshot.exists()) {
            const billsData = snapshot.val();

            renderTradeMoney(billsData, 'player-inv');
            console.log('Rendered!')
        }
    });

    currentMoneyListener = () => {
        unsubscribe();
    }
}

export async function listenToTheirProperty(selectedValue) {
    if (currentPlayerListener) {
        currentPlayerListener();
        currentPlayerListener = null;
    }

    const ownedPropertiesRef = ref(database, `parties/${PARTY_CODE}/game/players/${selectedValue}/ownedProperties`);
    const gamePropertiesRef = ref(database, `parties/${PARTY_CODE}/game/properties`);

    let ownedPropertiesData = null;
    let gamePropertiesData = null;

    const unsubscribe1 = onValue(ownedPropertiesRef, (snapshot) => {
        if (snapshot.exists()) {
            ownedPropertiesData = snapshot.val();
        } else {
            ownedPropertiesData = [];
        }

        if (gamePropertiesData) {
            console.log('Rendering with both datasets');
            renderTradeProperty(ownedPropertiesData, gamePropertiesData, 'player-inv');
        }
    });

    const unsubscribe2 = onValue(gamePropertiesRef, (snapshot) => {
        if (snapshot.exists()) {
            gamePropertiesData = snapshot.val();
        }

        if (ownedPropertiesData !== null) {
            console.log('Rendering with both datasets');
            renderTradeProperty(ownedPropertiesData, gamePropertiesData, 'player-inv');
        }
    });

    currentPlayerListener = () => {
        unsubscribe1();
        unsubscribe2();
    };
}

export let selectedValue = null;

export async function showPlayerOptions(PLAYER_UUIDs) {
    const dropdownList = document.getElementById('select-player');

    if (!dropdownList) {
        console.error('Dropdown list element no found.');
        return;
    }

    dropdownList.innerHTML = '';

    PLAYER_UUIDs.forEach(uuid => {
        if (uuid === PLAYER_UUID) {
            return;
        }

        const playerSelect = document.createElement('option');

        playerSelect.className = 'player-option align-center';
        playerSelect.value = uuid;
        playerSelect.dataset.uuid = uuid;

        dropdownList.appendChild(playerSelect);

        listenToUsername(uuid, (newUsername) => {
            playerSelect.textContent = newUsername;
        });
    });

    
    const selectedPlayer = localStorage.getItem('selectedPlayer');
    
    if (selectedPlayer) {
        dropdownList.value = selectedPlayer;
    }

    dropdownList.addEventListener('change', (event) => {
        selectedValue = event.target.value;

        if (selectedValue) {
            localStorage.setItem('selectedPlayer', selectedValue);
        } else {
            localStorage.removeItem('selectedPlayer');
        }

        localStorage.removeItem('propertiesToReceive');
        localStorage.removeItem('moneyToReceive');

        listenToTheirProperty(selectedValue);
        listenToTheirMoney(selectedValue);
    });
}

/**        const propertyItem = document.querySelectorAll('.selected');

        propertyItem.forEach(element => {
            element.classList.remove('selected');
            console.log('Successfully deleted.')
        }); */