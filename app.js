var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
//var p2 = require('p2');

var balls = [];

//set Port to 8081 if process.env.PORT is undefined
var port = process.env.PORT === undefined ? '8081' : process.env.PORT;


//Web Server Konfig
//#################

server.listen(port, function () {
    console.log('Server is listening to localhost:' + port);
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/Game.html');
    console.log('\'' + req.path + '\' requested');
});

app.use(express.static(__dirname + '/public'));



//Socket konfg
//############
//io.set('heartbeat interval', 30);
io.set('heartbeat timeout', 1500);

//client verbindet sich
io.on('connection', function (socket) {

    //id zuweisen
    var id = socket.id;

    //neuen client anlegen
    balls.push(new Ball(id));

    //über client benachrichtigen
    console.log('Client ' + id + ' connected. (' + balls.length + ')');

    //clients über neuen client informieren
    socket.broadcast.emit('new', {
        id: id
    });

    //clients beim neuen client initialisieren
    socket.on('init', function (fn) {
        fn(balls);
    });

    //Ball informationen vom Client erhalten
    socket.on('toServer', function (data) {

        //suche die passende box und setze x, y und angle
        balls.forEach(function (box) {
            if (box.id === id) {

                /*
                console.log(
                    'box.id: ' + box.id,
                    'id: ' + id,
                    'box.id === id: ' + (box.id === id)
                    );
                */


                box.x = data.x;
                box.y = data.y;
                box.velocity = data.velocity;
            }
        });


        /*
        console.log(
            'id: ' + id,
            'x: ' + data.x,
            'y: ' + data.y,
            'angle: ' + data.angle
        );
        */

    });

    //periodischen senden von updates an die  Clients;
    setInterval(toClients, 10);

    //Ball Informationen an clients senden
    function toClients() {

        //console.log('toClients: ' + balls[0]);

        balls.forEach(function (box) {
            if (box.id === id) {
                socket.broadcast.emit('toClient', {
                    box: box
                });
                //console.log('toClients: ' + box.id);
            }
        });

        /*
        socket.broadcast.emit('toClient', {
            balls: balls

        });
        */
    }


    //Clients über das verlassen eines Cleints informieren
    //so dass Sie den client entfernen können (leave event)
    socket.on('disconnect', function () {


        //balls.splice(balls.indexOf(id), 1);

		//Alle Ballen überprüfen
			balls.forEach(function (box) {
				//Wenn Ball id und erhaltene id übereinstimmen
				if (box.id === id) {
					//Ball aus dem Balles Array entfernen.
					balls.splice(balls.indexOf(box), 1);
				}

			});


        socket.broadcast.emit('leave', {
            id: id
        });

        console.log('Client ' + id + ' disconnected. (' + balls.length + ')');
    });


});

//Ball constructor Server Version
function Ball(id, x, y, velocity) {
    this.id = id;


    this.x = typeof x === 'undefined' ? 0 : x;
    this.y = typeof y === 'undefined' ? 5 : y;
    this.angle = typeof angle === 'undefined' ? 0 : angle;
    this.velocity = typeof velocity === 'undefined' ? 0 : velocity;

}

//p2JS konfig
//###########
