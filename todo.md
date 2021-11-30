# Strategy

-   ## Definition
    - A simple visually appealing site about one single blackjack game or multiple easy to implement games like memory flip card game, or more advanced like a platformer, like dino-run and such
    - Demographic is for all who are willing to pastime
    - Blackjack as minimum viable product with html,css,js, and a `not fully realized` canvas based "game"

-   ## Value
    - For a user to take a break and relax throughout a hard day, have an engaging but not frustrating short experience of interactive games.
    - Interactive elements and animation is the main appeal

-   ## [Research](#blackjack)
        
-   ## Viability
    Opportunity / Problem | Importance | Feasibility
    --- | --- | ---
    BlackJack game core | 5 | 5
    BlackJack with [API](https://deckofcardsapi.com/) ~~or same on local~~ | 5 | 5
    BlackJack UI styling | 5 | 4
    ~~BlackJack with SVG cards~~ | ~~4~~ | ~~3~~
    Store Game state on local to continue | 4 | 3
    BlackJack Game Settings Modal | 3 | 2
    BlackJack Rule Settings in ☝ | 3 | 2
    BlackJack Visual Tutorial | 3 | 2
    Main Game Site | 3 | 2
    Other Game? | 2 | 1 😅

    - 33 - 26

# Main Idea
## Website
- each game should have its own high score board if applicable, saved on local storage, with whatever username and date
- main page have the games listed in cards view horizontally (scrollable? pan-able) with a "more coming soon" card. (There will be always more coming soon)
- single page in full screen view, should have 0 scrolling behavior, but with a sandwich button that would pause the game and give a native experience like feature, bringing up the footer and down the header and other menu elements
    - should have option to (in a sense) quit the game and go back to the main menu
    - should have option to report error (that would be a text to describe the error, and further down the line to have error handling and logging that can be sent to the dev)
    - see the high scores or/and other game info that is not relevant on the main game but informative about the current game

- the site can have an about page but i already know i'll struggle to write any meaningful content in there. 
    - Maybe I can keep it concise and positioned in an appealing way to achieve the same user experience as a meaningful read would 😑
    - Or the about page could contain frequently asked questions (arising from testing) (although that is not about).

- the site can have a get in contact page, or report error
    - Or the contact page could contain frequently asked questions ...

## Games
-   ## BlackJack
    rules and ui to implement in this order of importance
    - [52-card deck](https://en.wikipedia.org/wiki/Standard_52-card_deck)
        1. clubs (♣), diamonds (♦), hearts (♥) and spades (♠)? in svg?
        1. generate the cards or have image assets? and the Ace, King, Queen, Jack image?
        1. the back of the card generic pattern or follow the page color and design?
        1. table background? audio?
    - General [BlackJack RULES](https://en.wikipedia.org/wiki/Blackjack)
    - User should play against the bank. Should the bank have a difficulty setting? Or should it be the source of dopamine?
        - Hmmm, now the idea arise to implement a future where the game is not random, as soon as you start to lose (or have some chance to be nice?). That is something that me personally have never experienced so I find the idea fascinating. Maybe, Probably. To clarify it would activate when whatever player (thinking about multiplayer, or multiple npc?) is about to lose it last stake / that also mean a stake should be limited to an amount
    - Should the game state be stored in local to be able to continue? or in query?
    - Bank should have Speech Bubbles, win lose comments and such, inspiring or funny comments
    - User should could have chat options to say on win or lose
    - Every day if a user starts the game should receive X amount of cash on top of what he have to stake.
    - Every time a user runs out of cash can only receive a small amount to stake again DAILY_GAME_TOKEN^(1/7) - ish
    - Timeout on multiplayer?

    - #### Local Vars
        - MAX_BET
        - player:object
            - totalCoins:int
            - bettingBox:int //indexed?

    - #### Game Phases
        - Round cycles:
            1. betting phase
                - At a blackjack table, the dealer faces five to nine playing positions from behind a semicircular table.
                - Between one and eight standard 52-card decks are shuffled together.
                - To start each round, players place bets in the "betting box" at each position.
                - The player whose bet is at the front of the betting box controls the position, and the dealer consults the controlling player for playing decisions; the other bettors "play behind".
                - A player can usually control or bet in as many boxes as desired at a single table, players are limited to playing one to three positions at a table.
            1. dealing phase
                - The dealer deals from their left ("first base") to their far right ("third base").
                - Each box gets an initial hand of two cards visible to the people playing on it.
                - The dealer's hand gets its first card face up, and, in "hole card" games, immediately gets a second card face down (the hole card), which the dealer peeks at but only reveals when it makes the dealer's hand a blackjack.
                - Dealers deal the cards from one or two handheld decks, from a dealer's shoe, or from a shuffling machine.
                - Single cards are dealt to each wagered-on position clockwise from the dealer's left, followed by a single card to the dealer, followed by an additional card to each of the positions in play.
                - The players' initial cards may be dealt face up or face down (more common in single-deck games).
            1. evaluation phase / cycle
                - Player Decisions; After the initial two cards, the player has up to five options:
                    1. **Hit**: Take another card.
                    1. **Stand**: Take no more cards.
                    1. **Double down**: Increase the initial bet by 100% and take exactly one more card.
                    1. **Split**: Create two hands from a starting hand where both cards are the same value. Each new hand gets another card so that the player has two starting hands. This requires an additional bet on the second hand. The two hands are played out independently, and the wager on each hand is won or lost independently. In the case of cards worth 10 points, some casinos only allow splitting when the cards are the same rank. For example, 10-10 could be split, but K-10 could not. Doubling and re-splitting after splitting are often restricted. A 10-valued card and an ace resulting from a split usually isn't considered a blackjack. Hitting split aces is often not allowed. Non-controlling players can opt to put up a second bet or not. If they do not, they only get paid or lose on one of the two post-split hands.
                    1. **Surrender**: Forfeit half the bet and end the hand immediately. This option is only available at some tables in some casinos, and the option is only available as the first decision.