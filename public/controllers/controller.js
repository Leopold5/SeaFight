var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {

    var port = 3000;
    var server = 'localhost';
    var socket = io.connect(server + ':' + port);

// Game settings ----------------------
    var maxShipsNumber = 4;
    var a=10;               //number of columns in the field
    var b = 10;             //number of rows in the field
// Game view  ---------------------
    $scope.fieldIsVisible = false;
    $scope.playersListVisible=0;
    $scope.gameStarted=0;
    $scope.colomnsNumberArray = [];
    for (var i = 0; i < a; i++){
        $scope.colomnsNumberArray.push(i);
    }
    $scope.rowsNumberArray = [];
    for (var i = 0; i < b; i++){
        $scope.rowsNumberArray.push(i);
    }
// Game session ----------------------
    var myPlayerId = null;
    var myPlayerName = null;
    var mySocket = null;
    var opponentSocket = null;
    var shipsPlaced = 0;
    var myTurn = 0;

    $scope.myField = [];
    $scope.opponentField = [];
    $scope.opponentFieldHidden = [];
    for (var i = 0; i < a; i++){
        for (var j = 0; j < b; j++) {
            $scope.myField[i*10 + j] = 'emptyButton';
            $scope.opponentField[i * 10 + j] = 'emptyButton';
        }
    }

// event handlers------------------------------------------------

    socket.on('setName', function(){
        function setName(){
            UIkit.modal.prompt('Введите ваш логин:', '', function(name){
                if(name.length>0){
                    socket.emit('setName', name);
                    myPlayerName = name;
                    console.log(name+'is my name');
                    console.log('new user added in function');
                    showPlayersList();
                    $scope.user = true;
                }
                else{
                    setName();
                }
            });
        }

        console.log('Запрос имени...');
        if($('#login').html().length > 0){
            socket.emit('setName', $('#login').html());
            console.log('new user added');
        }
        else{
            setName();
        }

        console.log ('someone set a name');
    });

    socket.on('userDisconnected', function(userData){
        if (opponentSocket===userData){
            alert('Your opponent flied the battle');
            location.reload();
        }
        else{
            console.log(userData.userName + ' is disconnected');
            showPlayersList();
        }
    });

    socket.on('newUser', function(clientsList){
        console.log('New user in  da haus');
        showPlayersList();
    });

    socket.on('newPlayerIsReady', function() {
        console.log ('server said: new player is ready');
        showPlayersList();
    });

    socket.on('killedYou', function(cellId) {
        console.log ('Someone killed me');
        $scope.myField[cellId]='shipKilledButton';
        document.getElementById(cellId).innerText ='X';
        if (--shipsPlaced>0){
            console.log('Still more than 0 - ',shipsPlaced);
        }
        else {
            socket.emit('youWin', opponentSocket);
            alert('You have lost');
            location.reload();
        }
    });

    socket.on('missedYou', function(cellId) {
        console.log ('Someone missed me');
        $scope.myField[cellId]='missedButton';
        document.getElementById(cellId).innerText ='X';
        myTurn = 1;
    });

    socket.on('someoneConnectedToYou', function(hisName, hisSocket) {
        console.log ('Someone connected me');
        alert (hisName+' connected to you on socket '+hisSocket);
        opponentSocket = hisSocket;
        console.log(opponentSocket);
        $scope.gameStarted=1;
        myTurn=0;
        console.log(myTurn);
        $http.get('/playersList').then(function (response) {
            dbdata = response.data;
            dbdata.forEach(function(item, i, arr) {
                if (item.socket === opponentSocket) $scope.opponentFieldHidden = item.field;
            })
        });
    });

    socket.on('youWon', function() {
        console.log ('i Won');
        alert('YOU ARE THE WINNER!!! Hurraaaaaaay!!!');
        location.reload();
    });

//HTML Buttons functions --------------------------

    $scope.startNewGame = function(){
        allShipsPlaced = 0;
        shipsNumber = 0;
        $scope.fieldIsVisible = true;
        $scope.gameStarted = false;
    }; //when startNewGame button is pressed

    $scope.playerReady = function(){
        if (shipsPlaced===maxShipsNumber){
            allShipsPlaced = true;
            reqData = {field:$scope.myField};
            $http.put('/playersList/' + myPlayerId, reqData); // send your field data to db
            $scope.playersListVisible = true;
            socket.emit('playerIsReady');
            showPlayersList();
        }
        else {
            alert ('Place all the ships, plz');
        }

    }; //when player ready button is pressed

    $scope.connect = function (id) {
        if (id!==mySocket){
            opponentSocket = id;
            $scope.gameStarted=1;
            myTurn=1;
            $http.get('/playersList').then(function (response) {
                dbdata = response.data;
                dbdata.forEach(function(item, i, arr) {
                    if (item.socket === opponentSocket) {$scope.opponentFieldHidden = item.field;
               //         opponent = item;
                    }
                    console.log($scope.opponentFieldHidden);
                })
            });
            socket.emit('connectedYou',myPlayerName, mySocket, opponentSocket);
        }
        else{
            alert('Can not connect to yourself');
        }
    }; //when connect button is pressed

    $scope.remove = function (id) {
        $http.delete('/playersList/'+id).then(function (responce) {showPlayersList();});
    }; //when remove button is pressed - this button was used for tests purposes, it's commented in index.html

    $scope.onButtonPress = function (coords, fieldOwner) {
        if (fieldOwner==='my' && !allShipsPlaced){                               // when placing your ships
            placeNewShip(coords);
        }
        else if (fieldOwner==='my' && allShipsPlaced){
            alert ('Ships are placed');
        }
        else if (fieldOwner==='enemy' && $scope.gameStarted){                           // when game started and u press opponent field
           shootHere(coords);
        }
        else if (fieldOwner==='enemy' && !$scope.gameStarted){
            alert ('Opponent not ready');
        }
    }; //when one of the game fields buttons is pressed

// Game logic functions----------------------

    function placeNewShip(coords) {
        if (shipsPlaced<maxShipsNumber){
            if ($scope.myField[coords]==='emptyButton'){
                $scope.myField[coords]= 'myShipButton';
                shipsPlaced++;
            }
            else {
                alert ('a-a-aaaa!!!!');
            }
        }
        else{
            alert ('All ships placed');
        }
    };

    function shootHere (coords){
        if(myTurn){
            if ($scope.opponentFieldHidden[coords]==='emptyButton'){
                console.log('missed');
                myTurn = 0;
                markMissedPlace(coords);
            }
            else{
                console.log('BOOOM');
                markKilledShip(coords);
                myTurn=1;

            }
        }
        else alert ("It's not your turn");
    };

    function markKilledShip(cellId) {
        $scope.opponentField[cellId]='shipKilledButton';
        socket.emit('killedYou',cellId, opponentSocket);
    }; // changes fields color

    function markMissedPlace (cellId) {
        $scope.opponentField[cellId]='missedButton';
        socket.emit('missedYou',cellId, opponentSocket);
    }; // changes fields color in both yor and enemy browser

// some service functions

    $scope.numberToLetter = function (number) {
        number = String.fromCharCode(+number+64);
        return number;
    }; // transforms number to letter :)

    function showPlayersList() {
        $http.get('/playersList').then(function (response) {                  //gets data  from DB
            $scope.playersList = response.data;                           //and refreshes the html players table with it
            if (myPlayerId === null) {                      // saves players info on enter
               $scope.playersList.forEach(function(item, i, arr) {
                   if (item.name === myPlayerName){
                       myPlayerId=item._id;
                       mySocket=item.socket;
                   }
               });
          }
        });
    }; // generates players table and used for refreshing it

}]);

