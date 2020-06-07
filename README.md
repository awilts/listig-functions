-clients should be able to easily subscribe to all relevant data
    -relevant data is:
        -players
        -teams
        -host
        -guides
        -votes
        -hints
        -revealed cards
        -unrevealed cards
        -timer
-normal clients must not be able to read sensitive data
-guides need to read sensitive data
    -sensitive data is:
        -owners of unrevealed cards
    -can security rule lookup hosts in public gamestate?

-clients must not be able to write any data without security checks
    -all writing access happens through cloud functions

-each game needs its own lobby
    -players need to be registered in a lobby in order to read its content



lobbies : {
    someid: {
        players: {
            player1: {
                id: abc,
                name: Peter Pan,
                color: 
            }
        }
    }
}