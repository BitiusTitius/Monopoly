export const BUILDING_COSTS = {
    brown: 50,
    lightblue: 50,
    pink: 100,
    orange: 100,
    red: 150,
    yellow: 150,
    green: 200,
    darkblue: 200,
};

import { database } from './firebase-config.js';
import { getDatabase, ref, onValue, set, get, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { listenToUsername } from './auth.js';
import { MONOPOLY_BOARD } from "./game-functions.js";

import { PARTY_CODE, PLAYER_UUID } from './game.js';

const PROPERTY_TILE = `
    <div class="tile [--tile-space--] property [--tile-rotation--]">
        <div class="player-content">
            <!-- Player tokens will be dynamically added here -->
        </div>
        <div class="tile-content">
            <div class="color-bar [--tile-color--]-group"></div>
        
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
            template = CARD_TILE.replace('card', tile.type);
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

const RAILROAD_DEED = `
    Oi    
`;

const UTILITY_DEED = `
    Oi
`;

const PROPERTY_DEED = `
    <div class="property-bar [--tile-color--]-group">
        [--tile-name--]
    </div>
    <div class="rent-list">
        <div class="rent-labels">
            <div class="deed-label-text rentLabel">Rent</div>
            <div class="deed-label-text rentLabel">Rent with color set</div>
            <div class="deed-label-text rentLabel">Rent with 1h</div>
            <div class="deed-label-text rentLabel">Rent with 2h</div>
            <div class="deed-label-text rentLabel">Rent with 3h</div>
            <div class="deed-label-text rentLabel">Rent with 4h</div>
            <div class="deed-label-text rentLabel">Rent with hotel</div>
        </div>
        <div class="rent-costs">
            <div class="deed-label-text rentcost">[--rent-base--]</div>
            <div class="deed-label-text rentcost">[--rent-color-set--]</div>
            <div class="deed-label-text rentcost">[--rent-1-house--]</div>
            <div class="deed-label-text rentcost">[--rent-2-house--]</div>
            <div class="deed-label-text rentcost">[--rent-3-house--]</div>
            <div class="deed-label-text rentcost">[--rent-4-house--]</div>
            <div class="deed-label-text rentcost">[--rent-hotel--]</div>
        </div>
    </div>
    <div class="develop">
        <div class="building-type">
            <div class="deed-label-text buildingLabel">Houses cost</div>
            <div class="deed-label-text buildingLabel">Hotels cost</div>
        </div>
        <div class="building-cost">
            <div class="deed-label-text buildingCost">[--house-cost--] each</div>
            <div class="deed-label-text buildingCost">[--hotel-cost--] each</div>
            <div class="plus-four-houses">(plus 4 houses)</div>
        </div>
    </div>
`;

export async function renderDeedCard(property) {
    const tile = MONOPOLY_BOARD[property]
    let template;

    switch (tile.type) {
        case 'utility':
            template = UTILITY_DEED;
            break;
        case `railroad`:
            template = RAILROAD_DEED;
            break;
        default:
            template = PROPERTY_DEED;
    }

    if (tile.type === 'property') {
        const houseCost = tile.price * 0.5;
        const hotelCost = tile.price * 0.5
        
        template = template
            .replace('[--tile-color--]', tile.group)
            .replace('[--tile-name--]', tile.name)
            .replace('[--rent-base--]', `₩${tile.rent[0]}`)
            .replace('[--rent-color-set--]', `₩${tile.rent[1]}`)
            .replace('[--rent-1-house--]', `₩${tile.rent[2]}`)
            .replace('[--rent-2-house--]', `₩${tile.rent[3]}`)
            .replace('[--rent-3-house--]', `₩${tile.rent[4]}`)
            .replace('[--rent-4-house--]', `₩${tile.rent[5]}`)
            .replace('[--rent-hotel--]', `₩${tile.rent[6]}`)
            .replace('[--house-cost--]', `₩${houseCost}`)
            .replace('[--hotel-cost--]', `₩${hotelCost}`);
        
        return template;
    } else {
        return template;
    }
}