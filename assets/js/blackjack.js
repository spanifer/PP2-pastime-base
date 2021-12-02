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

        betButton.addEventListener('mousedown', mousedownEvHandler.bind(null, closure))
        betButton.addEventListener('mouseup', mouseupEvHandler.bind(null, closure))
        betButton.addEventListener('mouseleave', mouseupEvHandler.bind(null, closure))
    }
}

function mousedownEvHandler (closure) {
    if (!parseInt(closure.pot.innerText)) closure.pot.innerText = 1;
    closure.isPressed = true;
    function executeOperation() {
        if (closure.isPressed) {
            switch (closure.betButton.dataset.type) {
                case 'add': console.log('add'); break;
                case 'sub': console.log('sub'); break;
                default: throw new Error('No such operation.')
            }
            setTimeout(executeOperation,BET_OPERATION_INTERVAL)
        }
    }
    executeOperation()
}

function mouseupEvHandler (closure) {
    if (!parseInt(closure.pot.innerText)) closure.pot.innerText = '';
    closure.isPressed = false;
}