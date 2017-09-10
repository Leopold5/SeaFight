var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {

    var port = 3000;
    var server = 'localhost';
    var socket = io.connect(server + ':' + port);
    var serverRestarted = 0; ///  used further for bugfixing

// Game settings ----------------------

    var maxShipsNumber = 4;
    var a=10;               //number of columns in the field (not tested hard)
    var b = 10;             //number of rows in the field (not tested hard)
    $scope.colomnsNumberArray = [];
    for (var i = 0; i < a; i++){
        $scope.colomnsNumberArray.push(i);
    }
    $scope.rowsNumberArray = [];
    for (var i = 0; i < b; i++){
        $scope.rowsNumberArray.push(i);
    }

// Game view  ---------------------   used to hide/show  ui elements

    $scope.draw ={
        gameFields : false,
        playersList : false,
        readyButton : true
    };

// Game session ----------------------
    var player = {};
    var opponentSocket;
    var opponentFieldHidden = [];
    $scope.playersOnline = [];
    $scope.myField = [];
    $scope.opponentField = [];
    for (var i = 0; i < a; i++){
        for (var j = 0; j < b; j++) {
            $scope.myField[i*10 + j] = 'emptyButton';
            $scope.opponentField[i * 10 + j] = 'emptyButton';
            opponentFieldHidden[i * 10 + j] = 'emptyButton';
        }
    }
    var allShipsPlaced = 0;
    var numberOfShipsPlaced = 0;
    var gameStarted = 0;
    var myTurn = 0;


// event handlers------------------------------------------------

    socket.on('setNamePlz', function(){
        if (serverRestarted){location.reload();}   /// this refreshes page if server restarted while page opened
        serverRestarted = 1;
        setName();

        function setName(){
            UIkit.modal.prompt('Введите ваш логин:', '', function(name){
                if(name.length>0){
                    socket.emit('setThisName', name);
                }
                else{
                    setName();
                }
            });
        }
    });

    socket.on('saveYourSessionAndStartNewGame',function (userData) {
        player = userData;
        startNewGame();
    }); // initialize a new game

    socket.on('userDisconnected', function(userData){
        if (opponentSocket===userData){                            // if it was your current opponent, who left, it may cause some bugs.
            alert('Your opponent flied the battle');
            location.reload();
        }
        else{
            console.log(userData.userName + ' is disconnected');
            showPlayersList();
        }
    });

    socket.on('newUserConnectedToServer', function(){
        console.log('New user in  da haus');
        showPlayersList();
    });

    socket.on('newPlayerIsReady', function() {
        showPlayersList();
    });

    socket.on('killedYou', function(cellId) {
        $scope.myField[cellId]='shipKilledButton';
        document.getElementById(cellId).innerText ='X';
        refresh();                                         // i had a bug, angular not refreshing as intended. so that trick fixed it
        if (--numberOfShipsPlaced>0){
                                                //was going to add some action here
        }
        else {
            socket.emit('youWin', opponentSocket);
            alert('You have lost');
            location.reload();
        }
    });

    socket.on('missedYou', function(cellId) {
        $scope.myField[cellId]='missedButton';
        document.getElementById(cellId).innerText ='X';
        myTurn = 1;
        refresh();
    });

    socket.on('someoneConnectedToYou', function(hisName, hisSocket) {           //initialises a new game
        alert (hisName+' connected to you on socket '+hisSocket);
        opponentSocket = hisSocket;
        $scope.draw.playersList=false;
        gameStarted = true;
        myTurn=0;
        $http.get('/playersList').then(function (response) {            // when someone connected to u,
            dbdata = response.data;                                      // it gets your opponent field data and saves it
            dbdata.forEach(function(item, i, arr) {
                if (item.socket === opponentSocket) opponentFieldHidden = item.field;
            })
        });
    });

    socket.on('youWon', function() {
        alert('YOU ARE THE WINNER!!! Hurraaaaaaay!!!');
        location.reload();
    });

//HTML Buttons functions --------------------------

    $scope.playerReady = function(){
        if (numberOfShipsPlaced===maxShipsNumber){
            allShipsPlaced = 1;
            reqData = {socket: player.socketId, field:$scope.myField, status: 'ready'};
            $http.put('/playersList', reqData).then (showPlayersList()); // send your field data to db
            $scope.draw.readyButton = false;
            $scope.draw.playersList = true;
            socket.emit('playerIsReady');
        }
        else {
            alert ('Place all the ships, plz');
        }
    }; //when player ready button is pressed

    $scope.onButtonPress = function (coords, fieldOwner) {
        if (fieldOwner==='my' && !allShipsPlaced){                               // when placing your ships
            placeNewShip(coords);
        }
        else if (fieldOwner==='my' && allShipsPlaced){
            alert ('Ships are placed');
        }
        else if (fieldOwner==='enemy' && gameStarted){                           // when game started and u press opponent field
            shootHere(coords);
        }
        else if (fieldOwner==='enemy' && !gameStarted){
            alert ('Opponent not ready');
        }
    }; ///when one of the game fields buttons is pressed

    $scope.connect = function (id) {
        if (id!==player.socketId){          //do not connect to yourself
            opponentSocket = id;
            $scope.draw.readyButton=0;
            myTurn=true;
            $http.get('/playersList').then(function (response) {
                dbdata = response.data;
                dbdata.forEach(function(item, i, arr) {
                    if (item.socket === opponentSocket) {
                        opponentFieldHidden = item.field;
                    }
                })
            });
            socket.emit('connectedHim',player.name, player.socketId, opponentSocket);
            $scope.draw.playersList=false;
            gameStarted = true;
        }
        else{
            alert('Can not connect to yourself');
        }
    }; //when connect button is pressed

// Game logic functions----------------------

    function placeNewShip(coords) {
        if (numberOfShipsPlaced<maxShipsNumber){
            if ($scope.myField[coords]!=='myShipButton'){
                $scope.myField[coords]= 'myShipButton';
                numberOfShipsPlaced++;
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
            if (opponentFieldHidden[coords]==='emptyButton'){
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
    }; // changes fields color in both yor and enemy browser
    function markMissedPlace (cellId) {
        $scope.opponentField[cellId]='missedButton';
        socket.emit('missedYou',cellId, opponentSocket);
    }; // changes fields color in both yor and enemy browser

// some service functions

    function showPlayersList() {
        $http.get('/playersList').then(function (response) {
            $scope.playersOnline = response.data;
            console.log($scope.playersOnline);
        });
    }       //refreshes playerlist field when called
    function startNewGame (){
        $scope.draw.gameFields = true;
        showPlayersList ();
        refresh();
    };
    function refresh (){
        $http.get('');
    };
    $scope.numberToLetter = function (number) {
        number = String.fromCharCode(+number+64);
        return number;
    }; // transforms number to letter :)
    $scope.remove = function (id) {
        $http.delete('/playersList/'+id).then(function (responce) {showPlayersList();});
    }; //when remove button is pressed - this button was used for tests purposes, it's commented in index.html

}]);



