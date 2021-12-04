let deckID;

window.addEventListener('load', async function() {
    deckID = localStorage.getItem('deckID')

    if (!deckID) {
        // get a new shuffled deck
        await getNewDeck()
        .then(json=>{
            deckID = json.deck_id;
            localStorage.setItem('deckID',json.deck_id);
        })
    }
})

// Game rules
const MAX_BET = 100,
    BET_OPERATION_INTERVAL = 100,
    BET_INTERVAL_FREQUENCY = 8,
    BLACKJACK = 21

const gameState = {
    phase: -1,
    acceptedPhases: ['betting', 'dealing', 'evaluate', 'conclude'],
    player : new Player({cash:250}),
    continuePhase: function () {
        if (++this.phase >= this.acceptedPhases.length) this.phase = 0;
    },
    getPhase: function () {
        return this.acceptedPhases[this.phase]
    },
    resetBetBoxes: function (){
        const map = new Map()
        map.set(document.getElementById('dealer'),[])
        this.betBoxes = map
    },
}

gameState.resetBetBoxes()

const gameProperties = {
    // This is a list of card values that the api will return for each card
    cardNameValues: ["ACE","2","3","4","5","6","7","8","9","10","JACK","QUEEN","KING"],
    highCards: gameProperties.cardNameValues.slice(10),
    getCardGameValue: function(cardName) {
        let val;
        if (val = parseInt(cardName)) return val;
        if (this.highCards.includes(cardName)) return 10;
        else return [1,11]
    },
}

// Game Course methods and initiators
// __________________________________
function advanceBettingPhase() {
    if (gameState.betBoxes.size < 2) throw new Error('Should not be able to advance betting phase')
    gameState.continuePhase()
    unloadBettingPhase()
    loadDealingPhase()
    initDealingPhase()
}

function initDealingPhase() {
    drawCards(gameState.betBoxes.size * 2)
    .then(apiResponse => {
        if (!apiResponse.success) throw new Error('Something is not right with the drawn cards. ')
        dealCards(apiResponse)
    })
}

function dealCards(docAPI) {
    // The dealer deals from their left ("first base") to their far right ("third base")
    const betBoxes = [...document.getElementsByClassName('betting-box')]
    .reverse().filter(betBox=>gameState.betBoxes.has(betBox))
    // Single cards are dealt to each wagered-on position clockwise from the dealer's left, followed by a single
    // card to the dealer, followed by an additional card to each of the positions in play.
    betBoxes.push(document.getElementById('dealer'))

    for (const [i,card] of docAPI.cards.entries()) {
        const betBox = betBoxes[i % betBoxes.length]
        const img = document.createElement('img')
        img.src = card.image
        betBox.getElementsByClassName('card-list')[0].appendChild(img)

        let {code,suit,value} = card;
        let boxState
        if (boxState = gameState.betBoxes.get(betBox)) 
            gameState.betBoxes.set(betBox, [...boxState, {
                code, suit, value
            }])
        else
            throw new TypeError('Bet box does not exist!')

        updateCardsGameValue(betBox)
    }
}

/**
 * Temporarily this function handles the dealt cards value evaluation as well
 * @param {HTMLDivElement} betBox - with the 'betting-box' class name
 * @note ace value is either 1 or 11 according to the player choice, so it can be calculated automatically, player cannot just decide hes bust
 * @todo divide and refactor according the method affiliation
 */
function updateCardsGameValue(betBox) {
    const cardsValueWrapper = betBox.getElementsByClassName('cards-value')[0]
    const cards = gameState.betBoxes.get(betBox)

    const {f:fixedValues, a:aces} = cards
        .reduce((p,c)=>{
            const value = gameProperties.getCardGameValue(c.value)
            if (typeof value === 'number') p.f += value
            else p.a.push(c)
            return p
        },{f:0,a:[]})

    let cardsValues = fixedValues

    aces.forEach(ace=>cardsValues += 
        aces.length-1+11+cardsValues > BLACKJACK ? 1 : 11)

    cardsValueWrapper.innerText = cardsValues
}
// _________________________________

