var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {

    var port = 3000;
    var server = 'localhost';
    var socket = io.connect(server + ':' + port);

    $scope.fieldIsVisible = false;
    $scope.playersListVisible=0;
    $scope.gameStarted=0;
    var myPlayerId = null;
    var myPlayerName = null;
    var mySocket = null;
    var myShips = [];
    var myShipsLeft = 0;
    var myTurn = 0;
    var opponent = [];
    var maxShipsNumber = 4;

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
        document.getElementById(cellId).style.backgroundColor ='red';
        if (--myShipsLeft>0){
            console.log('Still more than 0 - ',myShipsLeft);
        }
        else {
            socket.emit('youWin', opponentSocket);
            alert('You have lost');
            location.reload();
        }
    });

    socket.on('missedYou', function(cellId) {
        console.log ('Someone missed me');
        document.getElementById(cellId).style.backgroundColor ='grey';
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
                console.log(item);
                console.log(item.socket);
                console.log(opponentSocket);
                if (item.socket === opponentSocket) opponent = item;
                console.log(opponent.name,opponent.id,opponent.ships);
            })
        });
  //      $scope.playersListVisible=0;
    });

    socket.on('youWon', function() {
        console.log ('i Won');
        alert('YOU ARE THE WINNER!!! Hurraaaaaaay!!!');
        location.reload();
    });

//HTML Buttons functions --------------------------
    $scope.startNewGame = function(){
        shipsPlaced = 0;
        shipsNumber = 0;
        $scope.fieldIsVisible = true;
        $scope.gameStarted = false;
    }; //when startNewGame button is pressed

    $scope.playerReady = function(){
        if (myShipsLeft===maxShipsNumber){
            shipsPlaced = true;
            reqData = {ships:myShips};
            $http.put('/playersList/' + myPlayerId, reqData);
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
                    if (item.socket === opponentSocket) opponent = item;
                    console.log(opponent.name,opponent.id,opponent.ships);
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

    $scope.onButtonPress = function (id, fieldOwner) {
        if (fieldOwner==='my' && !shipsPlaced){                               // when placing your ships
            if (myShipsLeft<maxShipsNumber){
                if (document.getElementById(id).style.backgroundColor !=='black'){
                    myShips[myShips.length]= id;
                    myShipsLeft++;
                    document.getElementById(id).style.backgroundColor ='black';
                }
                else {
                    alert ('a-a-aaaa!!!!');
                }
            }
            else{
                alert ('All ships placed');
            }
        }
        else if (fieldOwner==='my' && shipsPlaced){
            alert ('Ships are placed');
        }
        else if ($scope.gameStarted && fieldOwner==='enemy'){                           // when game started nd u press opponent field
            if(myTurn){
                target =id-100;
                for (i=0; i<opponent.ships.length; i++) {
                    if (target!==+opponent.ships[i]){
                        console.log('missed');
                        myTurn = 0;
                        markMissedPlace(id);
                    }
                    else{
                        console.log('BOOOM');
                        markKilledShip(id);
                        myTurn=1;
                        break;
                    }
                }
            }
            else alert ("It's not your turn");
        }
        else if (!$scope.gameStarted && fieldOwner==='enemy'){
            alert ('Opponent not ready');
        }
    }; //when one of the game fields buttons is pressed - this handles most of game logic

// some service functions

    $scope.numberToLetter = function (number) {
        number = String.fromCharCode(+number+64);
        return number;
    }; // transforms number to letter :)

    function markKilledShip(cellId) {
        document.getElementById(cellId).style.backgroundColor ='red';
        socket.emit('killedYou',cellId-100, opponentSocket);
    }; // changes fields color

    function markMissedPlace (cellId) {
        document.getElementById(cellId).style.backgroundColor ='grey';
        socket.emit('missedYou',cellId-100, opponentSocket);
    }; // changes fields color

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










//module.exports.userName=userName;

//var messagesBox = $('#messages');
//var userLogin = new String;
//var controller = require ('./controller');
//var userName = null;
//console.log(userName);


//  $scope.removeLast = function () {
//       $http.delete('/playersList/'+$scope.user._id).then(function (responce) {showPlayersList();});
//   };


/*   $scope.submit = function submit(){
       if ($scope.player){
           $scope.user = $scope.player;
        //  console.log($scope.user._id);
           $http.post('/playersList',$scope.player).then(function (response){
               showPlayersList();
               $scope.user._id = response.data._id;
               console.log($scope.user._id);
              // saveId('$scope.user.name');
           });
       }
   };*/


/*    var my_arr = [ "2", "1", "6" ]
    for(var i=0; i<my_arr.length; i++) {
        alert(my_arr[i]);
    }*/

//       for(var key in clientsList){
//           if($('#'+key).length == 0){
//               addUserToList(clientsList[key]);
//           }
//       }

//        $('#messages').append('<div class="uk-panel uk-panel-box uk-panel-box-warning uk-width-4-5 uk-align-left uk-margin-top-remove animated flipInX" id="info-message">Пользователь <b>'+userData.userName+'</b> покинул чат!</div>');
//        removeUserFromList(userData);
//        messagesBox.scrollTop(messagesBox.prop('scrollHeight'));