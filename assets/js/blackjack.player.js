class Player {
    constructor (...{name = 'noname', cash = 250}) {
        this.name = name
        this.cash = cash
        //to store active pot elements with its bet value
        this.potList = new Map()
    }
}

(function() {

function boxTypeCheck (bettingBox) {
    if (!bettingBox.classList.contains('betting-box')) throw new TypeError('Wrong element used to select betting box!')
}

Player.prototype.getPot = function (bettingBox) {
    return this.potList.get(bettingBox)
}

Player.prototype.addPot = function (bettingBox, potValue) {
    this.potList.set(bettingBox, potValue)
}

Player.prototype.removePot = function (bettingBox) {
    this.potList.delete(bettingBox)
}

const mod = Symbol('modify')
/**
 * Replaces a Map.set(key, Map.get(key) + value)
 * instead it is
 * Map[mod](key, (currentVal)=>currentVal+value)
 * @param {Map.key} key 
 * @param {Number|Function} cb - to run or sum with this[key].value
 */
Map.prototype[mod] = function (key, cb) {
    if (typeof cb === 'function')
        this.set(key, cb(this.get(key)))
    else if (typeof cb === 'number')
        this.set(key, this.get(key) + cb)
}

/**
 * Modifies Player pot and cash according to bet value if possible
 * @param {HTMLDivElement} bettingBox 
 * @param {Number} betValue - negative integer to remove from pot, positive to add to pot
 */
Player.prototype.addToPot = function (bettingBox, betValue) {
    if (this.getPot(bettingBox) + betValue < 0) { // if trying to remove from pot more than available
        this.cash += this.getPot(bettingBox)
        this.addPot(bettingBox, 0)
    } else if (this.cash - betValue < 0) { // if trying to add to pot more 
        this.potList[mod](bettingBox, this.cash)
        this.cash = 0
    } else {
        this.cash -= betValue
        this.potList[mod](bettingBox, betValue)
    }
}

}())
