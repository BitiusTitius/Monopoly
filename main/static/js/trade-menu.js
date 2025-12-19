import { PARTY_CODE, PLAYER_UUID } from "./game";

function tradeMenuMessage(message, type, duration) {

}

async function renderToGiveMenu(bills, properties) {
    const toGiveMenu = document.getElementById('to-give')
    toGiveMenu.innerHTML = '';

    if (!bills) {
        console.log('No bills data to render.');
        return;
    }

    if (!properties) {
        console.log('No properties data to render.');
        return;
    }
}