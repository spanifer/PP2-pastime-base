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
    BET_OPERATION_INTERVAL = 100;

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

// betting event listener
for (const betButtons of document.getElementsByClassName('bet')) {
    for (const betButton of betButtons.children) {

        const betBox = betButton.parentElement.parentElement
        const pot = betBox.getElementsByClassName('pot')[0]
        const closure = {
            pot: pot,
            betButton: betButton,
            isPressed: false
        }

        betButton.addEventListener('pointerdown', mousedownEvHandler.bind(null, closure))
        betButton.addEventListener('pointerup', mouseupEvHandler.bind(null, closure))
        betButton.addEventListener('pointerleave', mouseupEvHandler.bind(null, closure))
    }
}

function mousedownEvHandler (closure) {
    if (!parseInt(closure.pot.innerText)) closure.pot.innerText = 1;
    closure.isPressed = true;
    function executeOperation() {
        if (closure.isPressed) {
            betOperation(closure)
            setTimeout(executeOperation,BET_OPERATION_INTERVAL)
        }
    }
    executeOperation()
}

function mouseupEvHandler (closure) {
    if (!parseInt(closure.pot.innerText)) closure.pot.innerText = '';
    closure.isPressed = false;
}

function betOperation ({pot, betButton:{dataset:{type}}}) {
    let value = parseInt(pot.innerText)
    if (!value && value !== 0) {
        console.error('Something went terribly wrong with bet value: ', value)
        value = 0;
    }
    switch (type) {
        case 'add': if (value >= MAX_BET) break; 
            pot.innerText = ++value;
            break;
        case 'sub': if (value <= 0) break;
            pot.innerText = --value;
            break;
        default: throw new Error('No such operation.')
    }
} 