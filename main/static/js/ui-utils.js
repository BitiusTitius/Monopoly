// main homepage ui utilities

export function togglePartyView(viewName) {
    const creationMenu = document.getElementById('party-creation-menu'); 
    const listMenu = document.getElementById('party-list-menu'); 
    const lobbyMenu = document.getElementById('party-lobby-menu'); 
    const title = document.getElementById('title');

    if (!listMenu || !creationMenu || !lobbyMenu) return;

    listMenu.classList.add('hidden');
    creationMenu.classList.add('hidden');
    lobbyMenu.classList.add('hidden');

    if (viewName === 'listMenu') {
        listMenu.classList.remove('hidden');
        title.textContent = 'List of ongoing games';
    } else if (viewName === 'createMenu') {
        creationMenu.classList.remove('hidden');
        title.textContent = 'Creating game';
    } else if (viewName === 'lobbyMenu') {
        lobbyMenu.classList.remove('hidden');
        title.textContent = 'Party lobby';
    } else {
        listMenu.classList.remove('hidden'); 
        title.textContent = 'List of ongoing games';
    }
}

let messageTimeout = null;

export function showMessage(message, messageType, duration) {
    const messageElement = document.getElementById('messageNotif');

    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }

    if(messageElement) {
        if (messageType === 0) {
            messageElement.classList.remove('hidden');
            messageElement.textContent = message;
            messageElement.style.backgroundColor = '#d03737ff';
        }

        if (messageType === 1) {
            messageElement.classList.remove('hidden');
            messageElement.textContent = message;
            messageElement.style.backgroundColor = '#4CAF50';
        }

        const durationSeconds = duration * 1000;

        messageTimeout = setTimeout(() => {
            messageElement.classList.add('hidden');
        }, durationSeconds);
    }
}

export function debounce(func, delay = 200) {
    let timeoutId;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

export function setResponsiveUnits() {
    const root = document.documentElement.style;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    const oneVw_in_px = viewportWidth / 100;
    const oneVh_in_px = viewportHeight / 100;

    root.setProperty('--scale-unit-w', `${oneVw_in_px}px`);
    root.setProperty('--scale-unit-h', `${oneVh_in_px}px`);
    
    window.requestAnimationFrame(() => {
        void root.getPropertyValue('--scale-unit-w'); 
        window.requestAnimationFrame(() => {});
    });
}

// game page ui utilities