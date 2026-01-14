import { database } from './firebase-config.js';
import { ref, get, update, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { listenToUsername } from "./auth.js";
import { PARTY_CODE, PLAYER_UUID } from './game.js';
import { endTurn, listenToInventory, MONOPOLY_BOARD } from './game-functions.js';

// list of things to show in property content: current rent, number of houses/hotels (will be implemented soon)

const propertiesToGive = JSON.parse(localStorage.getItem('propertiesToGive')) || [];
const propertiesToReceive = JSON.parse(localStorage.getItem('propertiesToReceive')) || [];

const moneyToGive = JSON.parse(localStorage.getItem('moneyToGive')) || [];
const moneyToReceive = JSON.parse(localStorage.getItem('moneyToReceive')) || [];

const proposeTradeMenu = document.getElementById('propose-trade');
const incomingTradeMenu = document.getElementById('incoming-trade');

let currentTradeId = null;

export async function sendTrade(type, propertyData, taxAmount) { // types: buying property, paying rent, trading property
    try {
        const tradeId = `${PLAYER_UUID}-${Date.now()}`;
        const tradeRef = ref(database, `parties/${PARTY_CODE}/game/trades/${tradeId}`);
        const selectedValue = localStorage.getItem('selectedPlayer');
        let tradeData;

        if (type === 'trade') { //trade between players
            if (!selectedValue) {
                console.error('No player selected for trade.');
                return;
            }

            tradeData = {
                type: type,
                from: PLAYER_UUID,
                to: selectedValue,
                propertiesOffered: propertiesToGive,
                propertiesRequested: propertiesToReceive,
                moneyOffered: moneyToGive,
                moneyRequested: moneyToReceive,
                status: 'pending',
                timeSent: Date.now()
            };
        } else if (type === 'buy') { //buy property
            tradeData = {
                type: type,
                from: 'bank',
                to: PLAYER_UUID,
                propertiesOffered: [propertyData.id],
                moneyRequested: propertyData.price,
                status: 'pending',
                timeSent: Date.now()
            };
        } else if (type === 'rent' || type === 'tax') { //rent property
            tradeData = {
                type: type,
                from: (type === 'rent' ? propertyData.ownerId : 'bank'),
                propertyId: propertyData ? propertyData.id : null,
                to: PLAYER_UUID,
                moneyRequested: (type === 'rent' ? propertyData?.rent : taxAmount),
                status: 'pending',
                timeSent: Date.now()
            };
        } else {
            console.error('Invalid trade type');
            return null;
        }

        await update(tradeRef, tradeData);

        localStorage.removeItem('moneyToGive');
        localStorage.removeItem('moneyToReceive');
        localStorage.removeItem('propertiesToGive');
        localStorage.removeItem('propertiesToReceive');

        // re-render inventories
        renderInventory(PLAYER_UUID, 'user-inv');
        renderInventory(selectedValue, 'player-inv');
        
        console.log(`Successfully sent trade with id ${tradeId}`);

    } catch (error) {
        console.error('Could not send trade.', error);
        return;
    }
}

export async function confirmTrade() {
    try {
        const tradeRef = ref(database, `parties/${PARTY_CODE}/game/trades/${currentTradeId}`);
        const tradeSnapshot = await get(tradeRef);

        if (!tradeSnapshot.exists()) {
            console.error('Trade does not exist');
            return;
        }

        const tradeData = tradeSnapshot.val();

        const moneyToGive = JSON.parse(localStorage.getItem('moneyToGive')) || [];
        const moneyToReceive = JSON.parse(localStorage.getItem('moneyToReceive')) || [];
        const selectedValue = localStorage.getItem('selectedPlayer');

        const btn = document.getElementById('payment-btn');

        const gameRef = ref(database, `parties/${PARTY_CODE}/game/`);
        const gameSnapshot = await get(gameRef);

        if (!gameSnapshot.exists()) {
            console.error('Game data not found');
            return;
        }

        const gameData = gameSnapshot.val();

        if (tradeData.status !== 'pending') {
            console.error('Trade is not pending and cannot be confirmed.');
            return;
        }

        if (tradeData.type !== 'trade') {
            const totalPledged = moneyToGive.reduce((sum, item) => sum + (item.denom * item.count), 0);
            const needsChange = totalPledged > tradeData.moneyRequested;
            const InsufficientFunds = totalPledged < tradeData.moneyRequested;

            if (InsufficientFunds) {
                console.error('Insufficient funds pledged to confirm trade.');
                btn.textContent = `Insufficient funds`;
                return;
            }
            
            let updatedBills = { ...gameData.players[PLAYER_UUID].money.bills };

            moneyToGive.forEach(item => {
                const count = updatedBills[item.denom] || 0;
                updatedBills[item.denom] = count - item.count;

                if (updatedBills[item.denom] < 0) {
                    delete updatedBills[item.denom];
                }
            })

            let bankBills = { ...gameData.bank };

            moneyToGive.forEach(item => {
                const count = bankBills[item.denom] || 0;
                bankBills[item.denom] = count + item.count;
            });

            if (needsChange) {
                btn.textContent = `Confirm purchase (will receive change)`;
                const changeAmount = totalPledged - tradeData.moneyRequested;
                const changeResult = await handleChange(changeAmount, bankBills);

                if (!changeResult) {
                    console.error('Could not provide change for the transaction.');
                    return;
                }

                changeResult.changeBills.forEach(item => {
                    const count = updatedBills[item.denom] || 0;
                    updatedBills[item.denom] = count + item.count;
                });

                bankBills = changeResult.updatedBankBills;
            }

            if (tradeData.type === 'buy') {
                let updatedProperties = gameData.players[PLAYER_UUID]?.properties || [];
                updatedProperties.push(tradeData.propertiesOffered[0]);

                await update(gameRef, {
                    [`properties/${tradeData.propertiesOffered}/ownerId`]: PLAYER_UUID,
                    [`players/${PLAYER_UUID}/properties`]: updatedProperties
                });
            }

            if (tradeData.type === 'rent') {
                const ownerId = tradeData.from;
                let ownerBills = { ...gameData.players[ownerId].money.bills };

                moneyToGive.forEach(item => {
                    const count = ownerBills[item.denom] || 0;
                    ownerBills[item.denom] = count + item.count;
                });

                await update(gameRef, {
                    [`players/${ownerId}/money/bills`]: ownerBills
                });
            }

            await update(gameRef, {
                [`players/${PLAYER_UUID}/money/bills`]: updatedBills,
                [`bank`]: bankBills,
                [`trades/${currentTradeId}/status`]: 'completed'
            });

            console.log('Purchase confirmed successfully.');

            endTurn();
        } else {
            console.error('Only buy and rent trades can be confirmed this way.');
            return;
        }

        proposeTradeMenu.classList.remove('hidden');
        incomingTradeMenu.classList.add('hidden');

        localStorage.removeItem('moneyToGive');
        localStorage.removeItem('propertiesToGive');

        renderInventory(PLAYER_UUID, 'user-inv');
        renderInventory(selectedValue, 'player-inv');

    } catch (error) {
        console.error('Error confirming trade:', error);
    }
}

export async function handleChange(changeAmount, bankBills) {
    const denominations = Object.keys(bankBills).map(Number).sort((a, b) => b - a);

    let remaining = changeAmount;
    const changeBills = [];
    const updatedBankBills = { ...bankBills };

    for (const denom of denominations) {
        if (remaining <= 0) break;

        const availableBills = updatedBankBills[denom] || 0;
        const neededBills = Math.floor(remaining / denom);
        const billsToGive = Math.min(availableBills, neededBills);

        if (billsToGive > 0) {
            changeBills.push({ denom, count: billsToGive });
            updatedBankBills[denom] -= billsToGive;
            remaining -= billsToGive * denom;

            if (updatedBankBills[denom] === 0) {
                delete updatedBankBills[denom];
            }
        }
    }

    if (remaining > 0) {
        console.error('The bank is broken lol')
        return false; // Unable to provide exact change
    }

    return {
        changeBills,
        updatedBankBills
    }
}

export async function listenToIncomingTrades() {
    const tradesRef = ref(database, `parties/${PARTY_CODE}/game/trades/`);

    onValue(tradesRef, (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((trade) => {
                const tradeId = trade.key;
                const tradeData = trade.val();
                const priorityTrades = tradeData.type === 'buy' || tradeData.type === 'rent' || tradeData.type === 'tax';

                if (priorityTrades && tradeData.to === PLAYER_UUID && tradeData.status === 'pending') {
                    renderIncomingTrade(tradeId);
                    currentTradeId = tradeId;
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
            return;
        }

        const tradeData = tradeSnapshot.val()

        const billsRef = ref(database, `parties/${PARTY_CODE}/game/players/${PLAYER_UUID}/money/bills`);
        const billsSnapshot = await get(billsRef);

        if (!billsSnapshot.exists()) {
            console.error('Bills data not found');
            return;
        }

        const billsData = billsSnapshot.val();

        const tradeActionBtns = document.getElementById('trade-action-btns');
        const paymentBtn = document.getElementById('payment-btn');
        const userInv = document.getElementById('user-inv-incoming');
        const playerInv = document.getElementById('player-inv-incoming');

        if (!userInv || !playerInv) {
            console.error('Container elements not found.');
            return;
        }

        const tradeHeader = document.getElementById('incoming-trade-header')

        tradeHeader.style.color = 'white';

        proposeTradeMenu.classList.add('hidden');
        incomingTradeMenu.classList.remove('hidden');
        playerInv.innerHTML = '';
        userInv.innerHTML = '';

        if (tradeData.type === 'buy') {
            tradeActionBtns.classList.add('hidden');
            paymentBtn.classList.remove('hidden');
            paymentBtn.textContent = `Confirm purchase`
            tradeHeader.textContent = `Buying property`
            tradeHeader.style.backgroundColor = '#1fb25a'

            renderInventory(PLAYER_UUID, 'user-inv-incoming');
            createTree(await convertTradeToTree(tradeData), playerInv);

            paymentBtn.onclick = async () => {
                await confirmTrade();
            };
        } else if (tradeData.type === 'rent' || tradeData.type === 'tax') {
            tradeActionBtns.classList.add('hidden');
            paymentBtn.classList.remove('hidden');
            paymentBtn.textContent = `Confirm payment`
            tradeHeader.textContent = `${tradeData.type === 'rent' ? 'Paying rent' : 'Paying tax'}`
            tradeHeader.style.backgroundColor = '#e84545'

            renderInventory(PLAYER_UUID, 'user-inv-incoming');
            createTree(await convertTradeToTree(tradeData), playerInv);

            paymentBtn.onclick = async () => {
                await confirmTrade();
            };
        }

    } catch (error) {
        console.error(error);
    }
}

export async function renderInventory(ownerId, containerId) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error('Container element not found.');
        return;
    }

    if (ownerId === null) {
        container.innerHTML = '';
        return;
    }

    const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${ownerId}`);
    const playerSnapshot = await get(playerRef);

    if (!playerSnapshot.exists()) {
        console.error('Player data not found.');
        return;
    }
    const playerData = playerSnapshot.val();

    const billsData = playerData.money.bills;
    const propertiesData = playerData.properties;

    const gameRef = ref(database, `parties/${PARTY_CODE}/game`);
    const gameSnapshot = await get(gameRef);

    if (!gameSnapshot.exists()) {
        console.error('Game properties data not found.');
        return;
    }

    const gameData = gameSnapshot.val();

    const gamePropertiesData = gameData.properties;

    container.innerHTML = '';

    let currentToGive = JSON.parse(localStorage.getItem('propertiesToGive')) || [];
    let currentToReceive = JSON.parse(localStorage.getItem('propertiesToReceive')) || [];
    let currentMoneyToGive = JSON.parse(localStorage.getItem('moneyToGive')) || [];
    let currentMoneyToReceive = JSON.parse(localStorage.getItem('moneyToReceive')) || [];

    const otherPlayer = ownerId !== PLAYER_UUID;
    const selectedProperties = otherPlayer ? currentToReceive : currentToGive;
    const selectedBills = otherPlayer ? currentMoneyToReceive : currentMoneyToGive;

    const treeData = [];
    const inventoryChildren = [];

    if (propertiesData && propertiesData.length > 0) {
        const propertyChildren = propertiesData.map(tileId => {
            const selectedData = selectedProperties.includes(tileId);

            return {
                label: MONOPOLY_BOARD[tileId].name,
                tileId: tileId,
                ownerId: gamePropertiesData[tileId]?.ownerId,
                isSelectable: true,
                isSelected: selectedData,
                type: 'property'
            };
        });

        inventoryChildren.push({
            label: 'PROPERTIES',
            children: propertyChildren
        })
    }

    if (billsData && Object.keys(billsData).length > 0) {
        const denominations = Object.keys(billsData).map(Number).sort((a, b) => b - a);

        const moneyChildren = denominations.map(denom => {
            const count = billsData[denom] || 0;

            if (count === 0) {
                return;
            }

            const selectedData = selectedBills.find(m => m.denom === denom);
            const selectedCount = selectedData ? selectedData.count : 0;

            return {
                label: `₩${denom}: ${selectedCount}/${count}`,
                denom: denom,
                maxCount: count,
                ownerId: ownerId,
                isSelectable: true,
                type: 'money'
            };

        }).filter(Boolean);

        inventoryChildren.push({
            label: 'MONEY',
            children: [
                {
                    label: `DENOMINATIONS`,
                    children: moneyChildren
                },
                { 
                    label: `TOTAL: ₩${denominations.reduce((sum, denom) => sum + (denom * (billsData[denom] || 0)), 0)}` 
                }
            ]
        })
    }

    treeData.push({
        label: 'INVENTORY',
        children: inventoryChildren
    });

    const hasSelectedProperties = selectedProperties.length > 0;
    const hasSelectedMoney = selectedBills.length > 0;

    if (hasSelectedProperties || hasSelectedMoney) {
        const selectedChildren = [];

        if (hasSelectedProperties) {
            const selectedPropertiesChildren = selectedProperties.map(tileId => {
                return {
                    label: MONOPOLY_BOARD[tileId].name,
                    type: 'property'
                }
            });
            selectedChildren.push({
                label: 'PROPERTIES',
                children: selectedPropertiesChildren
            });
        }

        if (hasSelectedMoney) {
            const selectedMoneyChildren = selectedBills.map(moneyItem => {
                return {
                    label: `₩${moneyItem.denom}: ${moneyItem.count}x`,
                    denom: moneyItem.denom,
                    count: moneyItem.count
                }
            });
            selectedChildren.push({
                label: 'MONEY',
                children: [
                    { 
                        label: 'DENOMINATIONS', 
                        children: selectedMoneyChildren 
                    },
                    {
                        label: `TOTAL: ₩${selectedBills.reduce((sum, item) => sum + (item.denom * item.count), 0)}`
                    }
                ]
            });
        }

        treeData.push({
            label: `SELECTED (${otherPlayer ? "They'll concede" : "You'll offer"})`,
            children: selectedChildren
        });
    }


    createTree(treeData, container, (node) => {
        handleInventoryClick(node, ownerId, containerId);
    });
}

let playerInventoryListener = null;

export function listenToTheirInventory(selectedValue) {
    if (playerInventoryListener) {
        playerInventoryListener();
        playerInventoryListener = null;
    }

    const playerRef = ref(database, `parties/${PARTY_CODE}/game/players/${selectedValue}`);

    const unsubscribe = onValue(playerRef, (snapshot) => {
        if (snapshot.exists()) {
            renderInventory(selectedValue, 'player-inv');
        }
    });

    playerInventoryListener = () => {
        unsubscribe();
    }
}

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
        const selectedValue = event.target.value;

        if (selectedValue) {
            localStorage.setItem('selectedPlayer', selectedValue);
        } else {
            localStorage.removeItem('selectedPlayer');
        }

        console.log('Cleared selected trade items from localStorage.');

        localStorage.removeItem('propertiesToReceive');
        localStorage.removeItem('moneyToReceive');

        listenToUsername(selectedValue, (username) => {
            console.log(`Selected player to trade with: ${username}`);
        });

        renderInventory(selectedValue, 'player-inv');
    });
}

function createNode(node, isLast, prefix, startCollapsed = false, isRoot = false, clickHandler = null) {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';
    
    if (startCollapsed) {
        nodeEl.classList.add('collapsed');
    }

    if (node.isSelected) {
        nodeEl.classList.add('selected-item');
    }
    
    const branch = isRoot ? '' : (isLast ? '└─' : '├─');
    const hasChildren = node.children && node.children.length > 0;
    const arrow = hasChildren ? '▼' : ' ';
    
    const label = document.createElement('span');
    let content = prefix;
    if (branch) content += branch + '';
    content += arrow + ' ' + node.label;
    label.innerHTML = content;
    
    // Make selectable items look clickable
    if (node.isSelectable && !hasChildren) {
        label.style.cursor = 'pointer';
        label.style.userSelect = 'none';
    }
    
    nodeEl.appendChild(label);
    
    if (hasChildren) {
        const childContainer = document.createElement('div');
        childContainer.className = 'tree-children';
        
        const newPrefix = isRoot ? '' : (prefix + (isLast ? '  ' : '│ '));
        
        node.children.forEach((child, idx) => {
            const isChildLast = idx === node.children.length - 1;
            childContainer.appendChild(createNode(child, isChildLast, newPrefix, false, false, clickHandler));
        });
        
        nodeEl.appendChild(childContainer);
        
        // Toggle collapse on parent nodes
        label.addEventListener('click', (e) => {
            e.stopPropagation();
            nodeEl.classList.toggle('collapsed');
            const currentArrow = nodeEl.classList.contains('collapsed') ? '▶' : '▼';
            label.innerHTML = label.innerHTML.replace(/[▶▼]/, currentArrow);
        });
    } else if (node.isSelectable && clickHandler) {
        // Handle clicks on selectable leaf nodes
        label.addEventListener('click', (e) => {
            e.stopPropagation();
            clickHandler(node, nodeEl);
        });
    }
    
    return nodeEl;
}

function createTree(data, container, clickHandler = null, startCollapsed = false) {
    const tree = document.createElement('div');
    tree.className = 'tree';
    
    data.forEach((node, index) => {
        const isLast = index === data.length - 1;
        tree.appendChild(createNode(node, isLast, '', startCollapsed, true, clickHandler));
    });
    
    container.appendChild(tree);
}

async function convertTradeToTree(tradeData) {
    const tree = [];
    const children = []; // Collect all nodes as children

    if (tradeData.type === 'trade') {
        // What the sender offers
        const offeredNode = {
            label: 'YOU OFFER',
            children: []
        };

        // Properties offered
        if (tradeData.propertiesOffered && tradeData.propertiesOffered.length > 0) {
            const propsNode = {
                label: 'PROPERTIES',
                children: tradeData.propertiesOffered.map(propId => ({
                    label: MONOPOLY_BOARD[propId].name
                }))
            };
            offeredNode.children.push(propsNode);
        }

        // Money offered
        if (tradeData.moneyOffered && tradeData.moneyOffered.length > 0) {
            const totalOffered = tradeData.moneyOffered.reduce((sum, item) => sum + (item.denom * item.count), 0);
            const moneyNode = {
                label: 'MONEY',
                children: [
                    {
                        label: 'DENOMINATIONS',
                        children: tradeData.moneyOffered.map(item => ({
                            label: `${item.denom}: ${item.count}x`
                        }))
                    },
                    { label: `TOTAL: ₩${totalOffered}` }
                ]
            };
            offeredNode.children.push(moneyNode);
        }

        children.push(offeredNode);

        // What you request
        const requestedNode = {
            label: 'YOU REQUEST',
            children: []
        };

        // Properties requested
        if (tradeData.propertiesRequested && tradeData.propertiesRequested.length > 0) {
            const propsNode = {
                label: 'PROPERTIES',
                children: tradeData.propertiesRequested.map(propId => ({
                    label: MONOPOLY_BOARD[propId].name
                }))
            };
            requestedNode.children.push(propsNode);
        }

        // Money requested
        if (tradeData.moneyRequested && tradeData.moneyRequested.length > 0) {
            const totalRequested = tradeData.moneyRequested.reduce((sum, item) => sum + (item.denom * item.count), 0);
            const moneyNode = {
                label: 'MONEY',
                children: [
                    {
                        label: 'DENOMINATIONS',
                        children: tradeData.moneyRequested.map(item => ({
                            label: `${item.denom}: ${item.count}x`
                        }))
                    },
                    { label: `TOTAL: ₩${totalRequested}` }
                ]
            };
            requestedNode.children.push(moneyNode);
        }

        children.push(requestedNode);

        // Wrap everything in a parent node
        tree.push({
            label: 'TRADE DETAILS',
            children: children
        });
    }

    if (tradeData.type === 'buy') {
        // Bank offers property
        children.push({
            label: 'BANK OFFERS',
            children: [
                {
                    label: 'PROPERTIES',
                    children: [
                        { label: MONOPOLY_BOARD[tradeData.propertiesOffered].name }
                    ]
                }
            ]
        });

        // You pay money
        children.push({
            label: 'IN EXCHANGE FOR',
            children: [
                {
                    label: 'MONEY',
                    children: [
                        { label: `TOTAL: ₩${tradeData.moneyRequested}` }
                    ]
                }
            ]
        });

        // What you've pledged so far
        const moneyToGive = JSON.parse(localStorage.getItem('moneyToGive')) || [];

        if (moneyToGive.length > 0) {
            const totalPledged = moneyToGive.reduce((sum, item) => sum + (item.denom * item.count), 0);
            
            children.push({
                label: 'TOTAL PLEDGED',
                children: [
                    {
                        label: 'MONEY',
                        children: [
                            {
                                label: 'DENOMINATIONS',
                                children: moneyToGive.map(item => ({
                                    label: `${item.denom}: ${item.count}x`
                                }))
                            },
                            { label: `TOTAL: ₩${totalPledged}` }
                        ]
                    }
                ]
            });
        }

        // Wrap in parent node
        tree.push({
            label: 'PURCHASE SUMMARY',
            children: children
        });
    }

    if (tradeData.type === 'rent' || tradeData.type === 'tax') {
        // Property rent details
        const username = await new Promise((resolve) => {
            listenToUsername(tradeData.from, (name) => {
                resolve(name);
            });
        });

        children.push({
            label: `OWED TO`,
            children: [{ label: `${tradeData.from === 'bank' ? 'BANK' : username}` }]
        });

        if (tradeData.type === 'rent') {
            children.push({
                label: 'ON',
                children: [{ label: MONOPOLY_BOARD[tradeData.propertyId].name }]
            });
        }

        children.push({
            label: 'AMOUNT',
            children: [{ label: `TOTAL: ₩${tradeData.moneyRequested}` }]
        });

        // What you've pledged
        const moneyToGive = JSON.parse(localStorage.getItem('moneyToGive')) || [];

        if (moneyToGive.length > 0) {
            const totalPledged = moneyToGive.reduce((sum, item) => sum + (item.denom * item.count), 0);
            
            children.push({
                label: 'TOTAL PLEDGED',
                children: [
                    {
                        label: 'MONEY',
                        children: [
                            {
                                label: 'DENOMINATIONS',
                                children: moneyToGive.map(item => ({
                                    label: `${item.denom}: ${item.count}x`
                                }))
                            },
                            { label: `TOTAL: ₩${totalPledged}/${tradeData.moneyRequested}` }
                        ]
                    }
                ]
            });
        }

        // Wrap in parent node
        tree.push({
            label: `${tradeData.type === 'rent' ? 'RENT DUE' : 'TAX DUE'}`,
            children: children
        });
    }

    return tree;
}

function handleInventoryClick(node, ownerId, containerId) {
    if (node.type === 'property') {
        handlePropertyClick(node);
    } else if (node.type === 'money') {
        handleMoneyClick(node);
    }

    renderInventory(ownerId, containerId)
}

function handlePropertyClick(node) {
    let currentToGive = JSON.parse(localStorage.getItem('propertiesToGive')) || [];
    let currentToReceive = JSON.parse(localStorage.getItem('propertiesToReceive')) || [];

    const tileId = node.tileId;
    const isOtherPlayer = node.ownerId !== PLAYER_UUID;

    if (isOtherPlayer) {
        const index = currentToReceive.indexOf(tileId);

        if (index > -1) {
            currentToReceive.splice(index, 1);
            console.log(`Deselected property ${tileId}`);
        } else {
            currentToReceive.push(tileId);
            console.log(`Selected property ${tileId}`);
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
            console.log(`Deselected property ${tileId}`);
        } else {
            currentToGive.push(tileId);
            console.log(`Selected property ${tileId}`);
        }

        if (currentToGive.length === 0) {
            localStorage.removeItem('propertiesToGive');
        } else {
            localStorage.setItem('propertiesToGive', JSON.stringify(currentToGive));
        }
    }

    if (currentTradeId) {
        renderIncomingTrade(currentTradeId);
    }
}

function handleMoneyClick(node) {
    let currentMoneyToGive = JSON.parse(localStorage.getItem('moneyToGive')) || [];
    let currentMoneyToReceive = JSON.parse(localStorage.getItem('moneyToReceive')) || [];

    const denom = node.denom;
    const maxCount = node.maxCount;
    const isOtherPlayer = node.ownerId !== PLAYER_UUID;

    if (isOtherPlayer) {
        const index = currentMoneyToReceive.findIndex(m => m.denom === denom);

        if (index > -1) {
            if (currentMoneyToReceive[index].count < maxCount) {
                currentMoneyToReceive[index].count++;
                console.log(`Increased ${denom} to ${currentMoneyToReceive[index].count}`);
            } else {
                currentMoneyToReceive.splice(index, 1);
                console.log(`Deselected ${denom}`);
            }
        } else {
            currentMoneyToReceive.push({ denom, count: 1 });
            console.log(`Selected ${denom} x1`);
        }

        if (currentMoneyToReceive.length === 0) {
            localStorage.removeItem('moneyToReceive');
        } else {
            localStorage.setItem('moneyToReceive', JSON.stringify(currentMoneyToReceive));
        }
    } else {
        const index = currentMoneyToGive.findIndex(m => m.denom === denom);

        if (index > -1) {
            if (currentMoneyToGive[index].count < maxCount) {
                currentMoneyToGive[index].count++;
                console.log(`Increased ${denom} to ${currentMoneyToGive[index].count}`);
            } else {
                currentMoneyToGive.splice(index, 1);
                console.log(`Deselected ${denom}`);
            }
        } else {
            currentMoneyToGive.push({ denom, count: 1 });
            console.log(`Selected ${denom} x1`);
        }

        if (currentMoneyToGive.length === 0) {
            localStorage.removeItem('moneyToGive');
        } else {
            localStorage.setItem('moneyToGive', JSON.stringify(currentMoneyToGive));
        }
    }

    // Re-render the entire inventory

    // Update trade view if exists
    if (currentTradeId) {
        renderIncomingTrade(currentTradeId);
    }
}