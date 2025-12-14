import { MONOPOLY_BOARD } from './game-functions.js';

const PROPERTY_TILE = `
    <div class="tile [--tile-space--] property [--tile-rotation--]">
        <div class="player-content">
            <!-- Player tokens will be dynamically added here -->
        </div>
        <div class="tile-content">
            <div class="color-bar" style="background-color: [--tile-color--];"></div>
        
            <div class="property-content">
                <div class="text tile-name">[--tile-name--]</div>
                <div class="text tile-price">₩[--tile-price--]</div>
            </div>
        </div>
    </div>
`;

const RAILROAD_TILE = `
    <div class="tile [--tile-space--] railroad [--tile-rotation--]">
        <div class="player-content">
            <!-- Player tokens will be dynamically added here -->
        </div>
        <div class="tile-content">
            <div class="non-property-content">
                <div class="text tile-name">[--tile-name--]</div>
                    <svg>
                        <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
                    </svg>
                <div class="text tile-price">₩[--tile-price--]</div>
            </div>
        </div>
    </div>
`;

const UTILITY_TILE = `
    <div class="tile [--tile-space--] utility [--tile-rotation--]">
        <div class="player-content">
            <!-- Player tokens will be dynamically added here -->
        </div>
        <div class="tile-content">
            <div class="non-property-content">
                <div class="text tile-name">[--tile-name--]</div>
                <svg>
                    <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
                </svg>
                <div class="text tile-price">₩[--tile-price--]</div>
            </div>
        </div>
    </div>
`;

const CARD_TILE = `
    <div class="tile [--tile-space--] utility [--tile-rotation--]">
        <div class="player-content">
            <!-- Player tokens will be dynamically added here -->
        </div>
        <div class="tile-content">
            <div class="non-property-content">
                <div class="text tile-name">[--tile-name--]</div>
                <svg>
                    <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
                </svg>
            </div>
        </div>
    </div>
`;

const TAX_TILE = `
    <div class="tile [--tile-space--] tax [--tile-rotation--]">
        <div class="player-content">
            <!-- Player tokens will be dynamically added here -->
        </div>
        <div class="tile-content">
            <div class="non-property-content">
                <div class="text tax-label">[--tile-name--]</div>
                <svg>
                    <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
                </svg>
                <div class="text tile-price">₩[--tile-price--]</div>
            </div>
        </div>
    </div>
`;

const CORNER_TILE = `
    <div class="corner [--tile-space--]">
        <div class="player-content">
            <!-- Player tokens will be dynamically added here -->
        </div>
        <div class="tile-content">
            <div class="non-property-content">
                <div class="text tile-name">[--tile-name--]</div>
                <svg>
                    <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
                </svg>
            </div>
        </div>
    </div>
`;

function getOrientationClass(tile) {
    const tileId = tile.id;
    if (tileId >= 0 && tileId <= 10) return 'bottom';
    if (tileId >= 11 && tileId <= 19) return 'left';
    if (tileId >= 20 && tileId <= 30) return 'top';
    if (tileId >= 31 && tileId <= 39) return 'right';
    return '';
}

function formatTileName(name) {
    const words = name.split(' ');
    
    if (words.length >= 3) {
        return words.slice(0, 2).join(' ') + '<br>' + words.slice(2).join(' ');
    } 

    return name;
}

function renderTile(tile) {
    let template;

    switch (tile.type) {
        case 'property':
            template = PROPERTY_TILE;
            break;
        case 'railroad':
            template = RAILROAD_TILE;
            break;
        case 'utility':
            template = UTILITY_TILE;
            break;
        case 'card':
            template = CARD_TILE;
            break;
        case 'tax':
            template = TAX_TILE;
            break;
        case 'card':
            template = CARD_TILE;
            break;
        default:
            template = CORNER_TILE;
    }

    let tileHTML = template;
    const formattedName = formatTileName(tile.name);

    tileHTML = tileHTML.replace('[--tile-space--]', `space${tile.id}`);
    tileHTML = tileHTML.replace('[--tile-rotation--]', getOrientationClass(tile));
    tileHTML = tileHTML.replace('[--tile-name--]', formattedName);

    const price = tile.price !== undefined ? tile.price : tile.cost !== undefined ? tile.cost : '';

    tileHTML = tileHTML.replace('₩[--tile-price--]', price ? `₩${price}` : '');
    tileHTML = tileHTML.replace('[--tile-price--]', price);

    if (tile.type === 'property') {
        tileHTML = tileHTML.replace('[--tile-color--]', tile.group);
    }
    
    return tileHTML;
}

export function buildMonopolyBoard() {
    const boardContainer = document.getElementById("monopoly-board-container");
    if (!boardContainer) {
        console.error('Board container element with id "monopoly-board-container" not found.');
        return;
    }

    let boardHTML = '';
    
    for (const tile of MONOPOLY_BOARD) {
        boardHTML += renderTile(tile);
    }

    boardContainer.innerHTML = boardHTML;
}