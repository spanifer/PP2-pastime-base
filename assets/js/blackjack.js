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

    returnCards()
})

async function displayCard() {

    const response = await drawCards(3)
    console.log(response)

    const cardsWrapper = document.getElementById('betting-area').firstElementChild.firstElementChild

    for (const card of response.cards) {

        const cardImageURL = card.image

        const cardImg = document.createElement('img')
        cardImg.src = cardImageURL

        const cardWrapper = document.createElement('div')
        cardWrapper.classList.add('playing-card')

        cardWrapper.appendChild(cardImg)
        cardsWrapper.appendChild(cardWrapper)
    }
}
