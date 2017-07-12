var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
//var p2 = require('p2');

var boxes = [];

//set Port to 8081 if process.env.PORT is undefined
var port = process.env.PORT === undefined ? '8081' : process.env.PORT;


//Web Server Konfig
//#################

server.listen(port, function () {
    console.log('Server is listening to localhost:' + port);
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
    console.log('\'' + req.path + '\' requested');
});

app.use(express.static(__dirname + '/public'));



//Socket konfg
//############
io.set('heartbeat interval', 30);
io.set('heartbeat timeout', 1500);

//client verbindet sich
io.on('connection', function (socket) {

    //id zuweisen
    var id = socket.id;

    //neuen client anlegen
    boxes.push(new Box(id));

    //über client benachrichtigen
    console.log('Client ' + id + ' connected. (' + boxes.length + ')');

    //clients über neuen client informieren
    socket.broadcast.emit('new', {
        id: id
    });

    //clients beim neuen client initialisieren
    socket.on('init', function (fn) {
        fn(boxes);
    });

    //Box informationen vom Client erhalten
    socket.on('toServer', function (data) {

        //suche die passende box und setze x, y und angle
        boxes.forEach(function (box) {
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
                box.angle = data.angle;
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

    //Box Informationen an clients senden
    function toClients() {

        //console.log('toClients: ' + boxes[0]);

        boxes.forEach(function (box) {
            if (box.id === id) {
                socket.broadcast.emit('toClient', {
                    box: box
                });
                //console.log('toClients: ' + box.id);
            }
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


        //boxes.splice(boxes.indexOf(id), 1);

		//Alle Boxen überprüfen
			boxes.forEach(function (box) {
				//Wenn Box id und erhaltene id übereinstimmen
				if (box.id === id) {
					//Box aus dem Boxes Array entfernen.
					boxes.splice(boxes.indexOf(box), 1);
				}

			});


        socket.broadcast.emit('leave', {
            id: id
        });

        console.log('Client ' + id + ' disconnected. (' + boxes.length + ')');
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
