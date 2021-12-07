let deckID;

window.addEventListener('load', function() {
    deckID = localStorage.getItem('deckID')

    if (!deckID) {
        // get a new shuffled deck
        getNewDeck()
        .then(json=>{
            deckID = json.deck_id;
            localStorage.setItem('deckID',json.deck_id);
        })
    }
})

const MAX_BET = 100,
    BET_OPERATION_INTERVAL = 100,
    BET_INTERVAL_FREQUENCY = 5,
    BLACKJACK = 21,
    DEALER_MSG_TIMEOUT = 2000,
    BACK_OF_CARD_PATH = 'assets/images/back-of-card-small.jpg'; 

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
        map.set(document.getElementById('dealer'), new Cards())
        this.betBoxes = map
    },
}

// first element in the list is always the dealer box
gameState.resetBetBoxes()

function Cards () {
    this.cards = []
}

Cards.prototype.push = function (card) {
    this.cards.push(card)
}

Cards.prototype.addCard = function (cb) {
    drawCards(1).then(resp=>{
        this.cards.push(resp.cards[0])
        return resp.cards[0]
    }).then(cb)
}

Cards.prototype.cardsValue = function () {
    // reduce cards to an object where card values are summed and aces are sorted separately
    const {fixedValue, aces} = this.cards
    .reduce((sortedCards,card)=>{
        const value = gameProperties.getCardGameValue(card.value)
        if (typeof value === 'number') sortedCards.fixedValue += value
        else sortedCards.aces.push(card)
        return sortedCards
    },{fixedValue:0,aces:[]})
    
    let cardsValue = fixedValue
    
    // only add high ace value if it is not over BLACKJACK value
    aces.forEach(ace=>cardsValue += 
        aces.length+10+cardsValue > BLACKJACK ? 1 : 11)
        
    return cardsValue
}

const gameProperties = {
    // This is a list of card values that the api will return for each card
    cardNameValues: ["ACE","2","3","4","5","6","7","8","9","10","JACK","QUEEN","KING"],
    highCards: ["JACK","QUEEN","KING"],
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
        initEvaluationPhase()
    })
}

function getPlayBoxesDirection() {
    return [...document.getElementsByClassName('betting-box')]
    .reverse().filter(betBox=>gameState.betBoxes.has(betBox))
}

function dealCards(docAPI) {
    // The dealer deals from their left ("first base") to their far right ("third base")
    const betBoxes = getPlayBoxesDirection()
    // Single cards are dealt to each wagered-on position clockwise from the dealer's left, followed by a single
    // card to the dealer, followed by an additional card to each of the positions in play.
    betBoxes.push(document.getElementById('dealer'))

    const cards = docAPI.cards
    
    for (let i = 0; i < cards.length-1; i++) {
        const betBox = betBoxes[i % betBoxes.length]
        addCardImage(betBox, cards[i])
        
        let boxState
        if (boxState = gameState.betBoxes.get(betBox)) 
            boxState.push(cards[i])
        else
        throw new TypeError('Bet box does not exist!')
        
        updateCardsGameValue(betBox)
    }

    // dealer last card face-down
    const betBox = betBoxes[betBoxes.length-1]
    const div = document.createElement('span')
    div.innerHTML = `<img src="${BACK_OF_CARD_PATH}" id="face-down">
<img src="${cards[cards.length-1].image}" id="face-up" hidden>`

    betBox.getElementsByClassName('card-list')[0].appendChild(div)

    gameState.dealerFaceDownCard = cards[cards.length-1]
}
    
function initEvaluationPhase() {
    loadEvaluationPhase()
    gameState.continuePhase()
    const betBoxes = getPlayBoxesDirection()
    
    gameState.betBoxIterator = betBoxes.values()
    document.getElementById('player-action').addEventListener('click', handlePlayerAction)
    
    selectNextBox()
}

function selectNextBox() {
    gameState.currentBetBox = gameState.betBoxIterator.next()
    if (gameState.currentBetBox.done) {
        console.log('Now run the dealer turn')
    } else {
        runEvaluation()
    }
}

function runEvaluation() {
    const evalResult = evaluateBox(gameState.currentBetBox.value)
    if (typeof evalResult === 'boolean') {
        dealerResponse(evalResult)
        showDealerMsg()
        setTimeout(()=>{
            selectNextBox()
        ,DEALER_MSG_TIMEOUT})
    } else {
        setPlayerActions(evalResult)
    }
}

