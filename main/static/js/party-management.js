// party-management.js
import { database, PLAYER_UUID } from './firebase-config.js';
import { ref, get, set, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { loadUser } from './auth.js';
import { showMessage, togglePartyView } from './ui-utils.js';
import { renderPartyLobby } from './party-lobby.js';
import { initializeGameState } from './game.js';

export function generatePartyCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

export async function createParty() {
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
            status: 0,
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

export async function joinParty(codeParam) {
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

        if (partyData.status === 1 || partyData.status === 2) {
            showMessage('That party has already started or finished.', 0, 4);
            console.log('That party has aleady started or finished.');
            return;
        }

        const newMember = { id: member.uuid, isHost: false };
        const updateMemberList = [...currentMembers, newMember]; 

        await update(partyRef, { members: updateMemberList });
        
        showMessage(`You have joined ${partyData.partyName}.`, 1, 4);
        await renderPartyLobby();

    } catch (error) {
        showMessage('Could not join that party.', 0, 4);
        console.error('Error joining party:', error);
    }
}

export async function leaveParty() {
    try {
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

export async function startParty() {
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
            showMessage('You need at least 2 players to start.', 0, 4);
            console.log('Not enough players');
            return;
        }

        const partyRef = ref(database, `parties/${hostPartyCode}`);
        await update(partyRef, {
            status: 1,
            startedAt: Date.now(),
            game: initializeGameState(hostParty.members)
        });

        showMessage('Party started!', 1, 4);
        console.log('Party started!');

        window.location.href = `/game/${hostPartyCode}/`;

    } catch (error) {
        showMessage('Could not start party.', 0, 4);
        console.error('Error starting party:', error);
    }
}

export function renderPartyList(allParties) {
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
        if (party.status !== 0) {
            continue;
        }

        const partyButton = document.createElement('button');
        partyButton.className = 'party-item';
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

export async function listenToParties() {
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

export function createOrJoin() {
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