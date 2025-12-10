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

const MONOPOLY_BOARD = [
    // bottom-end
    { id: 0, name: "GO", type: "corner", action: "collect", group: "start", price: 0 },
    { id: 1, name: "OLD KENT ROAD", type: "property", group: "brown", price: 60, rent: 2, houses: 0, hotels: 0, ownerId: null },
    { id: 2, name: "COMMUNITY CHEST", type: "card", action: "draw-community", group: "white" },
    { id: 3, name: "WHITECHAPEL ROAD", type: "property", group: "brown", price: 60, rent: 4, houses: 0, hotels: 0, ownerId: null },
    { id: 4, name: "INCOME TAX", type: "tax", cost: 200, group: "tax" },
    { id: 5, name: "KING'S CROSS STATION", type: "railroad", group: "railroad", price: 200, rent: 25, ownerId: null },
    { id: 6, name: "THE ANGEL, ISLINGTON", type: "property", group: "lightblue", price: 100, rent: 6, houses: 0, hotels: 0, ownerId: null },
    { id: 7, name: "CHANCE", type: "card", action: "draw-chance", group: "white" },
    { id: 8, name: "EUSTON ROAD", type: "property", group: "lightblue", price: 100, rent: 6, houses: 0, hotels: 0, ownerId: null },
    { id: 9, name: "PENTONVILLE ROAD", type: "property", group: "lightblue", price: 120, rent: 8, houses: 0, hotels: 0, ownerId: null },

    // left-end
    { id: 10, name: "JAIL", type: "corner", action: "visit-jail", group: "jail" },
    { id: 11, name: "PALL MALL", type: "property", group: "pink", price: 140, rent: 10, houses: 0, hotels: 0, ownerId: null },
    { id: 12, name: "ELECTRIC COMPANY", type: "utility", group: "utility", price: 150, rent: 4, ownerId: null },
    { id: 13, name: "WHITEHALL", type: "property", group: "pink", price: 140, rent: 10, houses: 0, hotels: 0, ownerId: null },
    { id: 14, name: "NORTHUMB'ND AVENUE", type: "property", group: "pink", price: 160, rent: 12, houses: 0, hotels: 0, ownerId: null },
    { id: 15, name: "MARYLEBONE STATION", type: "railroad", group: "railroad", price: 200, rent: 25, ownerId: null },
    { id: 16, name: "BOW STREET", type: "property", group: "orange", price: 180, rent: 14, houses: 0, hotels: 0, ownerId: null },
    { id: 17, name: "COMMUNITY CHEST", type: "card", action: "draw-community", group: "white" },
    { id: 18, name: "MARLBOROUGH STREET", type: "property", group: "orange", price: 180, rent: 14, houses: 0, hotels: 0, ownerId: null },
    { id: 19, name: "VINE STREET", type: "property", group: "orange", price: 200, rent: 16, houses: 0, hotels: 0, ownerId: null },

    // top-end
    { id: 20, name: "FREE PARKING", type: "corner", action: "free-parking", group: "free-parking" },
    { id: 21, name: "THE STRAND", type: "property", group: "red", price: 220, rent: 18, houses: 0, hotels: 0, ownerId: null },
    { id: 22, name: "CHANCE", type: "card", action: "draw-chance", group: "white" },
    { id: 23, name: "FLEET STREET", type: "property", group: "red", price: 220, rent: 18, houses: 0, hotels: 0, ownerId: null },
    { id: 24, name: "TRAFALGAR SQUARE", type: "property", group: "red", price: 240, rent: 20, houses: 0, hotels: 0, ownerId: null },
    { id: 25, name: "FENCHURCH ST STATION", type: "railroad", group: "railroad", price: 200, rent: 25, ownerId: null },
    { id: 26, name: "LEICESTER SQUARE", type: "property", group: "yellow", price: 260, rent: 22, houses: 0, hotels: 0, ownerId: null },
    { id: 27, name: "COVENTRY STREET", type: "property", group: "yellow", price: 260, rent: 22, houses: 0, hotels: 0, ownerId: null },
    { id: 28, name: "WATER WORKS", type: "utility", group: "utility", price: 150, rent: 4, ownerId: null },
    { id: 29, name: "PICCADILLY", type: "property", group: "yellow", price: 280, rent: 24, houses: 0, hotels: 0, ownerId: null },

    // right-end
    { id: 30, name: "GO TO JAIL", type: "corner", action: "go-to-jail", group: "go-to-jail" },
    { id: 31, name: "REGENT STREET", type: "property", group: "green", price: 300, rent: 26, houses: 0, hotels: 0, ownerId: null },
    { id: 32, name: "OXFORD STREET", type: "property", group: "green", price: 300, rent: 26, houses: 0, hotels: 0, ownerId: null },
    { id: 33, name: "COMMUNITY CHEST", type: "card", action: "draw-community", group: "white" },
    { id: 34, name: "BOND STREET", type: "property", group: "green", price: 320, rent: 28, houses: 0, hotels: 0, ownerId: null },
    { id: 35, name: "LIVERPOOL STREET STATION", type: "railroad", group: "railroad", price: 200, rent: 25, ownerId: null },
    { id: 36, name: "CHANCE", type: "card", action: "draw-chance", group: "white" },
    { id: 37, name: "PARK LANE", type: "property", group: "darkblue", price: 350, rent: 35, houses: 0, hotels: 0, ownerId: null },
    { id: 38, name: "SUPER TAX", type: "tax", cost: 200, group: "tax" },
    { id: 39, name: "MAYFAIR", type: "property", group: "darkblue", price: 400, rent: 50, houses: 0, hotels: 0, ownerId: null }
];

const PROPERTY_TILE = `
    <div class="tile [--tile-space--] property [--tile-rotation--]">
        <div class="color-bar" style="background-color: [--tile-color--];"></div>
    
        <div class="property-content">
            <div class="text tile-name">[--tile-name--]</div>
            <div class="text tile-price">₩[--tile-price--]</div>
        </div>
    </div>
`;

const RAILROAD_TILE = `
    <div class="tile [--tile-space--] railroad [--tile-rotation--]">
        <div class="non-property-content">
            <div class="text tile-name">[--tile-name--]</div>
                <svg>
                    <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
                </svg>
            <div class="text tile-price">₩[--tile-price--]</div>
        </div>
    </div>
`;

const UTILITY_TILE = `
    <div class="tile [--tile-space--] utility [--tile-rotation--]">
        <div class="non-property-content">
            <div class="text tile-name">[--tile-name--]</div>
            <svg>
                <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
            </svg>
            <div class="text tile-price">₩[--tile-price--]</div>
        </div>
    </div>
`;

const CARD_TILE = `
    <div class="tile [--tile-space--] utility [--tile-rotation--]">
        <div class="non-property-content">
            <div class="text tile-name">[--tile-name--]</div>
            <svg>
                <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
            </svg>
        </div>
    </div>
`;

const TAX_TILE = `
    <div class="tile [--tile-space--] tax [--tile-rotation--]">
        <div class="non-property-content">
            <div class="text tax-label">[--tile-name--]</div>
            <svg>
                <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
            </svg>
            <div class="text tile-price">₩[--tile-price--]</div>
        </div>
    </div>
`;

const CORNER_TILE = `
    <div class="corner [--tile-space--]">
        <div class="non-property-content">
            <div class="text tile-name">[--tile-name--]</div>
            <svg>
                <rect x="50%" y="50%" width="2vh" height="2vh" fill="red"/>
            </svg>
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