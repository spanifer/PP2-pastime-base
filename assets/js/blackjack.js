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
        if (++this.phase > this.acceptedPhases.length) this.phase = 0;
    },
    getPhase: function () {
        return this.acceptedPhases[this.phase]
    }
}

// allow player to place bets on betting phase
function loadBettingPhase() {
    const betBoxes = document.getElementsByClassName('bet')
    for (const betBox of betBoxes) {
        betBox.classList.add('allow-bet')
    }
}

function unloadBettingPhase() {
    const betBoxes = document.getElementsByClassName('bet')
    for (const betBox of betBoxes) {
        betBox.classList.remove('allow-bet')
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
                break
            } else {
                PLAYER.addPot(betBox, value)
                pot.innerText = value
            }
            break
        default: throw new Error('No such operation.')
    }
} 