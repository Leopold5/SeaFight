var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var server = require('http').Server(app);
var io = require('socket.io')(server);

var dbType='local';  // Change this to change where to store data - can be 'mongo' or 'local'. 'file' type planned
var connect;


var connectMongo = {

    addToDB: function (req) {
        db.playersList.insert(req, function (err, docs){
        });
    },

    findAllInDB: function (callback) {
        db.playersList.find().toArray(callback);
    },

    updateInDB: function (id, data) {
        db.playersList.findAndModify({
                query: {socket: id},
                update: {$set: {status:'ready', field: data.field}},
                new: true}, function (err, doc) {
            }
        );
    },

    removeFromDB: function (socketId) {
        db.playersList.remove({socket: socketId},  function (err, doc){
            //          res.json(doc);
        });
    }
};    // mongoDB methods
var connectLocalStorage = {

    addToDB: function (data) {
        dataStorage.push(data);
    },

    findAllInDB: function () {
        return dataStorage;
    },

    updateInDB: function (id,data) {
        for (i=0; i<dataStorage.length; i++) {
            if (dataStorage[i].socket===id){
                dataStorage[i].field = data.field;
                dataStorage[i].status = 'ready';
            }
        }
    },

    removeFromDB: function (socketId) {
        for (i=0; i<dataStorage.length; i++) {
            if (dataStorage[i].socket===socketId){
                dataStorage.splice (i,1);
            }
        }
    }
};  // local data storage methods

if (dbType === 'mongo'){
    var mongojs =require('mongojs');
    var db = mongojs ('playersList', ['playersList']);
    db.playersList.remove({});  // clears the DB on server start to fix some bugs
    connect = connectMongo;
}         // sets up a server for different types of data storage
else if (dbType === 'local'){
    var dataStorage = [];
    connect = connectLocalStorage;
}
else if (dbType === 'file'){
    var fs = require ('fs');
    var dbFile = 'localDB.json';
    fs.writeFile (dbFile, '{}');
    connect = connectLocalStorage;
}


server.listen(4000, function(){});

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html')});
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

// this block handles users connecting and disconnecting, sends appropriate events and updates db accordingly

io.on('connection', function(socket){
    function setSession(name){
        socket.session = {};
        socket.session.userName = name;
        socket.session.socketId = socket.id;
    }
    if (socket.name == null){
        socket.emit('setNamePlz');
    }

    socket.on('setThisName', function(name){
        setSession(name);
        socket.broadcast.emit('newUserConnectedToServer');
        socket.emit ('saveYourSessionAndStartNewGame', socket.session);
        connect.addToDB({name:name, socket:socket.id});
    });
    socket.on('disconnect', function(){
        if(socket.session){
            connect.removeFromDB(socket.session.socketId);
            io.sockets.emit('userDisconnected', socket.id);
        }
    });
    socket.on ('playerIsReady',function(){
        socket.broadcast.emit('newPlayerIsReady');
    });
    socket.on ('connectedHim', function (initiatorName, initiatorSocket, recipientName) {
        socket.to(recipientName).emit('someoneConnectedToYou', initiatorName, initiatorSocket);
    });

// here are handlers for gameplay events

    socket.on ('killedYou', function (cell,player) {
        socket.to(player).emit('killedYou', cell);
    });
    socket.on ('missedYou', function (cell,player) {
        socket.to(player).emit('missedYou', cell);
    });
    socket.on ('youWin', function (player) {
        socket.to(player).emit('youWon');
    });

});

//server requests handlers

app.get ('/playersList', function (req, res) {
   if (dbType==='mongo'){
       connect.findAllInDB (function(err, items) {
           res.send(items)
       });
   }
   else if (dbType==='local'){
       var players = connect.findAllInDB();
       res.send(players);
   }
});

app.put('/playersList', function (req, res) {
    var id = req.body.socket;
    data = req.body;
    connect.updateInDB(id, data);
    res.end();
});
