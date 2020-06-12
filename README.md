
#### DB schema design guidelines:

##### Data to be stored:
- public game state
    - players
        - name
        - team
        - vote
        - color
        - host
        - guide
    - hints
        - position
        - team
        - text
    - words
        - position
        - text
        - team
    - currentTeam
    - timer (?)
- hidden game state
    - owners of unrevealed cards

            
##### DB schema requirements

-  public game state
    - clients should be able to easily subscribe to all public data
    - players need to be registered in players-collection in order to read public game state 
    
- hidden game state
    - normal clients must not be able to read sensitive data
    - guides need to read sensitive data
    - can security rules lookup guides in public game state?
        - Otherwise place copy of guide ids in hidden game state

- clients must not be able to write any data without security checks
    - all writing access happens through cloud functions

- each game needs its own lobby
    - players need to be registered in a lobby in order to read its content

- use multiple small documents instead of few large ones for better write performance

#### Example game state

    lobbies : {
        lobbyid: {
            players: {
                playerid: {
                    name: Peter Pan,
                    color: teal,
                    team: red,
                    vote: 2
                }
            },
            hints: {
                hintid: {
                    position: 0,
                    team: red,
                    text: some hint,       
                },
            words: {
                wordid: {
                    position: 0,
                    text: someword,
                    team: red
                }
            },
            wordowners: {
                wordid: {
                    team: red 
                }
            }
            currentTeam: red
        }
    }



#### Test functions via:

npm run start:all