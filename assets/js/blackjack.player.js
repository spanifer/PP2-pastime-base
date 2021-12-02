class Player {
    constructor (...{name = 'noname', cash = 500}) {
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
    boxTypeCheck(bettingBox)
    this.potList.get(bettingBox)
}

Player.prototype.addPot = function (bettingBox, potValue) {
    boxTypeCheck(bettingBox)
    this.potList.set(bettingBox, potValue)
}

Player.prototype.removePot = function (bettingBox) {
    boxTypeCheck(bettingBox)
    this.potList.delete(bettingBox)
}

}())