// some table generator i was going to use :)

/*     $scope.createTable = function(targetPlaceId){if(!flag){
        var htmlTable = document.getElementById(targetPlaceId);
        var rowNomber=0;
        var columnNumber=0;
        var tr = [];
        var td = [];
        flag=1;
        for(rowNomber=0; rowNomber < 11; rowNomber += 1) {
            tr[rowNomber] = document.createElement('tr');
            htmlTable.appendChild(tr[rowNomber]);
            for(columnNumber=0; columnNumber < 11; columnNumber += 1) {
                td[columnNumber] = document.createElement('td');
                tr[rowNomber].appendChild(td[columnNumber]);
                td[columnNumber].width = 30;
                td[columnNumber].height = 30;

                if (rowNomber===0 && columnNumber===0){
                    td[columnNumber].innerHTML = '&nbsp';
                    td[columnNumber].style = "text-align: center; font-weight: bold; font-size: 14pt;";
                }
                else if (rowNomber===0){
                    td[columnNumber].innerHTML = String.fromCharCode(columnNumber+64);
                    td[columnNumber].style = "text-align: center; font-weight: bold; font-size: 14pt;";
                }
                else if (columnNumber===0){
                    td[columnNumber].innerHTML = rowNomber;
                    td[columnNumber].style = "text-align: center; font-weight: bold; font-size: 14pt;";
                }
                else{
                    var button = document.createElement('button');
                    td[columnNumber].appendChild(button);
                    button.id = rowNomber*10+columnNumber;
 //                   button.addEventListener('click', onButtonPress);
                    button.style = "width: 100%; height: 100%;";
                    button.innerHTML ='&nbsp';
                }
            }
        }
    }};*/
