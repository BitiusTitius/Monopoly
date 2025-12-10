// party-lobby.js
import { database, PLAYER_UUID } from './firebase-config.js';
import { ref, get, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { togglePartyView, showMessage } from './ui-utils.js';
import { usernameCache, listenToUsername, stopAllUsernameListeners } from './auth.js';

export async function renderPartyLobby() {
    try {
        const partiesRef = ref(database, `parties`);
        const snapshot = await get(partiesRef);

        if (!snapshot.exists()) {
            console.log('no parties found');
            return;
        }

        const allParties = snapshot.val();
        let userPartyCode = null;

        for (const [code, party] of Object.entries(allParties)) {
            if (party.members && Array.isArray(party.members)) {
                const isInParty = party.members.some(m => m.id === PLAYER_UUID);

                if (isInParty) {
                    userPartyCode = code;
                    break;
                }
            }
        }

        if (!userPartyCode) {
            console.log('user is not in any party atm');
            return;
        }

        togglePartyView('lobbyMenu');
        listenToPartyChanges(userPartyCode);

    } catch (error) {
        console.error('something went horribly wrong', error);
    }
}

export function listenToPartyChanges(partyCode) {
    const partyRef = ref(database, `parties/${partyCode}`);

    onValue(partyRef, async (snapshot) => {
        try {
            if(snapshot.exists()) {
                const partyData = snapshot.val();

                if (partyData.status === 1) {
                    console.log('Party started, redirecting to game...');
                    window.location.href = `/game/${partyCode}/`;
                    return;
                }
                await populatePartyLobby(partyCode, partyData);
            } else {
                console.log('The party was disbanded.');
            }
        } catch (error) {
            console.error(error);
        }
    });
}

export async function populatePartyLobby(partyCode, partyData) {
    const partyInfo = document.getElementById('party-info');
    const currentPlayerCount = partyData.members ? partyData.members.length : 0;
    const maxPlayers = partyData.playerCount || 10;

    if (partyInfo) {
        partyInfo.textContent = (`${partyData.partyName} | ${partyCode} | ${currentPlayerCount}/${maxPlayers} Players`);
    }

    await renderMembersList(partyData.members);

    const startBtn = document.getElementById('start-game-btn');

    if (startBtn) {
        const isHost = partyData.hostUUID === PLAYER_UUID;

        if (isHost) {
            startBtn.style.display = 'block';
            startBtn.disabled = currentPlayerCount < 2;
        }
    }
}

export async function renderMembersList(members) {
    const memberList = document.getElementById('party-members-list');

    if (!memberList || !members || !Array.isArray(members)) {
        return;
    }

    memberList.innerHTML = '';
    stopAllUsernameListeners();

    const memberDivs = members.map((member) => {
        const uuid = member.id;
        
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member-item';
        memberDiv.dataset.memberId = uuid;

        const initialUsername = usernameCache[uuid];

        memberDiv.innerHTML = `
            <span class="member-name" id="username-${uuid}">${initialUsername}</span>
            ${member.isHost ? '<span class="host-badge">👑 Host</span>' : ''}
            ${member.id === PLAYER_UUID ? '<span class="you-badge">(You)</span>' : ''}
        `;
        
        listenToUsername(uuid, (newUsername) => {
            const usernameSpan = document.getElementById(`username-${uuid}`);
            if (usernameSpan) {
                usernameSpan.textContent = newUsername;
            }
        });

        memberList.appendChild(memberDiv);
        
        return memberDiv;
    });
}