function setPlayerActions(availableActions) {
    for (const action of availableActions) {
        const actionElem = document.getElementById(action)
        actionElem.style.visibility = 'visible'
    }
}

function resetPlayerActions() {
    for (const actionElem of document.getElementById('player-action').children) {
        actionElem.style.visibility = 'hidden'
    }
}

function handlePlayerAction(ev) {
    console.log('clicked on', ev.target.id)
    if (!action.hasOwnProperty(ev.target.id)) {
        console.error('Miss clicked action')
        return
    }
    action[ev.target.id](()=>{
        resetPlayerActions()
        runEvaluation()
    })
    console.log('should remove unused event listeners')
}

const action = {
    hit: function(cb){
        drawCards().then(resp=>{
            const card = resp.cards[0]
            const betBox = gameState.currentBetBox.value
            const boxState = gameState.betBoxes.get(betBox)

            addCardImage(betBox, card)
            boxState.push(card)
            updateCardsGameValue(betBox)
        }).then(cb)
    },
    stand: function(cb){},
    double: function(cb){},
    split: function(cb){},
    surrender: function(cb){}
}

/**
 * @param {HTMLDivElement} betBox 
 * @returns {Array|Boolean} available player actions id list or false on bust, true on win
 */
function evaluateBox(betBox) {
    const thisBox = gameState.betBoxes.get(betBox)
    const isFirstAction = thisBox.cards.length === 2
    const cardsValue = thisBox.cardsValue()
    const playerActions = ["hit","stand","double","split","surrender"]
    if (cardsValue > BLACKJACK) {
        return false
    } else if (cardsValue === BLACKJACK) {
        return true
    } else {
        if (isFirstAction) {
            if (thisBox.cards[0].value !== thisBox.cards[1].value)
                playerActions.splice(playerActions.indexOf('split'),1)
            return playerActions
        } else 
            return playerActions.slice(0,2)
    }
}

function dealerResponse(isWin) {
    const dealerMsg = document.getElementById('dealer-message')
    if (isWin) {
        dealerMsg.innerText = 'Blackjack!'
    } else {
        dealerMsg.innerText = 'That\'s a Bust!'
    }
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
    const dealerMsg = document.getElementById('dealer-message')
    dealerMsg.innerText = 'Place your bets please'
    showDealerMsg()
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

function updateCardsGameValue(betBox) {
    const cardsValueWrapper = betBox.getElementsByClassName('cards-value')[0]
    cardsValueWrapper.innerText = gameState.betBoxes.get(betBox).cardsValue()
}

function addCardImage(betBox, apiCardObject) {
    betBox.getElementsByClassName('card-list')[0].innerHTML += 
    `<img src="${apiCardObject.image}">`
}

// evaluation phase
function loadEvaluationPhase() {
    document.getElementById('player-action').style.visibility = 'visible'
}

function unloadEvaluationPhase() {
    document.getElementById('player-action').style.visibility = 'hidden'
}

function showDealerMsg() {
    document.getElementById('dealer-message').style.visibility = 'visible'
}

function hideDealerMsg() {
    document.getElementById('dealer-message').style.visibility = 'hidden'
}
// _________________________________

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
        gameState.betBoxes.set(closure.betBox, new Cards())
    } else {
        gameState.betBoxes.delete(closure.betBox)
    }
}

function betOperation (closure) {
    let {betBox, pot, betButton:{dataset:{type}}, recursionCount:count} = closure
    let potValue = gameState.player.getPot(betBox)
    if (!potValue && potValue !== 0) {
        console.error('Something went terribly wrong with bet value: ', potValue)
        potValue = 0;
    }
    const operandValue = Math.ceil(count/BET_INTERVAL_FREQUENCY)
    switch (type) {
        case 'add':
            if (potValue + operandValue >= MAX_BET) {
                gameState.player.addToPot(betBox, MAX_BET-potValue)
                closure.isPressed = false
            } else {
                gameState.player.addToPot(betBox, operandValue)
            }
            break
        case 'sub':
            if (potValue - operandValue <= 0) {
                gameState.player.addToPot(betBox, -operandValue)
                gameState.player.removePot(betBox)
                closure.isPressed = false
            } else {
                gameState.player.addToPot(betBox, -operandValue)
            }
            break
        default: throw new Error('No such operation.')
    }

    document.getElementById('player-cash').innerText = gameState.player.cash

    pot.innerText = gameState.player.getPot(betBox) || ''
} 