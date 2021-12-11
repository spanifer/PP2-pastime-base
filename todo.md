# Viability in implementation priority order
    Opportunity / Problem | Importance | Feasibility | Status
    --- | --- | --- | ---
    BlackJack game core | 5 | 5 | ✔
    BlackJack with [API](https://deckofcardsapi.com/) ~~or same on local~~ | 5 | 5 | ✔
    BlackJack UI styling | 5 | 4
    ~~BlackJack with SVG cards~~ | ~~4~~ | ~~3~~
    Store Game state on local to continue | 4 | 3
    BlackJack Game Settings Modal | 3 | 2
    BlackJack Rule Settings in ☝ | 3 | 2
    BlackJack Visual Tutorial | 3 | 2
    Main Game Site | 3 | 2
    Other Game? | 2 | 1 😅

    - 33 - 26

1. Add facedown card
1. Add image on load & Game phase timing
    1. when dealing
    1. when draws a card
    1. when dealer draws own cards
1. Highlight active betbox
1. Pause menu modal? what is pause?
1. Out of cash?
1. Add meta tags
1. Card dealing animation as it flies over the table?

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
