var express = require('express');
var app = express();
var mongojs =require('mongojs');
var db = mongojs ('playersList', ['playersList']);
var bodyParser = require('body-parser');
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(3000, 'localhost', function(){});

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
// this block handles users connecting and disconnecting, sends apropriate events and updates db accordingly
    function setName(name){
        if(name != undefined && name != ''){
            socket.session = {};
            socket.session.userName = name;

            socket.broadcast.emit('newUser', socket.session);
        }
        else
            socket.emit('setName');
    }
    setName(null);

    socket.on('setName', function(name){
        if(name.length > 0){
            db.playersList.insert({name:name, socket:socket.id}, function (err, docs){});
            setName(name);
        }
        else
            socket.emit('setName');
    });

    socket.on('disconnect', function(){
        if(socket.session){
            io.sockets.emit('userDisconnected', socket.id);
            db.playersList.remove({name: socket.session.userName},  function (err, doc){});
        }
    });

// here are handlers for game logic events

    socket.on ('playerIsReady',function(player){
        io.sockets.emit('newPlayerIsReady');
    });
    socket.on ('killedYou', function (cell,player) {
        socket.to(player).emit('killedYou', cell);
    });
    socket.on ('missedYou', function (cell,player) {
        socket.to(player).emit('missedYou', cell);
    });
    socket.on ('connectedYou', function (initiatorName, initiatorSocket, recipientName) {
        socket.to(recipientName).emit('someoneConnectedToYou', initiatorName, initiatorSocket);
    });
    socket.on ('youWin', function (player) {
        socket.to(player).emit('youWon');
    });

});

//DB requests handlers

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
    db.playersList.remove({_id: mongojs.ObjectId(id)},  function (err, doc){
        res.json(doc);
    });
});

app.put('/playersList/:id', function (req, res) {
    var id = req.params.id;
    db.playersList.findAndModify({
            query: {_id: mongojs.ObjectId(id)},
            update: {$set: {playerStatus:'ready', field: req.body.field}},
            new: true}, function (err, doc) {
            res.json(doc);
        }
    );
});

db.playersList.remove({});  // clears the DB on server start to fix some bugs