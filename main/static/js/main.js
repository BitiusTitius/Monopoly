// main.js
import { loadUser, setUsername } from './auth.js';
import { setResponsiveUnits, debounce, togglePartyView } from './ui-utils.js';
import { renderPartyLobby } from './party-lobby.js';
import { 
    createParty, 
    joinParty, 
    leaveParty, 
    startParty, 
    listenToParties,
    createOrJoin
} from './party-management.js';

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    setResponsiveUnits();
    window.addEventListener('resize', debounce(setResponsiveUnits, 200));
    window.addEventListener('DOMContentLoaded', renderPartyLobby);

    listenToParties();
    loadUser();
    
    const codeInput = document.getElementById('join-code-input');
    if (codeInput) {
        createOrJoin(); 
        codeInput.addEventListener('keyup', createOrJoin);
        codeInput.addEventListener('change', createOrJoin); 
    }

    const joinPartyButton = document.getElementById('join-party-btn');
    if (joinPartyButton) {
        joinPartyButton.addEventListener('click', async () => {
            joinParty(codeInput);
        });
    }

    const leavePartyButton = document.getElementById('leave-party-btn');
    if (leavePartyButton) {
        leavePartyButton.addEventListener('click', () => {
            leaveParty();
        });
    }

    const startGameButton = document.getElementById('start-game-btn');
    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            startParty();
        });
    }

    const setUsernameButton = document.getElementById('create-user-btn');
    if (setUsernameButton) {
        setUsernameButton.addEventListener('click', async () => {
            await setUsername();
        });
    }

    const createPartyButton = document.getElementById('create-party-btn');
    if (createPartyButton) {
        createPartyButton.addEventListener('click', () => {
            togglePartyView('createMenu');
        });
    }

    const confirmPartyCreation = document.getElementById('submit-create-party-btn');
    if (confirmPartyCreation) {
        confirmPartyCreation.addEventListener('click', () => {
            createParty();
        });
    }

    const cancelCreatePartyButton = document.getElementById('cancel-creation-btn');
    if (cancelCreatePartyButton) {
        cancelCreatePartyButton.addEventListener('click', () => {
            togglePartyView('listMenu');
        });
    }
});