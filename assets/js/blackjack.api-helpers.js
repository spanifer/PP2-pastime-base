/**
 * @param {string} path - API specific URL path
 */
 function fetchFromAPI (path) {
    const baseURL = 'https://deckofcardsapi.com/api/deck/'

    return fetch(baseURL + path, {method:'GET'})
    .then(res=>{
        if (!res.ok) throw new Error('HTTP error, stats: ', res.status)
        return res.json()
    })
    .catch(err=>{
        console.error(err)
        alert('Something went wrong fetching from https://deckofcardsapi.com')
    })
}

function drawCards(count = 1) {
    return fetchFromAPI(`${deckID}/draw/?count=${count}`)
    .then(json=>{
        return json;
    })
}

function returnCards(cardList) {
    return fetchFromAPI(`${deckID}/return/${cardList?`?cards=${cardList.join(',')}`:''}`)
}