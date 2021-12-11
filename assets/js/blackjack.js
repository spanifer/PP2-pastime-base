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

    resetPlayerActions()
    resetGame()
})

const MAX_BET = 100,
    BET_OPERATION_INTERVAL = 100,
    BET_INTERVAL_FREQUENCY = 5,
    BLACKJACK = 21,
    DEALER_MSG_TIMEOUT = 2000,
    TOGGLE_MSG_INTERVAL = 300,
    DEALING_TIMEOUT = 500,
    BACK_OF_CARD_PATH = 'assets/images/back-of-card-small.jpg';

const gameState = {
    phase: -1,
    acceptedPhases: ['betting', 'dealing', 'evaluate', 'conclude'],
    player : new Player({cash:250}),
    continuePhase: function () {
        if (++this.phase >= this.acceptedPhases.length) this.phase = 0;
        document.getElementById('game-wrapper').dataset.phase = this.getPhase()
    },
    getPhase: function () {
        return this.acceptedPhases[this.phase]
    },
    betBoxes: new Map(),
    resetBetBoxes: function (){
        this.betBoxes.clear()
        this.betBoxes.set(document.getElementById('dealer'), new Cards())
    },
}

// first element in the list is always the dealer box
gameState.resetBetBoxes()

function Cards () {
    this.cards = []
    this.currentCardsValue = 0
    this.cardsValueChanged = false
}

Cards.prototype.push = function (card) {
    this.cards.push(card)
    this.cardsValueChanged = true
}

Cards.prototype.addCard = function (cb) {
    drawCards(1).then(resp=>{
        this.cards.push(resp.cards[0])
        this.cardsValueChanged = true
        return resp.cards[0]
    }).then(cb)
}

