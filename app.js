var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
//var p2 = require('p2');

var boxes = new Map();

//set Port to 8081 if process.env.PORT is undefined
var port = process.env.PORT === undefined ? '8081' : process.env.PORT;


//Web Server Konfig
//#################

server.listen(port, function () {
	console.log('Server is listening to localhost:' + port);
});

app.use(express.static(__dirname + '/public'));



//Socket konfg
//############
io.set('heartbeat interval', 500);
io.set('heartbeat timeout', 1500);

//client verbindet sich
io.on('connection', function (socket) {

	//id zuweisen
	let id = socket.id;

	let box = new Box(id);

	//neuen client anlegen
	boxes.set(id, box);

	//über client benachrichtigen
	console.log('Client ' + id + ' connected. (' + boxes.size + ')');

	//clients über neuen client informieren
	socket.broadcast.emit('new', {
		id: id
	});

	//clients beim neuen client initialisieren
	socket.on('init', function (fn) {

		let boxesArr = [];

		for(let value of boxes.values()){
			boxesArr.push(value);
		}

		fn(boxesArr);
	});

	//Box informationen vom Client erhalten
	socket.on('toServer', function (data) {

		//suche die passende box und setze x, y und angle
		box.x = data.x;
		box.y = data.y;
		box.angle = data.angle;
		box.velocity = data.velocity;

	});

	//periodischen senden von updates an die  Clients;
	setInterval(toClients, 50);

	//Box Informationen an clients senden
	function toClients() {


		socket.broadcast.emit('toClient', {
			box: box
		});

		/*
		socket.broadcast.emit('toClient', {
		    boxes: boxes

		});
		*/
	}


	//Clients über das verlassen eines Cleints informieren
	//so dass Sie den client entfernen können (leave event)
	socket.on('disconnect', function () {

		boxes.delete(id);

		socket.broadcast.emit('leave', {
			id: id
		});

		console.log('Client ' + id + ' disconnected. (' + boxes.size + ')');
	});


});

//Box constructor Server Version
function Box(id, x, y, angle, velocity) {
	this.id = id;


	this.x = typeof x === 'undefined' ? 0 : x;
	this.y = typeof y === 'undefined' ? 5 : y;
	this.angle = typeof angle === 'undefined' ? 0 : angle;
	this.velocity = typeof velocity === 'undefined' ? 0 : velocity;

}

//p2JS konfig
//###########
