var express = require('express');
var app = express();
var mongojs =require('mongojs');
var db = mongojs ('playersList', ['playersList']);
var bodyParser = require('body-parser');


var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(3000, 'localhost', function(){
    var addr = server.address();
//  logger.debug('listening on '+addr.address+':' + addr.port);
});

/*server.listen(3000, '127.0.0.1', function(){
    var addr = server.address();
    logger.debug('listening on '+addr.address+':' + addr.port);
});*/

//var router = express.Router();
//var http = require ('http');

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());





app.get('/socket.io.js', function(req,res){
    res.sendFile(__dirname+'/node_modules/socket.io-client/dist/socket.io.js');});
app.get('/jquery.js', function(req,res){
    res.sendFile(__dirname+'/node_modules/jquery/dist/jquery.min.js');});
app.get('/uikit.js', function(req,res){
    res.sendFile(__dirname+'/node_modules/uikit/dist/js/uikit.min.js');});
app.get('/uikit.css', function(req,res){
    res.sendFile(__dirname+'/node_modules/uikit/dist/css/uikit.almost-flat.min.css');});
app.get('/animate.css', function(req,res){
    res.sendFile(__dirname+'/node_modules/animate.css/animate.min.css');});

 io.on('connection', function(socket){
    function setName(name){
        if(name != undefined && name != ''){  // если имя не пустое
            socket.session = {};   // создаем объект с данными сокета
            socket.session.userName = name;   // помещаем в объект имя пользователя
            socket.broadcast.emit('newUser', socket.session); //отправляем всем сокетам, кроме текущего получившийся объект в событии newUser
       }
        else //если же имя пришло пустое
            socket.emit('setName');  //запрашиваем его снова
    }
    setName(null);  //вызываем функцию при первом подключении с пустым параметром name

    socket.on('setName', function(name){
         if(name.length > 0){
             db.playersList.insert({name}, function (err, docs){});
             setName(name);
         }
         else
             socket.emit('setName');
    });

     socket.on('disconnect', function(){
         if(socket.session){
             io.sockets.emit('userDisconnected', socket.session);
             db.playersList.remove({name: socket.session.userName},  function (err, doc){});
         }
     });
});





app.get ('/playersList', function (req, res) {
    db.playersList.find(function (err, docs) {
        res.json(docs);
    });

    console.log('I receiveg get request');
});

app.post('/playersList', function (req, res){
    db.playersList.insert(req.body, function (err, docs){
        res.json(docs);
    });
});

app.delete('/playersList/:id', function (req, res){
    var id = req.params.id;
    console.log(id);
    db.playersList.remove({_id: mongojs.ObjectId(id)},  function (err, doc){
        res.json(doc);
    });
});

app.put('/playersList/:id', function (req, res) {
    console.log('im putting, id='+req.params.id);
    var id = req.params.id;
    console.log(req.data);
//    console.log('req=>'+JSON.parse(req));
    for (item in req.data) {
        console.log('req.body item=>'+ item);
    };

    db.playersList.findAndModify({
            query: {_id: mongojs.ObjectId(id)},
            update: {$set: {playerStatus:'ready', ships: req.body.ships}},
            new: true}, function (err, doc) {
            res.json(doc);
        }
    );
});


//app.listen(3000);
console.log('Server running');