Cards.prototype.cardsValue = function () {
    if (! this.cardsValueChanged) return this.currentCardsValue
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
    
    this.currentCardsValue = cardsValue
    this.cardsValueChanged = false
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
    if (gameState.betBoxes.size < 2) {
        dealerMsgEmphasize()
        return 
    }
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

function getPlayBoxesDirection() {
    return [...document.getElementsByClassName('betting-box')]
    .reverse().filter(betBox=>gameState.betBoxes.has(betBox))
}

function dealCards(docAPI) {

    const betBoxes = getPlayBoxesDirection()

    betBoxes.push(document.getElementById('dealer'))

    const cards = docAPI.cards

    const cardIter = cards.entries()

    dealNextCard()

    function dealNextCard() {

        const [i, card] = cardIter.next().value
        if (i === docAPI.cards.length - 1) {
            dealerFaceDownCard()
            return
        }

        const betBox = betBoxes[i % betBoxes.length]
        addCardImage(betBox, card)
        
        let boxState
        if (boxState = gameState.betBoxes.get(betBox)) 
            boxState.push(card)
        else
        throw new TypeError('Bet box does not exist!')
        
        updateCardsGameValue(betBox)

        setTimeout(dealNextCard,DEALING_TIMEOUT)

    }

    function dealerFaceDownCard() {

        // dealer last card face-down
        const betBox = betBoxes[betBoxes.length-1]
        const div = document.createElement('div')
        div.classList.add('two-faced', 'playing-card')
        div.innerHTML = `<img src="${BACK_OF_CARD_PATH}" class="face-down"  alt="The back side of a card">`

        betBox.getElementsByClassName('card-list')[0].appendChild(div)

        gameState.dealerFaceDownCard = cards[cards.length-1]

        initEvaluationPhase()
    }
}
    
function initEvaluationPhase() {
    gameState.continuePhase()
    const betBoxes = getPlayBoxesDirection()
    
    gameState.betBoxIterator = betBoxes.values()
    document.getElementById('player-action').addEventListener('click', handlePlayerAction)
    
    selectNextBox()
}

function selectNextBox() {
    if (gameState.currentBetBox) toggleActiveBox(gameState.currentBetBox.value)
    gameState.currentBetBox = gameState.betBoxIterator.next()
    if (gameState.currentBetBox.done) {
        initDealerTurn()
    } else {
        toggleActiveBox(gameState.currentBetBox.value)
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
            hideDealerMsg()
        },DEALER_MSG_TIMEOUT)
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

function handlePlayerAction(ev) {
    if (!action.hasOwnProperty(ev.target.id)) return

    document.getElementById('player-action').removeEventListener('click', handlePlayerAction)
    Promise.resolve(action[ev.target.id](ev))
    .then(()=>
        document.getElementById('player-action').addEventListener('click', handlePlayerAction))
}

const action = {
    hit: function(){
        return drawCards().then(resp=>{
            const card = resp.cards[0]
            const betBox = gameState.currentBetBox.value
            const boxState = gameState.betBoxes.get(betBox)

            addCardImage(betBox, card)
            boxState.push(card)
            updateCardsGameValue(betBox)

            resetPlayerActions()
            runEvaluation()
        })
    },
    stand: function(){
        resetPlayerActions()
        selectNextBox()
    },
    double: function(){
        const betBox = gameState.currentBetBox.value
        const potValue = gameState.player.getPot(betBox)
        gameState.player.addToPot(betBox, potValue)

        return drawCards().then(resp=>{
            const card = resp.cards[0]
            const boxState = gameState.betBoxes.get(betBox)

            addCardImage(betBox, card)
            boxState.push(card)
            updateCardsGameValue(betBox)
            updateCashAndPot(betBox)

            resetPlayerActions()
            selectNextBox()
        })
    },
    split: function(ev){
        ev.target.innerText = 'Feature not implemented'
        setTimeout(()=>{
            ev.target.style.visibility = 'hidden'
            ev.target.innerText = 'Split'
        },DEALER_MSG_TIMEOUT)
    },
    surrender: function(){
        const betBox = gameState.currentBetBox.value
        const potValue = gameState.player.getPot(betBox)

        gameState.player.addToPot(betBox, -Math.floor(potValue / 2))
        updateCashAndPot(betBox)
        
        resetPlayerActions()
        selectNextBox()
    }
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
            if (gameState.player.cash / gameState.player.getPot(betBox) < 1)
                playerActions.splice(playerActions.indexOf('double'),1)
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

function initDealerTurn() {
    document.getElementById('player-action').removeEventListener('click', handlePlayerAction)

    gameState.possibleWinBoxes = getPlayBoxesDirection()
    .filter(betBox=>gameState.betBoxes.get(betBox).cardsValue() <= 21)

    flipDealerCard(document.getElementById('dealer'))

    if (gameState.possibleWinBoxes.length > 0)
        setTimeout(dealerDecision.bind(null, document.getElementById('dealer')), DEALING_TIMEOUT)
    else {
        gameState.continuePhase()
        setTimeout(resetGame, DEALER_MSG_TIMEOUT)
    }
}

function flipDealerCard(dealerBox) {
    const dealerCards = gameState.betBoxes.get(dealerBox)
    dealerCards.push(gameState.dealerFaceDownCard)

    const imgWrapper = dealerBox.getElementsByClassName('two-faced')[0]

    imgWrapper.innerHTML += `<img src="${gameState.dealerFaceDownCard.image}" class="face-up">`

    imgWrapper.getElementsByClassName('face-up')[0].addEventListener('load', ()=>{
        [...imgWrapper.children].forEach(card=>card.classList.toggle('flip'))
    })

    updateCardsGameValue(dealerBox)
}

/**
 * @param {HTMLDivElement} dealerBox
 */
function dealerDecision(dealerBox) {
    // not too bright dealer only draws card if cardsValue is less than <18
    if (gameState.betBoxes.get(dealerBox).cardsValue() < 18) {
        drawCards().then(resp=>{
            const card = resp.cards[0]
            gameState.betBoxes.get(dealerBox).push(card)
            addCardImage(dealerBox, card)
            updateCardsGameValue(dealerBox)
            setTimeout(dealerDecision.bind(null,dealerBox))
        })
    } else {
        setTimeout(initConclusion.bind(null,dealerBox))
    }
}

function initConclusion(dealerBox) {
    gameState.continuePhase()

    const dealerValue = gameState.betBoxes.get(dealerBox).cardsValue()

    const betBoxes = gameState.possibleWinBoxes.values()

    showDealerMsg()
    
    conclude()

    function conclude () {
        const iteration = betBoxes.next()
        if (iteration.done) {
            resetGame()
            return
        }

        const betBox = iteration.value

        toggleActiveBox(betBox)

        const playerValue = gameState.betBoxes.get(betBox).cardsValue()
        if (playerValue > BLACKJACK) {
            concludeBet(betBox,'lose')
        } else if (dealerValue > BLACKJACK) {
            concludeBet(betBox,'win')
        } else if (playerValue > dealerValue) {
            concludeBet(betBox,'win')
        } else if (playerValue === dealerValue) {
            concludeBet(betBox,'draw')
        } else {
            concludeBet(betBox,'lose')
        }

        setTimeout(conclude, DEALER_MSG_TIMEOUT)
    }
}

function concludeBet(betBox, status) {
    const player = gameState.player
    const dealerMsgElem = document.getElementById('dealer-message')
    if (status === 'win') {
        player.cash += player.getPot(betBox) * 2
    } else if (status === 'draw') {
        player.cash += player.getPot(betBox)
    }
    
    dealerMsgElem.innerText = status
    dealerMsgEmphasize()
    // will clear pot list
}

function resetGame() {
    gameState.betBoxes.forEach((val,key) => {
        key.getElementsByClassName('card-list')[0].innerHTML = ''
        key.getElementsByClassName('cards-value')[0].innerHTML = ''
    });
    gameState.betBoxes.clear()
    gameState.resetBetBoxes()
    
    gameState.player.potList.forEach((val,key,map)=>{
        map.set(key, null)
        updatePot(key)
    })
    gameState.player.resetPotList()
    
    gameState.currentBetBox = null
    resetActiveBoxes()

    updateCashAndPot()

    gameState.continuePhase()

    loadBettingPhase()
    
    returnCards()
    shuffleDeck()
}
// _________________________________

// Game UI modifiers
// _________________________________

// allow player to place bets on betting phase
function updatePot(betBox) {
    if (betBox)
    betBox.getElementsByClassName('pot')[0].innerHTML = gameState.player.getPot(betBox)?`<i class="fas fa-coins"></i> ${gameState.player.getPot(betBox)}`:''
}

function updateCashAndPot(betBox) {
    updatePot(betBox)
    document.getElementById('player-cash').innerHTML = `<i class="fas fa-coins"></i> ${gameState.player.cash}`
}

function loadBettingPhase() {
    const betButtons = document.getElementsByClassName('bet')
    for (const buttonsWrapper of betButtons) {
        buttonsWrapper.classList.add('allow-bet')
    }
    showDealerMsg('Place your bets please')
    document.getElementById('start-button').style.visibility = 'visible';
}

function dealerMsgEmphasize() {
    const dealerMsg = document.getElementById('dealer-message')
    const toggle = ()=>dealerMsg.classList.toggle('cannot-start')
    toggle()
    setTimeout(toggle, TOGGLE_MSG_INTERVAL)
}

// disable bets
function unloadBettingPhase() {
    const betButtons = document.getElementsByClassName('bet')
    for (const buttonsWrapper of betButtons) {
        buttonsWrapper.classList.remove('allow-bet')
    }
}

function toggleActiveBox(betBox) {
    betBox.classList.toggle('active-box')
}

function resetActiveBoxes() {
    [...document.getElementById('betting-area').children].forEach(bb=>bb.classList.remove('active-box'))
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
    `<div class='playing-card'>
    <img src="${apiCardObject.image}" alt="${apiCardObject.value} of ${apiCardObject.suit}">
</div>`
}

// evaluation phase
function resetPlayerActions() {
    for (const actionElem of document.getElementById('player-action').children) {
        actionElem.style.visibility = 'hidden'
    }
}

function showDealerMsg(msg) {
    const dealerMsgElem = document.getElementById('dealer-message')
    dealerMsgElem.style.visibility = 'visible'
    if (typeof msg === 'string') dealerMsgElem.innerText = msg;
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

    updateCashAndPot(betBox)
} 