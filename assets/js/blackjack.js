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
    PLAYER = new Player({cash:200})

const gameState = {
    phase: -1,
    acceptedPhases: ['betting', 'dealing', 'evaluate', 'conclude'],
    continuePhase: function () {
        if (++this.phase >= this.acceptedPhases.length) this.phase = 0;
    },
    getPhase: function () {
        return this.acceptedPhases[this.phase]
    },
    betBoxes: new Map(),
    // IIFE       👇
    dealerBox: function (){
        const map = new Map()
        map.set(document.getElementById('dealer'),[])
        return map
    }(),
    advanceBettingPhase: function () {
        if (! this.betBoxes.size) throw new Error('Should not be able to advance betting phase')
        this.continuePhase()
        unloadBettingPhase()
        loadDealingPhase()
    },
    initDealingPhase: function () {
        drawCards(gameState.betBoxes.size * 2 + 2)
        .then(apiResponse => {
            if (!apiResponse.success) throw new Error('Something is not right with the drawn cards. ')
            dealCards(apiResponse)
        })
    }
}

// allow player to place bets on betting phase
function loadBettingPhase() {
    const betButtons = document.getElementsByClassName('bet')
    for (const buttonsWrapper of betButtons) {
        buttonsWrapper.classList.add('allow-bet')
    }
}

function unloadBettingPhase() {
    const betButtons = document.getElementsByClassName('bet')
    for (const buttonsWrapper of betButtons) {
        buttonsWrapper.classList.remove('allow-bet')
    }
}

function loadDealingPhase() {
    document.getElementById('dealer-message').style.visibility = 'hidden'
    document.getElementById('start-button').style.visibility = 'hidden'
    gameState.initDealingPhase()
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
        else if (boxState = gameState.dealerBox.get(betBox)) {
            gameState.dealerBox.set(betBox, [...boxState, {
                code, suit, value
            }])
        } else {
            throw new TypeError('Bet box does not exist!')
        }
    }
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
    // if (!parseInt(closure.pot.innerText)) closure.pot.innerText = 1;
    let potValue, {betBox} = closure
    if (!(potValue = PLAYER.getPot(betBox))) {
        PLAYER.addPot(betBox, 0)
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
    if (PLAYER.getPot(closure.betBox)) {
        gameState.betBoxes.set(closure.betBox, [])
    } else {
        gameState.betBoxes.delete(closure.betBox)
    }
}

function betOperation (closure) {
    let {betBox, pot, betButton:{dataset:{type}}, recursionCount:count} = closure
    let value = PLAYER.getPot(betBox)
    if (!value && value !== 0) {
        console.error('Something went terribly wrong with bet value: ', value)
        value = 0;
    }
    switch (type) {
        case 'add':
            value += Math.ceil(count/BET_INTERVAL_FREQUENCY)
            if (value >= MAX_BET) {
                pot.innerText = MAX_BET
                PLAYER.addPot(betBox, MAX_BET)
                closure.isPressed = false
            } else {
                PLAYER.addPot(betBox, value)
                pot.innerText = value
            }
            break
        case 'sub':
            value -= Math.ceil(count/BET_INTERVAL_FREQUENCY)
            if (value <= 0) {
                pot.innerText = ''
                PLAYER.removePot(betBox)
                closure.isPressed = false
            } else {
                PLAYER.addPot(betBox, value)
                pot.innerText = value
            }
            break
        default: throw new Error('No such operation.')
    }
} 