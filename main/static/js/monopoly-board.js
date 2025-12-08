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
    { id: 1, name: "Old Kent Road", type: "property", group: "brown", price: 60, rent: 2, houses: 0, hotels: 0, ownerId: null },
    { id: 2, name: "Community Chest", type: "card", action: "draw-community", group: "white" },
    { id: 3, name: "Whitechapel Road", type: "property", group: "brown", price: 60, rent: 4, houses: 0, hotels: 0, ownerId: null },
    { id: 4, name: "Income Tax", type: "tax", cost: 200, group: "tax" },
    { id: 5, name: "King's Cross Station", type: "railroad", group: "railroad", price: 200, rent: 25, ownerId: null },
    { id: 6, name: "The Angel, Islington", type: "property", group: "lightblue", price: 100, rent: 6, houses: 0, hotels: 0, ownerId: null },
    { id: 7, name: "Chance", type: "card", action: "draw-chance", group: "white" },
    { id: 8, name: "Euston Road", type: "property", group: "lightblue", price: 100, rent: 6, houses: 0, hotels: 0, ownerId: null },
    { id: 9, name: "Pentonville Road", type: "property", group: "lightblue", price: 120, rent: 8, houses: 0, hotels: 0, ownerId: null },

    // left-end
    { id: 10, name: "Jail", type: "corner", action: "visit-jail", group: "jail" },
    { id: 11, name: "Pall Mall", type: "property", group: "pink", price: 140, rent: 10, houses: 0, hotels: 0, ownerId: null },
    { id: 12, name: "Electric Company", type: "utility", group: "utility", price: 150, rent: 4, ownerId: null },
    { id: 13, name: "Whitehall", type: "property", group: "pink", price: 140, rent: 10, houses: 0, hotels: 0, ownerId: null },
    { id: 14, name: "Northumberland Avenue", type: "property", group: "pink", price: 160, rent: 12, houses: 0, hotels: 0, ownerId: null },
    { id: 15, name: "Marylebone Station", type: "railroad", group: "railroad", price: 200, rent: 25, ownerId: null },
    { id: 16, name: "Bow Street", type: "property", group: "orange", price: 180, rent: 14, houses: 0, hotels: 0, ownerId: null },
    { id: 17, name: "Community Chest", type: "card", action: "draw-community", group: "white" },
    { id: 18, name: "Marlborough Street", type: "property", group: "orange", price: 180, rent: 14, houses: 0, hotels: 0, ownerId: null },
    { id: 19, name: "Vine Street", type: "property", group: "orange", price: 200, rent: 16, houses: 0, hotels: 0, ownerId: null },

    // top-end
    { id: 20, name: "Free Parking", type: "corner", action: "free-parking", group: "free-parking" },
    { id: 21, name: "The Strand", type: "property", group: "red", price: 220, rent: 18, houses: 0, hotels: 0, ownerId: null },
    { id: 22, name: "Chance", type: "card", action: "draw-chance", group: "white" },
    { id: 23, name: "Fleet Street", type: "property", group: "red", price: 220, rent: 18, houses: 0, hotels: 0, ownerId: null },
    { id: 24, name: "Trafalgar Square", type: "property", group: "red", price: 240, rent: 20, houses: 0, hotels: 0, ownerId: null },
    { id: 25, name: "Fenchurch St Station", type: "railroad", group: "railroad", price: 200, rent: 25, ownerId: null },
    { id: 26, name: "Leicester Square", type: "property", group: "yellow", price: 260, rent: 22, houses: 0, hotels: 0, ownerId: null },
    { id: 27, name: "Coventry Street", type: "property", group: "yellow", price: 260, rent: 22, houses: 0, hotels: 0, ownerId: null },
    { id: 28, name: "Water Works", type: "utility", group: "utility", price: 150, rent: 4, ownerId: null },
    { id: 29, name: "Piccadilly", type: "property", group: "yellow", price: 280, rent: 24, houses: 0, hotels: 0, ownerId: null },

    // right-end
    { id: 30, name: "Go To Jail", type: "corner", action: "go-to-jail", group: "go-to-jail" },
    { id: 31, name: "Regent Street", type: "property", group: "green", price: 300, rent: 26, houses: 0, hotels: 0, ownerId: null },
    { id: 32, name: "Oxford Street", type: "property", group: "green", price: 300, rent: 26, houses: 0, hotels: 0, ownerId: null },
    { id: 33, name: "Community Chest", type: "card", action: "draw-community", group: "white" },
    { id: 34, name: "Bond Street", type: "property", group: "green", price: 320, rent: 28, houses: 0, hotels: 0, ownerId: null },
    { id: 35, name: "Liverpool Street Station", type: "railroad", group: "railroad", price: 200, rent: 25, ownerId: null },
    { id: 36, name: "Chance", type: "card", action: "draw-chance", group: "white" },
    { id: 37, name: "Park Lane", type: "property", group: "darkblue", price: 350, rent: 35, houses: 0, hotels: 0, ownerId: null },
    { id: 38, name: "Super Tax", type: "tax", cost: 100, group: "tax" },
    { id: 39, name: "Mayfair", type: "property", group: "darkblue", price: 400, rent: 50, houses: 0, hotels: 0, ownerId: null }
];

function getOrientationClass(tile) {
    if (tileId >= 11 && tileId <= 19) {
        return 'rotation-90'
    }
    if (tileId >= 21 && tileId <= 29) {
        return 'rotation-180'
    }
    if (tileId >= 31 && tileId <= 39) {
        return 'rotation-270'
    }
    return 'rotation-0'
}