// Game UI modifiers
// _________________________________
// allow player to place bets on betting phase
function loadBettingPhase() {
    const betButtons = document.getElementsByClassName('bet')
    for (const buttonsWrapper of betButtons) {
        buttonsWrapper.classList.add('allow-bet')
    }
}
// disable bets
function unloadBettingPhase() {
    const betButtons = document.getElementsByClassName('bet')
    for (const buttonsWrapper of betButtons) {
        buttonsWrapper.classList.remove('allow-bet')
    }
}

function loadDealingPhase() {
    document.getElementById('dealer-message').style.visibility = 'hidden'
    document.getElementById('start-button').style.visibility = 'hidden'
}


// evaluation phase
function loadEvaluationPhase() {
    document.getElementById('player-action').style.visibility = 'visible'
}

function unloadEvaluationPhase() {
    document.getElementById('player-action').style.visibility = 'hidden'
}

// TODO event listeners should invoke game state modifier functions, and those should invoke UI mutation methods
// set up placing-bet event listeners
for (const betButtons of document.getElementsByClassName('bet')) {
    for (const betButton of betButtons.children) {

        const betBox = betButton.parentElement.parentElement
        const pot = betBox.getElementsByClassName('pot')[0]
        const closure = {
            betBox: betBox,
            pot: pot,
            betButton: betButton,
            isPressed: false
        }

        // make sure not to set listeners multiple times
        if (betButton.dataset.listener !== 'set') {
            betButton.addEventListener('pointerdown', mousedownEvHandler.bind(null, closure))
            betButton.addEventListener('pointerup', mouseupEvHandler.bind(null, closure))
            betButton.addEventListener('pointerleave', mouseupEvHandler.bind(null, closure))
        }
        betButton.dataset.listener = 'set'
    }
}

function mousedownEvHandler (closure) {
    let potValue, {betBox} = closure
    if (!(potValue = gameState.player.getPot(betBox))) {
        gameState.player.addPot(betBox, 0)
        potValue = 0;
    }

    closure.isPressed = true;
    closure.recursionCount = 1;

    // call recursively until mouseup event (or limit value changed in betOperation) changes the isPressed variable
    function executeOperation() {
        if (closure.isPressed) {
            betOperation(closure)
            closure.recursionCount++
            setTimeout(executeOperation,BET_OPERATION_INTERVAL)
        }
    }
    executeOperation()
}

function mouseupEvHandler (closure) {
    closure.isPressed = false;
    closure.recursionCount = null;
    if (gameState.player.getPot(closure.betBox)) {
        gameState.betBoxes.set(closure.betBox, [])
    } else {
        gameState.betBoxes.delete(closure.betBox)
    }
}

function betOperation (closure) {
    let {betBox, pot, betButton:{dataset:{type}}, recursionCount:count} = closure
    let value = gameState.player.getPot(betBox)
    if (!value && value !== 0) {
        console.error('Something went terribly wrong with bet value: ', value)
        value = 0;
    }
    switch (type) {
        case 'add':
            value += Math.ceil(count/BET_INTERVAL_FREQUENCY)
            if (value >= MAX_BET) {
                pot.innerText = MAX_BET
                gameState.player.addPot(betBox, MAX_BET)
                closure.isPressed = false
            } else {
                gameState.player.addPot(betBox, value)
                pot.innerText = value
            }
            break
        case 'sub':
            value -= Math.ceil(count/BET_INTERVAL_FREQUENCY)
            if (value <= 0) {
                pot.innerText = ''
                gameState.player.removePot(betBox)
                closure.isPressed = false
            } else {
                gameState.player.addPot(betBox, value)
                pot.innerText = value
            }
            break
        default: throw new Error('No such operation.')
    }
} 