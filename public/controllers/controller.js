var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {

    var port = 3000;
    var server = 'localhost';
    var socket = io.connect(server + ':' + port);

    $scope.fieldIsVisible = false;
    $scope.playersListVisible=0;
    $scope.cellStatus = {'background-color':'red', 'width':'30'};
    var myPlayerId = null;
    var myPlayerName = null;

    // Обработчики событий
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
    });

    socket.on('userDisconnected', function(userData){
        console.log(userData.userName + ' is disconnected');
        showPlayersList();
    });

    socket.on('newUser', function(clientsList){
        console.log(clientsList +'cthdfr crfpfk');
        showPlayersList();
    });

    // Ангуляр - логика

    //Buttons--------------------------
    $scope.startNewGame = function(){
        shipsPlaced = 0;
        shipsNumber = 0;
        $scope.fieldIsVisible = true;
        gameStarted = false;
    };

    $scope.playerReady = function(){
        shipsPlaced = true;
        shipsPositions = [];
        ships = document.getElementsByClassName('myShipPlace');
        for (i=0; i<ships.length; i++){
            shipsPositions[i] = ships[i].attributes[4].value;
        }
        reqData = {ships:shipsPositions};
        $http.put('/playersList/' + myPlayerId, reqData);
        $scope.playersListVisible = true;
        $scope.cellStatus = {'background-color':'#6fac34', 'width':'30'}
        showPlayersList();
    };


    //--------------------------buttons

    $scope.remove = function (id) {
        $http.delete('/playersList/'+id).then(function (responce) {showPlayersList();});
    };

 //   $scope.connect = function (id) {

 //   };

  //  $scope.pressed = function(id){

  //  };

    $scope.numberToLetter = function (number) {
        number = String.fromCharCode(+number+64);
        return number;
    };

    $scope.onButtonPress = function (id, fieldOwner) {
        if (fieldOwner==='my' && !shipsPlaced){
            document.getElementById(id).style.backgroundColor ='red';
            document.getElementById(id).className = 'myShipPlace';
//            console.log('pressed'+ document.getElementById(id).id);
//            console.log('owner:'+fieldOwner);
        }
        else if (fieldOwner==='my' && shipsPlaced){
            alert ('Ships are placed');
        }
        else if (gameStarted && fieldOwner==='enemy'){
            alert ('BOOM!!!');
        }
        else if (!gameStarted && fieldOwner==='enemy'){
            alert ('Opponent not ready');
        }
    };


    // gamefield buttons function


    //Other functions

    function showPlayersList() {
        $http.get('/playersList').then(function (response) {
            $scope.playersList = response.data;
            console.log(typeof $scope.playersList);
            console.log($scope.playersList);

           if (myPlayerId === null) {
               console.log('first name Check');
               $scope.playersList.forEach(function(item, i, arr) {
                   if (item.name === myPlayerName){
                       myPlayerId=item._id;
                       console.log(myPlayerId + 'id');
                   }
               });
          }
        });
    };

}]);

// Динамическая таблица

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