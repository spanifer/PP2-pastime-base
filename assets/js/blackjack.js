let deckID;

window.addEventListener('load', async function() {
    deckID = localStorage.getItem('deckID')

    if (!deckID) {
        // get a new shuffled deck
        await fetchFromAPI('new/shuffle/?deck_count=1')
        .then(json=>{
            deckID = json.deck_id;
            localStorage.setItem('deckID',json.deck_id);
        })
    }

    displayCard()
})

async function displayCard() {
    const response = await drawCard()
    console.log(response)

    const cardImageURL = response.cards[0].image

    const cardWrapper = document.getElementById('betting-area').firstElementChild.firstElementChild

    const cardImg = document.createElement('img')
    cardImg.src = cardImageURL

    cardWrapper.appendChild(cardImg)

    console.log(await returnCard())
}