var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {

 //   var port = 3000;
//    var server = 'localhost';
 //   var socket = io.connect(server + ':' + port);
    var socket = io.connect();
    var serverRestarted = 0; ///  used further for bugfixing

// Game settings ----------------------
    var _1DS = 4;
    var _2DS = 3;
    var _3DS = 2;
    var _4DS = 1;
    var maxShipsNumber = _1DS+ _2DS*2+_3DS*3+_4DS*4;
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
    $scope.myTurn = false;

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
  //      document.getElementById(cellId).innerText ='X';
        refresh();                                         // i had a bug, angular not refreshing as intended. so that trick fixed it
        if (--numberOfShipsPlaced>0){
            if (getShipAsArray(cellId, $scope.myField).length===countKilledLength(cellId, $scope.myField)){
                markMissesIfShipIsKilled(cellId, $scope.myField);
            }
        }
        else {
            socket.emit('youWin', opponentSocket);
            alert('You have lost');
            location.reload();
        }
    });

    socket.on('missedYou', function(cellId) {
        $scope.myField[cellId]='missedButton';
 //       document.getElementById(cellId).innerText ='X';
        $scope.myTurn = true;
        refresh();
    });

    socket.on('someoneConnectedToYou', function(hisName, hisSocket) {           //initialises a new game
        alert (hisName+' connected to you on socket '+hisSocket);
        opponentSocket = hisSocket;
        $scope.draw.playersList=false;
        gameStarted = true;
        $scope.myTurn=false;
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
            if ($scope.myField[coords] === 'emptyButton'){
                placeNewShip(coords);
            }
            else {
                removeShip(coords)
            }

        }
        else if (fieldOwner==='my' && allShipsPlaced){
            if ($scope.myField[coords] === 'emptyButton'){
                alert ('Ships are placed');
            }
            else {
                removeShip(coords)
            }
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
            $scope.myTurn=true;
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
    function noOtherShipsAtAngles (coords){
        if (Math.floor(coords/10)===coords/10){     // if left side of the field
            if ($scope.myField[coords-9] !== 'myShipButton' &&
                $scope.myField[coords+11] !== 'myShipButton')
            {return true;}
        }
        else if (Math.floor((coords+1)/10)===(coords+1)/10){    // right side of the field
            if($scope.myField[coords-11] !== 'myShipButton' &&
                $scope.myField[coords+9] !== 'myShipButton')
            {return true;}
        }
        else if ($scope.myField[coords-11] !== 'myShipButton' &&
            $scope.myField[coords-9] !== 'myShipButton' &&
            $scope.myField[coords+11] !== 'myShipButton' &&
            $scope.myField[coords+9] !== 'myShipButton')
        {return true;}
        else
        {return false}
    }
    function sipIsPlacedBetweenShips (coords){
        if (Math.floor(coords/10)===coords/10) {     // if left side of the field
            if ($scope.myField[coords-10]==='myShipButton'&&
                $scope.myField[coords+10]==='myShipButton')
            {return true;}
        }
        else if (Math.floor((coords+1)/10)===(coords+1)/10) {    // right side of the field
            if ($scope.myField[coords-10]==='myShipButton'&&
                $scope.myField[coords+10]==='myShipButton')
            {return true;}
        }
        else if ($scope.myField[coords-1]==='myShipButton'&&
            $scope.myField[coords+1]==='myShipButton'||
            $scope.myField[coords-10]==='myShipButton'&&
            $scope.myField[coords+10]==='myShipButton')
        {return true;}
        else
        {return false}
    }

    function countKilledLength (coords, field)  {
        var killedShipArray = getShipAsArray(coords, field);
        return killedShipArray.length;
    }
    function getShipAsArray (coords, field){
        var i = 1;
        var j = 1;
        var k = 1;
        var l = 1;
        var shipCoordsArray = [coords];

        if (Math.floor(coords/10)===coords/10) {     // if left side of the field
//            console.log('count on left side');
            while (field[coords + j] === 'myShipButton' || field[coords + j] === 'shipKilledButton') {
                shipCoordsArray.push(coords + j);
                j++;
            }
            while (field[coords - 10*k] === 'myShipButton' || field[coords - 10*k] === 'shipKilledButton') {
                shipCoordsArray.push(coords - 10*k);
                k++;
            }
            while (field[coords + 10*l] === 'myShipButton' || field[coords + 10*l] === 'shipKilledButton') {
                shipCoordsArray.push(coords + 10*l);
                l++;
            }
        }
        else if (Math.floor((coords+1)/10)===(coords+1)/10) {    // right side of the field
//            console.log('count on right side');
            while (field[coords - i] === 'myShipButton' || field[coords - i] === 'shipKilledButton') {
                shipCoordsArray.push(coords - i);
                i++;
            }
            while (field[coords - 10*k] === 'myShipButton' || field[coords - 10*k] === 'shipKilledButton') {
                shipCoordsArray.push(coords - 10*k);
                k++;
            }
            while (field[coords + 10*l] === 'myShipButton' || field[coords + 10*l] === 'shipKilledButton') {
                shipCoordsArray.push(coords + 10*l);
                l++;
            }
        }
        else {
//            console.log('count on middle');
            var leftSideReached=0;
            var rightSideReached=0;
            while ((field[coords - i] === 'myShipButton' || field[coords - i] === 'shipKilledButton') && leftSideReached===0) {
                if (Math.floor((coords-i)/10)===(coords-i)/10){leftSideReached=1; console.log('leftSideReached');}
                shipCoordsArray.push(coords - i);
                i++;
            }
            while ((field[coords + j] === 'myShipButton' || field[coords + j] === 'shipKilledButton') && rightSideReached===0) {
                if (Math.floor((coords+1+j)/10)===(coords+1+j)/10){rightSideReached=1; console.log('rightSideReached');}
                shipCoordsArray.push(coords + j);
                j++;
            }
            while (field[coords - 10*k] === 'myShipButton' || field[coords - 10*k] === 'shipKilledButton') {
                shipCoordsArray.push(coords - 10*k);
                k++;
            }
            while (field[coords + 10*l] === 'myShipButton' || field[coords + 10*l] === 'shipKilledButton') {
                shipCoordsArray.push(coords + 10*l);
                l++;
            }
        }
        return shipCoordsArray;
    }

    function placeNewShip(coords) {
        if (numberOfShipsPlaced < maxShipsNumber) {
            if (noOtherShipsAtAngles(coords)){
                if (!sipIsPlacedBetweenShips(coords)){
  //                  console.log('------------------------------------------------Shiplength is', countShipLength(coords, $scope.myField));
                    switch (getShipAsArray(coords, $scope.myField).length){
                        case 1:
   //                         console.log('case 1!');
                            if (_1DS===-1) {
                                alert('Finish previous 1ds ship');
                                break;
                            }
                            else if (_2DS===-1){
                                alert('Finish previous 2ds ship');
                                break;
                            }
                            else if (_3DS===-1){
                                alert('Finish previous 3ds ship');
                                break;
                            }
                            else if (_1DS>0){
                                markNewShipCell (coords);
                                _1DS--;
//                                console.log('putting 1ds',_1DS, ' left');
                                break;
                            }
                            else if (_1DS===0){
//                                console.log(_2DS,_3DS,_4DS);
                                if (_2DS>0||_3DS>0||_4DS>0){
                                    markNewShipCell (coords);
                                    _1DS--;
//                                    console.log('putting 1ds',_1DS, ' left');
                                    break;
                                }
                            }
                        case 2:
     //                       console.log('case 2!');
                            if (_2DS===-1) {
                                alert('Finish previous 2ds ship');
                                break;
                            }
                            else if (_3DS===-1){
                                alert('Finish previous 3ds ship');
                                break;
                            }
                            else if (_2DS>0) {
                                _1DS++;
                                _2DS--;
                                markNewShipCell(coords);
                                break;
                            } else if (_2DS===0 && (_3DS>0 || _4DS>0)){
                                _1DS++;
                                _2DS--;
                                markNewShipCell(coords);
                                break;
                            }
                        case 3:
   //                         console.log('case 3!');
                            if (_3DS===-1){
                                alert('Finish previous 3ds ship');
                                break;
                            }
                            else if (_3DS>0){
                                _2DS++;
                                _3DS--;
                                markNewShipCell(coords);
                                break;
                            }else if (_3DS===0 && _4DS) {
                                _3DS--;
                                _2DS++;
                                markNewShipCell(coords);
                                break;
                            }else if (_3DS===0 && !_4DS){
                                alert('Only smaller ships left');
                                break;
                            }
                        case 4:                                             //either u make it of 3deck ship or make it from 1deck
   //                         console.log('case 4!');
                            if (_4DS>0) {                     // above others
                                _4DS--;
                                _3DS++;
                                markNewShipCell(coords);
                                break;
                            }
                            else if (_4DS===0){
                                alert('No more 4ds ships left');
                                break;
                            }
                    }
                } else {alert('Placing ships between ships not allowed');}
            } else {alert('Placing ships angled to other ships not allowed');}
        }else{alert('All ships placed');}
    }  // contains all ship placement logic
    function removeShip(coords) {
        if (!gameStarted){
            switch (getShipAsArray(coords, $scope.myField).length){
                case 1:
                    _1DS++;
                     break;
                case 2:
                    _2DS++;
                    break;
                case 3:
                    _3DS++;
                    break;
                case 4:
                    _4DS++;
                    break;
            }
            var toBeRemovedShipArray = getShipAsArray(coords, $scope.myField);
            for (i=0; i<toBeRemovedShipArray.length; i++){
                markEmptyCell(toBeRemovedShipArray[i]);
            }

        }
    }   // contains all ship removing logic
    function shootHere (coords){
        if($scope.myTurn){
            if (opponentFieldHidden[coords]==='emptyButton'){
                $scope.myTurn = false;
                markMissedPlace(coords);
            }
            else{
//                console.log('BOOOM');
                markShipHit(coords);
                $scope.myTurn=true;
                if (getShipAsArray(coords, opponentFieldHidden).length===countKilledLength(coords, $scope.opponentField)){
//                    console.log('ship killed');
                    markMissesIfShipIsKilled(coords, $scope.opponentField);
                }
            }
        }
        else alert ("It's not your turn");
    }

    function markMissesAllAroundSingleShipCell (coords, field){
        if (Math.floor(coords/10)===coords/10){     //on the left side of the field
            if (field[coords+1]!=='shipKilledButton')field[coords+1] = 'missedButton';
            if (field[coords+10]!=='shipKilledButton')field[coords+10] = 'missedButton';
            if (field[coords-10]!=='shipKilledButton')field[coords-10] = 'missedButton';
            field[coords-9] = 'missedButton';
            field[coords+11] = 'missedButton';
        }
        else if (Math.floor((coords+1)/10)===(coords+1)/10){        ////on the right side of the field
            if (field[coords-1]!=='shipKilledButton')field[coords-1] = 'missedButton';
            if (field[coords+10]!=='shipKilledButton')field[coords+10] = 'missedButton';
            if (field[coords-10]!=='shipKilledButton')field[coords-10] = 'missedButton';
            field[coords+9] = 'missedButton';
            field[coords-11] = 'missedButton';
        }
        else {
            if (field[coords+1]!=='shipKilledButton')field[coords+1] = 'missedButton';
            if (field[coords-1]!=='shipKilledButton')field[coords-1] = 'missedButton';
            if (field[coords+10]!=='shipKilledButton')field[coords+10] = 'missedButton';
            if (field[coords-10]!=='shipKilledButton')field[coords-10] = 'missedButton';
            field[coords+9] = 'missedButton';
            field[coords-9] = 'missedButton';
            field[coords+11] = 'missedButton';
            field[coords-11] = 'missedButton';
        }
    }
    function markMissesIfShipIsKilled(coords, field){
        var killedShipArray = getShipAsArray(coords, field);
//        console.log('killed ship array:',killedShipArray);
        for (i=0; i<killedShipArray.length; i++){
            markMissesAllAroundSingleShipCell(killedShipArray[i],field);
        }
    }
    function markShipHit(coords) {
        $scope.opponentField[coords]='shipKilledButton';
        socket.emit('killedYou',coords, opponentSocket);
    } // changes cell color in both your and enemy browser
    function markMissedPlace (coords) {
        $scope.opponentField[coords]='missedButton';
        socket.emit('missedYou',coords, opponentSocket);
    } // changes fields color in both yor and enemy browser
    function markNewShipCell (coords){
        $scope.myField[coords] = 'myShipButton';
        numberOfShipsPlaced++;
    }  // changes fields cell to ship
    function markEmptyCell (coords){
        $scope.myField[coords] = 'emptyButton';
        numberOfShipsPlaced--;
    }  // changes fields cell to empty

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


    /*    function countKilledLength (coords)  {
        var i = 1;
        var j = 1;
        var k = 1;
        var l = 1;
        var killedLength = 1;
        if (Math.floor(coords/10)===coords/10) {     // if left side of the field
            console.log('count killed on left side');
            while ($scope.opponentField[coords + j] === 'shipKilledButton') {
                j++;
                killedLength++;
            }
            while ($scope.opponentField[coords - 10*k] === 'shipKilledButton') {
                k++;
                killedLength++;
            }
            while ($scope.opponentField[coords + 10*l] === 'shipKilledButton') {
                l++;
                killedLength++;
            }
        }
        else if (Math.floor((coords+1)/10)===(coords+1)/10) {    // right side of the field
            console.log('count killed on right side');
            while ($scope.opponentField[coords - i] === 'shipKilledButton') {
                i++;
                killedLength++;
            }
            while ($scope.opponentField[coords - 10*k] === 'shipKilledButton') {
                k++;
                killedLength++;
            }
            while ($scope.opponentField[coords + 10*l] === 'shipKilledButton') {
                l++;
                killedLength++;
            }
        }
        else {
            console.log('count killed on middle');
            var leftSideReached=0;
            var rightSideReached=0;
            while ($scope.opponentField[coords - i] === 'shipKilledButton' && leftSideReached===0) {
                if (Math.floor((coords-i)/10)===(coords-i)/10){leftSideReached=1; console.log('leftSideReached');}
                i++;
                killedLength++;
            }
            while ($scope.opponentField[coords + j] === 'shipKilledButton' && rightSideReached===0) {
                if (Math.floor((coords+1+j)/10)===(coords+1+j)/10){rightSideReached=1; console.log('rightSideReached');}
                j++;
                killedLength++;
            }
            while ($scope.opponentField[coords - 10*k] === 'shipKilledButton') {
                k++;
                killedLength++;
            }
            while ($scope.opponentField[coords + 10*l] === 'shipKilledButton') {
                l++;
                killedLength++;
            }
        }
        console.log('Killed ship length is: ',killedLength)
        return killedLength;
    }*/  //count killed length function backup
    /*    function removeShip(coords) {
        if (!gameStarted){
            switch (countShipLength(coords, $scope.myField)){
                case 1:
                    _1DS++;
                    numberOfShipsPlaced -=1;
                    console.log('adding 1ds');
                    break;
                case 2:
                    _2DS++;
                    numberOfShipsPlaced -=2;
                    console.log('adding 2ds');
                    break;
                case 3:
                    _3DS++;
                    numberOfShipsPlaced -=3;
                    console.log('adding 3ds');
                    break;
                case 4:
                    _4DS++;
                    numberOfShipsPlaced -=4;
                    console.log('adding 4ds');
                    break;
            }

            var i = 1;
            var j = 1;
            var k = 1;
            var l = 1;

            var firstRun = 1;

            if (Math.floor(coords/10)===coords/10) {     // if button is pressed on the left side of the field
                console.log('removing on left side');
                if ($scope.myField[coords+1]!=='myShipButton'&&
                    $scope.myField[coords-10]!=='myShipButton'&&
                    $scope.myField[coords+10]!=='myShipButton')
                {$scope.myField[coords] = 'emptyButton';}

                while ($scope.myField[coords + j] === 'myShipButton') {  //removing to the right
                    $scope.myField[coords + j] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    j++;
                }
                while ($scope.myField[coords - 10*k] === 'myShipButton') { //removing to the top
                    console.log('removing on left side to the top');
                    $scope.myField[coords - 10*k] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    k++;
                }
                while ($scope.myField[coords + 10*l] === 'myShipButton') {  //removing to the bottom
                    console.log('removing on left side to the bottom');
                    $scope.myField[coords + 10*l] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    l++;
                }
            }
            else if (Math.floor((coords+1)/10)===(coords+1)/10) {    // if button is pressed on the right side of the field
                console.log('removing on right side');
                if ($scope.myField[coords-1]!=='myShipButton'&&
                    $scope.myField[coords-10]!=='myShipButton'&&
                    $scope.myField[coords+10]!=='myShipButton')
                {$scope.myField[coords] = 'emptyButton';}

                while ($scope.myField[coords - i] === 'myShipButton') {  //removing to the left
                    $scope.myField[coords - i] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    i++;
                }
                while ($scope.myField[coords - 10*k] === 'myShipButton') { //removing to the bottom
                    $scope.myField[coords - 10*k] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    k++;
                }
                while ($scope.myField[coords + 10*l] === 'myShipButton') { //removing to the top
                    $scope.myField[coords + 10*l] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    l++;
                }
            }
            else {
                console.log('removing on middle');
                if ($scope.myField[coords-1]!=='myShipButton'&&
                    $scope.myField[coords+1]!=='myShipButton'&&
                    $scope.myField[coords-10]!=='myShipButton'&&
                    $scope.myField[coords+10]!=='myShipButton')
                {$scope.myField[coords] = 'emptyButton';}

                var leftSideReached=0;
                var rightSideReached=0;
                while ($scope.myField[coords - i] === 'myShipButton' && leftSideReached===0) {
                    if (Math.floor((coords-i)/10)===(coords-i)/10){leftSideReached=1; console.log('leftSideReached');}
                    $scope.myField[coords - i] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    i++;
                }
                while ($scope.myField[coords + j] === 'myShipButton' && rightSideReached===0) {
                    if (Math.floor((coords+1+j)/10)===(coords+1+j)/10){rightSideReached=1; console.log('rightSideReached');}
                    $scope.myField[coords + j] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    j++;
                }
                while ($scope.myField[coords - 10*k] === 'myShipButton') {
                    $scope.myField[coords - 10*k] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    k++;
                }
                while ($scope.myField[coords + 10*l] === 'myShipButton') {
                    $scope.myField[coords + 10*l] = 'emptyButton';
                    if (firstRun){$scope.myField[coords] = 'emptyButton'; firstRun = 0;}
                    l++;
                }
            }
        }
    }   // contains all ship removing logic*/ //remove ship function backup
    /*    function countShipLength (coords, field)  {
        console.log('field is: ',field);
        var i = 1;
        var j = 1;
        var k = 1;
        var l = 1;
        var shipLength = 1;
        if (Math.floor(coords/10)===coords/10) {     // if left side of the field
            console.log('counting shiplength on left side');
            while (field[coords + j] === 'myShipButton' || field[coords + j] === 'shipKilledButton') {
                j++;
                shipLength++;
            }
            while (field[coords - 10*k] === 'myShipButton' || field[coords - 10*k] === 'shipKilledButton') {
                k++;
                shipLength++;
            }
            while (field[coords + 10*l] === 'myShipButton' || field[coords + 10*l] === 'shipKilledButton') {
                l++;
                shipLength++;
            }
        }
        else if (Math.floor((coords+1)/10)===(coords+1)/10) {    // right side of the field
            console.log('counting shiplength on right side');
            while (field[coords - i] === 'myShipButton' || field[coords - i] === 'shipKilledButton') {
                i++;
                shipLength++;
            }
            while (field[coords - 10*k] === 'myShipButton' || field[coords - 10*k] === 'shipKilledButton') {
                k++;
                shipLength++;
            }
            while (field[coords + 10*l] === 'myShipButton' || field[coords + 10*l] === 'shipKilledButton') {
                l++;
                shipLength++;
            }
        }
        else {
            console.log('counting shiplength on middle');
            var leftSideReached=0;
            var rightSideReached=0;
            while ((field[coords - i] === 'myShipButton' || field[coords - i] === 'shipKilledButton') && leftSideReached===0) {
                if (Math.floor((coords-i)/10)===(coords-i)/10){leftSideReached=1; console.log('leftSideReached');}
                i++;
                shipLength++;
            }
            while ((field[coords + j] === 'myShipButton' || field[coords + j] === 'shipKilledButton') && rightSideReached===0) {
                if (Math.floor((coords+1+j)/10)===(coords+1+j)/10){rightSideReached=1; console.log('rightSideReached');}
                j++;
                shipLength++;
            }
            while (field[coords - 10*k] === 'myShipButton' || field[coords - 10*k] === 'shipKilledButton') {
                k++;
                shipLength++;
            }
            while (field[coords + 10*l] === 'myShipButton' || field[coords + 10*l] === 'shipKilledButton') {
                l++;
                shipLength++;
            }
        }
        console.log('Shiplength is: ',shipLength);
        return shipLength;
    }*/ // count ship length backup
}]);



